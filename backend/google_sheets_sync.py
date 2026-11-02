"""
HETA-HRM: Google Sheets Bi-Directional Master Synchronizer
Authenticates via Google Cloud Service Account and syncs Attendance, Members, Leaves, and Portions.
"""

import os
import json
import re
from datetime import datetime, date
import gspread
from gspread.utils import rowcol_to_a1
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(__file__), "google-service-account.json")

def get_service_account_credentials():
    """
    Load credentials from environment variable GOOGLE_SERVICE_ACCOUNT_JSON
    or from backend/google-service-account.json file.
    """
    env_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if env_json:
        try:
            info = json.loads(env_json)
            return Credentials.from_service_account_info(info, scopes=SCOPES)
        except Exception as e:
            print(f"[GSHEET WARN] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: {e}")

    if os.path.exists(SERVICE_ACCOUNT_PATH):
        return Credentials.from_service_account_file(SERVICE_ACCOUNT_PATH, scopes=SCOPES)

    return None

def extract_sheet_id(url_or_id):
    """
    Extracts 44-character spreadsheet ID from a full Google Sheets URL or raw ID.
    e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
    """
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url_or_id)
    if match:
        return match.group(1)
    if len(url_or_id) > 20 and "/" not in url_or_id and " " not in url_or_id:
        return url_or_id
    return None

def update_or_create_worksheet(spreadsheet, title, header, rows, freeze_cols=0, theme="navy"):
    """
    Helper to update or create a worksheet within a spreadsheet with header + rows,
    applying premium executive styling (header colors, frozen panes, and clean font).
    """
    try:
        ws = spreadsheet.worksheet(title)
        ws.clear()
    except gspread.exceptions.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=title, rows=max(len(rows) + 20, 100), cols=max(len(header) + 5, 20))

    all_values = [header] + rows
    ws.update(all_values, value_input_option="USER_ENTERED")

    try:
        # Determine theme header color
        # Navy: #0f172a (Dark Executive Navy)
        # Blue: #1e3a8a (Student Portal Royal Blue)
        # Emerald: #064e3b (Faculty Deep Emerald)
        # Gold: #78350f (Academic Executive Gold)
        # Rose: #881337 (KPI & Defaulters Warning Rose)
        theme_bg = {"red": 0.08, "green": 0.12, "blue": 0.20} # Default Executive Navy
        text_fg = {"red": 1.0, "green": 1.0, "blue": 1.0}

        if theme == "emerald":
            theme_bg = {"red": 0.03, "green": 0.28, "blue": 0.18}
        elif theme == "blue":
            theme_bg = {"red": 0.10, "green": 0.24, "blue": 0.50}
        elif theme == "gold":
            theme_bg = {"red": 0.47, "green": 0.22, "blue": 0.05}
        elif theme == "rose":
            theme_bg = {"red": 0.50, "green": 0.08, "blue": 0.18}

        last_col_a1 = rowcol_to_a1(1, len(header))
        header_range = f"A1:{last_col_a1}"

        # 1. Format Header Row with bold white text, theme background & centered
        ws.format(header_range, {
            "backgroundColor": theme_bg,
            "horizontalAlignment": "CENTER",
            "textFormat": {
                "foregroundColor": text_fg,
                "fontSize": 10,
                "bold": True
            }
        })

        # 2. Freeze top row (and optionally frozen left columns)
        ws.freeze(rows=1, cols=freeze_cols)

    except Exception as fmt_err:
        print(f"[GSHEET FORMAT NOTE] Formatting non-fatal exception on {title}: {fmt_err}")

    return ws

def sync_database_to_google_sheet(conn, target_sheet_id_or_url=None):
    """
    Main synchronization routine:
    1. Authenticates service account.
    2. Opens or creates the target spreadsheet.
    3. Exports Daily Attendance, Members Master, Leave Requests, Portions, and KPI Summary.
    4. Auto-shares with HETA admins.
    5. Returns sync statistics and spreadsheet URL.
    """
    creds = get_service_account_credentials()
    if not creds:
        raise ValueError("Google Service Account credentials not found. Please ensure google-service-account.json is present or GOOGLE_SERVICE_ACCOUNT_JSON is set.")

    client = gspread.authorize(creds)
    spreadsheet = None
    sheet_id = extract_sheet_id(target_sheet_id_or_url)

    if sheet_id:
        try:
            spreadsheet = client.open_by_key(sheet_id)
        except Exception as ex:
            raise ValueError(f"Could not open spreadsheet with ID '{sheet_id}'. Please verify that the sheet exists and has been shared with '{creds.service_account_email}' as Editor. (Details: {ex})")
    else:
        # Check if we have an existing spreadsheet saved in DB
        cursor = conn.cursor()
        cursor.execute("SELECT sheetId, sheetUrl FROM GoogleSheetSync WHERE sheetId IS NOT NULL AND sheetId != '' ORDER BY id DESC LIMIT 1")
        saved = cursor.fetchone()
        if saved and saved["sheetId"]:
            try:
                spreadsheet = client.open_by_key(saved["sheetId"])
            except Exception:
                spreadsheet = None

    if not spreadsheet:
        # Attempt to open existing by title or create new
        sheet_title = "HETA-HRM Attendance Master"
        try:
            spreadsheet = client.open(sheet_title)
        except (gspread.exceptions.SpreadsheetNotFound, Exception):
            try:
                spreadsheet = client.create(sheet_title)
                # Auto-share with admin accounts
                target_admins = [e.strip() for e in os.environ.get("HETA_ADMIN_EMAILS", os.environ.get("ADMIN_EMAIL", "pravesbalaji144@gmail.com,balajimanokaranmd@gmail.com")).split(",") if e.strip()]
                for admin_email in target_admins:
                    try:
                        spreadsheet.share(admin_email, perm_type="user", role="writer")
                    except Exception as share_err:
                        print(f"[GSHEET SHARE NOTICE] Could not auto-share with {admin_email}: {share_err}")
            except Exception as create_err:
                err_msg = str(create_err)
                if "Google Drive API has not been used" in err_msg or "403" in err_msg:
                    raise ValueError(
                        f"Google Drive API needs to be enabled for your GCP Project 'united-watch-513401-b4'. "
                        f"Enable it in 1 click at: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=united-watch-513401-b4 "
                        f"OR create a Google Sheet manually in your personal Google Drive and share it with '{creds.service_account_email}' as Editor, then paste its URL above."
                    )
                raise create_err

    # Gather data from SQLite
    cursor = conn.cursor()

    curr_now = datetime.now()
    curr_year = curr_now.year
    curr_month = curr_now.month
    next_month_date = date(curr_year + 1, 1, 1) if curr_month == 12 else date(curr_year, curr_month + 1, 1)
    num_days = (next_month_date - date(curr_year, curr_month, 1)).days
    month_prefix = f"{curr_year}-{curr_month:02d}"

    # 1. Student Daily Attendance Records
    cursor.execute("""
    SELECT a.date, m.code, m.name, m.course, m.batch,
           a.status, COALESCE(a.inTime, '-') as inTime, COALESCE(a.outTime, '-') as outTime,
           COALESCE(a.notes, '-') as notes,
           COALESCE(a.markedBy, 'Admin') as markedBy
    FROM Attendance a
    JOIN Member m ON a.memberId = m.id
    WHERE m.role = 'STUDENT'
    ORDER BY a.date DESC, m.batch ASC, m.name ASC
    """)
    student_att_rows = [[r["date"], r["code"], r["name"], r["course"], r["batch"],
                         r["status"], r["inTime"], r["outTime"], r["notes"], r["markedBy"]]
                        for r in cursor.fetchall()]
    student_att_header = ["Date (YYYY-MM-DD)", "Roll No", "Student Name", "Course", "Batch",
                          "Attendance Status", "In Time", "Out Time", "Notes / Remarks", "Marked By"]
    update_or_create_worksheet(spreadsheet, "Student Daily Attendance", student_att_header, student_att_rows, freeze_cols=2, theme="blue")

    # 2. Staff Daily Attendance Records
    cursor.execute("""
    SELECT a.date, m.code, m.name, m.department,
           a.status, COALESCE(a.inTime, '-') as inTime, COALESCE(a.outTime, '-') as outTime,
           COALESCE(a.notes, '-') as notes,
           COALESCE(a.markedBy, 'Admin') as markedBy
    FROM Attendance a
    JOIN Member m ON a.memberId = m.id
    WHERE m.role = 'STAFF'
    ORDER BY a.date DESC, m.name ASC
    """)
    staff_att_rows = [[r["date"], r["code"], r["name"], r["department"],
                       r["status"], r["inTime"], r["outTime"], r["notes"], r["markedBy"]]
                      for r in cursor.fetchall()]
    staff_att_header = ["Date (YYYY-MM-DD)", "Staff Code", "Faculty Name", "Department",
                        "Attendance Status", "In Time", "Out Time", "Notes / Remarks", "Marked By"]
    update_or_create_worksheet(spreadsheet, "Staff Daily Attendance", staff_att_header, staff_att_rows, freeze_cols=2, theme="emerald")

    # 3. Student Monthly Matrix (Cross-Tabular Day 1 to 31 Grid)
    student_matrix_header = ["Roll No", "Student Name", "Course", "Batch"] + [f"D{d}" for d in range(1, num_days + 1)] + ["Present (P)", "Absent (A)", "Holiday (H)", "Rate %"]
    student_matrix_rows = []

    cursor.execute("SELECT id, code, name, course, batch FROM Member WHERE role = 'STUDENT' AND status = 'ACTIVE' ORDER BY batch ASC, name ASC")
    active_students = cursor.fetchall()
    for m in active_students:
        m_id = m["id"]
        cursor.execute("SELECT date, status FROM Attendance WHERE memberId = ? AND date LIKE ?", (m_id, f"{month_prefix}%"))
        day_att = {r["date"].split("-")[2].lstrip("0"): r["status"] for r in cursor.fetchall()}
        
        p_c = 0
        a_c = 0
        h_c = 0
        day_statuses = []
        for d in range(1, num_days + 1):
            st = day_att.get(str(d), "-")
            if st == "PRESENT":
                day_statuses.append("P")
                p_c += 1
            elif st == "ABSENT":
                day_statuses.append("A")
                a_c += 1
            elif st == "HOLIDAY":
                day_statuses.append("H")
                h_c += 1
            else:
                day_statuses.append("-")
        
        total_w = p_c + a_c
        m_rate = round((p_c / total_w * 100), 1) if total_w > 0 else (100.0 if h_c > 0 else 0.0)
        row = [m["code"], m["name"], m["course"], m["batch"]] + day_statuses + [p_c, a_c, h_c, f"{m_rate}%"]
        student_matrix_rows.append(row)

    update_or_create_worksheet(spreadsheet, f"Student Matrix ({month_prefix})", student_matrix_header, student_matrix_rows, freeze_cols=2, theme="blue")

    # 4. Staff Monthly Matrix (Cross-Tabular Day 1 to 31 Grid)
    staff_matrix_header = ["Staff Code", "Faculty Name", "Department"] + [f"D{d}" for d in range(1, num_days + 1)] + ["Present (P)", "Absent (A)", "Holiday (H)", "Rate %"]
    staff_matrix_rows = []

    cursor.execute("SELECT id, code, name, department FROM Member WHERE role = 'STAFF' AND status = 'ACTIVE' ORDER BY name ASC")
    active_staff = cursor.fetchall()
    for m in active_staff:
        m_id = m["id"]
        cursor.execute("SELECT date, status FROM Attendance WHERE memberId = ? AND date LIKE ?", (m_id, f"{month_prefix}%"))
        day_att = {r["date"].split("-")[2].lstrip("0"): r["status"] for r in cursor.fetchall()}
        
        p_c = 0
        a_c = 0
        h_c = 0
        day_statuses = []
        for d in range(1, num_days + 1):
            st = day_att.get(str(d), "-")
            if st == "PRESENT":
                day_statuses.append("P")
                p_c += 1
            elif st == "ABSENT":
                day_statuses.append("A")
                a_c += 1
            elif st == "HOLIDAY":
                day_statuses.append("H")
                h_c += 1
            else:
                day_statuses.append("-")
        
        total_w = p_c + a_c
        m_rate = round((p_c / total_w * 100), 1) if total_w > 0 else (100.0 if h_c > 0 else 0.0)
        row = [m["code"], m["name"], m["department"]] + day_statuses + [p_c, a_c, h_c, f"{m_rate}%"]
        staff_matrix_rows.append(row)

    update_or_create_worksheet(spreadsheet, f"Staff Matrix ({month_prefix})", staff_matrix_header, staff_matrix_rows, freeze_cols=2, theme="emerald")

    # 5. Students Directory
    cursor.execute("""
    SELECT code, name, course, batch,
           COALESCE(phone, '-') as phone, COALESCE(email, '-') as email,
           COALESCE(parentName, '-') as parentName, COALESCE(parentPhone, '-') as parentPhone,
           COALESCE(parentEmail, '-') as parentEmail, status
    FROM Member
    WHERE role = 'STUDENT'
    ORDER BY batch ASC, name ASC
    """)
    student_dir_rows = [[r["code"], r["name"], r["course"], r["batch"],
                         r["phone"], r["email"], r["parentName"], r["parentPhone"], r["parentEmail"], r["status"]]
                        for r in cursor.fetchall()]
    student_dir_header = ["Roll No", "Student Name", "Course", "Batch",
                          "Student Phone", "Student Email", "Parent Name", "Parent Phone", "Parent Email", "Active Status"]
    update_or_create_worksheet(spreadsheet, "Students Directory", student_dir_header, student_dir_rows, freeze_cols=2, theme="blue")

    # 6. Staff Directory
    cursor.execute("""
    SELECT code, name, department,
           COALESCE(phone, '-') as phone, COALESCE(email, '-') as email, status
    FROM Member
    WHERE role = 'STAFF'
    ORDER BY name ASC
    """)
    staff_dir_rows = [[r["code"], r["name"], r["department"], r["phone"], r["email"], r["status"]]
                      for r in cursor.fetchall()]
    staff_dir_header = ["Staff Code", "Faculty Name", "Department", "Phone", "Email", "Active Status"]
    update_or_create_worksheet(spreadsheet, "Staff Directory", staff_dir_header, staff_dir_rows, freeze_cols=2, theme="emerald")

    # 7. Leave Applications & Approvals
    cursor.execute("""
    SELECT lr.id, lr.studentName, m.code, m.role, lr.course, lr.batch, lr.leaveType,
           lr.startDate, lr.endDate, lr.reason, lr.status,
           COALESCE(lr.reviewedBy, '-') as reviewedBy, COALESCE(lr.adminRemarks, '-') as adminRemarks,
           lr.appliedAt
    FROM LeaveRequest lr
    JOIN Member m ON lr.memberId = m.id
    ORDER BY lr.appliedAt DESC
    """)
    leave_rows = [[r["id"], r["studentName"], r["code"], r["role"], r["course"], r["batch"], r["leaveType"],
                   r["startDate"], r["endDate"], r["reason"], r["status"], r["reviewedBy"], r["adminRemarks"], r["appliedAt"]]
                  for r in cursor.fetchall()]
    leave_header = ["Application ID", "Applicant Name", "Code", "Role", "Course / Dept", "Batch", "Leave Type",
                    "From Date", "To Date", "Reason", "Status", "Reviewed By", "Admin Remarks", "Applied At"]
    update_or_create_worksheet(spreadsheet, "Leave Applications", leave_header, leave_rows, freeze_cols=1, theme="gold")

    # 8. Attendance KPI Summary & Defaulters
    cursor.execute("SELECT id, name, code, role, course, batch, department FROM Member WHERE status = 'ACTIVE' ORDER BY role ASC, name ASC")
    active_members = cursor.fetchall()
    summary_rows = []
    for m in active_members:
        cursor.execute("SELECT status FROM Attendance WHERE memberId = ?", (m["id"],))
        records = [r["status"] for r in cursor.fetchall()]
        total_held = len(records)
        p_cnt = records.count("PRESENT")
        a_cnt = records.count("ABSENT")
        h_cnt = records.count("HOLIDAY")
        rate = round((p_cnt / total_held * 100), 1) if total_held > 0 else 0.0
        standing = "Good Standing (>=75%)" if rate >= 75.0 else "CRITICAL (<75%) DEFAULTER"
        cat_info = f"{m['course']} - {m['batch']}" if m["role"] == "STUDENT" else (m["department"] or "Faculty")
        summary_rows.append([m["role"], m["code"], m["name"], cat_info,
                             total_held, p_cnt, a_cnt, h_cnt, f"{rate}%", standing])

    summary_header = ["Category", "Member Code", "Full Name", "Batch / Department",
                      "Total Classes", "Present Days", "Absent Days", "Holiday/Leave Days", "Attendance Rate", "Academic Standing"]
    kpi_ws = update_or_create_worksheet(spreadsheet, "Attendance KPI & Defaulters", summary_header, summary_rows, freeze_cols=2, theme="rose")

    # Conditional Highlighting for KPI & Defaulters
    try:
        for idx, srow in enumerate(summary_rows, start=2):
            standing_text = srow[9]
            cell_ref = f"J{idx}"
            if "DEFAULTER" in standing_text:
                kpi_ws.format(cell_ref, {
                    "backgroundColor": {"red": 0.99, "green": 0.88, "blue": 0.88},
                    "textFormat": {"foregroundColor": {"red": 0.75, "green": 0.10, "blue": 0.10}, "bold": True}
                })
            else:
                kpi_ws.format(cell_ref, {
                    "backgroundColor": {"red": 0.88, "green": 0.98, "blue": 0.88},
                    "textFormat": {"foregroundColor": {"red": 0.05, "green": 0.45, "blue": 0.15}, "bold": True}
                })
    except Exception as kpi_fmt_err:
        print(f"[GSHEET KPI FORMAT NOTE]: {kpi_fmt_err}")

    # Clean default "Sheet1" if present
    try:
        sheet1 = spreadsheet.worksheet("Sheet1")
        if len(spreadsheet.worksheets()) > 1:
            spreadsheet.del_worksheet(sheet1)
    except Exception:
        pass

    total_records = (len(student_att_rows) + len(staff_att_rows) +
                     len(student_matrix_rows) + len(staff_matrix_rows) +
                     len(student_dir_rows) + len(staff_dir_rows) +
                     len(leave_rows) + len(summary_rows))
    sheet_url = spreadsheet.url
    sheet_id = spreadsheet.id
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"Synced {total_records} records across 8 Dedicated Separate Sheets (Student & Staff Attendance, Matrices, Directories, Leaves, KPIs) at {now_str}."

    # Update database tracking
    cursor.execute("""
    UPDATE GoogleSheetSync
    SET sheetId = ?,
        sheetUrl = ?,
        lastSyncedAt = ?,
        recordsSynced = ?,
        syncStatus = 'SUCCESS',
        log = ?
    WHERE id = 'gsheet_cfg_1'
    """, (sheet_id, sheet_url, now_str, total_records, log_msg))
    conn.commit()

    return {
        "success": True,
        "sheetId": sheet_id,
        "sheetUrl": sheet_url,
        "sheetName": spreadsheet.title,
        "recordsSynced": total_records,
        "lastSyncedAt": now_str,
        "log": log_msg
    }

