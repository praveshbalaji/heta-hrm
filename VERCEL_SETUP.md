# 🚀 Vercel Deployment & SMTP Configuration Guide

This comprehensive guide explains how to deploy **HETA-HRM** to Vercel and configure SMTP email delivery, Google Sheets synchronization, and environment variables.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Step 1: Deploying to Vercel](#-step-1-deploying-to-vercel)
3. [Step 2: SMTP Configuration (Gmail App Password)](#-step-2-smtp-configuration-gmail-app-password)
4. [Step 3: Setting Environment Variables in Vercel](#-step-3-setting-environment-variables-in-vercel)
5. [Step 4: Google Cloud Service Account Setup](#-step-4-google-cloud-service-account-setup)
6. [Step 5: Verifying Production Deployment](#-step-5-verifying-production-deployment)
7. [Default Roles & Credentials](#-default-roles--credentials)
8. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🏗 Architecture Overview

The repository is pre-configured for full-stack deployment on Vercel:
- **Frontend**: High-performance React 18 + Vite SPA located in `frontend/`.
- **Backend API**: Python Serverless Function located in `api/index.py` using `@vercel/python`.
- **Database**: SQLite database automatically initialized on cold start in `/tmp/heta.db`.
- **Email Delivery**: Asynchronous SMTP dispatch for leave notifications and absent alerts.
- **Bi-Directional Cloud Sync**: Google Sheets API + Google Drive API master synchronizer.

---

## ⚡ Step 1: Deploying to Vercel

### Method A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub (e.g. `https://github.com/praveshbalaji/heta-hrm-portal`).
2. Log in to [Vercel](https://vercel.com).
3. Click **Add New...** → **Project**.
4. Select your **`heta-hrm-portal`** repository and click **Import**.
5. In the project configuration:
   - **Framework Preset**: `Other` or `Vite` (Vercel will detect `vercel.json`).
   - **Root Directory**: `./` (leave as root).
   - **Build Command**: `cd frontend && npm install && npm run build` (pre-configured in `vercel.json`).
   - **Output Directory**: `frontend/dist` (pre-configured in `vercel.json`).
6. Expand **Environment Variables** (see [Step 3](#-step-3-setting-environment-variables-in-vercel)).
7. Click **Deploy**.

### Method B: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to your Vercel account
vercel login

# Deploy to production from repository root
vercel --prod
```

---

## 📧 Step 2: SMTP Configuration (Gmail App Password)

To allow the server to send automated emails (leave application notifications to administrators and absent alerts to students/parents), you need a **16-character Google App Password**.

> [!NOTE]
> Regular Gmail passwords will be rejected by Google's SMTP servers due to modern 2FA security policies. You must create a dedicated App Password.

### How to Generate a Gmail App Password:
1. Open your browser and navigate to **[Google Account Security](https://myaccount.google.com/security)**.
2. Sign in as `pravesbalaji144@gmail.com` (or your chosen sender address).
3. Under **"How you sign in to Google"**, verify that **2-Step Verification** is turned **ON**.
4. In the top search bar of Google Account, type **`App passwords`** and select it (or visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
5. In the **App name** field, enter: `HETA-HRM Portal`.
6. Click **Create**.
7. Google will display a yellow box with a **16-character code** (e.g., `abcd efgh ijkl mnop`).
8. Copy this 16-character code (without spaces: `abcdefghijklmnop`). **This is your `HETA_SMTP_PASS`.**

---

## ⚙️ Step 3: Setting Environment Variables in Vercel

In your Vercel Project Dashboard:
1. Go to **Settings** → **Environment Variables**.
2. Add each of the following keys for **Production**, **Preview**, and **Development**:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `ADMIN_EMAIL` | `pravesbalaji144@gmail.com` | Super Admin login email |
| `ADMIN_PASSWORD` | `Heta@123` | Super Admin initial password |
| `HETA_SMTP_HOST` | `smtp.gmail.com` | SMTP host server (default: `smtp.gmail.com`) |
| `HETA_SMTP_PORT` | `587` | Port for TLS encryption (default: `587`) |
| `HETA_SMTP_USER` | `pravesbalaji144@gmail.com` | Your Gmail address |
| `HETA_SMTP_PASS` | `abcdefghijklmnop` | 16-character Gmail App Password from Step 2 |
| `HETA_SMTP_SENDER` | `pravesbalaji144@gmail.com` | "From" address on outgoing emails |
| `HETA_ADMIN_EMAILS` | `pravesbalaji144@gmail.com,balajimanokaranmd@gmail.com` | Comma-separated admin alert recipients |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `{"type": "service_account", ...}` | Complete JSON key string for Google Sheets sync |

3. Click **Save** on each variable.
4. Redeploy the latest deployment in **Deployments** → **Redeploy** to apply the new variables.

---

## 📊 Step 4: Google Cloud Service Account Setup

To enable one-click synchronization of Attendance, Student Roster, Leave Records, and KPI Summaries into Google Sheets:

1. **Google Cloud Console**:
   - Service Account: `heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com`
   - APIs required: **Google Sheets API** and **Google Drive API** (both must be enabled).
2. **Environment Variable in Vercel**:
   - Open your `backend/google-service-account.json` file.
   - Copy the entire JSON content as a single line.
   - Paste it into the `GOOGLE_SERVICE_ACCOUNT_JSON` variable in Vercel.
3. **Sharing Google Sheets**:
   - If using a pre-existing Google Sheet, share it with:
     `heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com` with **Editor** permissions.
   - Paste the Google Sheet URL or ID into the portal under **Google Sheets Sync** settings.

---

## 🔍 Step 5: Verifying Production Deployment

1. **Check System Health**:
   Visit: `https://your-app-name.vercel.app/api/health`
   Expected response:
   ```json
   {
     "status": "healthy",
     "app": "HETA-HRM Student & Staff Attendance and Leave Management System",
     "version": "2.0.0",
     "adminEmail": "pravesbalaji144@gmail.com",
     "timestamp": "..."
   }
   ```

2. **Verify Frontend UI**:
   Visit: `https://your-app-name.vercel.app/`
   - The Golden Academy Emblem renders crisply.
   - Portal switcher shows **Student Portal**, **Staff Portal**, and **Admin Portal**.
   - 1-Click Role Logins work instantly.

3. **Verify Automated Dual Email**:
   - Log in as Student (`student@heta.edu` / `Student@123`).
   - Submit a Casual Leave request.
   - The system sends instant dual notifications to `pravesbalaji144@gmail.com` and `balajimanokaranmd@gmail.com`.

---

## 🔐 Default Roles & Credentials

All passwords are salted and hashed using secure SHA-256:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `pravesbalaji144@gmail.com` | `Heta@123` | Full administrative control, member CRUD, leave approvals, absent email dispatch, sheets sync |
| **Academic Admin** | `admin@heta.edu` | `Admin@123` | Roster management, attendance entry |
| **Staff Member** | `staff@heta.edu` | `Staff@123` | Daily attendance marking, batch roll call, attendance matrix |
| **Student** | `student@heta.edu` | `Student@123` | Attendance history, calendar view, leave applications |

---

## ❓ Troubleshooting & FAQ

### 1. `smtplib.SMTPAuthenticationError: (535, '5.7.8 Username and Password not accepted')`
- **Cause**: Using your normal Google password instead of an App Password, or 2-Step Verification is disabled.
- **Solution**: Follow [Step 2](#-step-2-smtp-configuration-gmail-app-password) to generate a 16-character App Password at `myaccount.google.com/apppasswords`.

### 2. `Google Drive API has not been used in project...`
- **Cause**: Service account project has Sheets API enabled but Drive API disabled.
- **Solution**: Visit `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=united-watch-513401-b4` and click **Enable**. Alternatively, create a Google Sheet manually and share it with the service account email.

### 3. Vercel Serverless Function Cold Starts
- **Behavior**: The first API call after inactivity may take 1-2 seconds while the Python runtime initializes.
- **Solution**: The database in `/tmp/heta.db` auto-migrates and seeds tables in under 50ms upon invocation.

