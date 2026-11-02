"""
HETA-HRM: Google Sheets Bi-Directional Master Synchronizer
Authenticates via Google Cloud Service Account and syncs Attendance, Members, Leaves, and Portions.
"""

import os
import json
import re
from datetime import datetime
import gspread
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

def update_or_create_worksheet(spreadsheet, title, header, rows):
    """
    Helper to update or create a worksheet within a spreadsheet with header + rows.
    """
    try:
        ws = spreadsheet.worksheet(title)
        ws.clear()
    except gspread.exceptions.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=title, rows=max(len(rows) + 10, 100), cols=max(len(header) + 2, 15))

    all_values = [header] + rows
    ws.update(all_values, value_input_option="USER_ENTERED")
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

    # 1. Daily Attendance Records
    cursor.execute("""
    SELECT a.date, m.code, m.name, m.role, m.course, m.batch,
           a.status, COALESCE(a.inTime, '-') as inTime, COALESCE(a.outTime, '-') as outTime,
           COALESCE(a.notes, '-') as notes,
           COALESCE(a.markedBy, 'Admin') as markedBy
    FROM Attendance a
    JOIN Member m ON a.memberId = m.id
    ORDER BY a.date DESC, m.name ASC
    """)
    att_rows = [[r["date"], r["code"], r["name"], r["role"], r["course"], r["batch"],
                 r["status"], r["inTime"], r["outTime"], r["notes"], r["markedBy"]]
                for r in cursor.fetchall()]

    att_header = ["Date (YYYY-MM-DD)", "Member Code", "Full Name", "Role", "Course", "Batch",
                  "Attendance Status", "In Time", "Out Time", "Notes / Remarks", "Marked By"]
    update_or_create_worksheet(spreadsheet, "Daily Attendance", att_header, att_rows)

    # 2. Members Directory (Students & Staff)
    cursor.execute("""
    SELECT code, name, role, course, batch, department,
           COALESCE(phone, '-') as phone, COALESCE(email, '-') as email,
           COALESCE(parentName, '-') as parentName, COALESCE(parentPhone, '-') as parentPhone,
           COALESCE(parentEmail, '-') as parentEmail, status
    FROM Member
    ORDER BY role ASC, name ASC
    """)
    member_rows = [[r["code"], r["name"], r["role"], r["course"], r["batch"], r["department"],
                    r["phone"], r["email"], r["parentName"], r["parentPhone"], r["parentEmail"], r["status"]]
                   for r in cursor.fetchall()]
    member_header = ["Code", "Full Name", "Role", "Course", "Batch", "Department",
                     "Phone", "Email", "Parent Name", "Parent Phone", "Parent Email", "Active Status"]
    update_or_create_worksheet(spreadsheet, "Members Directory", member_header, member_rows)

    # 3. Leave Requests & Approvals
    cursor.execute("""
    SELECT lr.id, lr.studentName, m.code, lr.course, lr.batch, lr.leaveType,
           lr.startDate, lr.endDate, lr.reason, lr.status,
           COALESCE(lr.reviewedBy, '-') as reviewedBy, COALESCE(lr.adminRemarks, '-') as adminRemarks,
           lr.appliedAt
    FROM LeaveRequest lr
    JOIN Member m ON lr.memberId = m.id
    ORDER BY lr.appliedAt DESC
    """)
    leave_rows = [[r["id"], r["studentName"], r["code"], r["course"], r["batch"], r["leaveType"],
                   r["startDate"], r["endDate"], r["reason"], r["status"], r["reviewedBy"], r["adminRemarks"], r["appliedAt"]]
                  for r in cursor.fetchall()]
    leave_header = ["Application ID", "Student Name", "Code", "Course", "Batch", "Leave Type",
                    "From Date", "To Date", "Reason", "Status", "Reviewed By", "Admin Remarks", "Applied At"]
    update_or_create_worksheet(spreadsheet, "Leave Applications", leave_header, leave_rows)

    # 4. Portions Covered
    cursor.execute("""
    SELECT date, course, batch, subject, topic, COALESCE(remarks, '-') as remarks, conductedBy
    FROM PortionCovered
    ORDER BY date DESC
    """)
    portion_rows = [[r["date"], r["course"], r["batch"], r["subject"], r["topic"], r["remarks"], r["conductedBy"]]
                    for r in cursor.fetchall()]
    portion_header = ["Date", "Course", "Batch", "Subject", "Topic Covered", "Remarks", "Conducted By / Faculty"]
    update_or_create_worksheet(spreadsheet, "Portions Covered", portion_header, portion_rows)

    # 5. Attendance KPI Summary
    cursor.execute("SELECT id, name, code, role, course, batch FROM Member WHERE status = 'ACTIVE' ORDER BY name ASC")
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
        kpi_status = "Good Standing" if rate >= 75.0 else "Action Required (<75%)"
        summary_rows.append([m["code"], m["name"], m["role"], m["course"], m["batch"],
                             total_held, p_cnt, a_cnt, h_cnt, f"{rate}%", kpi_status])

    summary_header = ["Member Code", "Name", "Role", "Course", "Batch",
                      "Total Classes", "Present Days", "Absent Days", "Holiday/Leave Days", "Attendance Rate", "Standing"]
    update_or_create_worksheet(spreadsheet, "Attendance KPI Summary", summary_header, summary_rows)

    # Clean default "Sheet1" if present
    try:
        sheet1 = spreadsheet.worksheet("Sheet1")
        if len(spreadsheet.worksheets()) > 1:
            spreadsheet.del_worksheet(sheet1)
    except Exception:
        pass

    total_records = len(att_rows) + len(member_rows) + len(leave_rows) + len(summary_rows)
    sheet_url = spreadsheet.url
    sheet_id = spreadsheet.id
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_msg = f"Synced {total_records} records across 4 Master Sheets (Attendance, Members, Leaves, KPIs) at {now_str}."

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

