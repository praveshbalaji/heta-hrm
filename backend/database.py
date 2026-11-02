import sqlite3
import os
import json
import hashlib
from datetime import datetime, date, timedelta

if os.environ.get("VERCEL"):
    DB_DIR = "/tmp"
    DB_PATH = os.path.join(DB_DIR, "heta.db")
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

    # Convert any existing non-conforming attendance statuses to the 3 canonical options:
    # LATE -> PRESENT, PERMISSION -> HOLIDAY (or PRESENT)
    cursor.execute("UPDATE Attendance SET status = 'PRESENT' WHERE status = 'LATE'")
    cursor.execute("UPDATE Attendance SET status = 'HOLIDAY' WHERE status = 'PERMISSION'")

    # Seed Members if empty
    cursor.execute("SELECT COUNT(*) as count FROM Member")
    if cursor.fetchone()["count"] == 0:
        initial_members = [
            # Students (12 official academy students, zero Balaji)
            ("stu_2", "Deepika J", "HETA-STU-001", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919444112233", "deepika@heta.edu", "Janakiraman", "+919444112233", "deepika.parent@example.com", "Python Core"),
            ("stu_3", "Rashida Begum S", "HETA-STU-002", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919884223344", "rashida@heta.edu", "Syed", "+919884223344", "rashida.parent@example.com", "Python Core"),
            ("stu_4", "Yuvashree M", "HETA-STU-003", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919710334455", "yuvashree@heta.edu", "Murugan", "+919710334455", "yuvashree.parent@example.com", "Python Core"),
            ("stu_5", "Dhanalakshmi V", "HETA-STU-004", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919841445566", "dhana@heta.edu", "Venkatesan", "+919841445566", "dhana.parent@example.com", "Python Core"),
            ("stu_6", "Hemanathan A", "HETA-STU-005", "STUDENT", "Python Programming", "Batch-2026-B", "Computer Science", "+919940556677", "hema@heta.edu", "Arumugam", "+919940556677", "hema.parent@example.com", "Python Core"),
            ("stu_7", "Bharani Rajan S", "HETA-STU-006", "STUDENT", "Python Programming", "Batch-2026-B", "Computer Science", "+919884667788", "bharani@heta.edu", "Srinivasan", "+919884667788", "bharani.parent@example.com", "Python Core"),
            ("stu_8", "Madhumitha R", "HETA-STU-007", "STUDENT", "Python Programming", "Batch-2026-B", "Computer Science", "+919790778899", "madhu@heta.edu", "Radhakrishnan", "+919790778899", "madhu.parent@example.com", "Python Core"),
            ("stu_9", "Riyaz Khan H", "HETA-STU-008", "STUDENT", "Python Programming", "Batch-2026-B", "Computer Science", "+919600889900", "riyaz@heta.edu", "Habibullah", "+919600889900", "riyaz.parent@example.com", "Python Core"),
            ("stu_10", "Santhosh K P", "HETA-STU-009", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919500990011", "santhosh@heta.edu", "Perumal", "+919500990011", "santhosh.parent@example.com", "Python Core"),
            ("stu_11", "G. Sowlagya", "HETA-STU-010", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919445112244", "sowlagya@heta.edu", "Gopal", "+919445112244", "sowlagya.parent@example.com", "Python Core"),
            ("stu_12", "Thirumurugan", "HETA-STU-011", "STUDENT", "Python Programming", "Batch-2026-A", "Computer Science", "+919840223355", "thiru@heta.edu", "Chidambaram", "+919840223355", "thiru.parent@example.com", "Python Core"),
            ("stu_13", "Ramkumar", "HETA-STU-012", "STUDENT", "Python Programming", "Batch-2026-B", "Computer Science", "+919710445577", "ram@heta.edu", "Kalyanasundaram", "+919710445577", "ram.parent@example.com", "Python Core"),

            # Staff Members
            ("stf_1", "Dr. K. Saravanan", "HETA-STF-001", "STAFF", "Computer Science", "All Batches", "Computer Science", "+919840998877", "saravanan@heta.edu", "Self", "+919840998877", "saravanan@heta.edu", "Senior Python Faculty"),
            ("stf_2", "Prof. R. Priya", "HETA-STF-002", "STAFF", "Computer Science", "All Batches", "Computer Science", "+919840887766", "priya@heta.edu", "Self", "+919840887766", "priya@heta.edu", "Lab Coordinator"),
            ("stf_3", "Er. M. Ramesh Kumar", "HETA-STF-003", "STAFF", "Training & Placement", "All Batches", "Training & Placement", "+919840776655", "ramesh@heta.edu", "Self", "+919840776655", "ramesh@heta.edu", "Placement Lead"),
        ]

        for m in initial_members:
            cursor.execute("""
            INSERT OR REPLACE INTO Member (id, name, code, role, course, batch, department, phone, email, parentName, parentPhone, parentEmail, portionCovered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, m)

    # Seed User Logins (Admin, Staff, Student) with hashed passwords
    admin_email_env = os.environ.get("ADMIN_EMAIL", os.environ.get("HETA_SMTP_USER", "pravesbalaji144@gmail.com")).strip().lower()
    admin_pass_env = os.environ.get("ADMIN_PASSWORD", "Heta@123")

    # Update any existing admin user to target admin email
    cursor.execute("UPDATE User SET email = ? WHERE id = 'usr_admin_1'", (admin_email_env,))

    users_to_seed = [
        # Admin (configured via environment variables or defaults)
        ("usr_admin_1", admin_email_env, admin_pass_env, hash_password(admin_pass_env), "Super Admin", "ADMIN", "+919876543210", None),
        ("usr_admin_2", "admin@heta.edu", "Admin@123", hash_password("Admin@123"), "Academic Administrator", "ADMIN", "+919876543211", None),

        # Staff
        ("usr_staff_generic", "staff@heta.edu", "Staff@123", hash_password("Staff@123"), "Staff Member", "STAFF", "+919840998800", "stf_1"),
        ("usr_staff_1", "saravanan@heta.edu", "Staff@123", hash_password("Staff@123"), "Dr. K. Saravanan", "STAFF", "+919840998877", "stf_1"),
        ("usr_staff_2", "priya@heta.edu", "Staff@123", hash_password("Staff@123"), "Prof. R. Priya", "STAFF", "+919840887766", "stf_2"),
        ("usr_staff_3", "ramesh@heta.edu", "Staff@123", hash_password("Staff@123"), "Er. M. Ramesh Kumar", "STAFF", "+919840776655", "stf_3"),

        # Students
        ("usr_stu_generic", "student@heta.edu", "Student@123", hash_password("Student@123"), "Student Member", "STUDENT", "+919444112200", "stu_2"),
        ("usr_stu_2", "deepika@heta.edu", "Student@123", hash_password("Student@123"), "Deepika J", "STUDENT", "+919444112233", "stu_2"),
        ("usr_stu_3", "rashida@heta.edu", "Student@123", hash_password("Student@123"), "Rashida Begum S", "STUDENT", "+919884223344", "stu_3"),
        ("usr_stu_4", "yuvashree@heta.edu", "Student@123", hash_password("Student@123"), "Yuvashree M", "STUDENT", "+919710334455", "stu_4"),
        ("usr_stu_5", "dhana@heta.edu", "Student@123", hash_password("Student@123"), "Dhanalakshmi V", "STUDENT", "+919841445566", "stu_5"),
    ]

    for u in users_to_seed:
        cursor.execute("""
        INSERT OR REPLACE INTO User (id, email, password, passwordHash, name, role, phone, memberId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, u)

    # Seed Portion Covered entries if empty
    cursor.execute("SELECT COUNT(*) as count FROM PortionCovered")
    if cursor.fetchone()["count"] == 0:
        portions_to_seed = [
            ("pc_1", "2026-10-26", "Python Programming", "Batch-2026-A", "Python Core", "Introduction to Python: Syntax, Variables & Data Types", "Completed Chapter 1 exercises", "Dr. K. Saravanan"),
            ("pc_2", "2026-10-27", "Python Programming", "Batch-2026-A", "Python Core", "Control Structures: If-Else, Elif, Nested Conditionals", "Practical lab coding test conducted", "Prof. R. Priya"),
            ("pc_3", "2026-10-28", "Python Programming", "Batch-2026-A", "Python Core", "Loops: While Loops, For Loops, Range, Break & Continue", "Assigned 10 loop challenge problems", "Dr. K. Saravanan"),
            ("pc_4", "2026-10-29", "Python Programming", "Batch-2026-A", "Python Core", "Functions: Def, Parameters, Return values, Lambda functions", "Covered variable scopes (Local & Global)", "Prof. R. Priya"),
            ("pc_5", "2026-10-30", "Python Programming", "Batch-2026-A", "Python Core", "Data Structures: Lists, Tuples, Sets & Dictionary methods", "List comprehension and dict traversal", "Er. M. Ramesh Kumar"),
            ("pc_6", "2026-10-31", "Python Programming", "Batch-2026-A", "Python Core", "Object-Oriented Programming (OOP): Classes, Objects, __init__", "Built a Bank Account simulator class", "Dr. K. Saravanan"),
            ("pc_7", "2026-11-01", "Python Programming", "Batch-2026-A", "Database Integration", "SQLite & Prisma Database: Tables, Queries, CRUD operations", "Connected Python backend to SQLite database", "Er. M. Ramesh Kumar"),
        ]
        for p in portions_to_seed:
            cursor.execute("""
            INSERT OR REPLACE INTO PortionCovered (id, date, course, batch, subject, topic, remarks, conductedBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, p)

    # Seed initial Leave Requests
    cursor.execute("SELECT COUNT(*) as count FROM LeaveRequest")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO LeaveRequest (id, memberId, studentName, course, batch, leaveType, startDate, endDate, reason, status, appliedAt)
        VALUES ('lv_stu_1', 'stu_2', 'Deepika J', 'Python Programming', 'Batch-2026-A', 'SICK', '2026-11-02', '2026-11-03', 'Doctor consultation and high fever', 'PENDING', datetime('now', '-2 hours'))
        """)
        cursor.execute("""
        INSERT INTO LeaveRequest (id, memberId, studentName, course, batch, leaveType, startDate, endDate, reason, status, appliedAt, reviewedBy, reviewedAt, adminRemarks)
        VALUES ('lv_stu_2', 'stu_3', 'Rashida Begum S', 'Python Programming', 'Batch-2026-A', 'CASUAL', '2026-10-30', '2026-10-30', 'Family religious ceremony in hometown', 'APPROVED', datetime('now', '-2 days'), 'HETA Super Admin', datetime('now', '-2 days'), 'Granted 1-day leave')
        """)

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
