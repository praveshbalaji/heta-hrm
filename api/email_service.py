"""
HETA Academy Student Management Portal - Professional Email Service
Provides responsive, branded HTML templates with official HETA crest,
ultra-fast asynchronous SMTP delivery, duplicate prevention, and audit logging into EmailLogs.
"""

import os
import smtplib
import uuid
import threading
import concurrent.futures
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

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

ADMIN_DEFAULT_EMAIL = os.environ.get("ADMIN_EMAIL", "pravesbalaji144@gmail.com")
ADMIN_NOTIFY_EMAILS = [
    e.strip() for e in os.environ.get("HETA_ADMIN_EMAILS", f"{ADMIN_DEFAULT_EMAIL},admin@heta.edu,hetahighereducation@gmail.com").split(",") if e.strip()
]
SMTP_HOST = os.environ.get("HETA_SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("HETA_SMTP_PORT", "587"))
SMTP_SENDER = os.environ.get("HETA_SMTP_SENDER", ADMIN_DEFAULT_EMAIL)
SMTP_USER = os.environ.get("HETA_SMTP_USER", SMTP_SENDER)
SMTP_PASS = os.environ.get("HETA_SMTP_PASS", os.environ.get("ADMIN_PASSWORD", "Heta@123"))

APP_URL = os.environ.get("APP_URL", "https://heta-hrm.vercel.app")

# Daemon threadpool executor for asynchronous non-blocking email delivery
_email_executor = concurrent.futures.ThreadPoolExecutor(max_workers=10, thread_name_prefix="HetaEmailWorker")

def get_base_html_template(title: str, preheader: str, body_content: str, button_text: str = None, button_url: str = None) -> str:
    """
    Renders an institutional, responsive email template styled with HETA #127171 Emerald
    and dark charcoal palette, featuring the verified HETA crest and clean layout.
    """
    button_html = ""
    if button_text and button_url:
        button_html = f"""
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 10px 0;">
            <tr>
                <td align="center" style="border-radius: 8px; background-color: #127171;">
                    <a href="{button_url}" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; border: 1px solid #0e5c5c; letter-spacing: 0.3px;">
                        {button_text} &rarr;
                    </a>
                </td>
            </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!--[if mso]>
    <style type="text/css">
    body, table, td {{font-family: Arial, Helvetica, sans-serif !important;}}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px;">
        {preheader}
    </div>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 30px 15px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Institutional Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #09090b 0%, #127171 100%); padding: 32px 24px; color: #ffffff;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 12px;">
                                        <div style="background: #ffffff; border-radius: 50%; width: 68px; height: 68px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid #14b8a6; padding: 4px;">
                                            <img src="{APP_URL}/heta-logo.png" alt="HETA Crest" width="56" height="56" style="display: block; border-radius: 50%; max-width: 56px; max-height: 56px;" onerror="this.style.display='none'" />
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-transform: uppercase;">
                                            HETA ACADEMY
                                        </h1>
                                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">
                                            Higher Education &amp; Training Academy &bull; Est. 2010
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Subject Pill Banner -->
                    <tr>
                        <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 28px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="font-size: 12px; font-weight: 700; color: #127171; text-transform: uppercase; letter-spacing: 0.8px;">
                                        {title}
                                    </td>
                                    <td align="right" style="font-size: 11px; color: #64748b;">
                                        {datetime.now().strftime("%d %b %Y")}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px 30px 24px 30px;">
                            {body_content}
                            {button_html}
                        </td>
                    </tr>

                    <!-- Institutional Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 24px 30px; color: #94a3b8; font-size: 12px; line-height: 1.6; border-top: 1px solid #1e293b;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; font-weight: 700; color: #e2e8f0; font-size: 13px;">
                                            HETA Student &amp; Academic Management Portal
                                        </p>
                                        <p style="margin: 0 0 10px 0; color: #94a3b8;">
                                            This is an automated notification from the official HETA HRM &amp; Attendance Portal. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 0; color: #64748b; font-size: 11px;">
                                            Need assistance? Contact Academic Administration at <a href="mailto:{ADMIN_DEFAULT_EMAIL}" style="color: #2dd4bf; text-decoration: none;">{ADMIN_DEFAULT_EMAIL}</a>.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End Container -->
                <p style="margin: 18px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
                    &copy; {datetime.now().year} HETA Academy of Higher Education. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>"""


# =========================================================================
# 1. PASSWORD RESET EMAIL TEMPLATE
# =========================================================================
def render_password_reset_email(name: str, reset_link: str, expires_minutes: int = 30):
    title = "Password Reset Request"
    preheader = f"Secure link to reset your HETA portal password. Valid for {expires_minutes} minutes."
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Hello {name or 'HETA Member'},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        We received a request to reset your password for the <strong>HETA Student Management Portal</strong>. Click the secure button below to set a new password:
    </p>
    
    <div style="background-color: #f0fdfa; border-left: 4px solid #127171; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #134e4a; line-height: 1.5;">
            <strong>Security Notice:</strong> This single-use link is valid for <strong>{expires_minutes} minutes</strong> only. If you did not make this request, you can safely ignore this email; your account remains secure.
        </p>
    </div>

    <p style="font-size: 12px; color: #64748b; margin: 20px 0 0 0; word-break: break-all;">
        If the button does not work, copy and paste this secure link into your browser:<br>
        <a href="{reset_link}" style="color: #127171;">{reset_link}</a>
    </p>
    """
    return title, get_base_html_template(title, preheader, body, "Reset My Password", reset_link)


# =========================================================================
# 2. SIGNUP RECEIVED - PENDING APPROVAL (STUDENT CONFIRMATION)
# =========================================================================
def render_signup_pending_student_email(name: str, student_id: str, course: str, batch: str):
    title = "Registration Received - Pending Admin Approval"
    preheader = "Your HETA Student Portal registration has been received and is currently under review."
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Welcome {name}!
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Thank you for registering on the <strong>HETA Student Management Portal</strong>. Your account registration has been successfully received and placed in the administrative verification queue.
    </p>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Application Code</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{student_id}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Course</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{course or 'Academic Program'}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Assigned Batch</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{batch or '2026 Batch'}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Account Status</td>
            <td style="padding: 10px 16px; color: #b45309; font-weight: 700;">PENDING APPROVAL</td>
        </tr>
    </table>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 18px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
            <strong>Next Step:</strong> Our academic administrator will review your enrollment credentials shortly. Once approved, you will receive an official activation email allowing you to log in.
        </p>
    </div>
    """
    return title, get_base_html_template(title, preheader, body)


# =========================================================================
# 3. SIGNUP ALERT - TO ADMIN
# =========================================================================
def render_signup_alert_admin_email(name: str, email: str, role: str, code: str, course: str, batch: str):
    title = f"Action Required: New {role} Registration Awaiting Approval"
    preheader = f"New user {name} ({email}) has registered and requires admin review."
    portal_url = f"{APP_URL}/#pending_signups"
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Administrator Alert,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        A new member has completed the registration form and requires administrative verification before access is granted.
    </p>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Full Name</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{name}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Official Email</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{email}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Role / ID Code</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{role} &bull; {code}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Course / Batch</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{course} ({batch})</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Status</td>
            <td style="padding: 10px 16px; color: #b45309; font-weight: 700;">AWAITING APPROVAL</td>
        </tr>
    </table>

    <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        Please review the registration in the Admin Portal and click Approve or Reject.
    </p>
    """
    return title, get_base_html_template(title, preheader, body, "Review Pending Requests", portal_url)


# =========================================================================
# 4. SIGNUP APPROVED (WELCOME EMAIL)
# =========================================================================
def render_signup_approved_email(name: str, email: str, login_url: str = None, temp_password: str = None):
    title = "Account Approved - Welcome to HETA Academy"
    preheader = "Your HETA Portal account has been approved by the administration. You can now log in."
    url = login_url or APP_URL
    pwd_section = ""
    if temp_password:
        pwd_section = f"""
        <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-family: monospace; font-size: 14px; color: #0f172a;">
            <strong>Temporary Password:</strong> <span style="color: #127171; font-weight: 700;">{temp_password}</span>
            <br><span style="font-size: 11px; font-family: sans-serif; color: #64748b;">(You may change this password inside your profile anytime.)</span>
        </div>
        """

    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Congratulations {name}!
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Your registration for the <strong>HETA Student Management Portal</strong> has been verified and <strong>Approved</strong>. Your account status is now <span style="color: #127171; font-weight: 700;">ACTIVE</span>.
    </p>

    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #065f46; line-height: 1.5;">
            <strong>Portal Access Granted:</strong> You can now log in with your registered email (<strong>{email}</strong>) to view daily attendance records, track portions covered, and submit online leave applications.
        </p>
    </div>

    {pwd_section}
    """
    return title, get_base_html_template(title, preheader, body, "Log In to HETA Portal", url)


# =========================================================================
# 5. SIGNUP REJECTED
# =========================================================================
def render_signup_rejected_email(name: str, reason: str = None):
    title = "Registration Application Update - HETA Academy"
    preheader = "Important update regarding your registration application at HETA Academy."
    reason_text = reason or "Submitted credentials or course enrollment details could not be verified."
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Dear {name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Thank you for your interest in the HETA Student Management Portal. Following administrative review, we regret to inform you that your registration could not be approved at this time.
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 12px 16px; font-weight: 700; color: #991b1b; width: 35%;">Reason / Remarks</td>
            <td style="padding: 12px 16px; color: #7f1d1d;">{reason_text}</td>
        </tr>
    </table>

    <p style="font-size: 13px; line-height: 1.6; color: #475569;">
        If you believe this decision is in error or need to rectify your registration details, please reach out to the HETA Academic Office directly.
    </p>
    """
    return title, get_base_html_template(title, preheader, body)


# =========================================================================
# 6. LEAVE APPLIED - CONFIRMATION TO STUDENT
# =========================================================================
def render_leave_applied_student_email(name: str, leave_type: str, start_date: str, end_date: str, reason: str):
    title = "Leave Application Received - Under Review"
    preheader = f"Your leave application from {start_date} to {end_date} has been submitted."
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Hello {name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Your leave application has been successfully submitted to the Academic Administration.
    </p>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Leave Type</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{leave_type}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Duration</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{start_date} to {end_date}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Reason</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{reason}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Decision Status</td>
            <td style="padding: 10px 16px; color: #b45309; font-weight: 700;">PENDING REVIEW</td>
        </tr>
    </table>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        You will receive an automated notification once the administrator reviews and approves or rejects your application.
    </p>
    """
    return title, get_base_html_template(title, preheader, body)


# =========================================================================
# 7. LEAVE APPLIED - ALERT TO ADMIN
# =========================================================================
def render_leave_applied_admin_email(student_name: str, role: str, course: str, batch: str, leave_type: str, start_date: str, end_date: str, reason: str):
    title = f"New Leave Request: {student_name} ({leave_type})"
    preheader = f"{student_name} applied for leave ({start_date} to {end_date}). Action required."
    portal_url = f"{APP_URL}/#leave_approvals"
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Administrator Alert,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        A new student leave request has been submitted and is awaiting your review:
    </p>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Applicant</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{student_name}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Course &amp; Batch</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">{course} &bull; {batch}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Leave Type</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{leave_type}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Dates</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{start_date} to {end_date}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Reason</td>
            <td style="padding: 10px 16px; color: #0f172a;">{reason}</td>
        </tr>
    </table>
    """
    return title, get_base_html_template(title, preheader, body, "Review Leave Request", portal_url)


# =========================================================================
# 8. LEAVE DECISION (APPROVED / REJECTED) - TO STUDENT
# =========================================================================
def render_leave_decision_student_email(name: str, status: str, leave_type: str, start_date: str, end_date: str, remarks: str = None):
    is_approved = (status.upper() == "APPROVED")
    title = f"Leave Request {status.upper()}: {start_date} to {end_date}"
    preheader = f"Your leave request has been {status.lower()} by the administration."
    bg_box = "#ecfdf5" if is_approved else "#fef2f2"
    border_box = "#059669" if is_approved else "#dc2626"
    text_color = "#065f46" if is_approved else "#991b1b"

    remark_row = ""
    if remarks:
        remark_row = f"""
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Admin Remarks</td>
            <td style="padding: 10px 16px; color: #0f172a; font-weight: 600;">{remarks}</td>
        </tr>
        """

    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Hello {name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        An administrative decision has been reached regarding your submitted leave request:
    </p>

    <div style="background-color: {bg_box}; border-left: 4px solid {border_box}; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <span style="font-size: 15px; font-weight: 800; color: {text_color}; text-transform: uppercase; letter-spacing: 0.5px;">
            LEAVE {status.upper()}
        </span>
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Leave Type</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{leave_type}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">Duration</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{start_date} to {end_date}</td>
        </tr>
        {remark_row}
    </table>
    """
    return title, get_base_html_template(title, preheader, body, "View Portal", APP_URL)


# =========================================================================
# 9. DAILY ABSENT REMINDER EMAIL (SCHEDULED JOB)
# =========================================================================
def render_daily_absent_reminder_email(name: str, date_str: str, student_id: str = ""):
    title = f"Attendance Notice: Absent on {date_str}"
    preheader = f"You were marked absent today ({date_str}). Kindly submit an official leave request."
    apply_url = f"{APP_URL}/#leaves"
    body = f"""
    <p style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 600;">
        Dear {name},
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
        Our daily attendance records indicate that you are <strong>Absent today ({date_str})</strong> and no pre-approved leave request was logged on your file.
    </p>

    <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #9f1239; font-weight: 700;">
            Action Required: You are absent today. Kindly apply for leave today.
        </p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #be123c;">
            HETA academic regulations require formal leave submission for all absences to prevent disciplinary attendance penalties.
        </p>
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; font-size: 13px;">
        <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; width: 35%;">Student Identifier</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">{student_id or name}</td>
        </tr>
        <tr>
            <td style="padding: 10px 16px; font-weight: 700; color: #475569;">Recorded Date</td>
            <td style="padding: 10px 16px; color: #0f172a; font-weight: 600;">{date_str}</td>
        </tr>
    </table>
    """
    return title, get_base_html_template(title, preheader, body, "Apply For Leave Now", apply_url)


# =========================================================================
# ASYNC WORKER FOR SMTP DISPATCH
# =========================================================================
def _send_smtp_background(recipient, subject, text_content, html_content, log_id, db_path):
    status = "SENT"
    error_detail = None
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"HETA Academy <{SMTP_SENDER}>"
        msg["To"] = recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        if html_content:
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=4) as server:
            server.starttls()
            try:
                server.login(SMTP_USER, SMTP_PASS)
            except smtplib.SMTPAuthenticationError as auth_err:
                status = "AUTH_REQUIRED"
                error_detail = "Gmail requires a 16-character App Password (https://myaccount.google.com/apppasswords). Please set HETA_SMTP_PASS."
                print(f"[EMAIL SERVICE WARNING] SMTP Auth Error for {recipient}: {error_detail}")
                return
            except Exception as login_err:
                status = "AUTH_FAILED"
                error_detail = str(login_err)
                print(f"[EMAIL SERVICE WARNING] SMTP Login Failed for {recipient}: {login_err}")
                return
            server.send_message(msg)
    except Exception as ex:
        status = "LOGGED_ONLY"
        error_detail = str(ex)
        print(f"[EMAIL SERVICE WARNING] Email to {recipient} logged only: {ex}")
    finally:
        # Update row in db
        try:
            import sqlite3
            conn = sqlite3.connect(db_path, timeout=10.0)
            conn.execute("UPDATE EmailLogs SET status = ?, details = ? WHERE id = ?", (status, error_detail, log_id))
            conn.commit()
            conn.close()
        except Exception:
            pass


def dispatch_email(conn, recipients, subject: str, text_content: str, html_content: str, email_type: str, user_id: str = None, date_ref: str = None):
    """
    Dispatches email asynchronously via thread pool, recording audit logs in EmailLogs immediately.
    Never blocks the HTTP request handler, returning in < 1ms.
    Guarantees no duplicate emails on same day for DAILY_ABSENT_REMINDER.
    """
    if isinstance(recipients, str):
        recipients = [recipients]

    cursor = conn.cursor()
    today_str = date_ref or datetime.now().strftime("%Y-%m-%d")

    # Duplicate check for daily absent reminder
    if email_type == "DAILY_ABSENT_REMINDER":
        for r in recipients:
            cursor.execute("""
            SELECT id FROM EmailLogs
            WHERE email = ? AND emailType = 'DAILY_ABSENT_REMINDER' AND date = ?
            """, (r.strip().lower(), today_str))
            if cursor.fetchone():
                return True, f"Duplicate skipped for {r}"

    results = []
    # Identify database path for background worker
    db_path = getattr(conn, "_db_path", None)
    if not db_path:
        try:
            from database import DB_PATH
            db_path = DB_PATH
        except Exception:
            db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prisma", "heta.db")

    for r in recipients:
        r_clean = r.strip().lower()
        log_id = f"elog_{uuid.uuid4().hex[:12]}"

        # Record in EmailLogs
        try:
            cursor.execute("""
            INSERT INTO EmailLogs (id, userId, email, emailType, subject, status, date, details, sentAt)
            VALUES (?, ?, ?, ?, ?, 'QUEUED', ?, NULL, CURRENT_TIMESTAMP)
            """, (log_id, user_id, r_clean, email_type, subject, today_str))
            conn.commit()
        except Exception as db_ex:
            print(f"[EMAIL SERVICE] Log save error: {db_ex}")

        # Dispatch via thread pool executor (zero thread creation latency)
        _email_executor.submit(_send_smtp_background, r_clean, subject, text_content, html_content, log_id, db_path)
        results.append(f"{r_clean}: DISPATCHED")

    return True, "; ".join(results)
