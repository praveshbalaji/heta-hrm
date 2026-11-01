import sqlite3
import os
import json
from datetime import datetime, date, timedelta

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prisma")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "heta.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # User table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'ADMIN',
        phone TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Member table (Student or Staff)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Member (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL, -- 'STUDENT' or 'STAFF'
        department TEXT DEFAULT 'Computer Science',
        portionCovered TEXT DEFAULT 'Python', -- matches the sketch column
        parentName TEXT,
        parentPhone TEXT,
        parentEmail TEXT,
        inTime TEXT DEFAULT '09:00 AM',
        outTime TEXT DEFAULT '05:00 PM',
        status TEXT DEFAULT 'ACTIVE',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Attendance table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Attendance (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE', 'PERMISSION', 'HOLIDAY'
        inTime TEXT,
        outTime TEXT,
        portionCovered TEXT DEFAULT 'Python',
        topicCovered TEXT,
        notes TEXT,
        markedBy TEXT DEFAULT 'Admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(memberId, date),
        FOREIGN KEY(memberId) REFERENCES Member(id) ON DELETE CASCADE
    );
    """)

    # LeaveRequest table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS LeaveRequest (
        id TEXT PRIMARY KEY,
        memberId TEXT NOT NULL,
        leaveType TEXT NOT NULL, -- 'CASUAL', 'SICK', 'PERMISSION', 'HALF_DAY', 'EMERGENCY'
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewedBy TEXT,
        reviewedAt DATETIME,
        adminNotes TEXT,
        FOREIGN KEY(memberId) REFERENCES Member(id) ON DELETE CASCADE
    );
    """)

    # DailyTopic table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS DailyTopic (
        id TEXT PRIMARY KEY,
        date TEXT UNIQUE NOT NULL,
        topic TEXT NOT NULL,
        portion TEXT DEFAULT 'Python',
        conductedBy TEXT DEFAULT 'Staff',
        notes TEXT
    );
    """)

    # GoogleSheetSync table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS GoogleSheetSync (
        id TEXT PRIMARY KEY,
        accountEmail TEXT DEFAULT 'hetahighereducation@gmail.com',
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

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) as count FROM User")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO User (id, email, password, name, role, phone)
        VALUES ('usr_admin_1', 'hetahighereducation@gmail.com', 'Heta@123', 'HETA Super Admin', 'SUPER_ADMIN', '+919876543210')
        """)
        cursor.execute("""
        INSERT INTO User (id, email, password, name, role, phone)
        VALUES ('usr_admin_2', 'admin@heta.edu', 'admin123', 'Academic Admin', 'ADMIN', '+919876543211')
        """)

    # Seed members if empty
    cursor.execute("SELECT COUNT(*) as count FROM Member")
    if cursor.fetchone()["count"] == 0:
        initial_members = [
            # Students
            ("stu_2", "Deepika J", "HETA-STU-001", "STUDENT", "Python Programming", "Python", "Janakiraman", "+919444112233", "deepika.parent@example.com", "09:10 AM", "05:00 PM"),
            ("stu_3", "Rashida Begum S", "HETA-STU-002", "STUDENT", "Python Programming", "Python", "Syed", "+919884223344", "rashida.parent@example.com", "09:05 AM", "05:00 PM"),
            ("stu_4", "Yuvashree M", "HETA-STU-003", "STUDENT", "Python Programming", "Python", "Murugan", "+919710334455", "yuvashree.parent@example.com", "09:15 AM", "05:00 PM"),
            ("stu_5", "Dhanalakshmi V", "HETA-STU-004", "STUDENT", "Python Programming", "Python", "Venkatesan", "+919841445566", "dhana.parent@example.com", "08:55 AM", "05:00 PM"),
            ("stu_6", "Hemanathan A", "HETA-STU-005", "STUDENT", "Python Programming", "Python", "Arumugam", "+919940556677", "hema.parent@example.com", "09:00 AM", "05:00 PM"),
            ("stu_7", "Bharani Rajan S", "HETA-STU-006", "STUDENT", "Python Programming", "Python", "Srinivasan", "+919884667788", "bharani.parent@example.com", "09:00 AM", "05:00 PM"),
            ("stu_8", "Madhumitha R", "HETA-STU-007", "STUDENT", "Python Programming", "Python", "Radhakrishnan", "+919790778899", "madhu.parent@example.com", "09:02 AM", "05:00 PM"),
            ("stu_9", "Riyaz Khan H", "HETA-STU-008", "STUDENT", "Python Programming", "Python", "Habibullah", "+919600889900", "riyaz.parent@example.com", "09:12 AM", "05:00 PM"),
            ("stu_10", "Santhosh K P", "HETA-STU-009", "STUDENT", "Python Programming", "Python", "Perumal", "+919500990011", "santhosh.parent@example.com", "09:00 AM", "05:00 PM"),
            ("stu_11", "G. Sowlagya", "HETA-STU-010", "STUDENT", "Python Programming", "Python", "Gopal", "+919445112244", "sowlagya.parent@example.com", "09:05 AM", "05:00 PM"),
            ("stu_12", "Thirumurugan", "HETA-STU-011", "STUDENT", "Python Programming", "Python", "Chidambaram", "+919840223355", "thiru.parent@example.com", "09:00 AM", "05:00 PM"),
            ("stu_13", "Ramkumar", "HETA-STU-012", "STUDENT", "Python Programming", "Python", "Kalyanasundaram", "+919710445577", "ram.parent@example.com", "09:08 AM", "05:00 PM"),

            # Staff Members
            ("stf_1", "Dr. K. Saravanan", "HETA-EMP-101", "STAFF", "Computer Science", "Python & Data Science", "Self", "+919840998877", "saravanan@heta.edu", "08:45 AM", "05:15 PM"),
            ("stf_2", "Prof. R. Priya", "HETA-EMP-102", "STAFF", "Computer Science", "Python Core & Labs", "Self", "+919840887766", "priya@heta.edu", "08:50 AM", "05:10 PM"),
            ("stf_3", "Er. M. Ramesh Kumar", "HETA-EMP-103", "STAFF", "Training & Placement", "Full Stack Python", "Self", "+919840776655", "ramesh@heta.edu", "08:40 AM", "05:30 PM"),
        ]

        for m in initial_members:
            cursor.execute("""
            INSERT INTO Member (id, name, code, role, department, portionCovered, parentName, parentPhone, parentEmail, inTime, outTime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, m)

        # Seed Daily Topics
        topics = [
            ("2026-10-26", "Python Control Flow & Loops", "Python", "Dr. K. Saravanan"),
            ("2026-10-27", "Functions, Lambda & Scope", "Python", "Prof. R. Priya"),
            ("2026-10-28", "Data Structures: Lists, Tuples & Sets", "Python", "Dr. K. Saravanan"),
            ("2026-10-29", "Dictionaries & Comprehensions", "Python", "Prof. R. Priya"),
            ("2026-10-30", "File Handling & CSV Processing", "Python", "Er. M. Ramesh Kumar"),
            ("2026-10-31", "Object-Oriented Programming (OOP)", "Python", "Dr. K. Saravanan"),
            ("2026-11-01", "Database Integration with SQLite & Prisma", "Python", "Er. M. Ramesh Kumar"),
        ]
        for t in topics:
            cursor.execute("INSERT OR REPLACE INTO DailyTopic (id, date, topic, portion, conductedBy) VALUES (?, ?, ?, ?, ?)",
                           (f"top_{t[0]}", t[0], t[1], t[2], t[3]))

        # Seed historical attendance for the last 7 days
        today = date.today()
        cursor.execute("SELECT id, name, role FROM Member")
        all_members = cursor.fetchall()

        for day_offset in range(6, -1, -1):
            curr_date = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
            # Skip Sundays
            weekday_idx = (today - timedelta(days=day_offset)).weekday()
            if weekday_idx == 6: # Sunday
                continue

            for idx, member in enumerate(all_members):
                # Realistic attendance distribution
                if (idx + day_offset) % 5 == 0:
                    status = "ABSENT"
                    in_time = "-"
                    out_time = "-"
                elif (idx + day_offset) % 7 == 0:
                    status = "PERMISSION"
                    in_time = "09:30 AM"
                    out_time = "02:00 PM"
                elif (idx + day_offset) % 9 == 0:
                    status = "LATE"
                    in_time = "09:40 AM"
                    out_time = "05:10 PM"
                else:
                    status = "PRESENT"
                    in_time = "08:55 AM"
                    out_time = "05:02 PM"

                cursor.execute("""
                INSERT OR REPLACE INTO Attendance (id, memberId, date, status, inTime, outTime, portionCovered, topicCovered, markedBy)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"att_{member['id']}_{curr_date}",
                    member["id"],
                    curr_date,
                    status,
                    in_time,
                    out_time,
                    "Python",
                    "Core Python Concepts",
                    "Super Admin"
                ))

        # Seed sample leave requests
        cursor.execute("""
        INSERT INTO LeaveRequest (id, memberId, leaveType, startDate, endDate, reason, status, appliedAt)
        VALUES ('lv_1', 'stu_2', 'SICK', '2026-11-02', '2026-11-03', 'Severe fever and medical consultation', 'PENDING', datetime('now', '-2 hours'))
        """)
        cursor.execute("""
        INSERT INTO LeaveRequest (id, memberId, leaveType, startDate, endDate, reason, status, appliedAt)
        VALUES ('lv_2', 'stf_2', 'CASUAL', '2026-11-05', '2026-11-06', 'Family wedding function in Madurai', 'PENDING', datetime('now', '-1 day'))
        """)
        cursor.execute("""
        INSERT INTO LeaveRequest (id, memberId, leaveType, startDate, endDate, reason, status, appliedAt, reviewedBy, reviewedAt, adminNotes)
        VALUES ('lv_3', 'stu_3', 'PERMISSION', '2026-10-30', '2026-10-30', 'Passport verification appointment', 'APPROVED', datetime('now', '-2 days'), 'HETA Super Admin', datetime('now', '-2 days'), 'Permitted from 11 AM to 2 PM')
        """)

        # Seed GoogleSheetSync record
        cursor.execute("""
        INSERT INTO GoogleSheetSync (id, accountEmail, sheetName, sheetUrl, syncStatus, recordsSynced, lastSyncedAt, log)
        VALUES (
            'gsheet_cfg_1',
            'hetahighereducation@gmail.com',
            'HETA-HRM Attendance Master',
            'https://docs.google.com/spreadsheets/d/1_HETA_HRM_Attendance_hetahighereducation/edit',
            'SUCCESS',
            48,
            CURRENT_TIMESTAMP,
            'Initialized Google Spreadsheet integration for hetahighereducation@gmail.com'
        )
        """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
