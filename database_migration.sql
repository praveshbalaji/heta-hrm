-- =========================================================================
-- HETA ACADEMY STUDENT MANAGEMENT PORTAL
-- Comprehensive Database Schema & Migration Script
-- Compatible with SQLite, PostgreSQL, and SQL Server
-- =========================================================================

-- 1. Users Table (RBAC, Authentication, Password Hash, Approval Status, Soft Delete)
CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    passwordHash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT', -- 'ADMIN', 'STAFF', 'STUDENT'
    phone TEXT,
    memberId TEXT,                        -- Foreign key to Member
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

-- 2. Member Directory Table (Students & Faculty Roster)
CREATE TABLE IF NOT EXISTS Member (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,            -- e.g. HETA-STU-001, HETA-STF-001
    role TEXT NOT NULL DEFAULT 'STUDENT', -- 'STUDENT', 'STAFF'
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

-- 3. Attendance Table (Strict 3-State: PRESENT, ABSENT, HOLIDAY)
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

-- 4. LeaveRequest Table (Student-Only, Dual Email Notifications)
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

-- 5. PasswordResetTokens Table (Single-Use, 30-Minute Expiry)
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

-- 6. Holiday Table (Academic Calendar & Public Holidays)
CREATE TABLE IF NOT EXISTS Holiday (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,                   -- YYYY-MM-DD
    description TEXT,
    isDeleted BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. EmailLogs Table (Audit Trail for Automated & Dispatched Emails)
CREATE TABLE IF NOT EXISTS EmailLogs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    email TEXT NOT NULL,
    emailType TEXT NOT NULL,              -- 'ABSENT_REMINDER', 'PASSWORD_RESET', 'SIGNUP_PENDING', etc.
    subject TEXT NOT NULL,
    status TEXT NOT NULL,                 -- 'SENT', 'FAILED', 'SIMULATED'
    date TEXT,                            -- YYYY-MM-DD
    details TEXT,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. PortionCovered Table (Daily Syllabus & Lab Tracking)
CREATE TABLE IF NOT EXISTS PortionCovered (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                   -- YYYY-MM-DD
    course TEXT DEFAULT 'Python Programming',
    batch TEXT DEFAULT 'Batch-2026-A',
    subject TEXT DEFAULT 'Python Core',
    topic TEXT NOT NULL,
    remarks TEXT,
    conductedBy TEXT DEFAULT 'Dr. K. Saravanan',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. GoogleSheetSync Configuration Table
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

-- Indexes for high-performance lookup and queries
CREATE INDEX IF NOT EXISTS idx_user_email ON User(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON User(role, status, isDeleted);
CREATE INDEX IF NOT EXISTS idx_member_code ON Member(code);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(date, status, isDeleted);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON LeaveRequest(status, isDeleted);
CREATE INDEX IF NOT EXISTS idx_holiday_date ON Holiday(date, isDeleted);
CREATE INDEX IF NOT EXISTS idx_email_logs_date ON EmailLogs(email, emailType, date);

