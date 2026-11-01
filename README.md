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

### 4. 📗 Google Spreadsheet Live Master Sync
- **Service Account**: `heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com`
- **One-Click Live Sync**: Automatically creates or updates 5 dedicated worksheets in Google Sheets:
  1. `Daily Attendance` (Complete daily records, In/Out times, status, syllabus covered, and marked-by audit trail)
  2. `Members Directory` (Full student & staff directory with parent contact information)
  3. `Leave Applications` (Leave history, dates, reasons, and dual-email notification audit)
  4. `Portions Covered` (Syllabus and chapter tracking with faculty names)
  5. `Attendance KPI Summary` (Live calculated attendance rate %, classes held, and <75% warnings)
- **Live Spreadsheet Link**: One-click direct link in the UI to open and share your live Google Sheet.
- **Custom Reports & Exports**: Filter by role, date, or threshold (<75% attendance alerts) with CSV and Landscape A4 PDF printing.

---

## ☁️ Vercel Deployment & SMTP Configuration

### Difference Between Service Account and SMTP:
1. **Google Cloud Service Account JSON** (`heta-attandace-report@...`):
   - Used for **Google Sheets & Drive API** to sync data into Google Spreadsheets.
   - Configured via `backend/google-service-account.json` or `GOOGLE_SERVICE_ACCOUNT_JSON` env variable.
2. **SMTP (Simple Mail Transfer Protocol)**:
   - Used for **dispatching emails** (absent student alerts to parents and dual-email leave notices to `hetahighereducation@gmail.com` and `balajimanokaranmd@gmail.com`).
   - Configured via `HETA_SMTP_USER` and `HETA_SMTP_PASS` (Gmail 16-character App Password).

### Step-by-Step Vercel Deployment:
1. **Deploy Frontend to Vercel**:
   - Push repository to GitHub/GitLab.
   - Import into Vercel and set:
     - **Root Directory**: `frontend`
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - In **Environment Variables**:
     - `VITE_API_BASE`: `https://your-backend-api-url.com/api` (or `/api` if using serverless proxy)

2. **Backend Environment Variables (on Vercel / Render / Railway)**:
   - `HETA_SMTP_HOST`: `smtp.gmail.com`
   - `HETA_SMTP_PORT`: `587`
   - `HETA_SMTP_USER`: `hetahighereducation@gmail.com`
   - `HETA_SMTP_PASS`: `[Your 16-character Google App Password]`
   - `HETA_SMTP_SENDER`: `hetahighereducation@gmail.com`
   - `HETA_ADMIN_EMAILS`: `hetahighereducation@gmail.com,balajimanokaranmd@gmail.com`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: `[Full content of google-service-account.json]`

### How to get Gmail SMTP App Password:
1. Go to your Google Account -> **Security**.
2. Enable **2-Step Verification** (if not already enabled).
3. Search for **App passwords** in Google Account settings.
4. Name it `HETA-HRM` and click **Create**.
5. Copy the 16-letter password (e.g., `abcd efgh ijkl mnop`) and set it as `HETA_SMTP_PASS`.

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
