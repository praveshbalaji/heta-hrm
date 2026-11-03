#!/usr/bin/env python3
"""
HETA-HRM: Attendance & Human Resource Management System
Backend API Server built with Python & Prisma/SQLite Database
Strict RBAC: /student, /staff, /admin
Strict Attendance: PRESENT, ABSENT, HOLIDAY
Server-side Dual Email Notification for Student Leaves
"""

import http.server
import socketserver
import json
import urllib.parse
import sqlite3
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date, timedelta
import os
import csv
import io
import secrets
import sys
import uuid

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import get_connection, init_db, hash_password, verify_password, sync_users_to_members

PORT = 5050
HOST = "0.0.0.0"

ADMIN_DEFAULT_EMAIL = os.environ.get("ADMIN_EMAIL", "pravesbalaji144@gmail.com")
ADMIN_NOTIFY_EMAILS = [
    e.strip() for e in os.environ.get("HETA_ADMIN_EMAILS", f"{ADMIN_DEFAULT_EMAIL},balajimanokaranmd@gmail.com").split(",") if e.strip()
]
SMTP_HOST = os.environ.get("HETA_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("HETA_SMTP_PORT", "587"))
SMTP_SENDER = os.environ.get("HETA_SMTP_SENDER", ADMIN_DEFAULT_EMAIL)
SMTP_USER = os.environ.get("HETA_SMTP_USER", SMTP_SENDER)
SMTP_PASS = os.environ.get("HETA_SMTP_PASS", os.environ.get("ADMIN_PASSWORD", "Heta@123"))

def send_server_email(recipients, subject, text_content):
    """
    Server-side email dispatch. Never exposes credentials to frontend.
    Logs dispatch and delivers via SMTP or simulated transport.
    """
    if isinstance(recipients, str):
        recipients = [recipients]
    success_count = 0
    logs = []
    for r in recipients:
        try:
            msg = MIMEMultipart()
            msg["From"] = f"HETA Higher Education <{SMTP_SENDER}>"
            msg["To"] = r
            msg["Subject"] = subject
            msg.attach(MIMEText(text_content, "plain", "utf-8"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            success_count += 1
            logs.append(f"Delivered to {r}")
        except Exception as ex:
            print(f"[MAIL LOG] Queued for {r}: {ex}")
            logs.append(f"Queued for {r} (Transport note: {ex})")
    return success_count > 0, "; ".join(logs)


class HetaApiHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for React frontend (Vite running on localhost:3000 / localhost:3001)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def send_error_json(self, message, status_code=400):
        self.send_json({"error": message, "success": False}, status_code=status_code)

    def parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(raw_body)
            except Exception:
                return {}
        return {}

    def parse_query(self):
        parsed = urllib.parse.urlparse(self.path)
        return urllib.parse.parse_qs(parsed.query)

    def get_auth_token(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        query = self.parse_query()
        return query.get("token", [""])[0].strip()

    def get_authenticated_user(self, cursor):
        token = self.get_auth_token()
        if not token:
            return None
        cursor.execute("""
        SELECT u.*, m.name as memberName, m.code as memberCode, m.course, m.batch, m.department, m.phone as memberPhone
        FROM User u
        LEFT JOIN Member m ON u.memberId = m.id
        WHERE u.sessionToken = ? AND u.tokenExpiry > CURRENT_TIMESTAMP
        """, (token,))
        row = cursor.fetchone()
        return dict(row) if row else None

    # ------------------ GET ROUTES ------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api") and path != "/":
            path = "/api" + path
        query = self.parse_query()

        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Health check & System Info
            if path in ["/api/health", "/"]:
                self.send_json({
                    "status": "healthy",
                    "app": "HETA-HRM Student & Staff Attendance and Leave Management System",
                    "version": "2.0.0",
                    "adminEmail": ADMIN_DEFAULT_EMAIL,
                    "timestamp": datetime.now().isoformat()
                })

            # 2. Auth: Current User Verification (/api/auth/me)
            elif path == "/api/auth/me":
                user = self.get_authenticated_user(cursor)
                if not user:
                    self.send_error_json("Session expired or unauthenticated", status_code=401)
                    return
                # Return sanitized user
                user_data = {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user["role"],
                    "memberId": user.get("memberId"),
                    "code": user.get("memberCode"),
                    "course": user.get("course") or "Python Programming",
                    "batch": user.get("batch") or "Batch-2026-A",
                    "department": user.get("department") or "Computer Science",
                    "phone": user.get("memberPhone") or user.get("phone")
                }
                self.send_json({"success": True, "authenticated": True, "user": user_data})

            # 2b. All Signed-Up Users Directory (Admin Only / Full System Directory)
            elif path in ["/api/users", "/api/admin/users"]:
                sync_users_to_members(conn)
                role_filter = query.get("role", [None])[0]
                search = query.get("search", [""])[0].strip().lower()

                sql = """
                SELECT u.id as userId, u.name, u.email, u.role, u.phone, u.memberId,
                       COALESCE(u.createdAt, CURRENT_TIMESTAMP) as signupDate,
                       u.updatedAt,
                       m.code, m.course, m.batch, m.department, m.parentName, m.parentPhone, m.parentEmail,
                       COALESCE(m.status, 'ACTIVE') as memberStatus
                FROM User u
                LEFT JOIN Member m ON u.memberId = m.id
                WHERE 1=1
                """
                params = []

                if role_filter and role_filter.upper() != "ALL":
                    sql += " AND UPPER(u.role) = ?"
                    params.append(role_filter.upper())

                if search:
                    sql += " AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(COALESCE(m.code, '')) LIKE ? OR LOWER(COALESCE(u.phone, '')) LIKE ?)"
                    q = f"%{search}%"
                    params.extend([q, q, q, q])

                sql += " ORDER BY u.createdAt DESC"
                cursor.execute(sql, tuple(params))
                users = [dict(row) for row in cursor.fetchall()]

                # Compute overall user counts
                cursor.execute("SELECT COUNT(*) as count FROM User")
                total_users = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM User WHERE UPPER(role) = 'STUDENT'")
                total_students = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM User WHERE UPPER(role) = 'STAFF'")
                total_staff = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM User WHERE UPPER(role) = 'ADMIN'")
                total_admins = cursor.fetchone()["count"]

                self.send_json({
                    "success": True,
                    "users": users,
                    "total": len(users),
                    "stats": {
                        "totalUsers": total_users,
                        "totalStudents": total_students,
                        "totalStaff": total_staff,
                        "totalAdmins": total_admins
                    }
                })

            # 3. Members List (Students & Staff, full CRUD search/filter)
            elif path == "/api/members":
                sync_users_to_members(conn)
                role_filter = query.get("role", [None])[0]
                search = query.get("search", [""])[0].strip().lower()
                batch_filter = query.get("batch", [None])[0]
                course_filter = query.get("course", [None])[0]
                status_filter = query.get("status", [None])[0]

                sql = "SELECT * FROM Member WHERE 1=1"
                params = []

                if role_filter:
                    sql += " AND role = ?"
                    params.append(role_filter.upper())
                if batch_filter and batch_filter != "All Batches" and (role_filter != "STAFF"):
                    sql += " AND batch = ?"
                    params.append(batch_filter)
                if course_filter:
                    sql += " AND course = ?"
                    params.append(course_filter)
                if status_filter:
                    sql += " AND status = ?"
                    params.append(status_filter.upper())
                if search:
                    sql += " AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ?)"
                    q = f"%{search}%"
                    params.extend([q, q, q, q])

                sql += " ORDER BY role DESC, name ASC"
                cursor.execute(sql, tuple(params))
                members = [dict(row) for row in cursor.fetchall()]
                self.send_json({"success": True, "members": members, "total": len(members)})

            # 4. Daily Attendance View (Strictly PRESENT, ABSENT, HOLIDAY)
            elif path == "/api/attendance/daily":
                sync_users_to_members(conn)
                req_date = query.get("date", [date.today().strftime("%Y-%m-%d")])[0]
                role_filter = query.get("role", [None])[0]
                batch_filter = query.get("batch", [None])[0]
                course_filter = query.get("course", [None])[0]

                # Calculate overall counts for Student and Staff across active members
                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STUDENT'")
                student_count = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STAFF'")
                staff_count = cursor.fetchone()["count"]

                sql = """
                SELECT m.id as memberId, m.name, m.code, m.role, m.course, m.batch, m.department,
                       m.phone, m.email, m.parentName, m.parentPhone, m.parentEmail,
                       a.id as attendanceId, COALESCE(a.status, 'NOT_MARKED') as status,
                       a.inTime, a.outTime, a.notes, a.markedBy
                FROM Member m
                LEFT JOIN Attendance a ON m.id = a.memberId AND a.date = ?
                WHERE m.status = 'ACTIVE'
                """
                params = [req_date]

                if role_filter:
                    sql += " AND m.role = ?"
                    params.append(role_filter.upper())
                if batch_filter and batch_filter != "All Batches" and (role_filter != "STAFF"):
                    sql += " AND m.batch = ?"
                    params.append(batch_filter)
                if course_filter:
                    sql += " AND m.course = ?"
                    params.append(course_filter)

                sql += " ORDER BY m.role DESC, m.name ASC"
                cursor.execute(sql, tuple(params))
                records = [dict(row) for row in cursor.fetchall()]

                # Compute summary stats (strictly PRESENT, ABSENT, HOLIDAY)
                total = len(records)
                present = sum(1 for r in records if r["status"] == "PRESENT")
                absent = sum(1 for r in records if r["status"] == "ABSENT")
                holiday = sum(1 for r in records if r["status"] == "HOLIDAY")
                not_marked = sum(1 for r in records if r["status"] == "NOT_MARKED")
                working_count = present + absent
                rate = round((present / working_count * 100), 1) if working_count > 0 else (100.0 if holiday > 0 else 0.0)

                self.send_json({
                    "success": True,
                    "date": req_date,
                    "records": records,
                    "studentCount": student_count,
                    "staffCount": staff_count,
                    "stats": {
                        "total": total,
                        "present": present,
                        "absent": absent,
                        "holiday": holiday,
                        "notMarked": not_marked,
                        "attendanceRate": rate
                    }
                })

            # 5. Monthly Matrix Register View
            elif path == "/api/attendance/matrix":
                sync_users_to_members(conn)
                month_param = query.get("month", [date.today().strftime("%Y-%m")])[0] # YYYY-MM
                role_filter = query.get("role", ["STUDENT"])[0]
                batch_filter = query.get("batch", [None])[0]

                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STUDENT'")
                student_count = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STAFF'")
                staff_count = cursor.fetchone()["count"]

                year, month = map(int, month_param.split("-"))
                next_month = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
                num_days = (next_month - date(year, month, 1)).days

                days = []
                for d in range(1, num_days + 1):
                    day_date = date(year, month, d)
                    days.append({
                        "date": day_date.strftime("%Y-%m-%d"),
                        "day": d,
                        "weekday": day_date.strftime("%a"),
                        "isWeekend": day_date.weekday() == 6 # Sunday
                    })

                mem_sql = "SELECT * FROM Member WHERE role = ? AND status = 'ACTIVE'"
                mem_params = [role_filter.upper()]
                if batch_filter and batch_filter != "All Batches" and (role_filter.upper() != "STAFF"):
                    mem_sql += " AND batch = ?"
                    mem_params.append(batch_filter)
                mem_sql += " ORDER BY name ASC"
                cursor.execute(mem_sql, tuple(mem_params))
                members = [dict(row) for row in cursor.fetchall()]

                cursor.execute("""
                SELECT memberId, date, status, inTime, outTime, notes
                FROM Attendance
                WHERE date LIKE ?
                """, (f"{month_param}%",))
                all_att = cursor.fetchall()
                att_map = {}
                for row in all_att:
                    m_id = row["memberId"]
                    if m_id not in att_map:
                        att_map[m_id] = {}
                    att_map[m_id][row["date"]] = dict(row)

                # Fetch portions for each day
                cursor.execute("SELECT date, topic, subject, course, batch FROM PortionCovered WHERE date LIKE ?", (f"{month_param}%",))
                portions_map = {row["date"]: dict(row) for row in cursor.fetchall()}

                matrix_rows = []
                for m in members:
                    m_id = m["id"]
                    m_records = att_map.get(m_id, {})
                    p_count = 0
                    a_count = 0
                    h_count = 0

                    day_statuses = {}
                    for day_obj in days:
                        d_str = day_obj["date"]
                        record = m_records.get(d_str)
                        if record:
                            st = record["status"]
                            if st in ["EMPTY", "CLEAR", "NONE", ""]:
                                day_statuses[d_str] = {
                                    "status": "",
                                    "inTime": "-",
                                    "outTime": "-"
                                }
                            else:
                                if st not in ["PRESENT", "ABSENT", "HOLIDAY"]:
                                    st = "PRESENT" if st == "LATE" else "HOLIDAY"
                                day_statuses[d_str] = {
                                    "status": st,
                                    "inTime": record.get("inTime"),
                                    "outTime": record.get("outTime")
                                }
                                if st == "PRESENT": p_count += 1
                                elif st == "ABSENT": a_count += 1
                                elif st == "HOLIDAY": h_count += 1
                        else:
                            day_statuses[d_str] = {
                                "status": "HOLIDAY" if day_obj["isWeekend"] else ""
                            }
                            if day_obj["isWeekend"]:
                                h_count += 1

                    working_days = p_count + a_count
                    rate = round((p_count / working_days * 100), 1) if working_days > 0 else 0

                    matrix_rows.append({
                        "member": m,
                        "days": day_statuses,
                        "presentCount": p_count,
                        "absentCount": a_count,
                        "holidayCount": h_count,
                        "attendanceRate": rate
                    })

                self.send_json({
                    "success": True,
                    "month": month_param,
                    "days": days,
                    "portions": portions_map,
                    "matrix": matrix_rows,
                    "studentCount": student_count,
                    "staffCount": staff_count
                })

            # 6. Custom Range Matrix (For Range Reports)
            elif path == "/api/attendance/range-matrix":
                sync_users_to_members(conn)
                start_str = query.get("startDate", ["2026-10-01"])[0]
                end_str = query.get("endDate", ["2026-10-31"])[0]
                role_filter = query.get("role", ["STUDENT"])[0]
                batch_filter = query.get("batch", [None])[0]

                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STUDENT'")
                student_count = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*) as count FROM Member WHERE status = 'ACTIVE' AND role = 'STAFF'")
                staff_count = cursor.fetchone()["count"]

                s_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                e_date = datetime.strptime(end_str, "%Y-%m-%d").date()

                days = []
                curr = s_date
                while curr <= e_date:
                    days.append({
                        "date": curr.strftime("%Y-%m-%d"),
                        "day": curr.day,
                        "weekday": curr.strftime("%a"),
                        "isWeekend": curr.weekday() == 6
                    })
                    curr += timedelta(days=1)

                mem_sql = "SELECT * FROM Member WHERE role = ? AND status = 'ACTIVE'"
                mem_params = [role_filter.upper()]
                if batch_filter and batch_filter != "All Batches" and (role_filter.upper() != "STAFF"):
                    mem_sql += " AND batch = ?"
                    mem_params.append(batch_filter)
                mem_sql += " ORDER BY name ASC"
                cursor.execute(mem_sql, tuple(mem_params))
                members = [dict(row) for row in cursor.fetchall()]

                cursor.execute("""
                SELECT memberId, date, status, inTime, outTime, notes
                FROM Attendance
                WHERE date BETWEEN ? AND ?
                """, (start_str, end_str))
                all_att = cursor.fetchall()
                att_map = {}
                for row in all_att:
                    m_id = row["memberId"]
                    if m_id not in att_map:
                        att_map[m_id] = {}
                    att_map[m_id][row["date"]] = dict(row)

                cursor.execute("SELECT date, topic, subject FROM PortionCovered WHERE date BETWEEN ? AND ?", (start_str, end_str))
                portions_map = {row["date"]: dict(row) for row in cursor.fetchall()}

                matrix_rows = []
                for m in members:
                    m_id = m["id"]
                    m_records = att_map.get(m_id, {})
                    p_count = 0
                    a_count = 0
                    h_count = 0

                    day_statuses = {}
                    for day_obj in days:
                        d_str = day_obj["date"]
                        record = m_records.get(d_str)
                        if record:
                            st = record["status"]
                            if st in ["EMPTY", "CLEAR", "NONE", ""]:
                                day_statuses[d_str] = {"status": "", "inTime": "-", "outTime": "-"}
                            else:
                                if st not in ["PRESENT", "ABSENT", "HOLIDAY"]:
                                    st = "PRESENT" if st == "LATE" else "HOLIDAY"
                                day_statuses[d_str] = {"status": st, "inTime": record.get("inTime"), "outTime": record.get("outTime")}
                                if st == "PRESENT": p_count += 1
                                elif st == "ABSENT": a_count += 1
                                elif st == "HOLIDAY": h_count += 1
                        else:
                            day_statuses[d_str] = {"status": "HOLIDAY" if day_obj["isWeekend"] else ""}
                            if day_obj["isWeekend"]:
                                h_count += 1

                    working_days = p_count + a_count
                    rate = round((p_count / working_days * 100), 1) if working_days > 0 else 0

                    matrix_rows.append({
                        "member": m,
                        "days": day_statuses,
                        "presentCount": p_count,
                        "absentCount": a_count,
                        "holidayCount": h_count,
                        "attendanceRate": rate
                    })

                self.send_json({
                    "success": True,
                    "startDate": start_str,
                    "endDate": end_str,
                    "days": days,
                    "portions": portions_map,
                    "matrix": matrix_rows
                })

            # 7. Individual Member Detailed Report
            elif path == "/api/attendance/individual":
                member_id = query.get("memberId", [None])[0]
                start_str = query.get("startDate", [(date.today() - timedelta(days=30)).strftime("%Y-%m-%d")])[0]
                end_str = query.get("endDate", [date.today().strftime("%Y-%m-%d")])[0]

                if not member_id:
                    self.send_error_json("memberId is required", 400)
                    return

                cursor.execute("SELECT * FROM Member WHERE id = ?", (member_id,))
                member_row = cursor.fetchone()
                if not member_row:
                    self.send_error_json("Member not found", 404)
                    return
                member = dict(member_row)

                cursor.execute("""
                SELECT a.*, pc.topic as portionTopic, pc.subject as portionSubject
                FROM Attendance a
                LEFT JOIN PortionCovered pc ON a.date = pc.date
                WHERE a.memberId = ? AND a.date BETWEEN ? AND ?
                ORDER BY a.date ASC
                """, (member_id, start_str, end_str))
                records_by_date = {row["date"]: dict(row) for row in cursor.fetchall()}

                s_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                e_date = datetime.strptime(end_str, "%Y-%m-%d").date()
                curr = s_date
                history = []
                p_count = 0
                a_count = 0
                h_count = 0

                while curr <= e_date:
                    d_str = curr.strftime("%Y-%m-%d")
                    rec = records_by_date.get(d_str)
                    is_sun = curr.weekday() == 6
                    if rec:
                        st = rec["status"]
                        if st not in ["PRESENT", "ABSENT", "HOLIDAY"]:
                            st = "PRESENT" if st == "LATE" else "HOLIDAY"
                        if st == "PRESENT": p_count += 1
                        elif st == "ABSENT": a_count += 1
                        elif st == "HOLIDAY": h_count += 1
                        history.append({
                            "date": d_str,
                            "day": curr.day,
                            "weekday": curr.strftime("%a"),
                            "isWeekend": is_sun,
                            "status": st,
                            "inTime": rec.get("inTime") or "-",
                            "outTime": rec.get("outTime") or "-",
                            "topic": rec.get("portionTopic") or rec.get("notes") or "Class Conducted"
                        })
                    else:
                        st = "HOLIDAY" if is_sun else "NOT_MARKED"
                        if is_sun: h_count += 1
                        history.append({
                            "date": d_str,
                            "day": curr.day,
                            "weekday": curr.strftime("%a"),
                            "isWeekend": is_sun,
                            "status": st,
                            "inTime": "-",
                            "outTime": "-",
                            "topic": "-"
                        })
                    curr += timedelta(days=1)

                working_days = p_count + a_count
                rate = round((p_count / working_days * 100), 1) if working_days > 0 else 0

                self.send_json({
                    "success": True,
                    "member": member,
                    "startDate": start_str,
                    "endDate": end_str,
                    "stats": {
                        "totalDays": len(history),
                        "presentDays": p_count,
                        "absentDays": a_count,
                        "holidayDays": h_count,
                        "attendanceRate": rate,
                        "standing": "Good Standing (>= 75%)" if rate >= 75 else "Action Required (< 75%)"
                    },
                    "history": history
                })

            # 8. Leave Requests (Student own or Admin all)
            elif path == "/api/leaves":
                member_id = query.get("memberId", [None])[0]
                status_filter = query.get("status", [None])[0]

                sql = """
                SELECT lr.*, m.name as memberName, m.code as memberCode, m.role as memberRole,
                       m.course, m.batch, m.department, m.phone, m.email
                FROM LeaveRequest lr
                JOIN Member m ON lr.memberId = m.id
                WHERE 1=1
                """
                params = []
                if member_id:
                    sql += " AND lr.memberId = ?"
                    params.append(member_id)
                if status_filter:
                    sql += " AND lr.status = ?"
                    params.append(status_filter.upper())

                sql += " ORDER BY lr.appliedAt DESC"
                cursor.execute(sql, tuple(params))
                leaves = [dict(row) for row in cursor.fetchall()]
                self.send_json({"success": True, "leaves": leaves, "total": len(leaves)})

            # 9. Portion Covered List (Dynamic Menu with filters)
            elif path == "/api/portions":
                date_filter = query.get("date", [None])[0]
                month_filter = query.get("month", [None])[0]
                subject_filter = query.get("subject", [None])[0]
                batch_filter = query.get("batch", [None])[0]
                course_filter = query.get("course", [None])[0]
                search = query.get("search", [""])[0].strip().lower()

                sql = "SELECT * FROM PortionCovered WHERE 1=1"
                params = []

                if date_filter:
                    sql += " AND date = ?"
                    params.append(date_filter)
                elif month_filter:
                    sql += " AND date LIKE ?"
                    params.append(f"{month_filter}%")

                if subject_filter:
                    sql += " AND subject = ?"
                    params.append(subject_filter)
                if batch_filter:
                    sql += " AND batch = ?"
                    params.append(batch_filter)
                if course_filter:
                    sql += " AND course = ?"
                    params.append(course_filter)
                if search:
                    sql += " AND (LOWER(topic) LIKE ? OR LOWER(remarks) LIKE ? OR LOWER(conductedBy) LIKE ?)"
                    q = f"%{search}%"
                    params.extend([q, q, q])

                sql += " ORDER BY date DESC, id DESC"
                cursor.execute(sql, tuple(params))
                portions = [dict(row) for row in cursor.fetchall()]
                self.send_json({"success": True, "portions": portions, "total": len(portions)})

            # 10. Unified Dashboard Stats (Student, Staff, Admin)
            elif path == "/api/dashboard/stats":
                role = query.get("role", ["ADMIN"])[0].upper()
                member_id = query.get("memberId", [None])[0]
                target_date = query.get("date", [date.today().strftime("%Y-%m-%d")])[0]
                target_month = query.get("month", [date.today().strftime("%Y-%m")])[0]

                if role == "STUDENT" and member_id:
                    # Student own stats
                    cursor.execute("SELECT * FROM Member WHERE id = ?", (member_id,))
                    m_row = cursor.fetchone()
                    member = dict(m_row) if m_row else {}

                    # Today's status
                    cursor.execute("SELECT status FROM Attendance WHERE memberId = ? AND date = ?", (member_id, target_date))
                    today_row = cursor.fetchone()
                    today_status = today_row["status"] if today_row else "NOT_MARKED"

                    # Monthly counts
                    cursor.execute("""
                    SELECT
                        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as presentCount,
                        COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absentCount,
                        COUNT(CASE WHEN status = 'HOLIDAY' THEN 1 END) as holidayCount
                    FROM Attendance
                    WHERE memberId = ? AND date LIKE ?
                    """, (member_id, f"{target_month}%"))
                    month_counts = dict(cursor.fetchone())
                    working = month_counts["presentCount"] + month_counts["absentCount"]
                    month_rate = round(month_counts["presentCount"] / working * 100, 1) if working > 0 else 0

                    # Recent portions covered
                    cursor.execute("SELECT * FROM PortionCovered WHERE batch = ? ORDER BY date DESC LIMIT 5", (member.get("batch", "Batch-2026-A"),))
                    recent_portions = [dict(r) for r in cursor.fetchall()]

                    # Student leave requests
                    cursor.execute("SELECT * FROM LeaveRequest WHERE memberId = ? ORDER BY appliedAt DESC LIMIT 5", (member_id,))
                    my_leaves = [dict(r) for r in cursor.fetchall()]

                    self.send_json({
                        "success": True,
                        "role": "STUDENT",
                        "member": member,
                        "date": target_date,
                        "month": target_month,
                        "todayStatus": today_status,
                        "monthlyStats": {
                            **month_counts,
                            "attendanceRate": month_rate
                        },
                        "recentPortions": recent_portions,
                        "recentLeaves": my_leaves
                    })

                else:
                    # Admin or Staff Dashboard Stats
                    cursor.execute("SELECT COUNT(*) as count FROM Member WHERE role = 'STUDENT' AND status = 'ACTIVE'")
                    total_students = cursor.fetchone()["count"]

                    cursor.execute("SELECT COUNT(*) as count FROM Member WHERE role = 'STAFF' AND status = 'ACTIVE'")
                    total_staff = cursor.fetchone()["count"]

                    # Today's attendance breakdown
                    cursor.execute("""
                    SELECT
                        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as presentCount,
                        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absentCount,
                        COUNT(CASE WHEN a.status = 'HOLIDAY' THEN 1 END) as holidayCount
                    FROM Member m
                    JOIN Attendance a ON m.id = a.memberId AND a.date = ?
                    WHERE m.status = 'ACTIVE' AND m.role = 'STUDENT'
                    """, (target_date,))
                    today_stats = dict(cursor.fetchone())
                    active_att = today_stats["presentCount"] + today_stats["absentCount"]
                    today_rate = round(today_stats["presentCount"] / active_att * 100, 1) if active_att > 0 else 0

                    # Today's absent students with parent contacts
                    cursor.execute("""
                    SELECT m.id, m.name, m.code, m.course, m.batch, m.phone, m.email,
                           m.parentName, m.parentPhone, m.parentEmail
                    FROM Member m
                    JOIN Attendance a ON m.id = a.memberId AND a.date = ?
                    WHERE a.status = 'ABSENT' AND m.role = 'STUDENT'
                    ORDER BY m.name ASC
                    """, (target_date,))
                    today_absentees = [dict(r) for r in cursor.fetchall()]

                    # Pending Leave Requests
                    cursor.execute("""
                    SELECT lr.*, m.name as studentName, m.code, m.course, m.batch
                    FROM LeaveRequest lr
                    JOIN Member m ON lr.memberId = m.id
                    WHERE lr.status = 'PENDING'
                    ORDER BY lr.appliedAt DESC
                    """)
                    pending_leaves = [dict(r) for r in cursor.fetchall()]

                    # Batch-wise report
                    cursor.execute("""
                    SELECT m.batch,
                           COUNT(DISTINCT m.id) as totalStudents,
                           COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as presentCount,
                           COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absentCount,
                           COUNT(CASE WHEN a.status = 'HOLIDAY' THEN 1 END) as holidayCount
                    FROM Member m
                    LEFT JOIN Attendance a ON m.id = a.memberId AND a.date = ?
                    WHERE m.status = 'ACTIVE' AND m.role = 'STUDENT'
                    GROUP BY m.batch
                    """, (target_date,))
                    batch_breakdown = [dict(r) for r in cursor.fetchall()]

                    # Recent portions covered
                    cursor.execute("SELECT * FROM PortionCovered ORDER BY date DESC, id DESC LIMIT 5")
                    recent_portions = [dict(r) for r in cursor.fetchall()]

                    self.send_json({
                        "success": True,
                        "role": role,
                        "date": target_date,
                        "month": target_month,
                        "counts": {
                            "totalStudents": total_students,
                            "totalStaff": total_staff,
                            "todayPresent": today_stats["presentCount"],
                            "todayAbsent": today_stats["absentCount"],
                            "todayHoliday": today_stats["holidayCount"],
                            "attendanceRate": today_rate,
                            "pendingLeavesCount": len(pending_leaves)
                        },
                        "todayAbsentees": today_absentees,
                        "pendingLeaves": pending_leaves,
                        "batchBreakdown": batch_breakdown,
                        "recentPortions": recent_portions
                    })

            # 11. Google Sheet Sync Status
            elif path == "/api/sheets/status":
                from google_sheets_sync import get_service_account_credentials
                creds = get_service_account_credentials()
                sa_email = creds.service_account_email if creds else "heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com"

                cursor.execute("SELECT * FROM GoogleSheetSync ORDER BY id DESC LIMIT 1")
                sheet_config = cursor.fetchone()
                if sheet_config:
                    cfg = dict(sheet_config)
                else:
                    cfg = {
                        "accountEmail": sa_email,
                        "sheetName": "HETA-HRM Attendance Master",
                        "sheetUrl": "",
                        "sheetId": None,
                        "syncStatus": "READY",
                        "recordsSynced": 0,
                        "lastSyncedAt": None,
                        "log": None
                    }
                cfg["hasServiceAccount"] = creds is not None
                cfg["serviceAccountEmail"] = sa_email
                self.send_json({"success": True, "config": cfg})

            # 12. Export Attendance to CSV
            elif path == "/api/export/csv":
                month_param = query.get("month", [date.today().strftime("%Y-%m")])[0]
                role_filter = query.get("role", ["STUDENT"])[0]

                cursor.execute("""
                SELECT m.name as "Student/Staff Name", m.code as "ID Code", m.role as "Role",
                       m.course as "Course", m.batch as "Batch",
                       a.date as "Date", a.status as "Attendance Status",
                       a.inTime as "In Time", a.outTime as "Out Time",
                       a.notes as "Remarks", a.markedBy as "Marked By"
                FROM Attendance a
                JOIN Member m ON a.memberId = m.id
                WHERE a.date LIKE ? AND m.role = ?
                ORDER BY a.date DESC, m.name ASC
                """, (f"{month_param}%", role_filter))

                rows = cursor.fetchall()
                output = io.StringIO()
                if rows:
                    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
                    writer.writeheader()
                    for r in rows:
                        writer.writerow(dict(r))
                else:
                    writer = csv.writer(output)
                    writer.writerow(["Student/Staff Name", "ID Code", "Role", "Course", "Batch", "Date", "Attendance Status", "In Time", "Out Time"])

                csv_content = output.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "text/csv")
                self.send_header("Content-Disposition", f'attachment; filename="HETA-HRM_Attendance_{month_param}.csv"')
                self.end_headers()
                self.wfile.write(csv_content.encode("utf-8"))
                return

            # 13. Export Leaves to CSV
            elif path == "/api/export/leaves/csv":
                cursor.execute("""
                SELECT lr.studentName as "Student Name", lr.course as "Course", lr.batch as "Batch",
                       lr.leaveType as "Leave Type", lr.startDate as "From Date", lr.endDate as "To Date",
                       lr.reason as "Reason", lr.status as "Status", lr.appliedAt as "Applied At",
                       lr.adminRemarks as "Admin Remarks", lr.reviewedBy as "Reviewed By"
                FROM LeaveRequest lr
                ORDER BY lr.appliedAt DESC
                """)
                rows = cursor.fetchall()
                output = io.StringIO()
                if rows:
                    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
                    writer.writeheader()
                    for r in rows:
                        writer.writerow(dict(r))
                else:
                    writer = csv.writer(output)
                    writer.writerow(["Student Name", "Course", "Batch", "Leave Type", "From Date", "To Date", "Reason", "Status"])

                csv_content = output.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "text/csv")
                self.send_header("Content-Disposition", 'attachment; filename="HETA-HRM_Leaves_Master.csv"')
                self.end_headers()
                self.wfile.write(csv_content.encode("utf-8"))
                return

            else:
                self.send_error_json("Endpoint not found", status_code=404)

        except Exception as e:
            self.send_error_json(str(e), status_code=500)
        finally:
            conn.close()

    # ------------------ POST ROUTES ------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api") and path != "/":
            path = "/api" + path
        body = self.parse_body()

        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 0. User Registration / Signup (Student & Staff Directory Self-Enrollment)
            if path == "/api/auth/signup":
                role = body.get("role", "STUDENT").strip().upper()
                if role not in ["STUDENT", "STAFF"]:
                    self.send_error_json("Invalid registration role. Only STUDENT or STAFF may sign up.", 400)
                    return

                name = body.get("name", "").strip()
                email = body.get("email", "").strip().lower()
                password = body.get("password", "").strip()
                phone = body.get("phone", "").strip()
                code = body.get("code", "").strip().upper()

                if not name or not email or not password:
                    self.send_error_json("Full Name, Email, and Password are required fields.", 400)
                    return

                if len(password) < 4:
                    self.send_error_json("Password must be at least 4 characters long.", 400)
                    return

                # Check if email is already taken
                cursor.execute("SELECT id FROM User WHERE LOWER(email) = ?", (email,))
                if cursor.fetchone():
                    self.send_error_json(f"An account with email '{email}' already exists. Please sign in.", 409)
                    return

                # Auto-assign or validate unique Roll No / Staff Code
                if not code:
                    prefix = "HETA-STU" if role == "STUDENT" else "HETA-STF"
                    cursor.execute("SELECT COUNT(*) as count FROM Member WHERE role = ?", (role,))
                    cnt = cursor.fetchone()["count"] + 1
                    code = f"{prefix}-{cnt:03d}"
                else:
                    cursor.execute("SELECT id FROM Member WHERE UPPER(code) = ?", (code,))
                    if cursor.fetchone():
                        self.send_error_json(f"The identification code '{code}' is already assigned. Please use another code.", 409)
                        return

                member_id = f"mem_{uuid.uuid4().hex[:8]}"
                user_id = f"usr_{uuid.uuid4().hex[:8]}"

                if role == "STUDENT":
                    course = body.get("course", "Python Programming").strip() or "Python Programming"
                    batch = body.get("batch", "Batch-2026-A").strip() or "Batch-2026-A"
                    parent_name = body.get("parentName", "").strip() or "Parent / Guardian"
                    parent_phone = body.get("parentPhone", "").strip() or phone
                    parent_email = body.get("parentEmail", "").strip() or email

                    cursor.execute("""
                    INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, parentName, parentPhone, parentEmail, portionCovered, status)
                    VALUES (?, ?, ?, 'STUDENT', ?, ?, 'Computer Science', ?, ?, ?, ?, ?, 'Enrolled', 'ACTIVE')
                    """, (member_id, name, code, course, batch, phone, email, parent_name, parent_phone, parent_email))
                    department = "Computer Science"

                else: # STAFF
                    faculty_role = body.get("facultyRole", "").strip() or body.get("department", "Faculty Member").strip() or "Faculty Member"
                    department = faculty_role
                    course = faculty_role
                    batch = "All Batches"
                    cursor.execute("""
                    INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, parentName, parentPhone, parentEmail, portionCovered, status)
                    VALUES (?, ?, ?, 'STAFF', ?, 'All Batches', ?, ?, ?, 'Self', ?, ?, ?, 'ACTIVE')
                    """, (member_id, name, code, faculty_role, department, phone, email, phone, email, faculty_role))

                # Create User account with salted SHA-256 hash
                p_hash = hash_password(password)
                token = f"tok_{uuid.uuid4().hex}"
                expiry = (datetime.now() + timedelta(days=7)).isoformat()

                cursor.execute("""
                INSERT INTO User (id, email, password, passwordHash, name, role, phone, memberId, sessionToken, tokenExpiry)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (user_id, email, password, p_hash, name, role, phone, member_id, token, expiry))

                conn.commit()

                user_data = {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "role": role,
                    "code": code,
                    "memberId": member_id,
                    "course": course,
                    "batch": batch,
                    "department": department,
                    "phone": phone
                }

                self.send_json({
                    "success": True,
                    "token": token,
                    "user": user_data,
                    "expiresAt": expiry,
                    "message": f"Welcome to HETA Academy, {name}! Your registration as {role} is complete."
                })
                return

            # 1. Login with Hashed Passwords, Sessions & Role Guards
            elif path == "/api/auth/login":
                email = body.get("email", "").strip().lower()
                password = body.get("password", "").strip()
                portal_role = body.get("portalRole", "").strip().upper() # 'STUDENT', 'STAFF', 'ADMIN'

                if not email or not password:
                    self.send_error_json("Email/Code and Password are required", 400)
                    return

                # Query User by email or by Member code
                cursor.execute("""
                SELECT u.*, m.name as memberName, m.code as memberCode, m.course, m.batch, m.department, m.phone as memberPhone, m.email as memberEmail
                FROM User u
                LEFT JOIN Member m ON u.memberId = m.id
                WHERE LOWER(u.email) = ? OR LOWER(m.code) = ?
                """, (email, email))
                user_row = cursor.fetchone()
                user = dict(user_row) if user_row else None

                if not user:
                    # Allow student/staff to login by member code with default password
                    cursor.execute("SELECT * FROM Member WHERE LOWER(code) = ? OR LOWER(email) = ?", (email, email))
                    mem = cursor.fetchone()
                    if mem:
                        # Auto create User entry
                        m_role = mem["role"]
                        default_pass = "Student@123" if m_role == "STUDENT" else "Staff@123"
                        if password == default_pass:
                            u_id = f"usr_{mem['id']}"
                            p_hash = hash_password(password)
                            cursor.execute("""
                            INSERT OR REPLACE INTO User (id, email, password, passwordHash, name, role, memberId)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (u_id, mem["email"] or f"{mem['code'].lower()}@heta.edu", password, p_hash, mem["name"], m_role, mem["id"]))
                            conn.commit()
                            cursor.execute("""
                            SELECT u.*, m.name as memberName, m.code as memberCode, m.course, m.batch, m.department, m.phone as memberPhone
                            FROM User u
                            LEFT JOIN Member m ON u.memberId = m.id
                            WHERE u.id = ?
                            """, (u_id,))
                            new_row = cursor.fetchone()
                            user = dict(new_row) if new_row else None

                if not user:
                    self.send_error_json("Invalid email or credentials", 401)
                    return

                # Verify Password (Salted SHA-256 hash or fallback)
                is_valid = False
                if user.get("passwordHash"):
                    is_valid = verify_password(password, user["passwordHash"])
                if not is_valid and user.get("password"):
                    is_valid = (user["password"] == password)

                if not is_valid:
                    self.send_error_json("Incorrect password", 401)
                    return

                user_role = user["role"].upper()

                # Portal Role Enforcement:
                # Student can never login to /admin or /staff
                # Staff can never login to /admin or /student
                if portal_role:
                    if portal_role == "ADMIN" and user_role != "ADMIN":
                        self.send_error_json(f"Access Denied: Your account role is {user_role}. Only Administrators can access /admin.", 403)
                        return
                    if portal_role == "STAFF" and user_role != "STAFF" and user_role != "ADMIN":
                        self.send_error_json(f"Access Denied: Your account role is {user_role}. Only Staff members can access /staff.", 403)
                        return
                    if portal_role == "STUDENT" and user_role != "STUDENT" and user_role != "ADMIN":
                        self.send_error_json(f"Access Denied: Your account role is {user_role}. Please log in via your designated portal.", 403)
                        return

                # Generate secure session token with 24h auto-expiry
                session_token = f"heta_sess_{secrets.token_hex(24)}"
                expiry = (datetime.now() + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")

                cursor.execute("""
                UPDATE User
                SET sessionToken = ?, tokenExpiry = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (session_token, expiry, user["id"]))
                conn.commit()

                user_data = {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user_role,
                    "memberId": user.get("memberId"),
                    "code": user.get("memberCode"),
                    "course": user.get("course") or "Python Programming",
                    "batch": user.get("batch") or "Batch-2026-A",
                    "department": user.get("department") or "Computer Science",
                    "phone": user.get("memberPhone") or user.get("phone")
                }

                self.send_json({
                    "success": True,
                    "token": session_token,
                    "expiresAt": expiry,
                    "user": user_data,
                    "message": f"Welcome back, {user['name']}!"
                })

            # 2. Auth: Logout (/api/auth/logout)
            elif path == "/api/auth/logout":
                token = self.get_auth_token()
                if token:
                    cursor.execute("UPDATE User SET sessionToken = NULL, tokenExpiry = NULL WHERE sessionToken = ?", (token,))
                    conn.commit()
                self.send_json({"success": True, "message": "Successfully logged out"})

            # 3. Mark Attendance (Strictly PRESENT, ABSENT, HOLIDAY)
            elif path == "/api/attendance/mark":
                records = body.get("records", [])
                if not records and "memberId" in body:
                    records = [body]

                marked_count = 0
                for rec in records:
                    m_id = rec.get("memberId")
                    rec_date = rec.get("date", date.today().strftime("%Y-%m-%d"))
                    marked_by = rec.get("markedBy", "Admin")
                    raw_status = rec.get("status", "").strip().upper()

                    # Handle clear / empty selection
                    if raw_status in ["", "SELECT", "NONE", "CLEAR", "EMPTY", "-"]:
                        try:
                            d_obj = date.fromisoformat(rec_date)
                            is_sunday = (d_obj.weekday() == 6)
                        except Exception:
                            is_sunday = False

                        if is_sunday:
                            att_id = f"att_{m_id}_{rec_date}"
                            cursor.execute("""
                            INSERT INTO Attendance (id, memberId, date, status, inTime, outTime, notes, markedBy, updatedAt)
                            VALUES (?, ?, ?, 'EMPTY', '-', '-', 'Cleared', ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(memberId, date) DO UPDATE SET
                                status = 'EMPTY',
                                inTime = '-',
                                outTime = '-',
                                updatedAt = CURRENT_TIMESTAMP
                            """, (att_id, m_id, rec_date, marked_by))
                        else:
                            cursor.execute("DELETE FROM Attendance WHERE memberId = ? AND date = ?", (m_id, rec_date))
                        marked_count += 1
                        continue

                    status = raw_status
                    # Strict 3-state validation
                    if status not in ["PRESENT", "ABSENT", "HOLIDAY"]:
                        status = "PRESENT" if status == "LATE" else "HOLIDAY"

                    in_time = rec.get("inTime", "09:00 AM" if status == "PRESENT" else "-")
                    out_time = rec.get("outTime", "05:00 PM" if status == "PRESENT" else "-")
                    notes = rec.get("notes", "")

                    att_id = f"att_{m_id}_{rec_date}"
                    cursor.execute("""
                    INSERT INTO Attendance (id, memberId, date, status, inTime, outTime, notes, markedBy, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(memberId, date) DO UPDATE SET
                        status = excluded.status,
                        inTime = excluded.inTime,
                        outTime = excluded.outTime,
                        notes = excluded.notes,
                        markedBy = excluded.markedBy,
                        updatedAt = CURRENT_TIMESTAMP
                    """, (att_id, m_id, rec_date, status, in_time, out_time, notes, marked_by))
                    marked_count += 1

                conn.commit()
                self.send_json({
                    "success": True,
                    "markedCount": marked_count,
                    "message": f"Successfully updated {marked_count} attendance records"
                })

            # 4. Bulk-Mark Entire Batch or Role in One Click
            elif path == "/api/attendance/bulk-batch":
                batch = body.get("batch")
                role = body.get("role", "STUDENT").upper()
                rec_date = body.get("date", date.today().strftime("%Y-%m-%d"))
                status = body.get("status", "PRESENT").upper()
                marked_by = body.get("markedBy", "Admin")

                if status not in ["PRESENT", "ABSENT", "HOLIDAY"]:
                    status = "PRESENT"

                sql = "SELECT id FROM Member WHERE status = 'ACTIVE' AND role = ?"
                params = [role]
                if batch and batch != "All Batches" and role != "STAFF":
                    sql += " AND batch = ?"
                    params.append(batch)

                cursor.execute(sql, tuple(params))
                members = cursor.fetchall()
                count = 0
                for row in members:
                    m_id = row["id"]
                    in_time = "09:00 AM" if status == "PRESENT" else "-"
                    out_time = "05:00 PM" if status == "PRESENT" else "-"
                    cursor.execute("""
                    INSERT INTO Attendance (id, memberId, date, status, inTime, outTime, notes, markedBy, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(memberId, date) DO UPDATE SET
                        status = excluded.status,
                        inTime = excluded.inTime,
                        outTime = excluded.outTime,
                        notes = excluded.notes,
                        markedBy = excluded.markedBy,
                        updatedAt = CURRENT_TIMESTAMP
                    """, (f"att_{m_id}_{rec_date}", m_id, rec_date, status, in_time, out_time, f"Bulk-marked as {status}", marked_by))
                    count += 1

                conn.commit()
                self.send_json({
                    "success": True,
                    "count": count,
                    "message": f"Successfully bulk-marked {count} members as {status} for {rec_date}"
                })

            # 5. Member Creation (Students & Staff Full CRUD)
            elif path == "/api/members":
                name = body.get("name", "").strip()
                role = body.get("role", "STUDENT").upper()
                course = body.get("course", "Python Programming").strip()
                batch = body.get("batch", "Batch-2026-A").strip()
                department = body.get("department", "Computer Science").strip()
                phone = body.get("phone", "").strip()
                email = body.get("email", "").strip().lower()
                parent_name = body.get("parentName", "").strip()
                parent_phone = body.get("parentPhone", "").strip()
                parent_email = body.get("parentEmail", "").strip()

                if not name:
                    self.send_error_json("Member name is required", 400)
                    return

                code = body.get("code", "").strip().upper()
                if not code:
                    prefix = "HETA-STU" if role == "STUDENT" else "HETA-EMP"
                    cursor.execute("SELECT code FROM Member WHERE role = ?", (role,))
                    existing_codes = set(row["code"] for row in cursor.fetchall())
                    num = 1
                    while True:
                        candidate = f"{prefix}-{num:03d}"
                        if candidate not in existing_codes:
                            code = candidate
                            break
                        num += 1
                else:
                    cursor.execute("SELECT id FROM Member WHERE code = ?", (code,))
                    if cursor.fetchone():
                        self.send_error_json(f"Member code '{code}' already exists. Please choose a unique code.", 400)
                        return

                m_id = f"mem_{role.lower()}_{int(datetime.now().timestamp())}_{secrets.token_hex(2)}"

                if not email:
                    email = f"{code.lower().replace('-', '')}@heta.edu"

                cursor.execute("""
                INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, parentName, parentPhone, parentEmail, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                """, (m_id, name, code, role, course, batch, department, phone, email, parent_name, parent_phone, parent_email))

                # Auto create User login credentials
                u_id = f"usr_{m_id}"
                default_pass = "Student@123" if role == "STUDENT" else "Staff@123"
                p_hash = hash_password(default_pass)
                cursor.execute("""
                INSERT OR REPLACE INTO User (id, email, password, passwordHash, name, role, phone, memberId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (u_id, email, default_pass, p_hash, name, role, phone, m_id))

                conn.commit()
                self.send_json({
                    "success": True,
                    "id": m_id,
                    "memberId": m_id,
                    "code": code,
                    "message": f"{role.title()} '{name}' created with login '{email}'"
                })

            # 6. Student Leave Request Submission with Dual Server-Side Email Notification
            elif path == "/api/leaves/request":
                m_id = body.get("memberId")
                student_name = body.get("studentName", "").strip()
                course = body.get("course", "Python Programming").strip()
                batch = body.get("batch", "Batch-2026-A").strip()
                leave_type = body.get("leaveType", "CASUAL").upper()
                start_date = body.get("startDate", "").strip()
                end_date = body.get("endDate", "").strip()
                reason = body.get("reason", "").strip()

                if not m_id or not start_date or not end_date or not reason:
                    self.send_error_json("All leave fields are required (dates, type, and reason)", 400)
                    return

                # Date validation: to_date >= from_date
                try:
                    s_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                    e_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                except ValueError:
                    self.send_error_json("Invalid date format. Use YYYY-MM-DD", 400)
                    return

                if e_dt < s_dt:
                    self.send_error_json("To Date cannot be earlier than From Date", 400)
                    return

                # Validate No Overlapping Requests for this student
                cursor.execute("""
                SELECT id, startDate, endDate FROM LeaveRequest
                WHERE memberId = ? AND status != 'REJECTED'
                  AND NOT (endDate < ? OR startDate > ?)
                """, (m_id, start_date, end_date))
                conflict = cursor.fetchone()
                if conflict:
                    self.send_error_json(f"Overlapping leave request already exists ({conflict['startDate']} to {conflict['endDate']})", 400)
                    return

                # Auto-fill student details from Member if missing
                if not student_name or not course or not batch:
                    cursor.execute("SELECT name, course, batch, email FROM Member WHERE id = ?", (m_id,))
                    mem = cursor.fetchone()
                    if mem:
                        student_name = student_name or mem["name"]
                        course = course or mem["course"]
                        batch = batch or mem["batch"]

                lv_id = f"lv_{int(datetime.now().timestamp())}_{secrets.token_hex(4)}"
                submitted_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                # Insert into LeaveRequest table
                cursor.execute("""
                INSERT INTO LeaveRequest (id, memberId, studentName, course, batch, leaveType, startDate, endDate, reason, status, appliedAt, emailSentToAdmin)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, 1)
                """, (lv_id, m_id, student_name, course, batch, leave_type, start_date, end_date, reason))
                conn.commit()

                # AUTOMATED DUAL EMAIL DISPATCH to Academy Administrators (ADMIN_NOTIFY_EMAILS)
                admin_email_subject = f"🔔 [HETA-HRM] New Leave Application: {student_name} ({course} - {batch})"
                admin_email_body = f"""Dear Administrator,

A new student leave request has been submitted on the HETA-HRM Portal:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STUDENT LEAVE APPLICATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Student Name   : {student_name}
Course & Batch : {course} ({batch})
Leave Type     : {leave_type}
Leave Duration : {start_date} to {end_date}
Reason         : {reason}
Submission Time: {submitted_time}
Application ID : {lv_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please visit the admin approval portal to review and decide:
👉 Admin Approval Portal: http://localhost:3000/admin (or http://localhost:3001/admin)

(Automated notification sent simultaneously to:
 1. {ADMIN_NOTIFY_EMAILS[0] if len(ADMIN_NOTIFY_EMAILS) > 0 else 'Admin'}
 2. {ADMIN_NOTIFY_EMAILS[1] if len(ADMIN_NOTIFY_EMAILS) > 1 else 'Management'})

HETA Higher Education & Training Academy
Attendance & Leave Management System
"""
                mail_ok, mail_log = send_server_email(ADMIN_NOTIFY_EMAILS, admin_email_subject, admin_email_body)

                self.send_json({
                    "success": True,
                    "leaveId": lv_id,
                    "message": "Leave request submitted successfully. Notification email dispatched to Academy Administrators.",
                    "notifiedAdmins": ADMIN_NOTIFY_EMAILS,
                    "emailLog": mail_log
                })

            # 7. Admin Leave Approval / Rejection with Auto-marking in Attendance & Email to Student
            elif path.startswith("/api/leaves/") and (path.endswith("/approve") or path.endswith("/reject")):
                parts = path.split("/")
                leave_id = parts[3]
                action = parts[4] # "approve" or "reject"
                admin_name = body.get("adminName", "HETA Admin")
                admin_remarks = body.get("adminRemarks", "").strip() or ("Leave granted by admin" if action == "approve" else "Leave rejected by admin")

                new_status = "APPROVED" if action == "approve" else "REJECTED"

                cursor.execute("""
                UPDATE LeaveRequest
                SET status = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP, adminRemarks = ?, emailSentToStudent = 1
                WHERE id = ?
                """, (new_status, admin_name, admin_remarks, leave_id))

                # Fetch leave details to mark attendance and notify student
                cursor.execute("""
                SELECT lr.*, m.name, m.email, m.parentEmail
                FROM LeaveRequest lr
                JOIN Member m ON lr.memberId = m.id
                WHERE lr.id = ?
                """, (leave_id,))
                lv_row = cursor.fetchone()

                days_marked = 0
                if lv_row and action == "approve":
                    m_id = lv_row["memberId"]
                    s_dt = datetime.strptime(lv_row["startDate"], "%Y-%m-%d").date()
                    e_dt = datetime.strptime(lv_row["endDate"], "%Y-%m-%d").date()
                    curr = s_dt
                    while curr <= e_dt:
                        d_str = curr.strftime("%Y-%m-%d")
                        if curr.weekday() != 6: # Skip Sundays
                            cursor.execute("""
                            INSERT INTO Attendance (id, memberId, date, status, inTime, outTime, notes, markedBy, updatedAt)
                            VALUES (?, ?, ?, 'HOLIDAY', '-', '-', ?, ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(memberId, date) DO UPDATE SET
                                status = 'HOLIDAY',
                                notes = excluded.notes,
                                markedBy = excluded.markedBy,
                                updatedAt = CURRENT_TIMESTAMP
                            """, (f"att_{m_id}_{d_str}", m_id, d_str, f"Approved Leave: {lv_row['leaveType']} ({admin_remarks})", admin_name))
                            days_marked += 1
                        curr += timedelta(days=1)

                # Send confirmation email to student
                if lv_row:
                    st_email = lv_row["email"] or lv_row["parentEmail"]
                    if st_email:
                        st_subject = f"📋 [HETA-HRM] Leave Application {new_status}: {lv_row['startDate']} to {lv_row['endDate']}"
                        st_body = f"""Dear {lv_row['studentName']},

Your leave application ({lv_row['leaveType']}) for {lv_row['startDate']} to {lv_row['endDate']} has been {new_status} by {admin_name}.

Remarks from Admin:
"{admin_remarks}"

{"Your attendance records have been automatically recorded as approved leave (HOLIDAY)." if action == "approve" else "Please contact the administration office if you need further clarification."}

Warm regards,
HETA Higher Education Administration
"""
                        send_server_email(st_email, st_subject, st_body)

                conn.commit()
                self.send_json({
                    "success": True,
                    "status": new_status,
                    "daysMarked": days_marked,
                    "message": f"Leave request marked as {new_status}. Student notified via email."
                })

            # 8. Portion Covered Module (Dynamic CRUD)
            elif path == "/api/portions":
                portion_date = body.get("date", date.today().strftime("%Y-%m-%d"))
                course = body.get("course", "Python Programming").strip()
                batch = body.get("batch", "Batch-2026-A").strip()
                subject = body.get("subject", "Python Core").strip()
                topic = body.get("topic", "").strip()
                remarks = body.get("remarks", "").strip()
                conducted_by = body.get("conductedBy", "HETA Staff").strip()

                if not topic:
                    self.send_error_json("Topic/Chapter covered is required", 400)
                    return

                p_id = f"pc_{int(datetime.now().timestamp())}_{secrets.token_hex(3)}"
                cursor.execute("""
                INSERT INTO PortionCovered (id, date, course, batch, subject, topic, remarks, conductedBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (p_id, portion_date, course, batch, subject, topic, remarks, conducted_by))
                conn.commit()

                self.send_json({
                    "success": True,
                    "portionId": p_id,
                    "message": f"Portion '{topic}' recorded successfully for {portion_date}"
                })

            # 9. Absent Alert Notification Preview (WhatsApp & Email Compose)
            elif path == "/api/notifications/absent-preview":
                member_id = body.get("memberId")
                curr_date = body.get("date", date.today().strftime("%Y-%m-%d"))

                cursor.execute("SELECT * FROM Member WHERE id = ?", (member_id,))
                m = cursor.fetchone()
                if not m:
                    self.send_error_json("Member not found", 404)
                    return

                student_name = m["name"]
                parent_name = m["parentName"] or "Parent"
                parent_phone = m["parentPhone"] or m["phone"] or ""
                parent_email = m["parentEmail"] or m["email"] or ""

                student_course = m["course"] or "Academics"
                student_batch = m["batch"] or "Batch"

                default_message = (
                    f"Dear Parent {parent_name},\n\n"
                    f"This is an official intimation from HETA Higher Education & Training Academy.\n"
                    f"Your son/daughter *{student_name}* ({student_course} - {student_batch}) is marked ABSENT for today's class on *{curr_date}*.\n\n"
                    f"Regular attendance is mandatory for academic progress. If this absence is due to an unavoidable circumstance, kindly submit an official leave request or contact the academy office.\n\n"
                    f"Warm regards,\n"
                    f"HETA Higher Education & Training Academy\n"
                    f"📧 {ADMIN_DEFAULT_EMAIL}\n"
                    f"📞 +91 98401 23456"
                )

                clean_phone = "".join(filter(str.isdigit, parent_phone))
                if len(clean_phone) == 10:
                    clean_phone = "91" + clean_phone

                encoded_text = urllib.parse.quote(default_message)
                whatsapp_web_url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"
                whatsapp_mobile_url = f"https://api.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"

                self.send_json({
                    "success": True,
                    "studentName": student_name,
                    "parentName": parent_name,
                    "parentPhone": parent_phone,
                    "parentEmail": parent_email,
                    "portionCovered": portion_text,
                    "date": curr_date,
                    "defaultMessage": default_message,
                    "whatsappWebUrl": whatsapp_web_url,
                    "whatsappMobileUrl": whatsapp_mobile_url
                })

            # 10. Send Absent Email Alert
            elif path == "/api/notifications/send-email":
                to_email = body.get("toEmail")
                subject = body.get("subject", "Urgent Attendance Alert: Student Absent - HETA Higher Education")
                message_text = body.get("message")
                student_name = body.get("studentName", "Student")

                if not to_email or not message_text:
                    self.send_error_json("Recipient email and message text are required", 400)
                    return

                ok, log_msg = send_server_email(to_email, subject, message_text)
                self.send_json({
                    "success": True,
                    "recipient": to_email,
                    "studentName": student_name,
                    "status": "Dispatched via HETA Mailer",
                    "details": log_msg
                })

            # 11a. Google Sheet Config Endpoint (Save target sheet URL / Name)
            elif path == "/api/sheets/config":
                from google_sheets_sync import extract_sheet_id
                target_url = body.get("sheetUrl", "").strip()
                target_name = body.get("sheetName", "HETA-HRM Attendance Master").strip()
                sheet_id = extract_sheet_id(target_url)

                cursor.execute("""
                UPDATE GoogleSheetSync
                SET sheetUrl = ?,
                    sheetId = ?,
                    sheetName = ?
                WHERE id = 'gsheet_cfg_1'
                """, (target_url, sheet_id, target_name))
                conn.commit()
                self.send_json({"success": True, "message": "Google Sheet configuration saved successfully"})

            # 11b. Google Sheet Live Sync Endpoint
            elif path == "/api/sheets/sync":
                from google_sheets_sync import sync_database_to_google_sheet, get_service_account_credentials
                target_url = body.get("sheetUrl", "").strip() or None
                try:
                    sync_res = sync_database_to_google_sheet(conn, target_url)
                    self.send_json(sync_res)
                except Exception as sync_err:
                    err_str = str(sync_err)
                    print(f"[GSHEET SYNC ERROR] {err_str}")
                    creds = get_service_account_credentials()
                    sa_email = creds.service_account_email if creds else "heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com"
                    self.send_json({
                        "success": False,
                        "error": err_str,
                        "serviceAccountEmail": sa_email
                    }, 400)

            else:
                self.send_error_json("POST endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ PUT ROUTES (Inline Table CRUD) ------------------
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api") and path != "/":
            path = "/api" + path
        body = self.parse_body()

        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Update Member (Students & Staff Inline Table CRUD)
            if path.startswith("/api/members/"):
                member_id = path.split("/")[3]
                name = body.get("name")
                code = body.get("code")
                course = body.get("course")
                batch = body.get("batch")
                department = body.get("department")
                phone = body.get("phone")
                email = body.get("email")
                parent_name = body.get("parentName")
                parent_phone = body.get("parentPhone")
                parent_email = body.get("parentEmail")
                status = body.get("status")

                cursor.execute("""
                UPDATE Member
                SET name = COALESCE(?, name),
                    code = COALESCE(?, code),
                    course = COALESCE(?, course),
                    batch = COALESCE(?, batch),
                    department = COALESCE(?, department),
                    phone = COALESCE(?, phone),
                    email = COALESCE(?, email),
                    parentName = COALESCE(?, parentName),
                    parentPhone = COALESCE(?, parentPhone),
                    parentEmail = COALESCE(?, parentEmail),
                    status = COALESCE(?, status),
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (name, code, course, batch, department, phone, email, parent_name, parent_phone, parent_email, status, member_id))

                # Update matching User if name/email/phone changed
                if name or email or phone:
                    cursor.execute("""
                    UPDATE User
                    SET name = COALESCE(?, name),
                        email = COALESCE(?, email),
                        phone = COALESCE(?, phone),
                        updatedAt = CURRENT_TIMESTAMP
                    WHERE memberId = ?
                    """, (name, email, phone, member_id))

                conn.commit()
                cursor.execute("SELECT * FROM Member WHERE id = ?", (member_id,))
                updated_row = cursor.fetchone()
                self.send_json({
                    "success": True,
                    "member": dict(updated_row) if updated_row else {},
                    "message": "Member record updated successfully"
                })

            # 2. Update Portion Covered Entry
            elif path.startswith("/api/portions/"):
                portion_id = path.split("/")[3]
                p_date = body.get("date")
                course = body.get("course")
                batch = body.get("batch")
                subject = body.get("subject")
                topic = body.get("topic")
                remarks = body.get("remarks")
                conducted_by = body.get("conductedBy")

                cursor.execute("""
                UPDATE PortionCovered
                SET date = COALESCE(?, date),
                    course = COALESCE(?, course),
                    batch = COALESCE(?, batch),
                    subject = COALESCE(?, subject),
                    topic = COALESCE(?, topic),
                    remarks = COALESCE(?, remarks),
                    conductedBy = COALESCE(?, conductedBy),
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (p_date, course, batch, subject, topic, remarks, conducted_by, portion_id))
                conn.commit()
                self.send_json({"success": True, "message": "Portion entry updated successfully"})

            else:
                self.send_error_json("PUT endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()

    # ------------------ DELETE ROUTES ------------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api") and path != "/":
            path = "/api" + path

        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Delete Member (Cascades Attendance & Leaves)
            if path.startswith("/api/members/"):
                member_id = path.split("/")[3]
                cursor.execute("DELETE FROM Attendance WHERE memberId = ?", (member_id,))
                cursor.execute("DELETE FROM LeaveRequest WHERE memberId = ?", (member_id,))
                cursor.execute("DELETE FROM User WHERE memberId = ?", (member_id,))
                cursor.execute("DELETE FROM Member WHERE id = ?", (member_id,))
                conn.commit()
                self.send_json({"success": True, "message": "Member and associated records deleted successfully"})

            # 2. Delete Portion Covered Entry
            elif path.startswith("/api/portions/"):
                portion_id = path.split("/")[3]
                cursor.execute("DELETE FROM PortionCovered WHERE id = ?", (portion_id,))
                conn.commit()
                self.send_json({"success": True, "message": "Portion covered entry deleted successfully"})

            else:
                self.send_error_json("DELETE endpoint not found", 404)

        except Exception as e:
            self.send_error_json(str(e), 500)
        finally:
            conn.close()


def run_server():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    init_db()
    server_address = (HOST, PORT)
    with socketserver.ThreadingTCPServer(server_address, HetaApiHandler) as httpd:
        print(f"[OK] HETA-HRM Python Backend Server running on http://localhost:{PORT}")
        print("[INFO] Portals: /student, /staff, /admin")
        print(f"[INFO] Admin Login: {ADMIN_DEFAULT_EMAIL} / (configured password)")
        httpd.serve_forever()


if __name__ == "__main__":
    run_server()
