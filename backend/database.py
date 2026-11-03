import sqlite3
import os
import json
import hashlib
from datetime import datetime, date, timedelta

if os.environ.get("VERCEL"):
    DB_DIR = "/tmp"
    DB_PATH = os.path.join(DB_DIR, "heta.db")
    if not os.path.exists(DB_PATH):
        bundled_candidates = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "prisma", "heta.db"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", "prisma", "heta.db"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "heta.db")
        ]
        for candidate in bundled_candidates:
            if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
                try:
                    import shutil
                    shutil.copyfile(candidate, DB_PATH)
                    break
                except Exception:
                    pass
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prisma")
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "heta.db")

PASSWORD_SALT = "heta_salt_2026_hrm_"

def hash_password(password: str) -> str:
    """Secure salted SHA-256 hash"""
    return hashlib.sha256(f"{PASSWORD_SALT}{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def get_raw_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_connection():
    if not os.path.exists(DB_PATH):
        init_db()
    return get_raw_connection()

def sync_users_to_members(conn):
    """
    Auto-heal guarantee: Ensure every user with role 'STUDENT' or 'STAFF'
    has an active linked Member record so they immediately appear in Mark Attendance.
    """
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, name, email, role, phone, memberId
    FROM User
    WHERE role IN ('STUDENT', 'STAFF')
    """)
    users = cursor.fetchall()
    for u in users:
        u_id = u["id"]
        u_role = u["role"]
        u_name = u["name"] or "HETA Member"
        u_email = (u["email"] or "").strip().lower()
        u_phone = u["phone"] or "+919876543210"
        m_id = u["memberId"]

        # Check if Member exists with this m_id or email
        cursor.execute("SELECT id, code, role FROM Member WHERE id = ? OR LOWER(email) = ?", (m_id or "", u_email))
        mem = cursor.fetchone()
        if not mem:
            new_mid = m_id if m_id else f"mem_{u_id.replace('usr_', '')}"
            prefix = "HETA-STU" if u_role == "STUDENT" else "HETA-STF"
            cursor.execute("SELECT COUNT(*) as count FROM Member WHERE role = ?", (u_role,))
            cnt = cursor.fetchone()["count"] + 1
            code = f"{prefix}-{cnt:03d}"
            course = "Python Programming" if u_role == "STUDENT" else "Faculty Member"
            batch = "Batch-2026-A" if u_role == "STUDENT" else "All Batches"
            dept = "Computer Science" if u_role == "STUDENT" else "Faculty Member"

            cursor.execute("""
            INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            """, (new_mid, u_name, code, u_role, course, batch, dept, u_phone, u_email))
            cursor.execute("UPDATE User SET memberId = ? WHERE id = ?", (new_mid, u_id))
        else:
            cursor.execute("UPDATE Member SET status = 'ACTIVE' WHERE id = ?", (mem["id"],))
            if u["memberId"] != mem["id"]:
                cursor.execute("UPDATE User SET memberId = ? WHERE id = ?", (mem["id"], u_id))
    conn.commit()

def init_db():
    conn = get_raw_connection()
    cursor = conn.cursor()

    # 1. User table with RBAC and Password Hash
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        passwordHash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'ADMIN', 'STAFF', 'STUDENT'
        phone TEXT,
        memberId TEXT,      -- Links to Member table for student/staff
        sessionToken TEXT,
        tokenExpiry DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Member table (Students & Staff) with Course, Batch, Full CRUD
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Member (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL, -- e.g. STU-001, STF-001
        role TEXT NOT NULL,        -- 'STUDENT' or 'STAFF'
        course TEXT DEFAULT 'Python Programming',
        batch TEXT DEFAULT 'Batch-2026-A',
        department TEXT DEFAULT 'Computer Science',
        phone TEXT,
        email TEXT,
        parentName TEXT,
        parentPhone TEXT,
        parentEmail TEXT,
        portionCovered TEXT DEFAULT 'Python Core',
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' or 'INACTIVE'
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Attendance table: Strictly 3 options: PRESENT, ABSENT, HOLIDAY
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Attendance (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        status TEXT NOT NULL, -- Strictly 'PRESENT', 'ABSENT', 'HOLIDAY'
        inTime TEXT,
        outTime TEXT,
        notes TEXT,
        markedBy TEXT DEFAULT 'Admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(memberId, date),
        FOREIGN KEY(memberId) REFERENCES Member(id) ON DELETE CASCADE
    );
    """)

    # 4. LeaveRequest table (Student-only, with dual email notifications)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS LeaveRequest (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        studentName TEXT NOT NULL,
        course TEXT NOT NULL,
        batch TEXT NOT NULL,
        leaveType TEXT NOT NULL, -- 'CASUAL', 'SICK', 'ACADEMIC', 'EMERGENCY'
        startDate TEXT NOT NULL, -- YYYY-MM-DD
        endDate TEXT NOT NULL,   -- YYYY-MM-DD
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewedBy TEXT,
        reviewedAt DATETIME,
        adminRemarks TEXT,
        emailSentToAdmin BOOLEAN DEFAULT 0,
        emailSentToStudent BOOLEAN DEFAULT 0,
        FOREIGN KEY(memberId) REFERENCES Member(id) ON DELETE CASCADE
    );
    """)

    # 5. PortionCovered table (Dynamic Portion Covered Menu)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PortionCovered (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        course TEXT DEFAULT 'Python Programming',
        batch TEXT DEFAULT 'Batch-2026-A',
        subject TEXT DEFAULT 'Python Core',
        topic TEXT NOT NULL, -- Chapter / Topic Covered
        remarks TEXT,
        conductedBy TEXT DEFAULT 'Dr. K. Saravanan',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. GoogleSheetSync table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS GoogleSheetSync (
        id TEXT PRIMARY KEY,
        accountEmail TEXT DEFAULT 'pravesbalaji144@gmail.com',
        sheetName TEXT DEFAULT 'HETA-HRM Attendance & Leave Master',
        sheetId TEXT,
        sheetUrl TEXT,
        lastSyncedAt DATETIME,
        syncStatus TEXT DEFAULT 'READY',
        recordsSynced INTEGER DEFAULT 0,
        log TEXT
    );
    """)

    conn.commit()

    # Clean legacy columns or ensure schema compatibility
    # Ensure Member table has course, batch, phone, email columns
    cursor.execute("PRAGMA table_info(Member)")
    cols = [col["name"] for col in cursor.fetchall()]
    if "course" not in cols:
        cursor.execute("ALTER TABLE Member ADD COLUMN course TEXT DEFAULT 'Python Programming'")
    if "batch" not in cols:
        cursor.execute("ALTER TABLE Member ADD COLUMN batch TEXT DEFAULT 'Batch-2026-A'")
    if "phone" not in cols:
        cursor.execute("ALTER TABLE Member ADD COLUMN phone TEXT")
    if "email" not in cols:
        cursor.execute("ALTER TABLE Member ADD COLUMN email TEXT")

    # Ensure User table has memberId
    cursor.execute("PRAGMA table_info(User)")
    user_cols = [col["name"] for col in cursor.fetchall()]
    if "memberId" not in user_cols:
        cursor.execute("ALTER TABLE User ADD COLUMN memberId TEXT")
    if "passwordHash" not in user_cols:
        cursor.execute("ALTER TABLE User ADD COLUMN passwordHash TEXT")
    if "sessionToken" not in user_cols:
        cursor.execute("ALTER TABLE User ADD COLUMN sessionToken TEXT")
    if "tokenExpiry" not in user_cols:
        cursor.execute("ALTER TABLE User ADD COLUMN tokenExpiry DATETIME")

    # Ensure LeaveRequest table has all required fields
    cursor.execute("PRAGMA table_info(LeaveRequest)")
    leave_cols = [col["name"] for col in cursor.fetchall()]
    if "studentName" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN studentName TEXT")
    if "course" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN course TEXT DEFAULT 'Python Programming'")
    if "batch" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN batch TEXT DEFAULT 'Batch-2026-A'")
    if "adminRemarks" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN adminRemarks TEXT")
    if "emailSentToAdmin" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN emailSentToAdmin BOOLEAN DEFAULT 0")
    if "emailSentToStudent" not in leave_cols:
        cursor.execute("ALTER TABLE LeaveRequest ADD COLUMN emailSentToStudent BOOLEAN DEFAULT 0")

    # Backfill LeaveRequest studentName, course, batch from Member if null
    cursor.execute("""
    UPDATE LeaveRequest
    SET studentName = (SELECT name FROM Member WHERE Member.id = LeaveRequest.memberId),
        course = COALESCE((SELECT course FROM Member WHERE Member.id = LeaveRequest.memberId), 'Python Programming'),
        batch = COALESCE((SELECT batch FROM Member WHERE Member.id = LeaveRequest.memberId), 'Batch-2026-A')
    WHERE studentName IS NULL
    """)

    # Ensure only canonical status in Attendance table
    cursor.execute("UPDATE Attendance SET status = 'PRESENT' WHERE status = 'LATE'")
    cursor.execute("UPDATE Attendance SET status = 'HOLIDAY' WHERE status = 'PERMISSION'")

    # Seed Master Admin accounts
    admin_email_env = os.environ.get("ADMIN_EMAIL", os.environ.get("HETA_SMTP_USER", "pravesbalaji144@gmail.com")).strip().lower()
    admin_pass_env = os.environ.get("ADMIN_PASSWORD", "Heta@123")

    # Update any existing admin user to target admin email
    cursor.execute("UPDATE User SET email = ? WHERE id = 'usr_admin_1'", (admin_email_env,))

    admin_users = [
        ("usr_admin_1", admin_email_env, admin_pass_env, hash_password(admin_pass_env), "Super Admin", "ADMIN", "+919876543210", None),
        ("usr_admin_2", "admin@heta.edu", "Admin@123", hash_password("Admin@123"), "Academic Administrator", "ADMIN", "+919876543211", None),
        ("usr_admin_3", "hetahighereducation@gmail.com", "Heta@123", hash_password("Heta@123"), "HETA Academy Administrator", "ADMIN", "+919876543212", None),
    ]

    for u in admin_users:
        cursor.execute("""
        INSERT OR REPLACE INTO User (id, email, password, passwordHash, name, role, phone, memberId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, u)

    # Seed initial Students and Staff if Member directory is empty
    cursor.execute("SELECT COUNT(*) as count FROM Member")
    if cursor.fetchone()["count"] == 0:
        initial_members = [
            # Students Directory
            ("stu_1", "Deepika J", "HETA-STU-001", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919444112233", "deepika@heta.edu", "Janakiraman", "+919444112233", "deepika.parent@example.com", "Python Core", "09:10 AM", "05:00 PM"),
            ("stu_2", "Rashida Begum S", "HETA-STU-002", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919884223344", "rashida@heta.edu", "Syed", "+919884223344", "rashida.parent@example.com", "Python Core", "09:05 AM", "05:00 PM"),
            ("stu_3", "Yuvashree M", "HETA-STU-003", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919710334455", "yuvashree@heta.edu", "Murugan", "+919710334455", "yuvashree.parent@example.com", "Python Core", "09:15 AM", "05:00 PM"),
            ("stu_4", "Dhanalakshmi V", "HETA-STU-004", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919841445566", "dhana@heta.edu", "Venkatesan", "+919841445566", "dhana.parent@example.com", "Python Core", "08:55 AM", "05:00 PM"),
            ("stu_5", "Hemanathan A", "HETA-STU-005", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919940556677", "hema@heta.edu", "Arumugam", "+919940556677", "hema.parent@example.com", "Python Core", "09:00 AM", "05:00 PM"),
            ("stu_6", "Bharani Rajan S", "HETA-STU-006", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919884667788", "bharani@heta.edu", "Srinivasan", "+919884667788", "bharani.parent@example.com", "Python Core", "09:00 AM", "05:00 PM"),
            ("stu_7", "Madhumitha R", "HETA-STU-007", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919790778899", "madhu@heta.edu", "Radhakrishnan", "+919790778899", "madhu.parent@example.com", "Python Core", "09:02 AM", "05:00 PM"),
            ("stu_8", "Riyaz Khan H", "HETA-STU-008", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919600889900", "riyaz@heta.edu", "Habibullah", "+919600889900", "riyaz.parent@example.com", "Python Core", "09:12 AM", "05:00 PM"),
            ("stu_9", "Santhosh K P", "HETA-STU-009", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919500990011", "santhosh@heta.edu", "Perumal", "+919500990011", "santhosh.parent@example.com", "Python Core", "09:00 AM", "05:00 PM"),
            ("stu_10", "Sneha K", "HETA-STU-010", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919445112244", "sneha@heta.edu", "Gopal", "+919445112244", "sneha.parent@example.com", "Python Core", "09:05 AM", "05:00 PM"),

            # Staff & Faculty Directory
            ("stf_1", "Dr. K. Saravanan", "HETA-STF-001", "STAFF", "Head of Department", "All Batches", "Computer Science", "+919840998877", "saravanan@heta.edu", "Self", "+919840998877", "saravanan@heta.edu", "Full Stack Python", "08:45 AM", "05:15 PM"),
            ("stf_2", "Prof. R. Priya", "HETA-STF-002", "STAFF", "Senior Faculty", "All Batches", "Computer Science", "+919840887766", "priya@heta.edu", "Self", "+919840887766", "priya@heta.edu", "Data Science & AI", "08:50 AM", "05:10 PM"),
            ("stf_3", "Er. M. Ramesh Kumar", "HETA-STF-003", "STAFF", "Technical Trainer", "All Batches", "Information Technology", "+919840776655", "ramesh@heta.edu", "Self", "+919840776655", "ramesh@heta.edu", "Cloud & Web Apps", "08:40 AM", "05:30 PM"),
        ]

        for m in initial_members:
            cursor.execute("""
            INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, parentName, parentPhone, parentEmail, portionCovered, inTime, outTime, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            """, m)

            # Also create User login account with default credentials
            m_role = m[3]
            m_email = m[8]
            default_pwd = "Student@123" if m_role == "STUDENT" else "Staff@123"
            pwd_hash = hash_password(default_pwd)
            cursor.execute("""
            INSERT OR IGNORE INTO User (id, email, password, passwordHash, name, role, phone, memberId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"usr_{m[0]}", m_email, default_pwd, pwd_hash, m[1], m_role, m[7], m[0]))

    # Auto-heal: Ensure every User with role STUDENT or STAFF has an active linked Member
    sync_users_to_members(conn)

    # Seed initial attendance for current month if empty
    cursor.execute("SELECT COUNT(*) as count FROM Attendance")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("SELECT id, role, code FROM Member WHERE status = 'ACTIVE'")
        all_mems = cursor.fetchall()
        now_dt = datetime.now()
        cur_yr = now_dt.year
        cur_mo = now_dt.month
        # Seed for days 1 through min(now_dt.day, 28)
        max_d = min(max(now_dt.day, 3), 28)
        for d in range(1, max_d + 1):
            try:
                d_obj = date(cur_yr, cur_mo, d)
            except Exception:
                continue
            d_str = d_obj.strftime("%Y-%m-%d")
            is_sun = (d_obj.weekday() == 6)

            for m in all_mems:
                m_id = m["id"]
                m_code = m["code"]
                if is_sun:
                    att_status = "HOLIDAY"
                    in_t = "-"
                    out_t = "-"
                else:
                    # Bharani Rajan S (HETA-STU-006) on Day 2 is Absent (matching design screenshot)
                    if m_code == "HETA-STU-006" and d == 2:
                        att_status = "ABSENT"
                        in_t = "-"
                        out_t = "-"
                    elif m_code == "HETA-STU-003" and d == 3:
                        att_status = "ABSENT"
                        in_t = "-"
                        out_t = "-"
                    else:
                        att_status = "PRESENT"
                        in_t = "09:00 AM"
                        out_t = "05:00 PM"

                cursor.execute("""
                INSERT OR IGNORE INTO Attendance (id, memberId, date, status, inTime, outTime, notes, markedBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'System Seed')
                """, (f"att_{m_id}_{d_str}", m_id, d_str, att_status, in_t, out_t, "Canonical Attendance"))

    # Seed GoogleSheetSync configuration
    cursor.execute("SELECT COUNT(*) as count FROM GoogleSheetSync")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO GoogleSheetSync (id, accountEmail, sheetName, sheetId, sheetUrl, syncStatus, recordsSynced, log)
        VALUES ('gsheet_cfg_1', 'heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com', 'Attandance Report Mangment', '1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg', 'https://docs.google.com/spreadsheets/d/1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg/edit', 'READY', 0, 'Configured for Google Cloud Service Account')
        """)
    else:
        cursor.execute("""
        UPDATE GoogleSheetSync
        SET accountEmail = 'heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com',
            sheetName = 'Attandance Report Mangment',
            sheetId = COALESCE(sheetId, '1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg'),
            sheetUrl = COALESCE(sheetUrl, 'https://docs.google.com/spreadsheets/d/1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg/edit')
        WHERE id = 'gsheet_cfg_1'
        """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema successfully upgraded and verified at", DB_PATH)
