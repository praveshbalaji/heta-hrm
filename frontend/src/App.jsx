import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye, EyeOff,
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet,
  Download, Printer, Send, MessageCircle, Mail, UserCheck, Users,
  Building, Check, X, ShieldAlert, Sparkles, RefreshCw, Plus, Trash2,
  ExternalLink, ChevronRight, BookOpen, Search, User, LogOut, Lock,
  Edit2, Save, Filter, LayoutDashboard, CheckSquare, FileText, Bell, Shield, Copy,
  GraduationCap, Briefcase, Menu
} from './icons';
import {
  ForgotPasswordCard,
  ResetPasswordScreen,
  PendingApprovalsTab,
  HolidaysTab,
  EmailLogsTab
} from './PortalModules';
import {
  AddUserModal,
  EditUserModal,
  ViewUserModal,
  HolidayModal
} from './PortalModals';

import { printOverallReport, printIndividualReport } from './reportPrintHelper';

const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5050/api' : '/api');

// Route normalization helper to prevent trailing slashes and query strings from breaking route guards
export const normalizeRoute = (p) => {
  if (!p) return '/';
  let clean = p.split('?')[0].split('#')[0].trim().toLowerCase();
  clean = clean.replace(/\/+$/, '');
  return clean || '/';
};

export default function App() {
  // ------------------ ROUTING & AUTH STATE ------------------
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return normalizeRoute(window.location.pathname || '/');
    }
    return '/';
  });
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('heta_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [rememberMe, setRememberMe] = useState(true);
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return localStorage.getItem('heta_remember_email') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [signupPendingNotice, setSignupPendingNotice] = useState('');

  // Password reset via token
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('reset_token');
      if (p) return p;
      if (window.location.hash.includes('token=')) {
        const m = window.location.hash.match(/token=([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
    }
    return '';
  });

  // Admin New Modules states
  const [pendingSignupsList, setPendingSignupsList] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [emailLogsList, setEmailLogsList] = useState([]);
  const [runningAbsentCheck, setRunningAbsentCheck] = useState(false);

  // User Directory Modals & Pagination
  const [userPage, setUserPage] = useState(1);
  const userPageSize = 10;
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserRole, setAddUserRole] = useState('STUDENT');
  const [editUserModal, setEditUserModal] = useState(false);
  const [editingUserData, setEditingUserData] = useState(null);
  const [viewUserModal, setViewUserModal] = useState(false);
  const [viewingUserData, setViewingUserData] = useState(null);

  // Multi-Select & Bulk Delete
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Holidays Modal
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [editingHolidayData, setEditingHolidayData] = useState(null);

  // Reject Reason Dialog
  const [rejectDialog, setRejectDialog] = useState({ open: false, userId: null, userName: '', reason: '' });

  // ------------------ SHADCN THEME (BLACK/WHITE vs EMERALD GREEN) ------------------
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('heta_theme') || 'bw';
  });

  useEffect(() => {
    localStorage.setItem('heta_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isGreen = theme === 'green';

  const themeTokens = useMemo(() => {
    return {
      isGreen,
      canvasBg: isGreen ? '#f5fbfb' : '#fcfcfd',
      sidebarBg: '#ffffff',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardInner: isGreen ? '#f0f7f7' : '#f8fafc',
      cardBorder: isGreen ? '#c8e3e3' : '#e4e4e7',
      inputBg: '#ffffff',
      inputBorder: isGreen ? '#a7d3d3' : '#d4d4d8',
      primaryBtn: isGreen ? '#127171' : '#09090b',
      primaryBtnFg: '#ffffff',
      primaryBtnHover: isGreen ? '#0e5959' : '#27272a',
      secondaryBtn: isGreen ? '#e6f4f4' : '#f4f4f5',
      secondaryBtnFg: isGreen ? '#127171' : '#09090b',
      secondaryBtnBorder: isGreen ? '#c8e3e3' : '#e4e4e7',
      accentText: isGreen ? '#127171' : '#09090b',
      headingText: isGreen ? '#0c3333' : '#09090b',
      textMain: isGreen ? '#0c3333' : '#09090b',
      mutedText: isGreen ? '#3d6a6a' : '#52525b',
      dimText: isGreen ? '#6d9696' : '#71717a',
      badgeBg: isGreen ? 'rgba(18, 113, 113, 0.1)' : '#f4f4f5',
      badgeBorder: isGreen ? 'rgba(18, 113, 113, 0.3)' : '#e4e4e7',
      badgeText: isGreen ? '#127171' : '#09090b',
      tableHeaderBg: isGreen ? '#f0f7f7' : '#f8fafc',
      iconColor: isGreen ? '#127171' : '#09090b',
      iconMuted: isGreen ? '#3d6a6a' : '#52525b',
      iconBadge: isGreen ? '#127171' : '#09090b',
      iconActive: isGreen ? '#127171' : '#ffffff'
    };
  }, [isGreen]);

  const renderThemeToggle = () => (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: isGreen ? '#e6f4f4' : '#f4f4f5',
      border: `1px solid ${isGreen ? '#c8e3e3' : '#e4e4e7'}`,
      borderRadius: 999,
      padding: '3px 4px',
      gap: 3
    }}>
      <button
        type="button"
        onClick={() => setTheme('bw')}
        title="White BG & Black Component Theme"
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          border: 'none',
          background: !isGreen ? '#09090b' : 'transparent',
          color: !isGreen ? '#ffffff' : '#64748b',
          fontWeight: 700,
          fontSize: 11,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          transition: 'all 0.15s ease'
        }}
      >
        <span>⚪</span> B&W (Black &amp; White)
      </button>
      <button
        type="button"
        onClick={() => setTheme('green')}
        title="Teal Green Theme (#127171)"
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          border: 'none',
          background: isGreen ? '#127171' : 'transparent',
          color: isGreen ? '#ffffff' : '#64748b',
          fontWeight: 700,
          fontSize: 11,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          transition: 'all 0.15s ease'
        }}
      >
        <span>🟢</span> #127171 Green
      </button>
    </div>
  );

  // ------------------ REGISTRATION / SIGNUP FORM STATE ------------------
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    code: '',
    phone: '',
    course: '',
    batch: '',
    department: '',
    facultyRole: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    password: '',
    confirmPassword: ''
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');

  // ------------------ FIELD-LEVEL VALIDATION RULES & ERROR STATES ------------------
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[+]?[\d\s-]{10,15}$/;

  const [loginErrors, setLoginErrors] = useState({});
  const [loginTouched, setLoginTouched] = useState({});

  const [signupErrors, setSignupErrors] = useState({});
  const [signupTouched, setSignupTouched] = useState({});

  const [leaveErrors, setLeaveErrors] = useState({});
  const [leaveTouched, setLeaveTouched] = useState({});

  const [memberErrors, setMemberErrors] = useState({});
  const [memberTouched, setMemberTouched] = useState({});

  const [portionErrors, setPortionErrors] = useState({});
  const [portionTouched, setPortionTouched] = useState({});

  const validateLoginField = (field, value) => {
    let err = '';
    const val = (value || '').trim();
    if (field === 'loginEmail') {
      if (!val) err = 'Email or ID code is required.';
    } else if (field === 'loginPassword') {
      if (!value) err = 'Password is required.';
      else if (value.length < 4) err = 'Password must be at least 4 characters.';
    }
    setLoginErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validateSignupField = (field, value, formSnapshot, portalRole) => {
    let err = '';
    const val = (value || '').trim();
    const isStudent = portalRole === 'STUDENT';

    if (field === 'name') {
      if (!val) err = isStudent ? 'Student full name is required.' : 'Faculty full name is required.';
      else if (val.length < 2) err = 'Name must be at least 2 characters.';
    } else if (field === 'email') {
      if (!val) err = 'Official email address is required.';
      else if (!EMAIL_REGEX.test(val)) err = 'Please enter a valid email address.';
    } else if (field === 'phone') {
      if (!val) err = 'Contact phone number is required.';
      else if (!PHONE_REGEX.test(val.replace(/\s+/g, ''))) err = 'Enter a valid 10-15 digit phone number.';
    } else if (field === 'course' && isStudent) {
      if (!val) err = 'Enrolled course is required.';
    } else if (field === 'batch' && isStudent) {
      if (!val) err = 'Assigned batch is required.';
    } else if (field === 'parentName' && isStudent) {
      if (!val) err = 'Parent / Guardian name is required.';
    } else if (field === 'parentPhone' && isStudent) {
      if (!val) err = 'Parent phone number is required.';
      else if (!PHONE_REGEX.test(val.replace(/\s+/g, ''))) err = 'Enter a valid 10-15 digit parent phone.';
    } else if (field === 'parentEmail' && isStudent) {
      if (!val) err = 'Parent email address is required.';
      else if (!EMAIL_REGEX.test(val)) err = 'Enter a valid parent email address.';
    } else if (field === 'facultyRole' && !isStudent) {
      if (!val) err = 'Faculty role or designation is required.';
    } else if (field === 'password') {
      if (!value) err = 'Password is required.';
      else if (value.length < 6) err = 'Password must be at least 6 characters.';
    } else if (field === 'confirmPassword') {
      if (!value) err = 'Please confirm your password.';
      else if (value !== (formSnapshot ? formSnapshot.password : signupForm.password)) err = 'Passwords do not match.';
    }

    setSignupErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validateSignupAll = (portalRole) => {
    const isStudent = portalRole === 'STUDENT';
    const fields = isStudent
      ? ['name', 'email', 'phone', 'course', 'batch', 'parentName', 'parentPhone', 'parentEmail', 'password', 'confirmPassword']
      : ['name', 'email', 'phone', 'facultyRole', 'password', 'confirmPassword'];

    const newErrors = {};
    const newTouched = {};
    fields.forEach(f => {
      newTouched[f] = true;
      const err = validateSignupField(f, signupForm[f], signupForm, portalRole);
      if (err) newErrors[f] = err;
    });

    setSignupTouched(newTouched);
    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLoginAll = () => {
    const errEmail = validateLoginField('loginEmail', loginEmail);
    const errPass = validateLoginField('loginPassword', loginPassword);
    setLoginTouched({ loginEmail: true, loginPassword: true });
    return !errEmail && !errPass;
  };

  const validateLeaveField = (field, value, formSnapshot) => {
    let err = '';
    const val = (value || '').trim();
    if (field === 'startDate') {
      if (!val) err = 'Start date is required.';
    } else if (field === 'endDate') {
      if (!val) err = 'End date is required.';
      else if (formSnapshot && formSnapshot.startDate && val < formSnapshot.startDate) {
        err = 'End date cannot be earlier than start date.';
      }
    } else if (field === 'reason') {
      if (!val) err = 'Reason for leave is required.';
      else if (val.length < 5) err = 'Reason must be at least 5 characters.';
    }
    setLeaveErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validateLeaveAll = () => {
    const fields = ['startDate', 'endDate', 'reason'];
    const newErrors = {};
    const newTouched = {};
    fields.forEach(f => {
      newTouched[f] = true;
      const err = validateLeaveField(f, studentLeaveForm[f], studentLeaveForm);
      if (err) newErrors[f] = err;
    });
    setLeaveTouched(newTouched);
    setLeaveErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePortionField = (field, value) => {
    let err = '';
    const val = (value || '').trim();
    if (field === 'date') {
      if (!val) err = 'Date is required.';
    } else if (field === 'subject') {
      if (!val) err = 'Subject / Module is required.';
    } else if (field === 'topic') {
      if (!val) err = 'Topic covered is required.';
      else if (val.length < 3) err = 'Topic must be at least 3 characters.';
    }
    setPortionErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validatePortionAll = () => {
    const fields = ['date', 'subject', 'topic'];
    const newErrors = {};
    const newTouched = {};
    fields.forEach(f => {
      newTouched[f] = true;
      const err = validatePortionField(f, portionForm[f]);
      if (err) newErrors[f] = err;
    });
    setPortionTouched(newTouched);
    setPortionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMemberField = (field, value) => {
    let err = '';
    const val = (value || '').trim();
    if (field === 'name') {
      if (!val) err = 'Full name is required.';
      else if (val.length < 2) err = 'Name must be at least 2 characters.';
    } else if (field === 'email' && val) {
      if (!EMAIL_REGEX.test(val)) err = 'Invalid email address format.';
    } else if (field === 'phone' && val) {
      if (!PHONE_REGEX.test(val.replace(/\s+/g, ''))) err = 'Invalid 10-15 digit phone number.';
    }
    setMemberErrors(prev => ({ ...prev, [field]: err }));
    return err;
  };

  const validateMemberAll = () => {
    const fields = ['name', 'email', 'phone'];
    const newErrors = {};
    const newTouched = {};
    fields.forEach(f => {
      newTouched[f] = true;
      const err = validateMemberField(f, newMemberForm[f]);
      if (err) newErrors[f] = err;
    });
    setMemberTouched(newTouched);
    setMemberErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Active Tab per Portal
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusToast, setStatusToast] = useState({ show: false, text: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  // Global Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // ------------------ DATA STATES ------------------
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [roleFilter, setRoleFilter] = useState('STUDENT'); // 'STUDENT' or 'STAFF'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // All Signed-Up Users Master State
  const [signedUpUsers, setSignedUpUsers] = useState({ users: [], total: 0, stats: {} });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('All Batches');

  // Attendance Registers
  const [dailyData, setDailyData] = useState(null);
  const [matrixData, setMatrixData] = useState(null);

  // Members Master (CRUD Table)
  const [membersList, setMembersList] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberCourseFilter, setMemberCourseFilter] = useState('All');
  const [memberStatusFilter, setMemberStatusFilter] = useState('All');
  const [memberSortColumn, setMemberSortColumn] = useState('name');
  const [memberSortDir, setMemberSortDir] = useState('asc'); // 'asc' or 'desc'
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(8);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({});
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '', role: 'STUDENT', course: '', batch: '',
    department: '', phone: '', email: '', parentName: '', parentPhone: '', parentEmail: ''
  });

  // Daily Attendance Inline Editing State
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editAttendanceForm, setEditAttendanceForm] = useState({ inTime: '', outTime: '', notes: '' });

  // Portion Covered
  const [portionsList, setPortionsList] = useState([]);
  const [portionFilterMonth, setPortionFilterMonth] = useState('2026-10');
  const [portionSubjectFilter, setPortionSubjectFilter] = useState('All');
  const [addPortionModal, setAddPortionModal] = useState(false);
  const [editingPortionId, setEditingPortionId] = useState(null);
  const [portionForm, setPortionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    course: 'Python Programming', batch: 'Batch-2026-A', subject: 'Python Core',
    topic: '', remarks: '', conductedBy: auth?.user?.name || ''
  });

  // Leaves & Email Management
  const [leavesList, setLeavesList] = useState([]);
  const [studentLeaveForm, setStudentLeaveForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    leaveType: 'CASUAL',
    reason: ''
  });
  const [adminReviewRemark, setAdminReviewRemark] = useState({});
  const [reviewLoading, setReviewLoading] = useState(false);

  // Absent Alerts (WhatsApp & Email)
  const [absentModal, setAbsentModal] = useState({ open: false, data: null, customMessage: '', recipientEmail: '', recipientPhone: '' });
  const [alertSending, setAlertSending] = useState(false);

  // Custom Reports (Overall & Individual)
  const [reportType, setReportType] = useState('OVERALL'); // 'OVERALL' or 'INDIVIDUAL'
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rangeMatrixData, setRangeMatrixData] = useState(null);
  const [individualData, setIndividualData] = useState(null);

  // Google Sheets
  const [sheetConfig, setSheetConfig] = useState(null);
  const [targetSheetUrl, setTargetSheetUrl] = useState('');
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [savingSheetConfig, setSavingSheetConfig] = useState(false);
  const [sheetSyncError, setSheetSyncError] = useState('');

  // ------------------ HELPER NOTIFICATIONS ------------------
  const showToast = (text, type = 'success') => {
    setStatusToast({ show: true, text, type });
    setTimeout(() => setStatusToast({ show: false, text: '', type: 'success' }), 4500);
  };

  // ------------------ ROUTING LISTENERS ------------------
  const navigateTo = (path) => {
    const targetRoute = normalizeRoute(path);
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
    setCurrentPath(targetRoute);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(normalizeRoute(window.location.pathname || '/'));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync route on initial load if root
  useEffect(() => {
    const activeRoute = normalizeRoute(currentPath);
    if (activeRoute === '/' && auth) {
      if (auth.user.role === 'ADMIN') navigateTo('/admin');
      else if (auth.user.role === 'STAFF') navigateTo('/staff');
      else if (auth.user.role === 'STUDENT') navigateTo('/student');
    }
  }, []);

  // ------------------ AUTHENTICATION HANDLERS ------------------
  const handleLogin = async (e, portal) => {
    if (e) e.preventDefault();
    if (!validateLoginAll()) return;
    setLoginLoading(true);
    setLoginError('');
    setSignupPendingNotice('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
          portalRole: portal // 'ADMIN', 'STAFF', 'STUDENT'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      // Remember Me
      if (rememberMe) {
        localStorage.setItem('heta_remember_email', loginEmail.trim());
      } else {
        localStorage.removeItem('heta_remember_email');
      }

      const authData = { token: data.token, user: data.user, expiresAt: data.expiresAt };
      localStorage.setItem('heta_auth', JSON.stringify(authData));
      setAuth(authData);
      showToast(data.message || `Signed in as ${data.user.name}`);
      setLoginPassword('');
    } catch (err) {
      setLoginError('Could not connect to backend server. Make sure Python backend is running.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e, portalRole) => {
    if (e) e.preventDefault();
    if (!validateSignupAll(portalRole)) return;
    setSignupLoading(true);
    setSignupError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setSignupError('Passwords do not match. Please re-enter.');
      setSignupLoading(false);
      return;
    }
    if (signupForm.password.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      setSignupLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: portalRole,
          name: signupForm.name.trim(),
          email: signupForm.email.trim(),
          code: signupForm.code.trim().toUpperCase(),
          phone: signupForm.phone.trim(),
          password: signupForm.password.trim(),
          course: signupForm.course.trim(),
          batch: signupForm.batch.trim(),
          department: signupForm.facultyRole.trim() || signupForm.department.trim(),
          facultyRole: signupForm.facultyRole.trim() || signupForm.department.trim(),
          parentName: signupForm.parentName.trim(),
          parentPhone: signupForm.parentPhone.trim(),
          parentEmail: signupForm.parentEmail.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSignupError(data.error || 'Registration failed. Please check your information.');
        return;
      }

      // Registration is Pending Admin Approval!
      setSignupPendingNotice(data.message || "Registration submitted! Your account is pending administrator approval. You will receive an email once approved.");
      setAuthMode('login');
      setLoginEmail(signupForm.email.trim());
      setSignupForm({
        name: '', email: '', code: '', phone: '',
        course: '', batch: '',
        department: '', facultyRole: '', parentName: '', parentPhone: '', parentEmail: '',
        password: '', confirmPassword: ''
      });
      showToast('Registration submitted for admin approval');
    } catch (err) {
      setSignupError('Network error during registration. Please verify connection.');
    } finally {
      setSignupLoading(false);
    }
  };

  // ------------------ NEW PORTAL MODULES HANDLERS ------------------
  const fetchPendingSignups = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/pending-signups`);
      const data = await res.json();
      if (data.success) setPendingSignupsList(data.pendingUsers || []);
    } catch (err) {
      console.error('Error fetching pending signups:', err);
    }
  };

  const handleApproveSignup = async (userId, name) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approve-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, adminName: auth?.user?.name || 'Super Admin' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Approved ${name}`);
        fetchPendingSignups();
        fetchSignedUpUsers();
        fetchDashboardStats();
      } else {
        showToast(data.error || 'Failed to approve signup', 'error');
      }
    } catch (err) {
      showToast('Network error during approval', 'error');
    }
  };

  const handleRejectSignup = async (userId, reason) => {
    try {
      const res = await fetch(`${API_BASE}/admin/reject-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Registration rejected');
        setRejectDialog({ open: false, userId: null, userName: '', reason: '' });
        fetchPendingSignups();
        fetchSignedUpUsers();
        fetchDashboardStats();
      } else {
        showToast(data.error || 'Failed to reject signup', 'error');
      }
    } catch (err) {
      showToast('Network error during rejection', 'error');
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/holidays`);
      const data = await res.json();
      if (data.success) setHolidaysList(data.holidays || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  const handleAddOrEditHoliday = async (hData, hId) => {
    const isEdit = Boolean(hId);
    const url = isEdit ? `${API_BASE}/holidays/${hId}` : `${API_BASE}/holidays`;
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save holiday');
    showToast(data.message || 'Holiday saved successfully');
    fetchHolidays();
  };

  const handleDeleteHoliday = (holiday) => {
    setConfirmModal({
      open: true,
      title: 'Confirm Soft Delete',
      message: `Are you sure you want to delete "${holiday.name}" (${holiday.date})? This holiday will be soft-deleted.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/holidays/${holiday.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Holiday soft-deleted');
            fetchHolidays();
          }
        } catch (err) {
          showToast('Failed to delete holiday', 'error');
        }
      }
    });
  };

  const fetchEmailLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/email-logs`);
      const data = await res.json();
      if (data.success) setEmailLogsList(data.emailLogs || []);
    } catch (err) {
      console.error('Error fetching email logs:', err);
    }
  };

  const handleRunDailyAbsentCheck = async () => {
    setRunningAbsentCheck(true);
    try {
      const res = await fetch(`${API_BASE}/cron/daily-absent-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Daily absent check completed!');
        fetchDashboardStats();
      } else {
        showToast(data.error || 'Failed to run absent check', 'error');
      }
    } catch (err) {
      showToast('Network error during absent check', 'error');
    } finally {
      setRunningAbsentCheck(false);
    }
  };

  const handleAddUser = async (uData) => {
    const res = await fetch(`${API_BASE}/admin/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create user');
    showToast(data.message || 'User created successfully');
    fetchSignedUpUsers();
    fetchMembers();
    fetchDashboardStats();
  };

  const handleUpdateUser = async (userId, uData) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update user');
    showToast(data.message || 'User updated successfully');
    fetchSignedUpUsers();
    fetchMembers();
  };

  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');
  const [leavePage, setLeavePage] = useState(1);
  const leavePageSize = 8;

  const handleDeleteLeave = (leaveId) => {
    setConfirmModal({
      open: true,
      title: 'Confirm Soft Delete Leave Request',
      message: 'Are you sure you want to soft-delete this leave application? The record will be permanently excluded from active rosters and statistics.',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/leaves/${leaveId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Leave request soft-deleted successfully');
            fetchLeaves();
            fetchDashboardStats();
          } else {
            showToast(data.error || 'Failed to delete leave request', 'error');
          }
        } catch (err) {
          showToast('Network error while deleting leave', 'error');
        }
      }
    });
  };

  const handleDeleteUser = (user) => {
    const isStudent = user.role === 'STUDENT';
    const isStaff = user.role === 'STAFF';
    const typeLabel = isStudent ? 'student' : isStaff ? 'staff member' : 'user';

    setConfirmModal({
      open: true,
      title: `Confirm Delete ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`,
      message: `Are you sure you want to soft-delete ${typeLabel} "${user.name}" (${user.code || user.email})? This record will be permanently excluded from active rosters, attendance register, and all reports.`,
      onConfirm: async () => {
        try {
          const targetId = user.userId || user.id;
          // Dynamic instant removal from frontend state
          setSignedUpUsers(prev => prev ? {
            ...prev,
            users: prev.users.filter(u => (u.userId || u.id) !== targetId)
          } : prev);
          setMembersList(prev => prev.filter(m => (m.id !== user.memberId && m.email !== user.email)));

          const res = await fetch(`${API_BASE}/admin/users/${targetId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} soft-deleted successfully`);
            fetchSignedUpUsers();
            fetchMembers();
            fetchDashboardStats();
            fetchDailyAttendance();
          } else {
            showToast(data.error || 'Failed to delete record', 'error');
            fetchSignedUpUsers();
          }
        } catch (err) {
          showToast('Failed to delete record', 'error');
          fetchSignedUpUsers();
        } finally {
          setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleBulkDeleteUsers = (ids) => {
    if (!ids || ids.length === 0) return;
    setConfirmModal({
      open: true,
      title: `Confirm Bulk Delete (${ids.length} Users)`,
      message: `Are you sure you want to delete these ${ids.length} selected users? This will permanently remove their user accounts, student/staff records, attendance, and leave requests.`,
      onConfirm: async () => {
        try {
          setSignedUpUsers(prev => prev ? {
            ...prev,
            users: prev.users.filter(u => !ids.includes(u.userId || u.id))
          } : prev);
          setMembersList(prev => prev.filter(m => !ids.includes(m.id)));
          setSelectedUserIds([]);

          const res = await fetch(`${API_BASE}/admin/users/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || `Successfully deleted ${ids.length} records.`);
            fetchSignedUpUsers();
            fetchMembers();
            fetchDashboardStats();
            fetchDailyAttendance();
          } else {
            showToast(data.error || 'Failed to delete selected users', 'error');
            fetchSignedUpUsers();
          }
        } catch (err) {
          showToast(err.message || 'Error executing bulk delete', 'error');
          fetchSignedUpUsers();
        } finally {
          setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleBulkDeleteMembers = (ids) => {
    if (!ids || ids.length === 0) return;
    setConfirmModal({
      open: true,
      title: `Confirm Bulk Delete (${ids.length} Members)`,
      message: `Are you sure you want to delete these ${ids.length} selected members? This will permanently remove their records, user accounts, and attendance history.`,
      onConfirm: async () => {
        try {
          setMembersList(prev => prev.filter(m => !ids.includes(m.id)));
          setSignedUpUsers(prev => prev ? {
            ...prev,
            users: prev.users.filter(u => !ids.includes(u.memberId) && !ids.includes(u.id))
          } : prev);
          setSelectedMemberIds([]);

          const res = await fetch(`${API_BASE}/members/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || `Successfully deleted ${ids.length} members.`);
            fetchMembers();
            fetchSignedUpUsers();
            fetchDashboardStats();
            fetchDailyAttendance();
          } else {
            showToast(data.error || 'Failed to delete selected members', 'error');
            fetchMembers();
          }
        } catch (err) {
          showToast(err.message || 'Error executing bulk delete', 'error');
          fetchMembers();
        } finally {
          setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  const handleLogout = async () => {
    try {
      if (auth?.token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${auth.token}` }
        });
      }
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      localStorage.removeItem('heta_auth');
      setAuth(null);
      showToast('Logged out successfully');
      navigateTo('/');
    }
  };

  // ------------------ DATA FETCHERS ------------------
  const fetchDashboardStats = async () => {
    try {
      const roleParam = auth?.user?.role || 'ADMIN';
      const memIdParam = auth?.user?.memberId ? `&memberId=${auth.user.memberId}` : '';
      const res = await fetch(`${API_BASE}/dashboard/stats?role=${roleParam}${memIdParam}&date=${selectedDate}&month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) setDashboardStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchSignedUpUsers = async () => {
    try {
      setLoading(true);
      const rParam = userRoleFilter !== 'ALL' ? `&role=${userRoleFilter}` : '';
      const sParam = userSearchQuery ? `&search=${encodeURIComponent(userSearchQuery)}` : '';
      const res = await fetch(`${API_BASE}/users?${rParam}${sParam}`);
      const data = await res.json();
      if (data.success) {
        setSignedUpUsers(data);
      }
    } catch (err) {
      console.error('Error fetching signed-up users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsersCSV = () => {
    if (!signedUpUsers?.users || signedUpUsers.users.length === 0) {
      showToast('No users available to export', 'error');
      return;
    }
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Code', 'Phone', 'Course / Faculty Role', 'Batch / Dept', 'Signup Date', 'Status'];
    const rows = signedUpUsers.users.map(u => [
      u.userId,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      u.role,
      u.code || '-',
      u.phone || '-',
      `"${(u.course || u.department || '-').replace(/"/g, '""')}"`,
      `"${(u.batch || '-').replace(/"/g, '""')}"`,
      u.signupDate || '-',
      u.status || 'ACTIVE'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HETA_Signed_Up_Users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported signed-up users to CSV');
  };

  const fetchDailyAttendance = async () => {
    try {
      setLoading(true);
      const bParam = batchFilter !== 'All Batches' && roleFilter !== 'STAFF' ? `&batch=${encodeURIComponent(batchFilter)}` : '';
      const res = await fetch(`${API_BASE}/attendance/daily?date=${selectedDate}&role=${roleFilter}${bParam}`);
      const data = await res.json();
      if (data.success) setDailyData(data);
    } catch (err) {
      console.error('Error fetching daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatrixAttendance = async () => {
    try {
      setLoading(true);
      const bParam = batchFilter !== 'All Batches' && roleFilter !== 'STAFF' ? `&batch=${encodeURIComponent(batchFilter)}` : '';
      const res = await fetch(`${API_BASE}/attendance/matrix?month=${selectedMonth}&role=${roleFilter}${bParam}`);
      const data = await res.json();
      if (data.success) setMatrixData(data);
    } catch (err) {
      console.error('Error fetching matrix attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/members?role=${roleFilter}`);
      const data = await res.json();
      if (data.success) setMembersList(data.members);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const isStudent = auth?.user?.role === 'STUDENT';
      const mParam = isStudent && auth?.user?.memberId ? `?memberId=${auth.user.memberId}` : '';
      const res = await fetch(`${API_BASE}/leaves${mParam}`);
      const data = await res.json();
      if (data.success) setLeavesList(data.leaves);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const fetchPortions = async () => {
    try {
      const res = await fetch(`${API_BASE}/portions?month=${portionFilterMonth}`);
      const data = await res.json();
      if (data.success) setPortionsList(data.portions);
    } catch (err) {
      console.error('Error fetching portions:', err);
    }
  };

  const fetchRangeMatrix = async (start = reportStartDate, end = reportEndDate) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/range-matrix?startDate=${start}&endDate=${end}&role=${roleFilter}`);
      const data = await res.json();
      if (data.success) setRangeMatrixData(data);
    } catch (err) {
      console.error('Error fetching range matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualReport = async (mId = selectedStudentId, start = reportStartDate, end = reportEndDate) => {
    if (!mId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/individual?memberId=${mId}&startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (data.success) setIndividualData(data);
    } catch (err) {
      console.error('Error fetching individual report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheetStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sheets/status`);
      const data = await res.json();
      if (data.success) {
        setSheetConfig(data.config);
        if (data.config?.sheetUrl && !targetSheetUrl) {
          setTargetSheetUrl(data.config.sheetUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching sheet status:', err);
    }
  };

  // Trigger data refreshes on tab / filter changes
  useEffect(() => {
    if (!auth) return;
    if (activeTab === 'dashboard') fetchDashboardStats();
    if (activeTab === 'attendance_daily') fetchDailyAttendance();
    if (activeTab === 'attendance_matrix') fetchMatrixAttendance();
    if (activeTab === 'signed_up_users') fetchSignedUpUsers();
    if (activeTab === 'pending_signups') fetchPendingSignups();
    if (activeTab === 'holidays') fetchHolidays();
    if (activeTab === 'email_logs') fetchEmailLogs();
    if (activeTab === 'members_crud') fetchMembers();
    if (activeTab === 'leaves' || activeTab === 'leave_approvals') fetchLeaves();
    if (activeTab === 'portions') fetchPortions();
    if (activeTab === 'reports') {
      if (reportType === 'OVERALL') fetchRangeMatrix(reportStartDate, reportEndDate);
      else {
        const targetId = selectedStudentId || (membersList[0]?.id) || 'stu_2';
        if (!selectedStudentId) setSelectedStudentId(targetId);
        fetchIndividualReport(targetId, reportStartDate, reportEndDate);
      }
    }
    if (activeTab === 'sheets') fetchSheetStatus();
  }, [activeTab, auth, selectedDate, selectedMonth, roleFilter, batchFilter, portionFilterMonth, userRoleFilter, userSearchQuery]);

  // ------------------ ATTENDANCE ACTIONS (STRICT 3-STATE: PRESENT, ABSENT, HOLIDAY) ------------------
  const handleMarkSingle = async (memberId, targetDate, status) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          date: targetDate,
          status, // Strictly 'PRESENT', 'ABSENT', 'HOLIDAY'
          inTime: status === 'PRESENT' ? '09:00 AM' : '-',
          outTime: status === 'PRESENT' ? '05:00 PM' : '-',
          markedBy: auth?.user?.name || 'Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(status ? `Marked ${status} for ${targetDate}` : `Cleared attendance for ${targetDate}`);
        if (activeTab === 'attendance_daily') fetchDailyAttendance();
        if (activeTab === 'attendance_matrix') fetchMatrixAttendance();
      }
    } catch (err) {
      showToast('Error marking attendance', 'error');
    }
  };

  const handleBulkBatchMark = async (status) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/bulk-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: batchFilter,
          role: roleFilter,
          date: selectedDate,
          status,
          markedBy: auth?.user?.name || 'Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchDailyAttendance();
      }
    } catch (err) {
      showToast('Bulk mark failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ------------------ LEAVE REQUESTS & DUAL EMAIL NOTIFICATION ------------------
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!auth?.user?.memberId) {
      showToast('No active student profile linked to this session', 'error');
      return;
    }
    if (!validateLeaveAll()) return;

    if (new Date(studentLeaveForm.endDate) < new Date(studentLeaveForm.startDate)) {
      showToast('Validation Error: To Date cannot be earlier than From Date', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: auth.user.memberId,
          studentName: auth.user.name,
          course: auth.user.course,
          batch: auth.user.batch,
          leaveType: studentLeaveForm.leaveType,
          startDate: studentLeaveForm.startDate,
          endDate: studentLeaveForm.endDate,
          reason: studentLeaveForm.reason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Leave submitted! Dual email notification dispatched to Academy Admins.');
        setStudentLeaveForm({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          leaveType: 'CASUAL',
          reason: ''
        });
        fetchLeaves();
      } else {
        showToast(data.error || 'Failed to submit leave', 'error');
      }
    } catch (err) {
      showToast('Server error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewLeave = async (leaveId, action) => {
    const remark = (adminReviewRemark[leaveId] || '').trim();
    try {
      setReviewLoading(true);
      const res = await fetch(`${API_BASE}/leaves/${leaveId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: auth?.user?.name || 'HETA Admin',
          adminRemarks: remark || (action === 'approve' ? 'Approved by Admin' : 'Rejected by Admin')
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Leave application ${action}d`);
        fetchLeaves();
        if (action === 'approve') {
          // Attendance was auto marked in backend, refresh dashboard
          fetchDashboardStats();
        }
      } else {
        showToast(data.error || 'Review failed', 'error');
      }
    } catch (err) {
      showToast('Server error during leave review', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // ------------------ PORTION COVERED ACTIONS ------------------
  const handleSavePortion = async (e) => {
    e.preventDefault();
    if (!validatePortionAll()) return;
    if (!portionForm.topic.trim()) {
      showToast('Please enter the topic/chapter covered', 'error');
      return;
    }

    try {
      setLoading(true);
      const url = editingPortionId ? `${API_BASE}/portions/${editingPortionId}` : `${API_BASE}/portions`;
      const method = editingPortionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portionForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingPortionId ? 'Portion updated successfully' : 'Portion recorded successfully');
        setAddPortionModal(false);
        setEditingPortionId(null);
        setPortionForm({
          date: new Date().toISOString().split('T')[0],
          course: 'Python Programming', batch: 'Batch-2026-A', subject: 'Python Core',
          topic: '', remarks: '', conductedBy: auth?.user?.name || ''
        });
        fetchPortions();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Error saving portion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortion = (portionId) => {
    setConfirmModal({
      open: true,
      title: 'Delete Portion Entry',
      message: 'Are you sure you want to delete this portion covered entry? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/portions/${portionId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('Portion entry deleted');
            fetchPortions();
          }
        } catch {
          showToast('Failed to delete portion', 'error');
        }
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // ------------------ MEMBERS FULL CRUD ACTIONS ------------------
  const handleSaveMemberInline = async (memberId) => {
    if (!editMemberForm.name || !editMemberForm.name.trim()) {
      showToast('Validation Error: Member name cannot be empty', 'error');
      return;
    }
    if (editMemberForm.email && !editMemberForm.email.includes('@')) {
      showToast('Validation Error: Please provide a valid email format', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMemberForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member details updated successfully');
        setEditingMemberId(null);
        fetchMembers();
      } else {
        showToast(data.error || 'Failed to update member', 'error');
      }
    } catch {
      showToast('Error updating member', 'error');
    }
  };

  const handleSaveAttendanceRow = async (row) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: row.memberId,
          date: selectedDate,
          status: editAttendanceForm.status || (row.status === 'NOT_MARKED' ? 'PRESENT' : row.status),
          inTime: editAttendanceForm.inTime || row.inTime || '09:00 AM',
          outTime: editAttendanceForm.outTime || row.outTime || '05:00 PM',
          notes: editAttendanceForm.notes !== undefined ? editAttendanceForm.notes : (row.notes || ''),
          markedBy: auth?.user?.name || 'Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Attendance record updated for ${row.name}`);
        setEditingAttendanceId(null);
        fetchDailyAttendance();
      } else {
        showToast(data.error || 'Failed to update attendance', 'error');
      }
    } catch {
      showToast('Error saving attendance details', 'error');
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!validateMemberAll()) return;
    if (!newMemberForm.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemberForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setAddMemberModal(false);
        setNewMemberForm({
          name: '', role: roleFilter === 'STAFF' ? 'STAFF' : 'STUDENT',
          course: roleFilter === 'STAFF' ? 'Faculty Member' : 'Python Programming',
          batch: roleFilter === 'STAFF' ? 'All Batches' : 'Batch-2026-A',
          department: roleFilter === 'STAFF' ? 'Faculty Member' : 'Computer Science',
          phone: '', email: '', parentName: '', parentPhone: '', parentEmail: ''
        });
        fetchMembers();
        fetchSignedUpUsers();
        fetchDashboardStats();
        fetchDailyAttendance();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Error creating member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = (memberId, memberName) => {
    setConfirmModal({
      open: true,
      title: `Delete ${memberName}`,
      message: `Are you sure you want to delete ${memberName}? This will permanently remove their attendance and leave records.`,
      onConfirm: async () => {
        try {
          // Dynamic instant removal from frontend state
          setMembersList(prev => prev.filter(m => m.id !== memberId));
          setSignedUpUsers(prev => prev ? {
            ...prev,
            users: prev.users.filter(u => u.memberId !== memberId && u.id !== memberId)
          } : prev);

          const res = await fetch(`${API_BASE}/members/${memberId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast(data.message || 'Member removed successfully');
            fetchMembers();
            fetchSignedUpUsers();
            fetchDashboardStats();
            fetchDailyAttendance();
          } else {
            showToast(data.error || 'Failed to delete member', 'error');
            fetchMembers();
          }
        } catch {
          showToast('Failed to delete member', 'error');
          fetchMembers();
        } finally {
          setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // ------------------ ABSENT PARENT ALERTS ------------------
  const handleOpenAbsentModal = async (member) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/absent-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id || member.memberId, date: selectedDate })
      });
      const data = await res.json();
      if (data.success) {
        setAbsentModal({
          open: true,
          data,
          customMessage: data.defaultMessage,
          recipientEmail: data.parentEmail || '',
          recipientPhone: data.parentPhone || ''
        });
      }
    } catch (err) {
      showToast('Could not generate absent alert preview', 'error');
    }
  };

  const handleSendAbsentEmail = async () => {
    if (!absentModal.recipientEmail) {
      showToast('Parent email is required', 'error');
      return;
    }

    try {
      setAlertSending(true);
      const res = await fetch(`${API_BASE}/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: absentModal.recipientEmail,
          subject: `Urgent Attendance Notice: ${absentModal.data.studentName} is ABSENT today`,
          message: absentModal.customMessage,
          studentName: absentModal.data.studentName
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Absent intimation sent to ${absentModal.recipientEmail}`);
        setAbsentModal({ open: false, data: null, customMessage: '', recipientEmail: '', recipientPhone: '' });
      } else {
        showToast(data.error || 'Failed to dispatch email', 'error');
      }
    } catch (err) {
      showToast('Error sending email', 'error');
    } finally {
      setAlertSending(false);
    }
  };

  // ------------------ GOOGLE SHEETS 1-CLICK SYNC & CONFIG ------------------
  const handleSaveSheetConfig = async () => {
    try {
      setSavingSheetConfig(true);
      const res = await fetch(`${API_BASE}/sheets/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: targetSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Google Sheet target configured successfully');
        fetchSheetStatus();
      } else {
        showToast(data.error || 'Failed to save sheet configuration', 'error');
      }
    } catch {
      showToast('Error connecting to backend API', 'error');
    } finally {
      setSavingSheetConfig(false);
    }
  };

  const handleGoogleSheetSync = async () => {
    try {
      setSyncingSheet(true);
      setSheetSyncError('');
      const res = await fetch(`${API_BASE}/sheets/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: targetSheetUrl })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Synced ${data.recordsSynced} records across 8 dedicated worksheets!`);
        fetchSheetStatus();
      } else {
        setSheetSyncError(data.error || 'Sync failed');
        showToast(data.error ? 'Google Sheets Sync Error' : 'Sync failed', 'error');
      }
    } catch (err) {
      setSheetSyncError(err.message || 'Network error syncing with Google Sheets');
      showToast('Google Sheet sync failed', 'error');
    } finally {
      setSyncingSheet(false);
    }
  };

  // ------------------ DYNAMIC BATCHES, COURSES & MONTH OPTIONS ------------------
  const dynamicBatches = useMemo(() => {
    const set = new Set(membersList.map(m => m.batch).filter(Boolean));
    const list = Array.from(set).sort();
    return list.length > 0 ? list : ['Batch-2026-A', 'Batch-2026-B'];
  }, [membersList]);

  const dynamicCourses = useMemo(() => {
    const set = new Set(membersList.map(m => m.course).filter(Boolean));
    const list = Array.from(set).sort();
    return list.length > 0 ? list : ['Python Programming', 'Computer Science'];
  }, [membersList]);

  const dynamicMonthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ val, label });
    }
    if (selectedMonth && !options.some(o => o.val === selectedMonth)) {
      options.unshift({ val: selectedMonth, label: selectedMonth });
    }
    return options;
  }, [selectedMonth]);

  // ------------------ CRUD SORTING, FILTERING & PAGINATION ------------------
  const processedMembers = useMemo(() => {
    return membersList
      .filter(m => {
        const q = memberSearch.trim().toLowerCase();
        const matchesSearch = !q ||
          m.name.toLowerCase().includes(q) ||
          m.code.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q) ||
          (m.phone || '').includes(q);
        const matchesBatch = batchFilter === 'All Batches' || m.batch === batchFilter;
        const matchesCourse = memberCourseFilter === 'All' || m.course === memberCourseFilter;
        const matchesStatus = memberStatusFilter === 'All' || m.status === memberStatusFilter;
        return matchesSearch && matchesBatch && matchesCourse && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[memberSortColumn] || '';
        let valB = b[memberSortColumn] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return memberSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return memberSortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [membersList, memberSearch, batchFilter, memberCourseFilter, memberStatusFilter, memberSortColumn, memberSortDir]);

  const totalMemberPages = Math.max(1, Math.ceil(processedMembers.length / memberPageSize));
  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * memberPageSize;
    return processedMembers.slice(start, start + memberPageSize);
  }, [processedMembers, memberPage, memberPageSize]);

  const handleSortMember = (column) => {
    if (memberSortColumn === column) {
      setMemberSortDir(memberSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setMemberSortColumn(column);
      setMemberSortDir('asc');
    }
  };

  // =========================================================================
  // VIEW RENDERERS BASED ON ROUTE & RBAC GUARDS
  // =========================================================================

  // 1. Root / Landing Page (Role Chooser & Architecture Overview)
  const activeRoute = normalizeRoute(currentPath);
  if (activeRoute === '/') {
    return (
      <div style={{ minHeight: '100vh', background: themeTokens.canvasBg, color: themeTokens.textMain, padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Top Utility Header with Theme Switcher */}
        <div style={{ width: '100%', maxWidth: 1080, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '6px 14px', borderRadius: 999 }}>
            <img src="/heta-logo.png" alt="HETA Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: themeTokens.headingText, letterSpacing: 0.5 }}>HETA HIGHER EDUCATION &amp; TRAINING ACADEMY</span>
          </div>
          {/* Top Theme Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: themeTokens.mutedText, fontWeight: 600 }}>Theme:</span>
            {renderThemeToggle()}
          </div>
        </div>

        <header style={{ textAlign: 'center', maxWidth: 820, marginBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/heta-logo.png" alt="HETA Academy Crest" style={{ width: 88, height: 88, objectFit: 'contain', marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.06))' }} />
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -0.6, marginBottom: 14, color: themeTokens.headingText }}>
            Academy Attendance &amp; Leave Portal
          </h1>
          <p style={{ fontSize: 15, color: themeTokens.mutedText, lineHeight: 1.6, maxWidth: 680, margin: '0 auto' }}>
            Production-grade academy management system. Clean self-registration for Students &amp; Staff, 3-canonical attendance tracking, dual-email leave notifications, and live Google Sheets sync.
          </p>
        </header>

        {/* Dedicated Portal Selector Cards (Shadcn Zinc / Emerald Styled) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20, width: '100%', maxWidth: 1080, marginBottom: 40 }}>
          {/* Student Portal Card */}
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', transition: 'all 0.2s' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: themeTokens.badgeBg, border: `1px solid ${themeTokens.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={22} color={themeTokens.iconColor} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: themeTokens.cardInner, color: themeTokens.mutedText, fontFamily: 'monospace' }}>/student</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: themeTokens.headingText }}>Student Portal</h2>
              <p style={{ fontSize: 13, color: themeTokens.mutedText, lineHeight: 1.5, marginBottom: 16 }}>
                Student self-registration, personal attendance registers, percentage standing, and leave requests with automated alerts.
              </p>
              <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '10px 14px', borderRadius: 8, fontSize: 12, color: themeTokens.mutedText, marginBottom: 20 }}>
                <strong style={{ color: themeTokens.headingText }}>Student Access:</strong> New students self-register. Registered students sign in with email or roll number.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { setAuthMode('login'); navigateTo('/student'); }}
                style={{ width: '100%', padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
              >
                Sign In to Student Portal <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { setAuthMode('signup'); navigateTo('/student'); }}
                style={{ width: '100%', padding: '9px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
              >
                <Plus size={14} /> New Student? Register Here
              </button>
            </div>
          </div>

          {/* Staff Portal Card */}
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: themeTokens.badgeBg, border: `1px solid ${themeTokens.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={22} color={themeTokens.iconColor} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: themeTokens.cardInner, color: themeTokens.mutedText, fontFamily: 'monospace' }}>/staff</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: themeTokens.headingText }}>Staff Portal</h2>
              <p style={{ fontSize: 13, color: themeTokens.mutedText, lineHeight: 1.5, marginBottom: 16 }}>
                Faculty self-enrollment, daily attendance marking, teaching portion logs, and faculty leave applications.
              </p>
              <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '10px 14px', borderRadius: 8, fontSize: 12, color: themeTokens.mutedText, marginBottom: 20 }}>
                <strong style={{ color: themeTokens.headingText }}>Staff Access:</strong> Faculty members self-register or sign in with official email or faculty code.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { setAuthMode('login'); navigateTo('/staff'); }}
                style={{ width: '100%', padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
              >
                Sign In to Staff Portal <ChevronRight size={16} />
              </button>
              <button
                onClick={() => { setAuthMode('signup'); navigateTo('/staff'); }}
                style={{ width: '100%', padding: '9px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}
              >
                <Plus size={14} /> New Faculty? Register Here
              </button>
            </div>
          </div>

          {/* Admin Control Panel Card */}
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: themeTokens.badgeBg, border: `1px solid ${themeTokens.badgeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={22} color={themeTokens.iconColor} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: themeTokens.cardInner, color: themeTokens.mutedText, fontFamily: 'monospace' }}>/admin</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: themeTokens.headingText }}>Admin Control Panel</h2>
              <p style={{ fontSize: 13, color: themeTokens.mutedText, lineHeight: 1.5, marginBottom: 16 }}>
                Super Administrator oversight: student/staff directory rosters, 3-state attendance matrix, dual-email approvals, and live Google Sheets sync.
              </p>
              <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '10px 14px', borderRadius: 8, fontSize: 12, color: themeTokens.mutedText, marginBottom: 20 }}>
                <strong style={{ color: themeTokens.headingText }}>Administrator:</strong> Restricted Access (Pre-configured Super Admin credentials only).
              </div>
            </div>
            <button
              onClick={() => { setAuthMode('login'); navigateTo('/admin'); }}
              style={{ width: '100%', padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
            >
              Open Admin Panel <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authentication View (Rendered when unauthenticated on /student, /staff, or /admin)
  const renderLoginView = (portalRole) => {
    const isStudentPortal = portalRole === 'STUDENT';
    const isStaffPortal = portalRole === 'STAFF';
    const isAdminPortal = portalRole === 'ADMIN';

    if (resetToken) {
      return (
        <ResetPasswordScreen
          token={resetToken}
          themeTokens={themeTokens}
          API_BASE={API_BASE}
          onDone={() => {
            setResetToken('');
            if (window.history.pushState) {
              window.history.pushState(null, '', window.location.pathname);
            }
            setAuthMode('login');
          }}
        />
      );
    }

    const portalTitle = isStudentPortal ? 'Student Portal' : isStaffPortal ? 'Staff Portal' : 'Admin Control Panel';

    const renderFieldError = (fieldKey, errMap, touchMap) => {
      if (!touchMap?.[fieldKey] || !errMap?.[fieldKey]) return null;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
          <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{errMap[fieldKey]}</span>
        </div>
      );
    };

    const getInputStyle = (fieldKey, errMap, touchMap, extraStyle = {}) => {
      const isErr = touchMap?.[fieldKey] && errMap?.[fieldKey];
      return {
        width: '100%',
        padding: '9px 12px',
        background: isErr ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
        border: isErr ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
        borderRadius: 6,
        color: themeTokens.textMain,
        fontSize: 13,
        outline: 'none',
        boxShadow: isErr ? '0 0 0 1px #ef4444' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...extraStyle
      };
    };

    return (
      <div style={{ minHeight: '100vh', background: themeTokens.canvasBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {/* Top bar with theme toggle */}
        <div style={{ width: '100%', maxWidth: authMode === 'signup' && !isAdminPortal ? 580 : 450, display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          {renderThemeToggle()}
        </div>

        <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: authMode === 'signup' && !isAdminPortal ? 580 : 450, padding: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          {/* Brand & Portal Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/heta-logo.png" alt="HETA Academy Crest" style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 12px auto', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.06))' }} />
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.headingText, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
              HETA HIGHER EDUCATION
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: themeTokens.headingText, marginBottom: 4 }}>
              {portalTitle}
            </h2>
            <div style={{ fontSize: 12, color: themeTokens.mutedText, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Lock size={13} color={themeTokens.accentText} /> {isAdminPortal ? 'Super Administrator Access' : authMode === 'signup' ? 'New Account Registration' : 'Secure Sign-In'}
            </div>
          </div>

          {/* Mode Switch Tabs (Sign In vs Sign Up) for Student and Staff */}
          {!isAdminPortal && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: themeTokens.cardInner, padding: 3, borderRadius: 8, border: `1px solid ${themeTokens.cardBorder}`, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setLoginError(''); setSignupError(''); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: authMode === 'login' ? themeTokens.primaryBtn : 'transparent',
                  color: authMode === 'login' ? themeTokens.primaryBtnFg : themeTokens.mutedText,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setLoginError(''); setSignupError(''); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: authMode === 'signup' ? themeTokens.primaryBtn : 'transparent',
                  color: authMode === 'signup' ? themeTokens.primaryBtnFg : themeTokens.mutedText,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isStudentPortal ? 'Student Registration' : 'Faculty Registration'}
              </button>
            </div>
          )}

          {/* Registration Pending Alert Banner */}
          {signupPendingNotice && authMode === 'login' && (
            <div style={{ background: themeTokens.isGreen ? '#ecfdf5' : '#f0fdf4', border: '1px solid #10b981', borderRadius: 8, padding: '12px 14px', marginBottom: 18, color: '#065f46', fontSize: 13, lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>✓ Registration Submitted</div>
              {signupPendingNotice}
            </div>
          )}

          {/* Global Backend Error Alerts */}
          {loginError && authMode === 'login' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{loginError}</div>
            </div>
          )}

          {signupError && authMode === 'signup' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{signupError}</div>
            </div>
          )}

          {/* ----------------- MODE A: SIGN IN FORM OR FORGOT PASSWORD ----------------- */}
          {authMode === 'forgot' ? (
            <ForgotPasswordCard
              themeTokens={themeTokens}
              API_BASE={API_BASE}
              onBackToLogin={() => { setAuthMode('login'); setLoginError(''); setSignupPendingNotice(''); }}
            />
          ) : authMode === 'login' ? (
            <form onSubmit={(e) => handleLogin(e, portalRole)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 6 }}>
                  {isStudentPortal ? 'Student Email or Roll No *' : isStaffPortal ? 'Faculty Email or Staff ID *' : 'Admin Email *'}
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginTouched.loginEmail) validateLoginField('loginEmail', e.target.value);
                  }}
                  onBlur={() => {
                    setLoginTouched(prev => ({ ...prev, loginEmail: true }));
                    validateLoginField('loginEmail', loginEmail);
                  }}
                  placeholder={isStudentPortal ? 'e.g. student@example.com or HETA-STU-001' : isStaffPortal ? 'e.g. faculty@example.com or HETA-STF-001' : 'Enter administrator email'}
                  autoComplete="username"
                  style={getInputStyle('loginEmail', loginErrors, loginTouched, { padding: '10px 14px' })}
                />
                {renderFieldError('loginEmail', loginErrors, loginTouched)}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 6 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginTouched.loginPassword) validateLoginField('loginPassword', e.target.value);
                    }}
                    onBlur={() => {
                      setLoginTouched(prev => ({ ...prev, loginPassword: true }));
                      validateLoginField('loginPassword', loginPassword);
                    }}
                    placeholder="Enter account password"
                    autoComplete="current-password"
                    style={getInputStyle('loginPassword', loginErrors, loginTouched, { padding: '10px 42px 10px 14px' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeTokens.mutedText, padding: 4 }}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {renderFieldError('loginPassword', loginErrors, loginTouched)}
              </div>

              {/* Remember me & Forgot Password */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: themeTokens.textMain, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: themeTokens.primaryBtn, cursor: 'pointer' }}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setLoginError(''); setSignupPendingNotice(''); }}
                  style={{ background: 'none', border: 'none', color: themeTokens.accentText, fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{ padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loginLoading ? 'wait' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s ease' }}
              >
                {loginLoading ? 'Authenticating...' : `Sign in to ${portalTitle}`}
              </button>

              {isAdminPortal && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 800, color: themeTokens.headingText, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} color={themeTokens.accentText} /> Master Admin Credentials
                  </div>
                  <div>Email: <strong style={{ color: themeTokens.headingText }}>pravesbalaji144@gmail.com</strong> or <strong style={{ color: themeTokens.headingText }}>admin@heta.edu</strong></div>
                  <div style={{ marginTop: 2 }}>Master Passwords: <code style={{ background: themeTokens.badgeBg, padding: '2px 6px', borderRadius: 4, color: themeTokens.badgeText, fontWeight: 700 }}>Admin@123</code> or <code style={{ background: themeTokens.badgeBg, padding: '2px 6px', borderRadius: 4, color: themeTokens.badgeText, fontWeight: 700 }}>Heta@123</code></div>
                </div>
              )}

              {!isAdminPortal && (
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setLoginError(''); setSignupError(''); setSignupPendingNotice(''); }}
                    style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Don't have an account yet? Create {isStudentPortal ? 'Student' : 'Staff'} Profile →
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* ----------------- MODE B: SELF-REGISTRATION / SIGNUP FORM ----------------- */
            <form onSubmit={(e) => handleSignup(e, portalRole)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                  {isStudentPortal ? 'Student Full Name *' : 'Faculty Full Name *'}
                </label>
                <input
                  type="text"
                  value={signupForm.name}
                  onChange={(e) => {
                    const updated = { ...signupForm, name: e.target.value };
                    setSignupForm(updated);
                    if (signupTouched.name) validateSignupField('name', e.target.value, updated, portalRole);
                  }}
                  onBlur={() => {
                    setSignupTouched(prev => ({ ...prev, name: true }));
                    validateSignupField('name', signupForm.name, signupForm, portalRole);
                  }}
                  placeholder={isStudentPortal ? 'e.g. Deepika J' : 'e.g. Dr. K. Saravanan'}
                  style={getInputStyle('name', signupErrors, signupTouched)}
                />
                {renderFieldError('name', signupErrors, signupTouched)}
              </div>

              {/* Email & Contact Phone (2-column) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => {
                      const updated = { ...signupForm, email: e.target.value };
                      setSignupForm(updated);
                      if (signupTouched.email) validateSignupField('email', e.target.value, updated, portalRole);
                    }}
                    onBlur={() => {
                      setSignupTouched(prev => ({ ...prev, email: true }));
                      validateSignupField('email', signupForm.email, signupForm, portalRole);
                    }}
                    placeholder="name@example.com"
                    style={getInputStyle('email', signupErrors, signupTouched)}
                  />
                  {renderFieldError('email', signupErrors, signupTouched)}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={signupForm.phone}
                    onChange={(e) => {
                      const updated = { ...signupForm, phone: e.target.value };
                      setSignupForm(updated);
                      if (signupTouched.phone) validateSignupField('phone', e.target.value, updated, portalRole);
                    }}
                    onBlur={() => {
                      setSignupTouched(prev => ({ ...prev, phone: true }));
                      validateSignupField('phone', signupForm.phone, signupForm, portalRole);
                    }}
                    placeholder="+91 94441 12233"
                    style={getInputStyle('phone', signupErrors, signupTouched)}
                  />
                  {renderFieldError('phone', signupErrors, signupTouched)}
                </div>
              </div>

              {/* Roll No / Staff Code (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                  {isStudentPortal ? 'Roll Number / Student Code (Optional)' : 'Faculty ID Code (Optional)'}
                </label>
                <input
                  type="text"
                  value={signupForm.code}
                  onChange={(e) => setSignupForm({ ...signupForm, code: e.target.value })}
                  placeholder={isStudentPortal ? 'e.g. HETA-STU-001 (auto-assigned if empty)' : 'e.g. HETA-STF-001 (auto-assigned if empty)'}
                  style={getInputStyle('code', signupErrors, signupTouched)}
                />
              </div>

              {/* Student Directory Specific Columns: Course & Batch (Textboxes) */}
              {isStudentPortal && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                      Enrolled Course *
                    </label>
                    <input
                      type="text"
                      value={signupForm.course}
                      onChange={(e) => {
                        const updated = { ...signupForm, course: e.target.value };
                        setSignupForm(updated);
                        if (signupTouched.course) validateSignupField('course', e.target.value, updated, portalRole);
                      }}
                      onBlur={() => {
                        setSignupTouched(prev => ({ ...prev, course: true }));
                        validateSignupField('course', signupForm.course, signupForm, portalRole);
                      }}
                      placeholder="e.g. Python Programming"
                      style={getInputStyle('course', signupErrors, signupTouched)}
                    />
                    {renderFieldError('course', signupErrors, signupTouched)}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                      Assigned Batch *
                    </label>
                    <input
                      type="text"
                      value={signupForm.batch}
                      onChange={(e) => {
                        const updated = { ...signupForm, batch: e.target.value };
                        setSignupForm(updated);
                        if (signupTouched.batch) validateSignupField('batch', e.target.value, updated, portalRole);
                      }}
                      onBlur={() => {
                        setSignupTouched(prev => ({ ...prev, batch: true }));
                        validateSignupField('batch', signupForm.batch, signupForm, portalRole);
                      }}
                      placeholder="e.g. Batch-2026-A"
                      style={getInputStyle('batch', signupErrors, signupTouched)}
                    />
                    {renderFieldError('batch', signupErrors, signupTouched)}
                  </div>
                </div>
              )}

              {/* Staff Directory Specific Column: Faculty Role (Textbox) */}
              {isStaffPortal && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                    Faculty Role *
                  </label>
                  <input
                    type="text"
                    value={signupForm.facultyRole || signupForm.department}
                    onChange={(e) => {
                      const updated = { ...signupForm, facultyRole: e.target.value, department: e.target.value };
                      setSignupForm(updated);
                      if (signupTouched.facultyRole) validateSignupField('facultyRole', e.target.value, updated, portalRole);
                    }}
                    onBlur={() => {
                      setSignupTouched(prev => ({ ...prev, facultyRole: true }));
                      validateSignupField('facultyRole', signupForm.facultyRole || signupForm.department, signupForm, portalRole);
                    }}
                    placeholder="e.g. Senior Faculty, Lab Coordinator, Assistant Professor"
                    style={getInputStyle('facultyRole', signupErrors, signupTouched)}
                  />
                  {renderFieldError('facultyRole', signupErrors, signupTouched)}
                </div>
              )}

              {/* Student Directory Specific Columns: Parent / Guardian Details */}
              {isStudentPortal && (
                <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: themeTokens.headingText, marginBottom: 8 }}>
                    Parent / Guardian Contact (for Dual-Email &amp; Attendance Alerts)
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: themeTokens.headingText, marginBottom: 3 }}>
                      Parent / Guardian Name *
                    </label>
                    <input
                      type="text"
                      value={signupForm.parentName}
                      onChange={(e) => {
                        const updated = { ...signupForm, parentName: e.target.value };
                        setSignupForm(updated);
                        if (signupTouched.parentName) validateSignupField('parentName', e.target.value, updated, portalRole);
                      }}
                      onBlur={() => {
                        setSignupTouched(prev => ({ ...prev, parentName: true }));
                        validateSignupField('parentName', signupForm.parentName, signupForm, portalRole);
                      }}
                      placeholder="e.g. Janakiraman"
                      style={getInputStyle('parentName', signupErrors, signupTouched, { padding: '8px 10px', fontSize: 12 })}
                    />
                    {renderFieldError('parentName', signupErrors, signupTouched)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: themeTokens.headingText, marginBottom: 3 }}>
                        Parent Phone *
                      </label>
                      <input
                        type="tel"
                        value={signupForm.parentPhone}
                        onChange={(e) => {
                          const updated = { ...signupForm, parentPhone: e.target.value };
                          setSignupForm(updated);
                          if (signupTouched.parentPhone) validateSignupField('parentPhone', e.target.value, updated, portalRole);
                        }}
                        onBlur={() => {
                          setSignupTouched(prev => ({ ...prev, parentPhone: true }));
                          validateSignupField('parentPhone', signupForm.parentPhone, signupForm, portalRole);
                        }}
                        placeholder="+91 94441 12233"
                        style={getInputStyle('parentPhone', signupErrors, signupTouched, { padding: '8px 10px', fontSize: 12 })}
                      />
                      {renderFieldError('parentPhone', signupErrors, signupTouched)}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: themeTokens.headingText, marginBottom: 3 }}>
                        Parent Email *
                      </label>
                      <input
                        type="email"
                        value={signupForm.parentEmail}
                        onChange={(e) => {
                          const updated = { ...signupForm, parentEmail: e.target.value };
                          setSignupForm(updated);
                          if (signupTouched.parentEmail) validateSignupField('parentEmail', e.target.value, updated, portalRole);
                        }}
                        onBlur={() => {
                          setSignupTouched(prev => ({ ...prev, parentEmail: true }));
                          validateSignupField('parentEmail', signupForm.parentEmail, signupForm, portalRole);
                        }}
                        placeholder="parent@example.com"
                        style={getInputStyle('parentEmail', signupErrors, signupTouched, { padding: '8px 10px', fontSize: 12 })}
                      />
                      {renderFieldError('parentEmail', signupErrors, signupTouched)}
                    </div>
                  </div>
                </div>
              )}

              {/* Password & Confirm Password (2-column) with Eye Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                    Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupForm.password}
                      onChange={(e) => {
                        const updated = { ...signupForm, password: e.target.value };
                        setSignupForm(updated);
                        if (signupTouched.password) validateSignupField('password', e.target.value, updated, portalRole);
                        if (signupTouched.confirmPassword) validateSignupField('confirmPassword', signupForm.confirmPassword, updated, portalRole);
                      }}
                      onBlur={() => {
                        setSignupTouched(prev => ({ ...prev, password: true }));
                        validateSignupField('password', signupForm.password, signupForm, portalRole);
                      }}
                      placeholder="Min 6 characters"
                      style={getInputStyle('password', signupErrors, signupTouched, { paddingRight: 38 })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      title={showSignupPassword ? "Hide password" : "Show password"}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeTokens.mutedText, padding: 4 }}
                    >
                      {showSignupPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {renderFieldError('password', signupErrors, signupTouched)}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>
                    Confirm Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      value={signupForm.confirmPassword}
                      onChange={(e) => {
                        const updated = { ...signupForm, confirmPassword: e.target.value };
                        setSignupForm(updated);
                        if (signupTouched.confirmPassword) validateSignupField('confirmPassword', e.target.value, updated, portalRole);
                      }}
                      onBlur={() => {
                        setSignupTouched(prev => ({ ...prev, confirmPassword: true }));
                        validateSignupField('confirmPassword', signupForm.confirmPassword, signupForm, portalRole);
                      }}
                      placeholder="Re-enter password"
                      style={getInputStyle('confirmPassword', signupErrors, signupTouched, { paddingRight: 38 })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      title={showSignupConfirmPassword ? "Hide password" : "Show password"}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeTokens.mutedText, padding: 4 }}
                    >
                      {showSignupConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {renderFieldError('confirmPassword', signupErrors, signupTouched)}
                </div>
              </div>

              <button
                type="submit"
                disabled={signupLoading}
                style={{ padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: signupLoading ? 'wait' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {signupLoading ? 'Registering Account...' : isStudentPortal ? 'Complete Student Registration & Enter' : 'Complete Faculty Registration & Enter'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setLoginError(''); setSignupError(''); }}
                  style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Already registered? Switch to Sign In →
                </button>
              </div>
            </form>
          )}

          {/* Production Security Active Note */}
          <div style={{ marginTop: 20, padding: '10px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, color: themeTokens.dimText }}>
            <Shield size={15} color={themeTokens.accentText} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: themeTokens.headingText, display: 'block', marginBottom: 2 }}>Production Security Active</strong>
              {isAdminPortal ? 'Admin authentication strictly guarded. Passwords hashed with salted SHA-256.' : 'Self-registered profiles immediately sync to academy attendance registers and Google Sheets.'}
            </div>
          </div>

          {/* Navigation to switch portal */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button
              onClick={() => navigateTo('/')}
              style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Academy Hub
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAccessDeniedView = (requiredRole, portalName, userActualRole) => {
    const returnUrl = userActualRole === 'STUDENT' ? '/student' : userActualRole === 'STAFF' ? '/staff' : '/admin';
    return (
      <div style={{ minHeight: '100vh', background: themeTokens.canvasBg, color: themeTokens.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: themeTokens.cardBg, border: '1px solid #ef4444', borderRadius: 12, padding: 36, maxWidth: 500, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldAlert size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: themeTokens.headingText, marginBottom: 8 }}>Access Denied (RBAC)</h2>
          <p style={{ fontSize: 14, color: themeTokens.mutedText, lineHeight: 1.6, marginBottom: 20 }}>
            You are logged in as a <strong>{userActualRole}</strong>. According to academy security protocols, you cannot access the <strong>{portalName}</strong>.
          </p>
          <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 12, fontSize: 12, color: themeTokens.mutedText, marginBottom: 24 }}>
            Signed in as: <strong style={{ color: themeTokens.headingText }}>{auth?.user?.name}</strong> ({auth?.user?.email})
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigateTo(returnUrl)}
              style={{ padding: '10px 20px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              Go to My {userActualRole.toLowerCase()} Portal
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '10px 20px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Check RBAC Route Guards for authenticated users
  if (activeRoute === '/student') {
    if (!auth) return renderLoginView('STUDENT');
    if (auth.user.role !== 'STUDENT' && auth.user.role !== 'ADMIN') {
      return renderAccessDeniedView('STUDENT', 'Student Portal (/student)', auth.user.role);
    }
  } else if (activeRoute === '/staff') {
    if (!auth) return renderLoginView('STAFF');
    if (auth.user.role !== 'STAFF' && auth.user.role !== 'ADMIN') {
      return renderAccessDeniedView('STAFF', 'Staff Portal (/staff)', auth.user.role);
    }
  } else if (activeRoute === '/admin') {
    if (!auth) return renderLoginView('ADMIN');
    if (auth.user.role !== 'ADMIN') {
      return renderAccessDeniedView('ADMIN', 'Admin Control Panel (/admin)', auth.user.role);
    }
  } else {
    // For any other path: if not authenticated, route to appropriate login
    if (!auth) {
      if (activeRoute.includes('student')) return renderLoginView('STUDENT');
      if (activeRoute.includes('staff')) return renderLoginView('STAFF');
      return renderLoginView('ADMIN');
    }
  }

  // Absolute safety guard: If user is somehow unauthenticated, never render dashboard shell!
  if (!auth) {
    return renderLoginView(activeRoute.includes('student') ? 'STUDENT' : activeRoute.includes('staff') ? 'STAFF' : 'ADMIN');
  }

  // =========================================================================
  // DYNAMIC SIDEBAR MENU CONFIGURATION BASED ON USER ROLE
  // =========================================================================
  const isStudentPortal = activeRoute === '/student';
  const isStaffPortal = activeRoute === '/staff';
  const isAdminPortal = activeRoute === '/admin' || (!isStudentPortal && !isStaffPortal && auth?.user?.role === 'ADMIN');

  let navItems = [];
  if (isStudentPortal) {
    navItems = [
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'attendance_details', label: 'Attendance Details', icon: Calendar },
      { id: 'leaves', label: 'Leave Request', icon: Clock },
    ];
  } else if (isStaffPortal) {
    navItems = [
      { id: 'dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
      { id: 'attendance_daily', label: 'Mark Attendance', icon: CheckSquare },
      { id: 'attendance_matrix', label: 'Attendance Register', icon: FileSpreadsheet },
      { id: 'leaves', label: 'Leave Requests', icon: Clock },
    ];
  } else {
    // Admin Control Panel
    navItems = [
      { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
      { id: 'pending_signups', label: 'Pending Approvals', icon: UserCheck, badge: pendingSignupsList.length || dashboardStats?.pendingSignups || 0 },
      { id: 'signed_up_users', label: 'Users Directory', icon: Users },
      { id: 'members_crud', label: 'Students & Staff Roster', icon: GraduationCap },
      { id: 'attendance_daily', label: 'Mark Attendance', icon: CheckSquare },
      { id: 'attendance_matrix', label: 'Attendance Details', icon: FileSpreadsheet },
      { id: 'leave_approvals', label: 'Leave Approvals', icon: Clock },
      { id: 'holidays', label: 'Academic Holidays', icon: Calendar },
      { id: 'portions', label: 'Portions Covered', icon: BookOpen },
      { id: 'reports', label: 'Reports & Exports', icon: Download },
      { id: 'email_logs', label: 'Email Audit Logs', icon: Mail },
      { id: 'sheets', label: 'Google Sheets Sync', icon: RefreshCw },
    ];
  }

  // Ensure activeTab is valid for current role
  const validTabIds = navItems.map(n => n.id);
  const currentTabSafe = validTabIds.includes(activeTab) ? activeTab : validTabIds[0];

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: themeTokens.canvasBg, color: themeTokens.textMain }}>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {/* ------------------ TOAST NOTIFICATION ------------------ */}
      {statusToast.show && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: statusToast.type === 'error' ? '#ef4444' : isGreen ? '#10b981' : '#27272a',
          border: `1px solid ${statusToast.type === 'error' ? '#dc2626' : isGreen ? '#059669' : '#3f3f46'}`,
          color: '#fff', padding: '12px 20px', borderRadius: 8, fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 10,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {statusToast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} color={isGreen ? '#a7f3d0' : '#fafafa'} />}
          <span>{statusToast.text}</span>
        </div>
      )}

      {/* ------------------ CONFIRMATION MODAL ------------------ */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: themeTokens.headingText }}>{confirmModal.title}</h3>
            <p style={{ fontSize: 13, color: themeTokens.mutedText, lineHeight: 1.5, marginBottom: 20 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
                style={{ padding: '8px 16px', background: themeTokens.secondaryBtn, color: themeTokens.mutedText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------ SIDEBAR NAVIGATION (SHADCN ZINC / EMERALD) ------------------ */}
      <aside className={`sidebar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`} style={{ width: 260, background: themeTokens.sidebarBg, borderRight: `1px solid ${themeTokens.cardBorder}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand Banner */}
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/heta-logo.png" alt="HETA Logo" style={{ width: 42, height: 42, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: themeTokens.headingText, letterSpacing: 0.5 }}>HETA ACADEMY</div>
              <div style={{ fontSize: 10, color: themeTokens.mutedText, fontWeight: 600 }}>ATTENDANCE &amp; LEAVES</div>
            </div>
          </div>
        </div>

        {/* Current User Badge */}
        <div style={{ padding: '16px 20px', background: themeTokens.cardInner, borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: themeTokens.headingText }}>{auth?.user?.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
              background: themeTokens.badgeBg,
              border: `1px solid ${themeTokens.badgeBorder}`,
              color: themeTokens.badgeText
            }}>
              {auth?.user?.role}
            </span>
          </div>
          <div style={{ fontSize: 11, color: themeTokens.dimText, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{auth?.user?.code || auth?.user?.email}</span>
            {auth?.user?.batch && <span>• {auth.user.batch}</span>}
          </div>
        </div>

        {/* Dynamic Navigation Items */}
        <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTabSafe === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
                  background: isActive ? (isGreen ? 'rgba(18,113,113,0.12)' : '#09090b') : 'transparent',
                  color: isActive ? (isGreen ? '#127171' : '#ffffff') : themeTokens.textMain,
                  border: isActive ? (isGreen ? '1px solid rgba(18,113,113,0.35)' : '1px solid #09090b') : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500, fontSize: 13, textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <IconComponent size={17} color={isActive ? (isGreen ? '#127171' : '#ffffff') : themeTokens.iconMuted} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{ background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div style={{ padding: '16px 14px', borderTop: `1px solid ${themeTokens.cardBorder}` }}>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <LogOut size={16} color="#dc2626" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ------------------ MAIN CONTENT AREA ------------------ */}
      <main className="main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Header Bar with Shadcn Theme Toggle Pill */}
        <header className="top-header-bar" style={{ padding: '14px 28px', background: themeTokens.headerBg, borderBottom: `1px solid ${themeTokens.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              title="Toggle Menu"
            >
              <Menu size={18} />
            </button>
            <img src="/heta-logo.png" alt="HETA Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText, textTransform: 'capitalize' }}>
                {navItems.find(n => n.id === currentTabSafe)?.label || 'Dashboard'}
              </h2>
              <div style={{ fontSize: 11, color: themeTokens.mutedText }}>
                {isStudentPortal ? 'Student Self-Service Portal' : isStaffPortal ? 'Staff Academic Attendance Console' : 'Administrator Control Center'}
              </div>
            </div>
          </div>

          {/* Quick Date, Month & Batch Filters + Theme Switcher Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Theme Switcher Pill */}
            {renderThemeToggle()}

            {(currentTabSafe === 'attendance_daily' || currentTabSafe === 'dashboard') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: '4px 10px' }}>
                <Calendar size={14} color={themeTokens.iconColor} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: themeTokens.textMain, fontSize: 12, outline: 'none' }}
                />
              </div>
            )}

            {(currentTabSafe === 'attendance_matrix' || currentTabSafe === 'attendance_details') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ fontSize: 11, color: themeTokens.mutedText }}>Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: themeTokens.textMain, fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  {dynamicMonthOptions.map(opt => (
                    <option key={opt.val} value={opt.val} style={{ background: themeTokens.cardBg }}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {!isStudentPortal && (
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.textMain, borderRadius: 8, padding: '6px 12px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                <option value="All Batches">All Batches</option>
                {dynamicBatches.map(b => (
                  <option key={b} value={b} style={{ background: themeTokens.cardBg }}>{b}</option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* Tab Body View */}
        <div className="tab-content-area" style={{ padding: '24px 28px', flex: 1 }}>
          {/* =========================================================================
              TAB: DASHBOARD (STUDENT, STAFF, ADMIN)
              ========================================================================= */}
          {currentTabSafe === 'dashboard' && (
            <div>
              {/* If Student: Personal Dashboard with Daily, Weekly, Monthly Stats & Portions */}
              {isStudentPortal && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Status ({selectedDate})</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        {dashboardStats?.todayStatus === 'PRESENT' ? (
                          <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 14 }}>
                            ✓ PRESENT
                          </span>
                        ) : dashboardStats?.todayStatus === 'ABSENT' ? (
                          <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 14 }}>
                            ✕ ABSENT
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.4)', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 14 }}>
                            ✦ HOLIDAY / LEAVE
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Monthly Attendance Rate</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: (dashboardStats?.monthlyStats?.attendanceRate || 0) >= 75 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                        {dashboardStats?.monthlyStats?.attendanceRate || 0}%
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Target: 75% for exam eligibility</span>
                    </div>

                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Present Classes (Month)</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                        {dashboardStats?.monthlyStats?.presentCount || 0}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Active attendances recorded</span>
                    </div>

                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Approved Leaves / Holidays</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', marginTop: 4 }}>
                        {dashboardStats?.monthlyStats?.holidayCount || 0}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Approved leaves & holidays</span>
                    </div>
                  </div>

                  {/* Academic Attendance Standing & Guidelines */}
                  <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 22, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/heta-logo.png" alt="HETA Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                        Academic Standing &amp; Eligibility ({dashboardStats?.member?.batch || 'Active Batch'})
                      </h3>
                      <button
                        onClick={() => setActiveTab('attendance_details')}
                        style={{ background: 'none', border: 'none', color: themeTokens.accentText, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        View Full Register →
                      </button>
                    </div>

                    <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: themeTokens.headingText, fontWeight: 600 }}>
                          Current Rate: <strong style={{ color: (dashboardStats?.monthlyStats?.attendanceRate || 0) >= 75 ? '#10b981' : '#ef4444' }}>{dashboardStats?.monthlyStats?.attendanceRate || 0}%</strong>
                        </span>
                        <span style={{ fontSize: 12, color: (dashboardStats?.monthlyStats?.attendanceRate || 0) >= 75 ? '#10b981' : '#ef4444', fontWeight: 700, background: (dashboardStats?.monthlyStats?.attendanceRate || 0) >= 75 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 10px', borderRadius: 12 }}>
                          {(dashboardStats?.monthlyStats?.attendanceRate || 0) >= 75 ? '✓ Good Standing' : '⚠️ Action Required (<75%)'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: themeTokens.mutedText, lineHeight: 1.6 }}>
                        Academy policy requires a minimum of 75% attendance for course completion and examination eligibility. If you need to request leave for medical or family reasons, submit an application via the <strong>Leave Request</strong> tab for immediate review.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If Admin or Staff: Academy Overview Dashboard */}
              {!isStudentPortal && (
                <div>
                  {/* Scheduled Job Notification Bar */}
                  <div style={{
                    background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`,
                    borderRadius: 10, padding: '14px 20px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: themeTokens.headingText, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} color={themeTokens.iconColor} />
                        <span>Daily Absent Notification Service (Scheduled Job)</span>
                      </div>
                      <div style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
                        Automated check runs on working days (Mon–Fri). Skips weekends, holidays, and approved leaves.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleRunDailyAbsentCheck}
                        disabled={runningAbsentCheck}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: isGreen ? '#127171' : '#0f172a', color: '#ffffff',
                          border: 'none', cursor: runningAbsentCheck ? 'wait' : 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {runningAbsentCheck ? <RefreshCw size={14} className="spin-animation" /> : <Mail size={14} />}
                        <span>{runningAbsentCheck ? 'Running Absent Check...' : '▶ Run Daily Absent Email Check'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('email_logs')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '9px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                          border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
                        }}
                      >
                        View Email Audit Logs
                      </button>
                    </div>
                  </div>

                  {/* 5 Canonical KPI Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
                    {/* Card 1: Total Students */}
                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', fontWeight: 600 }}>Total Students</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: themeTokens.headingText, marginTop: 4 }}>
                        {dashboardStats?.totalStudents ?? dashboardStats?.counts?.totalStudents ?? 0}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Active enrolled learners</span>
                    </div>

                    {/* Card 2: Present Today */}
                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', fontWeight: 600 }}>Present Today</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                        {dashboardStats?.presentToday ?? dashboardStats?.counts?.todayPresent ?? 0}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Recorded present</span>
                    </div>

                    {/* Card 3: Absent Today */}
                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18 }}>
                      <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', fontWeight: 600 }}>Absent Today</span>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>
                        {dashboardStats?.absentToday ?? dashboardStats?.counts?.todayAbsent ?? 0}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Unexcused absence</span>
                    </div>

                    {/* Card 4: Pending Leaves (Clickable) */}
                    <div
                      onClick={() => setActiveTab('leave_approvals')}
                      style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18, cursor: 'pointer', transition: 'border-color 0.2s' }}
                      title="Click to review & approve leave applications"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', fontWeight: 600 }}>Pending Leaves</span>
                        {(dashboardStats?.pendingLeaves ?? dashboardStats?.counts?.pendingLeavesCount ?? 0) > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(217,119,6,0.15)', color: '#d97706', padding: '2px 8px', borderRadius: 999 }}>Action Req</span>
                        )}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
                        {dashboardStats?.pendingLeaves ?? dashboardStats?.counts?.pendingLeavesCount ?? 0}
                      </div>
                      <span style={{ fontSize: 11, color: isGreen ? '#127171' : '#2563eb', fontWeight: 600 }}>Review Leaves →</span>
                    </div>

                    {/* Card 5: Pending Signups (Clickable) */}
                    <div
                      onClick={() => setActiveTab('pending_signups')}
                      style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18, cursor: 'pointer', transition: 'border-color 0.2s' }}
                      title="Click to review & approve user registrations"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', fontWeight: 600 }}>Pending Signups</span>
                        {(dashboardStats?.pendingSignups ?? pendingSignupsList.length ?? 0) > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: 999 }}>New</span>
                        )}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                        {dashboardStats?.pendingSignups ?? pendingSignupsList.length ?? 0}
                      </div>
                      <span style={{ fontSize: 11, color: isGreen ? '#127171' : '#2563eb', fontWeight: 600 }}>Review Signups →</span>
                    </div>
                  </div>

                  {/* Absentees List with Instant WhatsApp/Email Trigger */}
                  <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 22, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={18} color="#ef4444" /> Today's Absent Students ({selectedDate})
                      </h3>
                      <span style={{ fontSize: 12, color: themeTokens.mutedText }}>
                        Click alert to compose parent notification
                      </span>
                    </div>

                    {(!dashboardStats?.todayAbsentees || dashboardStats.todayAbsentees.length === 0) ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#10b981', fontSize: 13, background: themeTokens.cardInner, borderRadius: 8 }}>
                        ✓ No absentees recorded for {selectedDate}. Full academy attendance!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {dashboardStats.todayAbsentees.map((st) => (
                          <div key={st.id} style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ fontSize: 14, color: themeTokens.headingText }}>{st.name}</strong> <span style={{ fontSize: 11, color: '#64748b' }}>({st.code})</span>
                              <div style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>
                                Batch: {st.batch} • Parent: {st.parentName || 'Parent'} ({st.parentPhone || 'No phone'})
                              </div>
                            </div>
                            <button
                              onClick={() => handleOpenAbsentModal(st)}
                              style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <MessageCircle size={14} /> Send Absent Alert
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Batch Breakdown & Recent Syllabus */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18 }}>
                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 20 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: themeTokens.headingText, marginBottom: 12 }}>
                        Batch-wise Attendance Breakdown
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(dashboardStats?.batchBreakdown || []).map((b) => (
                          <div key={b.batch} style={{ background: themeTokens.cardInner, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: 13, color: themeTokens.headingText }}>{b.batch}</strong>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{b.totalStudents} Students Enrolled</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>{b.presentCount} P</span>
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>{b.absentCount} A</span>
                              <span style={{ color: '#3b82f6', fontWeight: 700 }}>{b.holidayCount} H</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 20 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: themeTokens.headingText, marginBottom: 12 }}>
                        System & Infrastructure Status
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: themeTokens.cardInner, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Attendance Mode</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Strict 3-State (P / A / H)</span>
                        </div>
                        <div style={{ background: themeTokens.cardInner, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Dual Email Notifications</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: themeTokens.accentText }}>Automated Server-Side</span>
                        </div>
                        <div style={{ background: themeTokens.cardInner, padding: '10px 14px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Google Sheets Master Sync</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>Service Account Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB: MARK ATTENDANCE (STRICT 3-STATE: PRESENT, ABSENT, HOLIDAY)
              ========================================================================= */}
          {currentTabSafe === 'attendance_daily' && (
            <div>
              {/* Separate Role Switcher Tabs: Student Attendance vs Staff Attendance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'inline-flex', background: themeTokens.cardInner, padding: 4, borderRadius: 10, border: `1px solid ${themeTokens.cardBorder}` }}>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('STUDENT')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s ease',
                      background: roleFilter === 'STUDENT' ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                      color: roleFilter === 'STUDENT' ? '#fff' : themeTokens.mutedText
                    }}
                  >
                    <GraduationCap size={16} />
                    <span>Students Attendance</span>
                    <span style={{
                      marginLeft: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: roleFilter === 'STUDENT' ? 'rgba(255,255,255,0.22)' : themeTokens.cardBg,
                      color: roleFilter === 'STUDENT' ? '#fff' : themeTokens.mutedText
                    }}>
                      {dailyData?.studentCount ?? (dailyData?.records?.filter(r => r.role === 'STUDENT').length || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleFilter('STAFF')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s ease',
                      background: roleFilter === 'STAFF' ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                      color: roleFilter === 'STAFF' ? '#fff' : themeTokens.mutedText
                    }}
                  >
                    <Briefcase size={16} />
                    <span>Staff & Faculty Attendance</span>
                    <span style={{
                      marginLeft: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: roleFilter === 'STAFF' ? 'rgba(255,255,255,0.22)' : themeTokens.cardBg,
                      color: roleFilter === 'STAFF' ? '#fff' : themeTokens.mutedText
                    }}>
                      {dailyData?.staffCount ?? (dailyData?.records?.filter(r => r.role === 'STAFF').length || 0)}
                    </span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: themeTokens.mutedText }}>
                  <span>Viewing Roster: <strong style={{ color: themeTokens.headingText }}>{roleFilter === 'STUDENT' ? 'Students Directory' : 'Faculty & Staff Directory'}</strong></span>
                  <span>•</span>
                  <span>Date: <strong style={{ color: themeTokens.headingText }}>{selectedDate}</strong></span>
                </div>
              </div>

              {/* Bulk Toolbar */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: themeTokens.headingText }}>
                    1-Click Bulk Attendance ({roleFilter === 'STUDENT' ? 'Students' : 'Staff'}):
                  </span>
                  <button
                    onClick={() => handleBulkBatchMark('PRESENT')}
                    style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Mark All Present
                  </button>
                  <button
                    onClick={() => handleBulkBatchMark('ABSENT')}
                    style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Mark All Absent
                  </button>
                  <button
                    onClick={() => handleBulkBatchMark('HOLIDAY')}
                    style={{ padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    Mark All Holiday
                  </button>
                </div>

                <div style={{ fontSize: 12, color: themeTokens.mutedText, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>Showing: <strong style={{ color: themeTokens.headingText }}>{dailyData?.records?.length || 0}</strong> {roleFilter === 'STUDENT' ? 'students' : 'staff members'}</span>
                  <span>•</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>P: {dailyData?.stats?.present ?? 0}</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>A: {dailyData?.stats?.absent ?? 0}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>H: {dailyData?.stats?.holiday ?? 0}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>Not Marked: {dailyData?.stats?.notMarked ?? 0}</span>
                </div>
              </div>

              {/* Attendance Table */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: themeTokens.cardInner, borderBottom: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.mutedText }}>
                      <th style={{ padding: '12px 18px' }}>
                        {roleFilter === 'STUDENT' ? 'Student Name & Roll No' : 'Staff / Faculty Name & Code'}
                      </th>
                      <th style={{ padding: '12px 18px' }}>
                        {roleFilter === 'STUDENT' ? 'Enrolled Course & Batch' : 'Faculty Role & Department'}
                      </th>
                      <th style={{ padding: '12px 18px', textAlign: 'center' }}>Attendance Status (Strict 3 Options)</th>
                      <th style={{ padding: '12px 18px' }}>Timing</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!dailyData?.records || dailyData.records.length === 0) ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center' }}>
                          <Users size={38} color={themeTokens.iconMuted} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                          <div style={{ fontSize: 15, fontWeight: 700, color: themeTokens.headingText, marginBottom: 6 }}>
                            No {roleFilter === 'STUDENT' ? 'Students' : 'Staff Members'} Found
                          </div>
                          <div style={{ fontSize: 13, color: themeTokens.mutedText, maxWidth: 440, margin: '0 auto' }}>
                            {roleFilter === 'STUDENT'
                              ? 'No students found for this date or batch filter. Registered and logged-in students will automatically appear here.'
                              : 'No faculty/staff members found. Registered and logged-in staff will automatically appear here.'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dailyData.records.map((row) => (
                        <tr key={row.memberId} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                          <td style={{ padding: '12px 18px' }}>
                            <strong style={{ color: themeTokens.headingText }}>{row.name}</strong>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {row.code} • {row.role === 'STUDENT' ? 'Student' : 'Faculty / Staff'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', color: themeTokens.mutedText }}>
                            {row.role === 'STUDENT' ? row.batch : (row.department || 'Faculty')}
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              {row.course || (row.role === 'STAFF' ? 'Academic Staff' : 'Python Programming')}
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                            {/* 3-State Toggle: PRESENT, ABSENT, HOLIDAY */}
                            <div style={{ display: 'inline-flex', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 3 }}>
                              <button
                                onClick={() => handleMarkSingle(row.memberId, selectedDate, 'PRESENT')}
                                style={{
                                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                  background: row.status === 'PRESENT' ? '#10b981' : 'transparent',
                                  color: row.status === 'PRESENT' ? '#fff' : '#64748b'
                                }}
                              >
                                PRESENT
                              </button>
                              <button
                                onClick={() => handleMarkSingle(row.memberId, selectedDate, 'ABSENT')}
                                style={{
                                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                  background: row.status === 'ABSENT' ? '#ef4444' : 'transparent',
                                  color: row.status === 'ABSENT' ? '#fff' : '#64748b'
                                }}
                              >
                                ABSENT
                              </button>
                              <button
                                onClick={() => handleMarkSingle(row.memberId, selectedDate, 'HOLIDAY')}
                                style={{
                                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                  background: row.status === 'HOLIDAY' ? '#3b82f6' : 'transparent',
                                  color: row.status === 'HOLIDAY' ? '#fff' : '#64748b'
                                }}
                              >
                                HOLIDAY
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', color: themeTokens.mutedText, fontSize: 12 }}>
                            {row.inTime || '-'} to {row.outTime || '-'}
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            {row.role === 'STUDENT' && row.status === 'ABSENT' && (
                              <button
                                onClick={() => handleOpenAbsentModal(row)}
                                style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Alert Parent
                              </button>
                            )}
                            {row.role === 'STAFF' && (
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                {row.status === 'NOT_MARKED' ? 'Pending Mark' : 'Marked'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: ATTENDANCE DETAILS & MATRIX REGISTER
              ========================================================================= */}
          {(currentTabSafe === 'attendance_matrix' || currentTabSafe === 'attendance_details') && (
            <div>
              {/* Separate Role Switcher Tabs for Matrix: Student Register vs Staff Register */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'inline-flex', background: themeTokens.cardInner, padding: 4, borderRadius: 10, border: `1px solid ${themeTokens.cardBorder}` }}>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('STUDENT')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s ease',
                      background: roleFilter === 'STUDENT' ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                      color: roleFilter === 'STUDENT' ? '#fff' : themeTokens.mutedText
                    }}
                  >
                    <GraduationCap size={16} />
                    <span>Students Register</span>
                    <span style={{
                      marginLeft: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: roleFilter === 'STUDENT' ? 'rgba(255,255,255,0.22)' : themeTokens.cardBg,
                      color: roleFilter === 'STUDENT' ? '#fff' : themeTokens.mutedText
                    }}>
                      {matrixData?.studentCount ?? (matrixData?.matrix?.filter(r => r.member.role === 'STUDENT').length || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleFilter('STAFF')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s ease',
                      background: roleFilter === 'STAFF' ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                      color: roleFilter === 'STAFF' ? '#fff' : themeTokens.mutedText
                    }}
                  >
                    <Briefcase size={16} />
                    <span>Staff & Faculty Register</span>
                    <span style={{
                      marginLeft: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: roleFilter === 'STAFF' ? 'rgba(255,255,255,0.22)' : themeTokens.cardBg,
                      color: roleFilter === 'STAFF' ? '#fff' : themeTokens.mutedText
                    }}>
                      {matrixData?.staffCount ?? (matrixData?.matrix?.filter(r => r.member.role === 'STAFF').length || 0)}
                    </span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: themeTokens.mutedText }}>
                  <span>Register: <strong style={{ color: themeTokens.headingText }}>{roleFilter === 'STUDENT' ? 'Students Directory' : 'Faculty & Staff'}</strong></span>
                  <span>•</span>
                  <span>Month: <strong style={{ color: themeTokens.headingText }}>{matrixData?.month || selectedMonth}</strong></span>
                </div>
              </div>

              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText }}>
                    Monthly Attendance Register ({matrixData?.month || selectedMonth})
                  </h3>
                  <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                    Days 1 through {matrixData?.days?.length || 31} • Dropdown Selection (P / A / H / Select to Clear)
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      if (!matrixData) return;
                      printOverallReport({
                        startDate: `${selectedMonth}-01`,
                        endDate: `${selectedMonth}-${matrixData.days.length}`,
                        days: matrixData.days,
                        matrix: matrixData.matrix,
                        role: roleFilter
                      });
                    }}
                    style={{ padding: '8px 14px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Printer size={15} /> Print Full Register (PDF)
                  </button>
                </div>
              </div>

              {/* Interactive Matrix Table */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: themeTokens.cardInner, borderBottom: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.mutedText }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: 150 }}>Student / Staff</th>
                      {(matrixData?.days || []).map((d) => (
                        <th key={d.date} style={{ padding: '6px 4px', minWidth: 46, background: d.isWeekend ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                          <div>{d.day}</div>
                          <span style={{ fontSize: 9, color: d.isWeekend ? '#ef4444' : '#64748b' }}>{d.weekday}</span>
                        </th>
                      ))}
                      <th style={{ padding: '8px', color: '#10b981' }}>P</th>
                      <th style={{ padding: '8px', color: '#ef4444' }}>A</th>
                      <th style={{ padding: '8px', color: '#3b82f6' }}>H</th>
                      <th style={{ padding: '8px', color: themeTokens.accentText }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matrixData?.matrix || []).map((row) => (
                      <tr key={row.member.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                        <td style={{ padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: themeTokens.headingText }}>{row.member.name}</strong>
                        </td>
                        {(matrixData?.days || []).map((d) => {
                          const dayObj = row.days[d.date];
                          const st = dayObj?.status || '';
                          const isP = st === 'PRESENT';
                          const isA = st === 'ABSENT';
                          const isH = st === 'HOLIDAY';

                          return (
                            <td
                              key={d.date}
                              style={{
                                padding: '4px 2px',
                                background: isP
                                  ? 'rgba(16,185,129,0.12)'
                                  : isA
                                  ? 'rgba(239,68,68,0.12)'
                                  : isH
                                  ? 'rgba(59,130,246,0.12)'
                                  : d.isWeekend
                                  ? 'rgba(255,255,255,0.02)'
                                  : 'transparent'
                              }}
                            >
                              {isStudentPortal ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 32,
                                    height: 24,
                                    lineHeight: '24px',
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: isP ? '#10b981' : isA ? '#ef4444' : isH ? '#3b82f6' : '#64748b'
                                  }}
                                >
                                  {isP ? 'P' : isA ? 'A' : isH ? 'H' : ''}
                                </span>
                              ) : (
                                <select
                                  value={isP ? 'PRESENT' : isA ? 'ABSENT' : isH ? 'HOLIDAY' : ''}
                                  onChange={(e) => handleMarkSingle(row.member.id, d.date, e.target.value)}
                                  title={`${row.member.name} - ${d.date}`}
                                  style={{
                                    width: 44,
                                    height: 25,
                                    padding: '0 2px',
                                    borderRadius: 5,
                                    border: isP
                                      ? '1px solid rgba(16,185,129,0.5)'
                                      : isA
                                      ? '1px solid rgba(239,68,68,0.5)'
                                      : isH
                                      ? '1px solid rgba(59,130,246,0.5)'
                                      : `1px solid ${themeTokens.cardBorder}`,
                                    background: isP
                                      ? '#064e3b'
                                      : isA
                                      ? '#7f1d1d'
                                      : isH
                                      ? '#1e3a8a'
                                      : themeTokens.cardBg,
                                    color: isP
                                      ? '#6ee7b7'
                                      : isA
                                      ? '#fca5a5'
                                      : isH
                                      ? '#93c5fd'
                                      : '#64748b',
                                    fontWeight: 800,
                                    fontSize: 10,
                                    textAlign: 'center',
                                    textAlignLast: 'center',
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  <option value="" style={{ background: '#0f172a', color: themeTokens.mutedText }}>Select</option>
                                  <option value="PRESENT" style={{ background: '#0f172a', color: '#10b981' }}>P</option>
                                  <option value="ABSENT" style={{ background: '#0f172a', color: '#ef4444' }}>A</option>
                                  <option value="HOLIDAY" style={{ background: '#0f172a', color: '#3b82f6' }}>H</option>
                                </select>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ fontWeight: 800, color: '#10b981' }}>{row.presentCount}</td>
                        <td style={{ fontWeight: 800, color: '#ef4444' }}>{row.absentCount}</td>
                        <td style={{ fontWeight: 800, color: '#3b82f6' }}>{row.holidayCount}</td>
                        <td style={{ fontWeight: 800, color: row.attendanceRate >= 75 ? '#10b981' : '#ef4444' }}>
                          {row.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: PENDING APPROVALS (ADMIN ONLY)
              ========================================================================= */}
          {currentTabSafe === 'pending_signups' && (
            <PendingApprovalsTab
              pendingUsers={pendingSignupsList}
              onApprove={handleApproveSignup}
              onReject={(userId, name) => setRejectDialog({ open: true, userId, userName: name, reason: '' })}
              onRefresh={fetchPendingSignups}
              themeTokens={themeTokens}
            />
          )}

          {/* =========================================================================
              TAB: ACADEMIC HOLIDAYS (ADMIN ONLY)
              ========================================================================= */}
          {currentTabSafe === 'holidays' && (
            <HolidaysTab
              holidays={holidaysList}
              onAdd={() => { setEditingHolidayData(null); setHolidayModalOpen(true); }}
              onEdit={(h) => { setEditingHolidayData(h); setHolidayModalOpen(true); }}
              onDelete={handleDeleteHoliday}
              onRefresh={fetchHolidays}
              themeTokens={themeTokens}
            />
          )}

          {/* =========================================================================
              TAB: EMAIL AUDIT LOGS (ADMIN ONLY)
              ========================================================================= */}
          {currentTabSafe === 'email_logs' && (
            <EmailLogsTab
              emailLogs={emailLogsList}
              onRefresh={fetchEmailLogs}
              themeTokens={themeTokens}
            />
          )}

          {/* =========================================================================
              TAB: ALL SIGNED UP USERS DIRECTORY (ADMIN ONLY)
              ========================================================================= */}
          {currentTabSafe === 'signed_up_users' && (
            <div>
              {/* Header Banner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>
                    All Signed-Up Users Directory
                  </h3>
                  <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
                    Comprehensive real-time roster of all self-registered students, staff & faculty, and administrators.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={fetchSignedUpUsers}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                      border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} /> Refresh Roster
                  </button>
                  <button
                    onClick={handleExportUsersCSV}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                      border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
                    }}
                  >
                    <Download size={14} /> Export Users CSV
                  </button>
                  <button
                    onClick={() => { setAddUserRole('STUDENT'); setAddUserModal(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: '#2563eb', color: '#ffffff',
                      border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    title="Add a new student with roll code and course enrollment"
                  >
                    <Plus size={14} /> + Add Student
                  </button>
                  <button
                    onClick={() => { setAddUserRole('STAFF'); setAddUserModal(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: '#8b5cf6', color: '#ffffff',
                      border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    title="Add a new faculty trainer or staff member"
                  >
                    <Plus size={14} /> + Add Staff
                  </button>
                </div>
              </div>

              {/* Stat Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14, marginBottom: 22 }}>
                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Total Accounts</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: themeTokens.headingText, marginTop: 4 }}>
                    {signedUpUsers?.stats?.totalUsers ?? (signedUpUsers?.users?.length || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 2, fontWeight: 600 }}>● Active in System</div>
                </div>

                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Enrolled Students</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: isGreen ? '#127171' : '#2563eb', marginTop: 4 }}>
                    {signedUpUsers?.stats?.totalStudents ?? (signedUpUsers?.users?.filter(u => u.role === 'STUDENT').length || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>Self-Registered Students</div>
                </div>

                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Staff & Faculty</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#8b5cf6', marginTop: 4 }}>
                    {signedUpUsers?.stats?.totalStaff ?? (signedUpUsers?.users?.filter(u => u.role === 'STAFF').length || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>Academic & Trainers</div>
                </div>

                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Administrators</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
                    {signedUpUsers?.stats?.totalAdmins ?? (signedUpUsers?.users?.filter(u => u.role === 'ADMIN').length || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>Master Admins</div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Role Switcher Pills */}
                <div style={{ display: 'inline-flex', background: themeTokens.cardInner, padding: 3, borderRadius: 8, border: `1px solid ${themeTokens.cardBorder}`, flexWrap: 'wrap', gap: 2 }}>
                  {[
                    { id: 'ALL', label: 'All Users', count: signedUpUsers?.stats?.totalUsers },
                    { id: 'STUDENT', label: 'Students', count: signedUpUsers?.stats?.totalStudents },
                    { id: 'STAFF', label: 'Staff / Faculty', count: signedUpUsers?.stats?.totalStaff },
                    { id: 'ADMIN', label: 'Admins', count: signedUpUsers?.stats?.totalAdmins }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUserRoleFilter(tab.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: userRoleFilter === tab.id ? 700 : 500,
                        background: userRoleFilter === tab.id ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                        color: userRoleFilter === tab.id ? '#fff' : themeTokens.mutedText,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
                  <Search size={14} color={themeTokens.iconMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search by name, email, roll/staff code..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 32px',
                      background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`,
                      borderRadius: 8, fontSize: 12, color: themeTokens.textMain, outline: 'none'
                    }}
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: themeTokens.dimText, cursor: 'pointer', padding: 2 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Signed-Up Users with Actions and Pagination */}
              {(() => {
                const allUsers = signedUpUsers?.users || [];
                const filteredUsers = allUsers.filter(u => {
                  if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
                  if (!userSearchQuery) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (
                    (u.name && u.name.toLowerCase().includes(q)) ||
                    (u.email && u.email.toLowerCase().includes(q)) ||
                    (u.code && u.code.toLowerCase().includes(q)) ||
                    (u.phone && u.phone.toLowerCase().includes(q)) ||
                    (u.course && u.course.toLowerCase().includes(q)) ||
                    (u.department && u.department.toLowerCase().includes(q))
                  );
                });
                const totalPages = Math.ceil(filteredUsers.length / userPageSize) || 1;
                const safePage = Math.min(Math.max(1, userPage), totalPages);
                const startIndex = (safePage - 1) * userPageSize;
                const pageUsers = filteredUsers.slice(startIndex, startIndex + userPageSize);

                return (
                  <div>
                    {/* Bulk Actions Bar */}
                    {selectedUserIds.length > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 18px', background: 'rgba(18,113,113,0.08)',
                        border: '1px solid rgba(18,113,113,0.3)', borderRadius: 10, marginBottom: 14
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#127171' }}>
                            ✓ {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Deselect All
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBulkDeleteUsers(selectedUserIds)}
                          style={{
                            padding: '8px 16px', background: '#ef4444', color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            boxShadow: '0 2px 8px rgba(239,68,68,0.3)'
                          }}
                        >
                          <Trash2 size={14} /> Delete Selected ({selectedUserIds.length})
                        </button>
                      </div>
                    )}

                    <div className="table-scroll-container" style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13, minWidth: 850 }}>
                        <thead>
                          <tr style={{ background: themeTokens.cardInner, borderBottom: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.mutedText }}>
                            <th style={{ width: 44, padding: '12px 14px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={pageUsers.length > 0 && pageUsers.every(u => selectedUserIds.includes(u.userId || u.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const pageIds = pageUsers.map(u => u.userId || u.id);
                                    setSelectedUserIds(prev => Array.from(new Set([...prev, ...pageIds])));
                                  } else {
                                    const pageIds = pageUsers.map(u => u.userId || u.id);
                                    setSelectedUserIds(prev => prev.filter(id => !pageIds.includes(id)));
                                  }
                                }}
                                style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#127171' }}
                              />
                            </th>
                            <th style={{ padding: '12px 18px' }}>User / Profile</th>
                            <th style={{ padding: '12px 18px' }}>Account Role</th>
                            <th style={{ padding: '12px 18px' }}>ID Code &amp; Contact</th>
                            <th style={{ padding: '12px 18px' }}>Academic / Faculty Spec</th>
                            <th style={{ padding: '12px 18px' }}>Registration Date</th>
                            <th style={{ padding: '12px 18px', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '12px 18px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageUsers.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center' }}>
                                <Users size={38} color={themeTokens.iconMuted} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                                <div style={{ fontSize: 15, fontWeight: 700, color: themeTokens.headingText, marginBottom: 6 }}>
                                  No Users Found
                                </div>
                                <div style={{ fontSize: 13, color: themeTokens.mutedText, maxWidth: 420, margin: '0 auto' }}>
                                  {userSearchQuery
                                    ? `No users match "${userSearchQuery}". Try clearing search.`
                                    : 'No users have registered under this role filter yet.'}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            pageUsers.map((u) => {
                              const isStudent = u.role === 'STUDENT';
                              const isStaff = u.role === 'STAFF';
                              const isAdmin = u.role === 'ADMIN';

                              return (
                                <tr key={u.userId || u.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                                  <td style={{ width: 44, padding: '12px 14px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedUserIds.includes(u.userId || u.id)}
                                      onChange={() => {
                                        const uId = u.userId || u.id;
                                        setSelectedUserIds(prev => prev.includes(uId) ? prev.filter(x => x !== uId) : [...prev, uId]);
                                      }}
                                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#127171' }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div style={{
                                        width: 34, height: 34, borderRadius: 8,
                                        background: isStudent ? 'rgba(37,99,235,0.1)' : isStaff ? 'rgba(139,92,246,0.1)' : 'rgba(217,119,6,0.1)',
                                        color: isStudent ? '#2563eb' : isStaff ? '#8b5cf6' : '#d97706',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13
                                      }}>
                                        {u.name?.charAt(0)?.toUpperCase() || 'U'}
                                      </div>
                                      <div>
                                        <strong style={{ color: themeTokens.headingText }}>{u.name}</strong>
                                        <div style={{ fontSize: 11, color: themeTokens.mutedText }}>{u.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 18px' }}>
                                    <span style={{
                                      padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                                      background: isStudent ? 'rgba(37,99,235,0.1)' : isStaff ? 'rgba(139,92,246,0.1)' : 'rgba(217,119,6,0.1)',
                                      color: isStudent ? '#2563eb' : isStaff ? '#8b5cf6' : '#d97706',
                                      border: isStudent ? '1px solid rgba(37,99,235,0.2)' : isStaff ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(217,119,6,0.2)'
                                    }}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 18px' }}>
                                    <div style={{ fontWeight: 600, color: themeTokens.headingText, fontSize: 12 }}>{u.code || '-'}</div>
                                    <div style={{ fontSize: 11, color: themeTokens.mutedText }}>{u.phone || '-'}</div>
                                  </td>
                                  <td style={{ padding: '12px 18px', color: themeTokens.mutedText }}>
                                    <div>{isStudent ? (u.course || 'Python Programming') : (u.department || 'Faculty Member')}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{isStudent ? (u.batch || 'Batch-2026-A') : 'Staff Directory'}</div>
                                  </td>
                                  <td style={{ padding: '12px 18px', color: themeTokens.mutedText, fontSize: 12 }}>
                                    {u.signupDate ? u.signupDate.replace('T', ' ').slice(0, 16) : '-'}
                                  </td>
                                  <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                      background: u.status === 'PENDING' ? 'rgba(217,119,6,0.15)' : 'rgba(16,185,129,0.12)',
                                      color: u.status === 'PENDING' ? '#d97706' : '#10b981',
                                      border: u.status === 'PENDING' ? '1px solid rgba(217,119,6,0.3)' : '1px solid rgba(16,185,129,0.3)'
                                    }}>
                                      {u.status || 'ACTIVE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => { setViewingUserData(u); setViewUserModal(true); }}
                                        title="View User Details"
                                        style={{ padding: '5px 10px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setEditingUserData(u); setEditUserModal(true); }}
                                        title="Edit User"
                                        style={{ padding: '5px 10px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u)}
                                        title="Soft Delete User"
                                        style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {filteredUsers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '4px 2px', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                          Showing <strong style={{ color: themeTokens.headingText }}>{startIndex + 1}</strong> to <strong style={{ color: themeTokens.headingText }}>{Math.min(startIndex + userPageSize, filteredUsers.length)}</strong> of <strong style={{ color: themeTokens.headingText }}>{filteredUsers.length}</strong> registered users
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                              border: `1px solid ${themeTokens.secondaryBtnBorder}`,
                              cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1
                            }}
                          >
                            ← Previous
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 600, color: themeTokens.headingText, padding: '0 4px' }}>
                            Page {safePage} of {totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() => setUserPage(p => Math.min(totalPages, p + 1))}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                              border: `1px solid ${themeTokens.secondaryBtnBorder}`,
                              cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1
                            }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================================
              TAB: STUDENTS & STAFF FULL CRUD (INLINE EDITABLE TABLES)
              ========================================================================= */}
          {currentTabSafe === 'members_crud' && (
            <div>
              {/* Filter & Action Toolbar */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* Search Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: '7px 12px', width: 250 }}>
                      <Search size={15} color={themeTokens.iconMuted} />
                      <input
                        type="text"
                        placeholder="Search name, code, email, phone..."
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setMemberPage(1);
                        }}
                        style={{ background: 'transparent', border: 'none', color: themeTokens.headingText, fontSize: 13, outline: 'none', width: '100%' }}
                      />
                    </div>

                    {/* Role Selector Tabs */}
                    <div style={{ display: 'flex', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 3 }}>
                      <button
                        onClick={() => {
                          setRoleFilter('STUDENT');
                          setMemberPage(1);
                        }}
                        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: roleFilter === 'STUDENT' ? (isGreen ? '#127171' : '#09090b') : 'transparent', color: roleFilter === 'STUDENT' ? '#fff' : themeTokens.mutedText }}
                      >
                        Students ({membersList.filter(m => m.role === 'STUDENT').length})
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('STAFF');
                          setMemberPage(1);
                        }}
                        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: roleFilter === 'STAFF' ? (isGreen ? '#127171' : '#09090b') : 'transparent', color: roleFilter === 'STAFF' ? '#fff' : themeTokens.mutedText }}
                      >
                        Staff ({membersList.filter(m => m.role === 'STAFF').length})
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setAddMemberModal(true)}
                    style={{ padding: '9px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Plus size={16} /> Add New {roleFilter === 'STUDENT' ? 'Student' : 'Staff Member'}
                  </button>
                </div>

                {/* Filter Dropdowns: Batch, Course, Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderTop: `1px solid ${themeTokens.cardBorder}`, paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Filter size={14} color={themeTokens.iconMuted} />
                    <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Filter Batch:</span>
                    <select
                      value={batchFilter}
                      onChange={(e) => {
                        setBatchFilter(e.target.value);
                        setMemberPage(1);
                      }}
                      style={{ padding: '5px 10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                    >
                      <option value="All Batches">All Batches</option>
                      {dynamicBatches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Course / Dept:</span>
                    <select
                      value={memberCourseFilter}
                      onChange={(e) => {
                        setMemberCourseFilter(e.target.value);
                        setMemberPage(1);
                      }}
                      style={{ padding: '5px 10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                    >
                      <option value="All">All Courses</option>
                      {dynamicCourses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Status:</span>
                    <select
                      value={memberStatusFilter}
                      onChange={(e) => {
                        setMemberStatusFilter(e.target.value);
                        setMemberPage(1);
                      }}
                      style={{ padding: '5px 10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  {(memberSearch || batchFilter !== 'All Batches' || memberCourseFilter !== 'All' || memberStatusFilter !== 'All') && (
                    <button
                      onClick={() => {
                        setMemberSearch('');
                        setBatchFilter('All Batches');
                        setMemberCourseFilter('All');
                        setMemberStatusFilter('All');
                        setMemberPage(1);
                      }}
                      style={{ background: 'none', border: 'none', color: themeTokens.accentText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Actions Bar for Members */}
              {selectedMemberIds.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px', background: 'rgba(18,113,113,0.08)',
                  border: '1px solid rgba(18,113,113,0.3)', borderRadius: 10, marginBottom: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#127171' }}>
                      ✓ {selectedMemberIds.length} {roleFilter === 'STUDENT' ? 'student' : 'staff member'}{selectedMemberIds.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Deselect All
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBulkDeleteMembers(selectedMemberIds)}
                    style={{
                      padding: '8px 16px', background: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 2px 8px rgba(239,68,68,0.3)'
                    }}
                  >
                    <Trash2 size={14} /> Delete Selected ({selectedMemberIds.length})
                  </button>
                </div>
              )}

              {/* Inline Editable Data Table with Sortable Columns */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: themeTokens.cardInner, borderBottom: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.mutedText }}>
                      <th style={{ width: 44, padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={paginatedMembers.length > 0 && paginatedMembers.every(m => selectedMemberIds.includes(m.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const pageIds = paginatedMembers.map(m => m.id);
                              setSelectedMemberIds(prev => Array.from(new Set([...prev, ...pageIds])));
                            } else {
                              const pageIds = paginatedMembers.map(m => m.id);
                              setSelectedMemberIds(prev => prev.filter(id => !pageIds.includes(id)));
                            }
                          }}
                          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#127171' }}
                        />
                      </th>
                      <th
                        onClick={() => handleSortMember('name')}
                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Full Name {memberSortColumn === 'name' ? (memberSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th
                        onClick={() => handleSortMember('code')}
                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        ID Code {memberSortColumn === 'code' ? (memberSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th
                        onClick={() => handleSortMember('batch')}
                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Batch {memberSortColumn === 'batch' ? (memberSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th
                        onClick={() => handleSortMember('course')}
                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Course / Dept {memberSortColumn === 'course' ? (memberSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th style={{ padding: '12px 16px' }}>Phone Number</th>
                      <th style={{ padding: '12px 16px' }}>Email Address</th>
                      <th
                        onClick={() => handleSortMember('status')}
                        style={{ padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Status {memberSortColumn === 'status' ? (memberSortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                          No members found matching the specified filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedMembers.map((mem) => {
                        const isEditing = editingMemberId === mem.id;
                        return (
                          <tr key={mem.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                            <td style={{ width: 44, padding: '10px 14px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(mem.id)}
                                onChange={() => {
                                  setSelectedMemberIds(prev => prev.includes(mem.id) ? prev.filter(x => x !== mem.id) : [...prev, mem.id]);
                                }}
                                style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#127171' }}
                              />
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editMemberForm.name ?? mem.name}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13, width: '100%' }}
                                />
                              ) : (
                                <strong style={{ color: themeTokens.headingText }}>{mem.name}</strong>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editMemberForm.code ?? mem.code}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, code: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13, width: 110 }}
                                />
                              ) : (
                                <span style={{ fontFamily: 'monospace', color: themeTokens.mutedText }}>{mem.code}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <select
                                  value={editMemberForm.batch ?? mem.batch}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, batch: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13 }}
                                >
                                  {dynamicBatches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: themeTokens.mutedText }}>{mem.batch}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editMemberForm.course ?? mem.course}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, course: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13 }}
                                />
                              ) : (
                                <span style={{ color: themeTokens.mutedText }}>{mem.course}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editMemberForm.phone ?? mem.phone ?? ''}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13 }}
                                />
                              ) : (
                                <span style={{ color: themeTokens.mutedText }}>{mem.phone || '-'}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editMemberForm.email ?? mem.email ?? ''}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13 }}
                                />
                              ) : (
                                <span style={{ color: themeTokens.mutedText }}>{mem.email || '-'}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              {isEditing ? (
                                <select
                                  value={editMemberForm.status ?? mem.status}
                                  onChange={(e) => setEditMemberForm({ ...editMemberForm, status: e.target.value })}
                                  style={{ padding: '5px 8px', background: themeTokens.cardInner, border: '1px solid #d4af37', borderRadius: 4, color: themeTokens.headingText, fontSize: 13 }}
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                                </select>
                              ) : (
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                  background: mem.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color: mem.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                                }}>
                                  {mem.status}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              {isEditing ? (
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    onClick={() => handleSaveMemberInline(mem.id)}
                                    style={{ padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Save size={13} /> Save
                                  </button>
                                  <button
                                    onClick={() => setEditingMemberId(null)}
                                    style={{ padding: '5px 10px', background: themeTokens.secondaryBtn, color: themeTokens.mutedText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    onClick={() => {
                                      setEditingMemberId(mem.id);
                                      setEditMemberForm({ ...mem });
                                    }}
                                    style={{ padding: '5px 10px', background: themeTokens.secondaryBtn, color: themeTokens.headingText, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingUserData({
                                        ...mem,
                                        userId: mem.id,
                                        studentId: mem.code
                                      });
                                      setEditUserModal(true);
                                    }}
                                    title="Edit All Details (Name, Parent, ID, Department, etc.)"
                                    style={{ padding: '5px 10px', background: isGreen ? 'rgba(18,113,113,0.1)' : 'rgba(9,9,11,0.06)', color: themeTokens.iconColor, border: isGreen ? '1px solid rgba(18,113,113,0.3)' : '1px solid #d4d4d8', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <User size={13} /> Edit All
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(mem.id, mem.name)}
                                    style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                  Showing {processedMembers.length === 0 ? 0 : (memberPage - 1) * memberPageSize + 1} to{' '}
                  {Math.min(memberPage * memberPageSize, processedMembers.length)} of {processedMembers.length} members
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: themeTokens.mutedText }}>Rows per page:</span>
                  <select
                    value={memberPageSize}
                    onChange={(e) => {
                      setMemberPageSize(Number(e.target.value));
                      setMemberPage(1);
                    }}
                    style={{ padding: '4px 8px', background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>

                  <button
                    disabled={memberPage === 1}
                    onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                    style={{ padding: '5px 12px', background: memberPage === 1 ? themeTokens.cardInner : themeTokens.secondaryBtn, color: memberPage === 1 ? themeTokens.dimText : themeTokens.headingText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, cursor: memberPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Prev
                  </button>

                  {Array.from({ length: totalMemberPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setMemberPage(pg)}
                      style={{
                        padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: memberPage === pg ? themeTokens.primaryBtn : themeTokens.cardInner,
                        color: memberPage === pg ? themeTokens.primaryBtnFg : themeTokens.mutedText
                      }}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    disabled={memberPage >= totalMemberPages}
                    onClick={() => setMemberPage(p => Math.min(totalMemberPages, p + 1))}
                    style={{ padding: '5px 12px', background: memberPage >= totalMemberPages ? themeTokens.cardInner : themeTokens.secondaryBtn, color: memberPage >= totalMemberPages ? themeTokens.dimText : themeTokens.headingText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, cursor: memberPage >= totalMemberPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: LEAVE REQUEST (STUDENT PORTAL FORM & MY LEAVE REQUESTS)
              ========================================================================= */}
          {currentTabSafe === 'leaves' && isStudentPortal && (
            <div>
              {/* Dual Email Notice Banner */}
              <div style={{
                background: isGreen ? 'rgba(18,113,113,0.08)' : themeTokens.cardInner,
                border: `1px solid ${isGreen ? 'rgba(18,113,113,0.3)' : themeTokens.cardBorder}`,
                borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12
              }}>
                <Mail size={22} color={themeTokens.iconColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: themeTokens.textMain, lineHeight: 1.5 }}>
                  <strong style={{ color: themeTokens.headingText }}>Automated Dual Email Notification:</strong> When you submit a leave application, an automated notification is instantly transmitted server-side to the administration. Once reviewed, you will receive an approval/rejection confirmation via email.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
                {/* Leave Application Form */}
                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText, marginBottom: 16 }}>
                    Submit Leave Application
                  </h3>
                  <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Student Name (Auto-filled)</label>
                      <input
                        type="text"
                        value={auth?.user?.name || ''}
                        disabled
                        style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.mutedText, fontSize: 13 }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Course</label>
                        <input
                          type="text"
                          value={auth?.user?.course || 'Python Programming'}
                          disabled
                          style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.mutedText, fontSize: 13 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Batch</label>
                        <input
                          type="text"
                          value={auth?.user?.batch || 'Batch-2026-A'}
                          disabled
                          style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.mutedText, fontSize: 13 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>From Date *</label>
                        <input
                          type="date"
                          value={studentLeaveForm.startDate}
                          onChange={(e) => {
                            const updated = { ...studentLeaveForm, startDate: e.target.value };
                            setStudentLeaveForm(updated);
                            if (leaveTouched.startDate) validateLeaveField('startDate', e.target.value, updated);
                          }}
                          onBlur={() => {
                            setLeaveTouched(prev => ({ ...prev, startDate: true }));
                            validateLeaveField('startDate', studentLeaveForm.startDate, studentLeaveForm);
                          }}
                          style={{
                            width: '100%', padding: '9px 12px',
                            background: leaveTouched.startDate && leaveErrors.startDate ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                            border: leaveTouched.startDate && leaveErrors.startDate ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                            borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                          }}
                        />
                        {leaveTouched.startDate && leaveErrors.startDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                            <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>{leaveErrors.startDate}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>To Date *</label>
                        <input
                          type="date"
                          value={studentLeaveForm.endDate}
                          onChange={(e) => {
                            const updated = { ...studentLeaveForm, endDate: e.target.value };
                            setStudentLeaveForm(updated);
                            if (leaveTouched.endDate) validateLeaveField('endDate', e.target.value, updated);
                          }}
                          onBlur={() => {
                            setLeaveTouched(prev => ({ ...prev, endDate: true }));
                            validateLeaveField('endDate', studentLeaveForm.endDate, studentLeaveForm);
                          }}
                          style={{
                            width: '100%', padding: '9px 12px',
                            background: leaveTouched.endDate && leaveErrors.endDate ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                            border: leaveTouched.endDate && leaveErrors.endDate ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                            borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                          }}
                        />
                        {leaveTouched.endDate && leaveErrors.endDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                            <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                            <span>{leaveErrors.endDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Leave Type *</label>
                      <select
                        value={studentLeaveForm.leaveType}
                        onChange={(e) => setStudentLeaveForm({ ...studentLeaveForm, leaveType: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                      >
                        <option value="CASUAL">Casual Leave</option>
                        <option value="SICK">Sick / Medical Leave</option>
                        <option value="ACADEMIC">Academic / Exam Leave</option>
                        <option value="EMERGENCY">Emergency Family Leave</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Reason for Leave *</label>
                      <textarea
                        rows={3}
                        value={studentLeaveForm.reason}
                        onChange={(e) => {
                          const updated = { ...studentLeaveForm, reason: e.target.value };
                          setStudentLeaveForm(updated);
                          if (leaveTouched.reason) validateLeaveField('reason', e.target.value, updated);
                        }}
                        onBlur={() => {
                          setLeaveTouched(prev => ({ ...prev, reason: true }));
                          validateLeaveField('reason', studentLeaveForm.reason, studentLeaveForm);
                        }}
                        placeholder="State your reason clearly (min 5 characters)..."
                        style={{
                          width: '100%', padding: '9px 12px',
                          background: leaveTouched.reason && leaveErrors.reason ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                          border: leaveTouched.reason && leaveErrors.reason ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                          borderRadius: 6, color: themeTokens.textMain, fontSize: 13, resize: 'vertical', outline: 'none'
                        }}
                      />
                      {leaveTouched.reason && leaveErrors.reason && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                          <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                          <span>{leaveErrors.reason}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{ padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s ease' }}
                    >
                      <Send size={15} /> Submit Application & Notify Admins
                    </button>
                  </form>
                </div>

                {/* My Leave Requests Table */}
                <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText, marginBottom: 16 }}>
                    My Leave Requests & Approval Status
                  </h3>

                  {leavesList.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13, background: themeTokens.cardInner, borderRadius: 8 }}>
                      No leave requests submitted yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {leavesList.map((lv) => (
                        <div key={lv.id} style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: themeTokens.secondaryBtn, color: themeTokens.mutedText, padding: '2px 8px', borderRadius: 4 }}>
                                {lv.leaveType}
                              </span>
                              <strong style={{ fontSize: 13, color: themeTokens.headingText }}>
                                {lv.startDate} to {lv.endDate}
                              </strong>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                              background: lv.status === 'APPROVED' ? 'rgba(16,185,129,0.2)' : lv.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.2)',
                              color: lv.status === 'APPROVED' ? '#10b981' : lv.status === 'REJECTED' ? '#ef4444' : '#d4af37'
                            }}>
                              {lv.status}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: themeTokens.mutedText, margin: '4px 0 6px' }}>"{lv.reason}"</p>
                          {lv.adminRemarks && (
                            <div style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '6px 10px', borderRadius: 4, marginTop: 6 }}>
                              <strong>Admin Remark:</strong> {lv.adminRemarks} (by {lv.reviewedBy || 'Admin'})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: LEAVE APPROVALS (ADMIN PORTAL WITH DUAL EMAIL & AUTO-ATTENDANCE)
              ========================================================================= */}
          {currentTabSafe === 'leave_approvals' && (
            <div>
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText }}>
                    Student Leave Requests & Admin Decision Center
                  </h3>
                  <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                    Approving automatically marks attendance as HOLIDAY for each day in range and dispatches notification emails.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a
                    href={`${API_BASE}/export/leaves/csv`}
                    style={{ padding: '8px 14px', background: themeTokens.secondaryBtn, color: themeTokens.headingText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} /> Export Leaves CSV
                  </a>
                </div>
              </div>

              {/* Filter and Search Bar for Leave Approvals */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'inline-flex', background: themeTokens.cardInner, padding: 3, borderRadius: 8, border: `1px solid ${themeTokens.cardBorder}`, flexWrap: 'wrap', gap: 2 }}>
                  {[
                    { id: 'ALL', label: 'All Requests' },
                    { id: 'PENDING', label: 'Pending' },
                    { id: 'APPROVED', label: 'Approved' },
                    { id: 'REJECTED', label: 'Rejected' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setLeaveStatusFilter(tab.id); setLeavePage(1); }}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: leaveStatusFilter === tab.id ? 700 : 500,
                        background: leaveStatusFilter === tab.id ? (isGreen ? '#127171' : '#0f172a') : 'transparent',
                        color: leaveStatusFilter === tab.id ? '#fff' : themeTokens.mutedText,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label} {tab.id !== 'ALL' ? `(${leavesList.filter(l => l.status === tab.id).length})` : `(${leavesList.length})`}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 360 }}>
                  <Search size={14} color={themeTokens.iconMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search by student name, code, course, reason..."
                    value={leaveSearch}
                    onChange={(e) => { setLeaveSearch(e.target.value); setLeavePage(1); }}
                    style={{
                      width: '100%', padding: '8px 12px 8px 32px',
                      background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`,
                      borderRadius: 8, fontSize: 12, color: themeTokens.textMain, outline: 'none'
                    }}
                  />
                  {leaveSearch && (
                    <button
                      onClick={() => setLeaveSearch('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: themeTokens.dimText, cursor: 'pointer', padding: 2 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const filteredLeaves = leavesList.filter(lv => {
                  if (leaveStatusFilter !== 'ALL' && lv.status !== leaveStatusFilter) return false;
                  if (!leaveSearch) return true;
                  const q = leaveSearch.toLowerCase();
                  return (
                    (lv.studentName && lv.studentName.toLowerCase().includes(q)) ||
                    (lv.memberName && lv.memberName.toLowerCase().includes(q)) ||
                    (lv.memberCode && lv.memberCode.toLowerCase().includes(q)) ||
                    (lv.course && lv.course.toLowerCase().includes(q)) ||
                    (lv.batch && lv.batch.toLowerCase().includes(q)) ||
                    (lv.reason && lv.reason.toLowerCase().includes(q))
                  );
                });

                const totalLeavePages = Math.ceil(filteredLeaves.length / leavePageSize) || 1;
                const safeLeavePage = Math.min(Math.max(1, leavePage), totalLeavePages);
                const startIdx = (safeLeavePage - 1) * leavePageSize;
                const pagedLeaves = filteredLeaves.slice(startIdx, startIdx + leavePageSize);

                if (pagedLeaves.length === 0) {
                  return (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14, background: themeTokens.cardBg, borderRadius: 10 }}>
                      No leave requests match the current filters.
                    </div>
                  );
                }

                return (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {pagedLeaves.map((lv) => {
                        const isPending = lv.status === 'PENDING';
                        return (
                          <div key={lv.id} style={{ background: themeTokens.cardBg, border: `1px solid ${isPending ? (isGreen ? '#127171' : '#09090b') : themeTokens.cardBorder}`, borderRadius: 10, padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                              <div>
                                <span style={{ fontSize: 16, fontWeight: 800, color: themeTokens.headingText }}>{lv.studentName || lv.memberName}</span>
                                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({lv.memberCode || lv.course} • {lv.batch})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 11, color: themeTokens.mutedText }}>Applied: {lv.appliedAt}</span>
                                <span style={{
                                  fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                                  background: lv.status === 'APPROVED' ? 'rgba(16,185,129,0.2)' : lv.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.2)',
                                  color: lv.status === 'APPROVED' ? '#10b981' : lv.status === 'REJECTED' ? '#ef4444' : '#d4af37'
                                }}>
                                  {lv.status}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLeave(lv.id)}
                                  title="Soft Delete Leave Request"
                                  style={{
                                    padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                  }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            </div>

                            <div style={{ background: themeTokens.cardInner, padding: '12px 16px', borderRadius: 8, marginBottom: 14 }}>
                              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: themeTokens.mutedText, marginBottom: 6 }}>
                                <span><strong>Leave Type:</strong> {lv.leaveType}</span>
                                <span><strong>Date Range:</strong> {lv.startDate} to {lv.endDate}</span>
                              </div>
                              <div style={{ fontSize: 13, color: themeTokens.headingText }}>
                                <strong>Reason:</strong> {lv.reason}
                              </div>
                            </div>

                            {/* If Pending: Admin Decision Controls */}
                            {isPending ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  placeholder="Admin remarks (e.g. Approved. Submit medical cert upon return)"
                                  value={adminReviewRemark[lv.id] || ''}
                                  onChange={(e) => setAdminReviewRemark({ ...adminReviewRemark, [lv.id]: e.target.value })}
                                  style={{ flex: 1, minWidth: 260, padding: '8px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 13 }}
                                />
                                <button
                                  onClick={() => handleReviewLeave(lv.id, 'approve')}
                                  disabled={reviewLoading}
                                  style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  <Check size={14} /> Approve Leave
                                </button>
                                <button
                                  onClick={() => handleReviewLeave(lv.id, 'reject')}
                                  disabled={reviewLoading}
                                  style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                  <X size={14} /> Reject Leave
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: '#64748b' }}>
                                Decision by <strong>{lv.reviewedBy}</strong>: "{lv.adminRemarks || 'No remarks recorded'}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Leave Pagination Controls */}
                    {filteredLeaves.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '4px 2px', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                          Showing <strong style={{ color: themeTokens.headingText }}>{startIdx + 1}</strong> to <strong style={{ color: themeTokens.headingText }}>{Math.min(startIdx + leavePageSize, filteredLeaves.length)}</strong> of <strong style={{ color: themeTokens.headingText }}>{filteredLeaves.length}</strong> leave requests
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            disabled={safeLeavePage <= 1}
                            onClick={() => setLeavePage(p => Math.max(1, p - 1))}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                              border: `1px solid ${themeTokens.secondaryBtnBorder}`,
                              cursor: safeLeavePage <= 1 ? 'not-allowed' : 'pointer', opacity: safeLeavePage <= 1 ? 0.5 : 1
                            }}
                          >
                            ← Previous
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 600, color: themeTokens.headingText, padding: '0 4px' }}>
                            Page {safeLeavePage} of {totalLeavePages}
                          </span>
                          <button
                            type="button"
                            disabled={safeLeavePage >= totalLeavePages}
                            onClick={() => setLeavePage(p => Math.min(totalLeavePages, p + 1))}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
                              border: `1px solid ${themeTokens.secondaryBtnBorder}`,
                              cursor: safeLeavePage >= totalLeavePages ? 'not-allowed' : 'pointer', opacity: safeLeavePage >= totalLeavePages ? 0.5 : 1
                            }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================================
              TAB: PORTION COVERED (DYNAMIC SIDEBAR MENU)
              ========================================================================= */}
          {currentTabSafe === 'portions' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText }}>
                    Portion Covered (Syllabus Tracker)
                  </h3>
                  <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                    {isStudentPortal ? 'Read-only view of topics covered by your instructors' : 'Add, edit, and record daily portions covered for batches'}
                  </div>
                </div>

                {!isStudentPortal && (
                  <button
                    onClick={() => {
                      setEditingPortionId(null);
                      setPortionForm({
                        date: new Date().toISOString().split('T')[0],
                        course: 'Python Programming', batch: 'Batch-2026-A', subject: 'Python Core',
                        topic: '', remarks: '', conductedBy: auth?.user?.name || ''
                      });
                      setAddPortionModal(true);
                    }}
                    style={{ padding: '9px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={16} /> Record New Portion
                  </button>
                )}
              </div>

              {/* Portions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {portionsList.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: themeTokens.cardBg, borderRadius: 10 }}>
                    No portions covered recorded for this month.
                  </div>
                ) : (
                  portionsList.map((p) => (
                    <div key={p.id} style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: themeTokens.accentText, background: 'rgba(212,175,55,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                            {p.date}
                          </span>
                          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{p.subject}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>• {p.batch} ({p.course})</span>
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: themeTokens.headingText, margin: '4px 0' }}>
                          {p.topic}
                        </h4>
                        {p.remarks && (
                          <p style={{ fontSize: 12, color: themeTokens.mutedText, margin: '4px 0 0' }}>
                            Remarks: {p.remarks}
                          </p>
                        )}
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                          Conducted by: <strong>{p.conductedBy}</strong>
                        </div>
                      </div>

                      {!isStudentPortal && (
                        <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                          <button
                            onClick={() => {
                              setEditingPortionId(p.id);
                              setPortionForm({ ...p });
                              setAddPortionModal(true);
                            }}
                            style={{ padding: '6px 10px', background: themeTokens.secondaryBtn, color: themeTokens.headingText, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePortion(p.id)}
                            style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: REPORTS & EXPORTS (OVERALL REGISTER & INDIVIDUAL STUDENT)
              ========================================================================= */}
          {currentTabSafe === 'reports' && (
            <div>
              {/* Institutional Reports Branding Banner */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '14px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img src="/heta-logo.png" alt="HETA Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: themeTokens.headingText, margin: 0 }}>
                      Official Academic Registers &amp; PDF Export Dossiers
                    </h3>
                    <div style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
                      Verified A4 Print &amp; PDF Export containing institutional crest, 3-state attendance breakdown, and official signature blocks.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: themeTokens.accentText }}>
                  <Sparkles size={13} /> Official Seal Embedded
                </div>
              </div>

              {/* Type Switcher and Date Range Presets */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, padding: 3 }}>
                    <button
                      onClick={() => setReportType('OVERALL')}
                      style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: reportType === 'OVERALL' ? '#d4af37' : 'transparent', color: reportType === 'OVERALL' ? '#000' : '#94a3b8' }}
                    >
                      Overall Academy Register
                    </button>
                    <button
                      onClick={() => setReportType('INDIVIDUAL')}
                      style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: reportType === 'INDIVIDUAL' ? '#d4af37' : 'transparent', color: reportType === 'INDIVIDUAL' ? '#000' : '#94a3b8' }}
                    >
                      Individual Student Report
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      style={{ padding: '6px 10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                    />
                    <span style={{ color: '#64748b' }}>to</span>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      style={{ padding: '6px 10px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12 }}
                    />
                  </div>
                </div>

                {reportType === 'INDIVIDUAL' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 12, color: themeTokens.mutedText }}>Select Student:</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        fetchIndividualReport(e.target.value, reportStartDate, reportEndDate);
                      }}
                      style={{ padding: '6px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 13 }}
                    >
                      {membersList.map((m) => (
                        <option key={m.id} value={m.id} style={{ background: themeTokens.cardBg }}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action Toolbar for Print & CSV */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {reportType === 'OVERALL' ? (
                  <>
                    <button
                      onClick={() => {
                        if (!rangeMatrixData) return;
                        printOverallReport({
                          startDate: reportStartDate,
                          endDate: reportEndDate,
                          days: rangeMatrixData.days,
                          matrix: rangeMatrixData.matrix,
                          role: roleFilter
                        });
                      }}
                      style={{ padding: '10px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Printer size={16} /> Print Full Register (A4 Landscape PDF)
                    </button>
                    <a
                      href={`${API_BASE}/export/csv?month=${reportStartDate.substring(0, 7)}`}
                      style={{ padding: '10px 18px', background: themeTokens.secondaryBtn, color: themeTokens.headingText, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Download size={16} /> Export CSV for Excel
                    </a>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (!individualData) return;
                      printIndividualReport({
                        member: individualData.member,
                        stats: individualData.stats,
                        history: individualData.history,
                        startDate: reportStartDate,
                        endDate: reportEndDate
                      });
                    }}
                    style={{ padding: '10px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Printer size={16} /> Print Student Dossier (A4 Portrait PDF)
                  </button>
                )}
              </div>

              {/* Preview Box */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: themeTokens.headingText, marginBottom: 12 }}>
                  Report Data Summary ({reportStartDate} to {reportEndDate})
                </h4>
                {reportType === 'OVERALL' ? (
                  <div style={{ fontSize: 13, color: themeTokens.mutedText }}>
                    Loaded <strong>{rangeMatrixData?.matrix?.length || 0}</strong> students across <strong>{rangeMatrixData?.days?.length || 0}</strong> days. Ready for instant A4 Landscape rendering.
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: themeTokens.mutedText }}>
                    Student: <strong>{individualData?.member?.name}</strong> • Attendance Rate: <strong>{individualData?.stats?.attendanceRate}%</strong> ({individualData?.stats?.presentDays} Present, {individualData?.stats?.absentDays} Absent, {individualData?.stats?.holidayDays} Holidays).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB: GOOGLE SHEETS SYNC
              ========================================================================= */}
          {currentTabSafe === 'sheets' && (
            <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Master Control Console */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 14, padding: 30, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' }}>
                {/* Header & Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(59,130,246,0.2) 100%)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={30} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: themeTokens.headingText, margin: 0 }}>
                          Google Spreadsheet Enterprise Cloud Sync
                        </h3>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,175,55,0.15)', color: themeTokens.accentText, border: '1px solid rgba(212,175,55,0.3)', textTransform: 'uppercase' }}>
                          8 Worksheets
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: themeTokens.mutedText }}>
                        Automated multi-sheet mirror with frozen headers, pinned names, and executive KPI formatting
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 10px #10b981' }} />
                    Service Account Connected
                  </div>
                </div>

                {/* Service Account Credentials & 3-Step Setup Guide */}
                <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.6 }}>
                        Google Cloud Service Account Identity
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginTop: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {sheetConfig?.serviceAccountEmail || sheetConfig?.accountEmail || 'heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const email = sheetConfig?.serviceAccountEmail || sheetConfig?.accountEmail || 'heta-attandace-report@united-watch-513401-b4.iam.gserviceaccount.com';
                        navigator.clipboard.writeText(email);
                        showToast('Service account email copied to clipboard!');
                      }}
                      style={{ padding: '7px 14px', background: themeTokens.secondaryBtn, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 7, color: themeTokens.headingText, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                    >
                      <Copy size={13} /> Copy Service Account Email
                    </button>
                  </div>

                  {/* 3-Step Quick Connector Guide */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, paddingTop: 14, borderTop: `1px solid ${themeTokens.cardBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: themeTokens.mutedText }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>1</span>
                      <span>Open target Google Sheet</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: themeTokens.mutedText }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(59,130,246,0.2)', border: '1px solid #3b82f6', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>2</span>
                      <span>Click <strong>Share</strong> &gt; Paste email &gt; <strong>Editor</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: themeTokens.mutedText }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>3</span>
                      <span>Click <strong>Sync to Google Sheets</strong> below</span>
                    </div>
                  </div>
                </div>

                {/* Target Spreadsheet Input */}
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: themeTokens.mutedText, marginBottom: 8 }}>
                    Connected Google Spreadsheet URL or Key
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/1d5drhOduObn9aS2Fw8UTR1XUsjF5CJXyFujatZA-PSg/edit"
                      value={targetSheetUrl}
                      onChange={(e) => setTargetSheetUrl(e.target.value)}
                      style={{ flex: 1, minWidth: 280, padding: '12px 16px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 8, color: themeTokens.headingText, fontSize: 13, outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveSheetConfig}
                      disabled={savingSheetConfig}
                      style={{ padding: '12px 20px', background: themeTokens.secondaryBtn, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 8, color: themeTokens.headingText, fontSize: 13, fontWeight: 700, cursor: savingSheetConfig ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Save size={14} /> {savingSheetConfig ? 'Saving...' : 'Save Target'}
                    </button>
                  </div>
                </div>

                {/* Sync Error Banner if any */}
                {sheetSyncError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: 18, marginBottom: 22, color: '#fca5a5', fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#ef4444' }}>
                      <AlertTriangle size={18} /> Google Sheets Sync Notice
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, marginBottom: 10 }}>
                      {sheetSyncError}
                    </div>
                    {sheetSyncError.includes('drive.googleapis.com') && (
                      <div style={{ marginTop: 10 }}>
                        <a
                          href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=united-watch-513401-b4"
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#3b82f6', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
                        >
                          Enable Google Drive API in GCP (1-Click Direct Link) →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Status & Sync Trigger Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingTop: 20, borderTop: `1px solid ${themeTokens.cardBorder}` }}>
                  <div style={{ fontSize: 12, color: themeTokens.mutedText }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong>Sync State:</strong>
                      <span style={{ fontWeight: 700, color: sheetConfig?.syncStatus === 'SUCCESS' ? '#10b981' : '#f59e0b', padding: '2px 8px', borderRadius: 4, background: sheetConfig?.syncStatus === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                        {sheetConfig?.syncStatus || 'READY'}
                      </span>
                    </div>
                    <div>
                      <strong>Last Synchronized:</strong> {sheetConfig?.lastSyncedAt || 'Not yet synced'} • <strong>Records:</strong> {sheetConfig?.recordsSynced || 0} rows across 8 sheets
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleGoogleSheetSync}
                      disabled={syncingSheet}
                      style={{ padding: '12px 26px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: syncingSheet ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 18px rgba(16,185,129,0.35)' }}
                    >
                      <RefreshCw size={16} className={syncingSheet ? 'spin' : ''} />
                      {syncingSheet ? 'Syncing All 8 Worksheets...' : 'Sync to Google Sheets Now'}
                    </button>
                    {sheetConfig?.sheetUrl && (
                      <a
                        href={sheetConfig.sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '12px 20px', background: themeTokens.secondaryBtn, color: themeTokens.headingText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                      >
                        <ExternalLink size={15} color={themeTokens.iconColor} /> Open Live Spreadsheet
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 8 Synchronized Worksheets Visual Architecture */}
              <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 14, padding: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: themeTokens.headingText, margin: 0 }}>
                      8 Dedicated Synchronized Worksheets
                    </h4>
                    <div style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 3 }}>
                      Separated into clean tabs with executive styling, frozen headers, and pinned left panes
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.25)' }}>
                    ✓ Auto-Formatted on Every Sync
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {/* Sheet 1 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: 13 }}>📘 Student Daily Attendance</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>BLUE THEME</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Chronological student attendance log with Roll No, Name, Batch, In/Out times, remarks, and marked-by audit trail.
                    </div>
                  </div>

                  {/* Sheet 2 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13 }}>📗 Staff Daily Attendance</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>EMERALD THEME</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Faculty attendance registers with Staff Code, Faculty Name, Department, timestamps, and audit verification.
                    </div>
                  </div>

                  {/* Sheet 3 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: 13 }}>🗓️ Student Monthly Matrix</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>PINNED PANES</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Full 31-day cross-tabular P/A/H grid. Left panes pinned (Roll No & Name) so names stay locked during horizontal scroll.
                    </div>
                  </div>

                  {/* Sheet 4 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13 }}>🗓️ Staff Monthly Matrix</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>PINNED PANES</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Faculty monthly attendance grid with day-by-day P/A/H breakdown, totals, and monthly attendance percentages.
                    </div>
                  </div>

                  {/* Sheet 5 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 13 }}>👥 Students Directory</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>DIRECTORY</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Complete student roster with phone, email, parent names, parent contact numbers, batches, and active status.
                    </div>
                  </div>

                  {/* Sheet 6 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13 }}>💼 Staff Directory</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>FACULTY ROSTER</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Faculty member details, departments, verified contact numbers, official emails, and academy role status.
                    </div>
                  </div>

                  {/* Sheet 7 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 13 }}>📝 Leave Applications</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: themeTokens.mutedText, background: themeTokens.secondaryBtn, padding: '2px 6px', borderRadius: 4 }}>GOLD THEME</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Complete leave history, applied dates, duration, reasons, dual-email dispatch records, and administrator review remarks.
                    </div>
                  </div>

                  {/* Sheet 8 */}
                  <div style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, color: '#f43f5e', fontSize: 13 }}>🚨 Attendance KPI & Defaulters</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.15)', padding: '2px 6px', borderRadius: 4 }}>HIGHLIGHTED</span>
                    </div>
                    <div style={{ fontSize: 11, color: themeTokens.mutedText, lineHeight: 1.5 }}>
                      Automated calculations with conditional formatting: &lt;75% attendance rows highlighted with critical warning badges.
                    </div>
                  </div>
                </div>

                {/* Enterprise Best Practices Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${themeTokens.cardBorder}`, fontSize: 11, color: themeTokens.mutedText }}>
                  <span style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '4px 10px', borderRadius: 6 }}>✓ 1-Row Frozen Headers</span>
                  <span style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '4px 10px', borderRadius: 6 }}>✓ Horizontal Pinned Names</span>
                  <span style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '4px 10px', borderRadius: 6 }}>✓ A4 Landscape Print Compatibility</span>
                  <span style={{ background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, padding: '4px 10px', borderRadius: 6 }}>✓ Real-Time SQLite to Google Cloud Push</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODAL: ADD NEW MEMBER (STUDENT OR STAFF)
          ========================================================================= */}
      {addMemberModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, maxWidth: 520, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText, marginBottom: 16 }}>
              Add New {roleFilter === 'STUDENT' ? 'Student' : 'Staff Member'}
            </h3>
            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Full Name"
                  value={newMemberForm.name}
                  onChange={(e) => {
                    const updated = { ...newMemberForm, name: e.target.value };
                    setNewMemberForm(updated);
                    if (memberTouched.name) validateMemberField('name', e.target.value);
                  }}
                  onBlur={() => {
                    setMemberTouched(prev => ({ ...prev, name: true }));
                    validateMemberField('name', newMemberForm.name);
                  }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: memberTouched.name && memberErrors.name ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                    border: memberTouched.name && memberErrors.name ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                    borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                  }}
                />
                {memberTouched.name && memberErrors.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                    <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{memberErrors.name}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Batch</label>
                  <input
                    type="text"
                    list="batch-suggestions"
                    placeholder="e.g. Batch-2026-A"
                    value={newMemberForm.batch}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, batch: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                  />
                  <datalist id="batch-suggestions">
                    {dynamicBatches.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Course</label>
                  <input
                    type="text"
                    list="course-suggestions"
                    placeholder="e.g. Python Programming"
                    value={newMemberForm.course}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, course: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                  />
                  <datalist id="course-suggestions">
                    {dynamicCourses.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Phone</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={newMemberForm.phone}
                    onChange={(e) => {
                      const updated = { ...newMemberForm, phone: e.target.value };
                      setNewMemberForm(updated);
                      if (memberTouched.phone) validateMemberField('phone', e.target.value);
                    }}
                    onBlur={() => {
                      setMemberTouched(prev => ({ ...prev, phone: true }));
                      validateMemberField('phone', newMemberForm.phone);
                    }}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: memberTouched.phone && memberErrors.phone ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                      border: memberTouched.phone && memberErrors.phone ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                      borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                    }}
                  />
                  {memberTouched.phone && memberErrors.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                      <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{memberErrors.phone}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Email</label>
                  <input
                    type="email"
                    placeholder="email@heta.edu"
                    value={newMemberForm.email}
                    onChange={(e) => {
                      const updated = { ...newMemberForm, email: e.target.value };
                      setNewMemberForm(updated);
                      if (memberTouched.email) validateMemberField('email', e.target.value);
                    }}
                    onBlur={() => {
                      setMemberTouched(prev => ({ ...prev, email: true }));
                      validateMemberField('email', newMemberForm.email);
                    }}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: memberTouched.email && memberErrors.email ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                      border: memberTouched.email && memberErrors.email ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                      borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                    }}
                  />
                  {memberTouched.email && memberErrors.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                      <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{memberErrors.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {roleFilter === 'STUDENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Parent Name</label>
                    <input
                      type="text"
                      placeholder="Father / Guardian"
                      value={newMemberForm.parentName}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, parentName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Parent Phone</label>
                    <input
                      type="tel"
                      placeholder="+91..."
                      value={newMemberForm.parentPhone}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, parentPhone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddMemberModal(false)}
                  style={{ padding: '8px 16px', background: themeTokens.secondaryBtn, color: themeTokens.mutedText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s ease' }}
                >
                  {loading ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT PORTION COVERED
          ========================================================================= */}
      {addPortionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, maxWidth: 500, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText, marginBottom: 16 }}>
              {editingPortionId ? 'Edit Portion Covered' : 'Record Portion Covered'}
            </h3>
            <form onSubmit={handleSavePortion} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Date *</label>
                  <input
                    type="date"
                    value={portionForm.date}
                    onChange={(e) => {
                      const updated = { ...portionForm, date: e.target.value };
                      setPortionForm(updated);
                      if (portionTouched.date) validatePortionField('date', e.target.value);
                    }}
                    onBlur={() => {
                      setPortionTouched(prev => ({ ...prev, date: true }));
                      validatePortionField('date', portionForm.date);
                    }}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: portionTouched.date && portionErrors.date ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                      border: portionTouched.date && portionErrors.date ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                      borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                    }}
                  />
                  {portionTouched.date && portionErrors.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                      <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>{portionErrors.date}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Batch</label>
                  <select
                    value={portionForm.batch}
                    onChange={(e) => setPortionForm({ ...portionForm, batch: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                  >
                    <option value="Batch-2026-A">Batch-2026-A</option>
                    <option value="Batch-2026-B">Batch-2026-B</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Subject / Module *</label>
                <input
                  type="text"
                  placeholder="e.g. Python Core / Data Structures"
                  value={portionForm.subject}
                  onChange={(e) => {
                    const updated = { ...portionForm, subject: e.target.value };
                    setPortionForm(updated);
                    if (portionTouched.subject) validatePortionField('subject', e.target.value);
                  }}
                  onBlur={() => {
                    setPortionTouched(prev => ({ ...prev, subject: true }));
                    validatePortionField('subject', portionForm.subject);
                  }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: portionTouched.subject && portionErrors.subject ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                    border: portionTouched.subject && portionErrors.subject ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                    borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none'
                  }}
                />
                {portionTouched.subject && portionErrors.subject && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                    <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{portionErrors.subject}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Topic / Chapter Covered *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Object Oriented Programming: Classes, Objects, __init__"
                  value={portionForm.topic}
                  onChange={(e) => {
                    const updated = { ...portionForm, topic: e.target.value };
                    setPortionForm(updated);
                    if (portionTouched.topic) validatePortionField('topic', e.target.value);
                  }}
                  onBlur={() => {
                    setPortionTouched(prev => ({ ...prev, topic: true }));
                    validatePortionField('topic', portionForm.topic);
                  }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: portionTouched.topic && portionErrors.topic ? (isGreen ? '#fff8f8' : '#fff5f5') : themeTokens.inputBg,
                    border: portionTouched.topic && portionErrors.topic ? '1px solid #ef4444' : `1px solid ${themeTokens.inputBorder}`,
                    borderRadius: 6, color: themeTokens.textMain, fontSize: 13, resize: 'vertical', outline: 'none'
                  }}
                />
                {portionTouched.topic && portionErrors.topic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                    <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                    <span>{portionErrors.topic}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Conducted By (Faculty Name)</label>
                <input
                  type="text"
                  value={portionForm.conductedBy}
                  onChange={(e) => setPortionForm({ ...portionForm, conductedBy: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Remarks / Lab Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Completed Chapter exercises and coding test"
                  value={portionForm.remarks}
                  onChange={(e) => setPortionForm({ ...portionForm, remarks: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddPortionModal(false)}
                  style={{ padding: '8px 16px', background: themeTokens.secondaryBtn, color: themeTokens.mutedText, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ padding: '8px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'background 0.15s ease' }}
                >
                  {loading ? 'Saving...' : 'Save Portion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ABSENT PARENT ALERT NOTIFICATION (WHATSAPP & EMAIL)
          ========================================================================= */}
      {absentModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9995, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, padding: 28, maxWidth: 540, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={20} color="#ef4444" />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>
                  Parent Absent Notification
                </h3>
              </div>
              <button
                onClick={() => setAbsentModal({ open: false, data: null, customMessage: '', recipientEmail: '', recipientPhone: '' })}
                style={{ background: 'none', border: 'none', color: themeTokens.mutedText, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: themeTokens.mutedText, marginBottom: 12 }}>
              Student: <strong style={{ color: themeTokens.headingText }}>{absentModal.data?.studentName}</strong> • Date: <strong>{selectedDate}</strong>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Parent Email</label>
              <input
                type="email"
                value={absentModal.recipientEmail}
                onChange={(e) => setAbsentModal({ ...absentModal, recipientEmail: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Notification Message Text (Editable)</label>
              <textarea
                rows={6}
                value={absentModal.customMessage}
                onChange={(e) => setAbsentModal({ ...absentModal, customMessage: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.headingText, fontSize: 12, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a
                href={absentModal.data?.whatsappWebUrl || '#'}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '10px', background: '#25D366', color: themeTokens.primaryBtnFg, borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <MessageCircle size={16} /> Send via WhatsApp Web
              </a>
              <button
                onClick={handleSendAbsentEmail}
                disabled={alertSending}
                style={{ padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: alertSending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Mail size={16} /> {alertSending ? 'Sending...' : 'Send via Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------ MODALS: USER MANAGEMENT, HOLIDAYS, REJECTION ------------------ */}
      <AddUserModal
        open={addUserModal}
        onClose={() => setAddUserModal(false)}
        onSubmit={handleAddUser}
        defaultRole={addUserRole}
        themeTokens={themeTokens}
      />

      <EditUserModal
        open={editUserModal}
        user={editingUserData}
        onClose={() => { setEditUserModal(false); setEditingUserData(null); }}
        onSubmit={handleUpdateUser}
        themeTokens={themeTokens}
      />

      <ViewUserModal
        open={viewUserModal}
        user={viewingUserData}
        onClose={() => { setViewUserModal(false); setViewingUserData(null); }}
        themeTokens={themeTokens}
      />

      <HolidayModal
        open={holidayModalOpen}
        holiday={editingHolidayData}
        onClose={() => { setHolidayModalOpen(false); setEditingHolidayData(null); }}
        onSubmit={handleAddOrEditHoliday}
        themeTokens={themeTokens}
      />

      {/* Reject Reason Confirmation Dialog */}
      {rejectDialog.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 450, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: themeTokens.headingText, marginBottom: 8 }}>
              Reject Registration: {rejectDialog.userName}
            </h3>
            <p style={{ fontSize: 12, color: themeTokens.mutedText, marginBottom: 14 }}>
              Please provide the reason for rejecting this applicant. This explanation will be included in the official notification email.
            </p>
            <textarea
              rows={3}
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
              placeholder="e.g. Course enrollment credentials could not be verified."
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setRejectDialog({ open: false, userId: null, userName: '', reason: '' })}
                style={{ padding: '8px 14px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectSignup(rejectDialog.userId, rejectDialog.reason)}
                style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
