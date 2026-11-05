import sqlite3
import os
import json
import time
import hashlib
from datetime import datetime, date, timedelta

def load_env_file():
    """Lightweight zero-dependency .env loader for local and production environments"""
    candidate_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
                break
            except Exception:
                pass

load_env_file()

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
    """
    High-concurrency SQLite connection with WAL mode, 15s busy timeout,
    and memory-mapped I/O to handle thousands of concurrent queries smoothly.
    """
    conn = sqlite3.connect(DB_PATH, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA busy_timeout = 15000;")
        conn.execute("PRAGMA temp_store = MEMORY;")
        conn.execute("PRAGMA cache_size = -64000;")
        conn.execute("PRAGMA mmap_size = 268435456;")
    except Exception:
        pass
    return conn

def get_connection():
    if not os.path.exists(DB_PATH):
        init_db()
    return get_raw_connection()

_last_sync_timestamp = 0

def sync_users_to_members(conn, force=False):
    """
    Auto-heal guarantee: Ensure every user with role 'STUDENT' or 'STAFF'
    has an active linked Member record with matching approval and soft-delete states.
    Strictly prevents resurrection of deleted records.
    Throttled to avoid unnecessary table scans on repetitive read requests.
    """
    global _last_sync_timestamp
    now = time.time()
    if not force and (now - _last_sync_timestamp < 45):
        return
    _last_sync_timestamp = now
    cursor = conn.cursor()

    # 1. Bi-directional soft-delete synchronization:
    # If a Member is deleted, ensure linked User is also marked deleted
    cursor.execute("""
    UPDATE User
    SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP
    WHERE COALESCE(isDeleted, 0) = 0 AND (
        memberId IN (SELECT id FROM Member WHERE COALESCE(isDeleted, 0) = 1)
        OR LOWER(TRIM(COALESCE(email, ''))) IN (
            SELECT LOWER(TRIM(email)) FROM Member WHERE COALESCE(isDeleted, 0) = 1 AND email IS NOT NULL AND email != ''
        )
    )
    """)

    # If a User is deleted, ensure linked Member is also marked deleted
    cursor.execute("""
    UPDATE Member
    SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP
    WHERE COALESCE(isDeleted, 0) = 0 AND (
        id IN (SELECT memberId FROM User WHERE COALESCE(isDeleted, 0) = 1 AND memberId IS NOT NULL)
        OR LOWER(TRIM(COALESCE(email, ''))) IN (
            SELECT LOWER(TRIM(email)) FROM User WHERE COALESCE(isDeleted, 0) = 1 AND email IS NOT NULL AND email != ''
        )
    )
    """)

    # 2. Select only active, non-deleted users
    cursor.execute("""
    SELECT id, name, email, role, phone, memberId, status, isApproved, isDeleted, dateOfJoining
    FROM User
    WHERE role IN ('STUDENT', 'STAFF') AND COALESCE(isDeleted, 0) = 0
    """)
    users = cursor.fetchall()
    for u in users:
        u_id = u["id"]
        u_role = u["role"]
        u_name = u["name"] or "HETA Member"
        u_email = (u["email"] or "").strip().lower()
        u_phone = u["phone"] or "+919876543210"
        m_id = u["memberId"]
        u_status = u["status"] or "ACTIVE"
        u_approved = 1 if u["isApproved"] in (1, True, '1') else 0
        u_doj = u["dateOfJoining"] or "2026-01-10"

        # Check if Member exists with this m_id or email
        cursor.execute("SELECT id, code, role, isDeleted FROM Member WHERE id = ? OR LOWER(TRIM(email)) = ?", (m_id or "", u_email))
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
            INSERT INTO Member (id, name, code, role, course, batch, department, phone, email, status, isApproved, isDeleted, dateOfJoining)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """, (new_mid, u_name, code, u_role, course, batch, dept, u_phone, u_email, u_status, u_approved, u_doj))
            cursor.execute("UPDATE User SET memberId = ? WHERE id = ?", (new_mid, u_id))
        else:
            # If member was already deleted, DO NOT resurrect it! Mark User as deleted too!
            if mem["isDeleted"] in (1, True, '1'):
                cursor.execute("UPDATE User SET isDeleted = 1 WHERE id = ?", (u_id,))
            else:
                cursor.execute("""
                UPDATE Member
                SET status = ?, isApproved = ?, dateOfJoining = COALESCE(dateOfJoining, ?)
                WHERE id = ?
                """, (u_status, u_approved, u_doj, mem["id"]))
                if u["memberId"] != mem["id"]:
                    cursor.execute("UPDATE User SET memberId = ? WHERE id = ?", (mem["id"], u_id))
    conn.commit()

def init_db():
    conn = get_raw_connection()
    cursor = conn.cursor()

    # 1. User table with RBAC, Password Hash, Approval Status, Soft Delete
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        passwordHash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STUDENT', -- 'ADMIN', 'STAFF', 'STUDENT'
        phone TEXT,
        memberId TEXT,                        -- Links to Member table
        status TEXT DEFAULT 'ACTIVE',          -- 'ACTIVE', 'PENDING', 'REJECTED', 'INACTIVE'
        isApproved BOOLEAN DEFAULT 1,
        isDeleted BOOLEAN DEFAULT 0,
        dateOfJoining TEXT DEFAULT '2026-01-10',
        approvedAt DATETIME,
        approvedBy TEXT,
        rejectionReason TEXT,
        sessionToken TEXT,
        tokenExpiry DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Member table (Students & Faculty) with Full CRUD, Soft Delete
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Member (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,            -- e.g. HETA-STU-001, HETA-STF-001
        role TEXT NOT NULL DEFAULT 'STUDENT', -- 'STUDENT' or 'STAFF'
        course TEXT DEFAULT 'Python Programming',
        batch TEXT DEFAULT 'Batch-2026-A',
        department TEXT DEFAULT 'Computer Science',
        phone TEXT,
        email TEXT,
        parentName TEXT,
        parentPhone TEXT,
        parentEmail TEXT,
        portionCovered TEXT DEFAULT 'Python Core',
        inTime TEXT DEFAULT '09:00 AM',
        outTime TEXT DEFAULT '05:00 PM',
        status TEXT DEFAULT 'ACTIVE',          -- 'ACTIVE', 'PENDING', 'REJECTED', 'INACTIVE'
        isApproved BOOLEAN DEFAULT 1,
        isDeleted BOOLEAN DEFAULT 0,
        dateOfJoining TEXT DEFAULT '2026-01-10',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 3. Attendance table: Strictly 3 options: PRESENT, ABSENT, HOLIDAY
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Attendance (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        date TEXT NOT NULL,                   -- YYYY-MM-DD
        status TEXT NOT NULL,                 -- Strictly 'PRESENT', 'ABSENT', 'HOLIDAY'
        inTime TEXT,
        outTime TEXT,
        portionCovered TEXT,
        topicCovered TEXT,
        notes TEXT,
        markedBy TEXT DEFAULT 'Admin',
        isDeleted BOOLEAN DEFAULT 0,
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
        leaveType TEXT NOT NULL,              -- 'CASUAL', 'SICK', 'ACADEMIC', 'EMERGENCY'
        startDate TEXT NOT NULL,              -- YYYY-MM-DD
        endDate TEXT NOT NULL,                -- YYYY-MM-DD
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',        -- 'PENDING', 'APPROVED', 'REJECTED'
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewedBy TEXT,
        reviewedAt DATETIME,
        adminRemarks TEXT,
        emailSentToAdmin BOOLEAN DEFAULT 0,
        emailSentToStudent BOOLEAN DEFAULT 0,
        isDeleted BOOLEAN DEFAULT 0,
        FOREIGN KEY(memberId) REFERENCES Member(id) ON DELETE CASCADE
    );
    """)

    # 5. PasswordResetTokens table (Single-Use, 30-Minute Expiry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PasswordResetTokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES User(id) ON DELETE CASCADE
    );
    """)

    # 6. Holiday table (Admin managed holidays)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Holiday (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,                   -- YYYY-MM-DD
        description TEXT,
        isDeleted BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 7. EmailLogs table (Audit trail for dual-leave, signup, password reset, and daily absent emails)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS EmailLogs (
        id TEXT PRIMARY KEY,
        userId TEXT,
        email TEXT NOT NULL,
        emailType TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,                 -- 'SENT', 'FAILED', 'LOGGED_ONLY'
        date TEXT,                            -- YYYY-MM-DD reference
        details TEXT,
        sentAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 8. PortionCovered table (Portions taught)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PortionCovered (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,                   -- YYYY-MM-DD
        course TEXT DEFAULT 'Python Programming',
        batch TEXT DEFAULT 'Batch-2026-A',
        subject TEXT DEFAULT 'Python Core',
        topic TEXT NOT NULL,
        remarks TEXT,
        conductedBy TEXT DEFAULT 'Dr. K. Saravanan',
        isDeleted BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 9. GoogleSheetSync table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS GoogleSheetSync (
        id TEXT PRIMARY KEY,
        accountEmail TEXT DEFAULT 'pravesbalaji144@gmail.com',
        sheetName TEXT DEFAULT 'Attandance Report Mangment',
        sheetId TEXT DEFAULT '1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg',
        sheetUrl TEXT DEFAULT 'https://docs.google.com/spreadsheets/d/1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg/edit',
        lastSyncedAt DATETIME,
        syncStatus TEXT DEFAULT 'READY',
        recordsSynced INTEGER DEFAULT 0,
        log TEXT
    );
    """)

    # ------------------ HIGH PERFORMANCE INDEXES ------------------
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_email_active ON User(email, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_user_role_status ON User(role, status, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_user_memberId ON User(memberId)",
        "CREATE INDEX IF NOT EXISTS idx_member_email_active ON Member(email, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_member_role_status ON Member(role, status, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_member_code ON Member(code)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_lookup ON Attendance(memberId, date, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(date, status, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_leave_lookup ON LeaveRequest(memberId, status, isDeleted)",
        "CREATE INDEX IF NOT EXISTS idx_reset_token ON PasswordResetTokens(token, usedAt)",
        "CREATE INDEX IF NOT EXISTS idx_email_logs_filter ON EmailLogs(email, emailType, date)",
    ]
    for idx_sql in indexes:
        try:
            cursor.execute(idx_sql)
        except Exception:
            pass

    conn.commit()

    # ------------------ SAFELY APPLY COLUMN MIGRATIONS ------------------
    # User table migrations
    cursor.execute("PRAGMA table_info(User)")
    user_cols = {col["name"] for col in cursor.fetchall()}
    user_additions = [
        ("memberId", "TEXT"),
        ("passwordHash", "TEXT"),
        ("sessionToken", "TEXT"),
        ("tokenExpiry", "DATETIME"),
        ("status", "TEXT DEFAULT 'ACTIVE'"),
        ("isApproved", "BOOLEAN DEFAULT 1"),
        ("isDeleted", "BOOLEAN DEFAULT 0"),
        ("dateOfJoining", "TEXT DEFAULT '2026-01-10'"),
        ("approvedAt", "DATETIME"),
        ("approvedBy", "TEXT"),
        ("rejectionReason", "TEXT")
    ]
    for c_name, c_def in user_additions:
        if c_name not in user_cols:
            cursor.execute(f"ALTER TABLE User ADD COLUMN {c_name} {c_def}")

    # Member table migrations
    cursor.execute("PRAGMA table_info(Member)")
    mem_cols = {col["name"] for col in cursor.fetchall()}
    mem_additions = [
        ("course", "TEXT DEFAULT 'Python Programming'"),
        ("batch", "TEXT DEFAULT 'Batch-2026-A'"),
        ("phone", "TEXT"),
        ("email", "TEXT"),
        ("isApproved", "BOOLEAN DEFAULT 1"),
        ("isDeleted", "BOOLEAN DEFAULT 0"),
        ("dateOfJoining", "TEXT DEFAULT '2026-01-10'")
    ]
    for c_name, c_def in mem_additions:
        if c_name not in mem_cols:
            cursor.execute(f"ALTER TABLE Member ADD COLUMN {c_name} {c_def}")

    # Attendance table migrations
    cursor.execute("PRAGMA table_info(Attendance)")
    att_cols = {col["name"] for col in cursor.fetchall()}
    if "isDeleted" not in att_cols:
        cursor.execute("ALTER TABLE Attendance ADD COLUMN isDeleted BOOLEAN DEFAULT 0")

    # LeaveRequest table migrations
    cursor.execute("PRAGMA table_info(LeaveRequest)")
    leave_cols = {col["name"] for col in cursor.fetchall()}
    leave_additions = [
        ("studentName", "TEXT"),
        ("course", "TEXT DEFAULT 'Python Programming'"),
        ("batch", "TEXT DEFAULT 'Batch-2026-A'"),
        ("adminRemarks", "TEXT"),
        ("emailSentToAdmin", "BOOLEAN DEFAULT 0"),
        ("emailSentToStudent", "BOOLEAN DEFAULT 0"),
        ("isDeleted", "BOOLEAN DEFAULT 0")
    ]
    for c_name, c_def in leave_additions:
        if c_name not in leave_cols:
            cursor.execute(f"ALTER TABLE LeaveRequest ADD COLUMN {c_name} {c_def}")

    # PortionCovered table migrations
    cursor.execute("PRAGMA table_info(PortionCovered)")
    portion_cols = {col["name"] for col in cursor.fetchall()}
    if "isDeleted" not in portion_cols:
        cursor.execute("ALTER TABLE PortionCovered ADD COLUMN isDeleted BOOLEAN DEFAULT 0")

    conn.commit()

    # Backfill default values
    cursor.execute("UPDATE User SET status = 'ACTIVE' WHERE status IS NULL")
    cursor.execute("UPDATE User SET isApproved = 1 WHERE isApproved IS NULL")
    cursor.execute("UPDATE User SET isDeleted = 0 WHERE isDeleted IS NULL")
    cursor.execute("UPDATE Member SET isApproved = 1 WHERE isApproved IS NULL")
    cursor.execute("UPDATE Member SET isDeleted = 0 WHERE isDeleted IS NULL")
    cursor.execute("UPDATE Member SET status = 'ACTIVE' WHERE status IS NULL")
    cursor.execute("UPDATE Attendance SET isDeleted = 0 WHERE isDeleted IS NULL")
    cursor.execute("UPDATE LeaveRequest SET isDeleted = 0 WHERE isDeleted IS NULL")

    # Backfill LeaveRequest studentName, course, batch from Member if null
    cursor.execute("""
    UPDATE LeaveRequest
    SET studentName = (SELECT name FROM Member WHERE Member.id = LeaveRequest.memberId),
        course = COALESCE((SELECT course FROM Member WHERE Member.id = LeaveRequest.memberId), 'Python Programming'),
        batch = COALESCE((SELECT batch FROM Member WHERE Member.id = LeaveRequest.memberId), 'Batch-2026-A')
    WHERE studentName IS NULL
    """)

    # Ensure canonical attendance statuses
    cursor.execute("UPDATE Attendance SET status = 'PRESENT' WHERE status = 'LATE'")
    cursor.execute("UPDATE Attendance SET status = 'HOLIDAY' WHERE status = 'PERMISSION'")

    # Seed Admin users if empty or update them
    admin_email_env = os.environ.get("ADMIN_EMAIL", os.environ.get("HETA_SMTP_USER", "pravesbalaji144@gmail.com")).strip().lower()
    admin_pass_env = os.environ.get("ADMIN_PASSWORD", "Heta@123")

    admin_users = [
        ("usr_admin_1", admin_email_env, admin_pass_env, hash_password(admin_pass_env), "Super Admin", "ADMIN", "+919876543210", None),
        ("usr_admin_2", "admin@heta.edu", "Admin@123", hash_password("Admin@123"), "Academic Administrator", "ADMIN", "+919876543211", None),
        ("usr_admin_3", "hetahighereducation@gmail.com", "Heta@123", hash_password("Heta@123"), "HETA Academy Administrator", "ADMIN", "+919876543212", None),
    ]

    for u in admin_users:
        cursor.execute("""
        INSERT OR REPLACE INTO User (id, email, password, passwordHash, name, role, phone, memberId, status, isApproved, isDeleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1, 0)
        """, u)

    # Seed initial Academic Holidays if table is empty
    cursor.execute("SELECT COUNT(*) as count FROM Holiday WHERE isDeleted = 0")
    if cursor.fetchone()["count"] == 0:
        default_holidays = [
            ("hol_01", "New Year's Day", "2026-01-01", "National Holiday"),
            ("hol_02", "Pongal Harvest Festival", "2026-01-14", "State Festival Holiday"),
            ("hol_03", "Thiruvalluvar Day", "2026-01-15", "Academic Holiday"),
            ("hol_04", "Uzhavar Thirunal", "2026-01-16", "Festival Holiday"),
            ("hol_05", "Republic Day", "2026-01-26", "National Holiday"),
            ("hol_06", "Tamil New Year", "2026-04-14", "Traditional Festival Holiday"),
            ("hol_07", "Labour Day", "2026-05-01", "International Workers' Day"),
            ("hol_08", "Independence Day", "2026-08-15", "National Holiday"),
            ("hol_09", "Gandhi Jayanti", "2026-10-02", "National Holiday"),
            ("hol_10", "Ayutha Pooja & Deepavali", "2026-11-08", "Festival Holiday"),
            ("hol_11", "Christmas Celebration", "2026-12-25", "National Holiday"),
        ]
        for h in default_holidays:
            cursor.execute("""
            INSERT OR IGNORE INTO Holiday (id, name, date, description, isDeleted)
            VALUES (?, ?, ?, ?, 0)
            """, h)

    # Auto-heal: Ensure every User with role STUDENT or STAFF has an active linked Member
    sync_users_to_members(conn)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema successfully verified and upgraded at", DB_PATH)
