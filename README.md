# 🏆 HETA-HRM: Attendance & Human Resource Management System

A dynamic, full-stack Attendance & HRM web application built for **HETA Higher Education & Training Academy**.

---

## 🌟 Architecture & Features

### 1. 📋 Attendance Matrix Register (Exact Hand-Drawn Sketch Implementation)
- **Student Name Column**: Features all enrolled students (including **BALAJI** as highlighted in your drawing).
- **Portion Covered Column**: Displays the specific syllabus/portion taught (e.g., **Python**).
- **Calendar Day Grid (01 to 31)**: Horizontal date columns with days of the week, weekend markers, and official holidays.
- **Instant Attendance Toggling**: One-click **[P]** (Present) or **[A]** (Absent) toggles with real-time percentage recalculation.
- **Totals & Attendance Rate %**: Automatic live calculation of classes held, attended days, and rate percentage.

### 2. 📢 Absent Parent Messenger (WhatsApp Web & Email)
Whenever a student is marked absent, teachers or admins can click the **Alert** button:
- **Editable Live Message Template**:
  > *"Dear Parent [Parent Name], This is an official intimation from HETA Higher Education. Your son/daughter [Student Name] is marked ABSENT for today's class on [Date]. Portion covered today: Python. Please ensure regular attendance..."*
- **Option 1: Send via WhatsApp Web**:
  - Automatically formats the parent's phone number with international country code.
  - Launches `https://web.whatsapp.com/send?phone=...&text=...` in a new tab with the pre-filled message.
- **Option 2: Send via Email**:
  - Sends direct email notifications configured for `hetahighereducation@gmail.com`.

### 3. 🏢 HRM Leave Management System
- **Staff & Student Portal**: Apply for Casual Leave (CL), Sick Leave, or Half-day Permissions with date range and reason.
- **Super Admin Approval Queue**:
  - Exclusive access for Admin (`hetahighereducation@gmail.com`).
  - One-click **Approve** or **Reject** actions.
  - **Auto-Register Sync**: Approved leaves automatically reflect as **Leave/Permission** in the attendance register!

### 4. 📗 Google Spreadsheet Integration & Custom Reports
- **Connected Account**: `hetahighereducation@gmail.com`
- **One-Click Sync**: Synchronizes all attendance records, In/Out times, and leave logs to Google Sheets format.
- **Daily, Weekly & Monthly Custom Reports**: Filter by role, date, or threshold (<75% attendance alerts).
- **Exports**: One-click **CSV download** for Google Sheets/Excel and **Landscape A4 PDF Print** view.

---

## 🚀 Running the Application

Both servers are active:

| Component | URL | Notes |
| :--- | :--- | :--- |
| **Frontend (React + Vite)** | **`http://localhost:3001/`** | Fast modern UI with HETA Golden Emblem branding |
| **Backend (Python API)** | **`http://localhost:5050/`** | REST endpoints, SQLite + Prisma database |

### Startup Commands (if starting manually):
```powershell
# 1. Start Python Backend
cd C:\Users\balaj\.gemini\antigravity-ide\scratch\heta-hrm\backend
python server.py

# 2. Start React Frontend
cd C:\Users\balaj\.gemini\antigravity-ide\scratch\heta-hrm\frontend
npm run dev -- --port 3001 --host
```

---

## 🔐 Credentials & Admin Access
- **Admin Email**: `hetahighereducation@gmail.com`
- **Admin Password**: `Heta@123`
- **Role**: Super Admin (full HRM controls, leave approval, and attendance management)
