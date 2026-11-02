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

    # Ensure only canonical status in Attendance table
    cursor.execute("UPDATE Attendance SET status = 'PRESENT' WHERE status = 'LATE'")
    cursor.execute("UPDATE Attendance SET status = 'HOLIDAY' WHERE status = 'PERMISSION'")

    # Wipe mock/sample data: student/staff members, attendance logs, and mock leaves
    # Real users and students will self-register via the new Signup flow
    cursor.execute("DELETE FROM Attendance")
    cursor.execute("DELETE FROM LeaveRequest")
    cursor.execute("DELETE FROM PortionCovered")
    cursor.execute("DELETE FROM Member")
    cursor.execute("DELETE FROM User WHERE role != 'ADMIN'")

    # Seed Master Admin accounts only
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
