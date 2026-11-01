import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet,
  Download, Printer, Send, MessageCircle, Mail, UserCheck, Users,
  Building, Check, X, ShieldAlert, Sparkles, RefreshCw, Plus, Trash2,
  ExternalLink, ChevronRight, BookOpen, Search, User
} from './icons';
import { printOverallReport, printIndividualReport } from './reportPrintHelper';

const API_BASE = 'http://localhost:5050/api';

export default function App() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix', 'daily', 'alerts', 'leaves', 'reports', 'sheets', 'members'
  const [userRole, setUserRole] = useState('SUPER_ADMIN'); // 'SUPER_ADMIN', 'STAFF', 'STUDENT'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('STUDENT'); // 'STUDENT' or 'STAFF'

  // Date and Matrix Controls
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('2026-10'); // YYYY-MM
  const [matrixData, setMatrixData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [leavesData, setLeavesData] = useState([]);
  const [sheetConfig, setSheetConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Custom Reports State (Two Types: 'OVERALL' and 'INDIVIDUAL')
  const [reportType, setReportType] = useState('OVERALL'); // 'OVERALL' or 'INDIVIDUAL'
  const [reportStartDate, setReportStartDate] = useState('2026-10-01');
  const [reportEndDate, setReportEndDate] = useState('2026-10-31');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rangeMatrixData, setRangeMatrixData] = useState(null);
  const [individualData, setIndividualData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Absent Alert Modal State
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedAbsentee, setSelectedAbsentee] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [parentPhoneInput, setParentPhoneInput] = useState('');
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState(null);

  // Leave Request Form State
  const [leaveForm, setLeaveForm] = useState({
    memberId: '',
    leaveType: 'CASUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Add Member Modal State
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'STUDENT',
    department: 'Python Programming',
    portionCovered: 'Python',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  });

  // Fetch Matrix Register
  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/matrix?month=${selectedMonth}&role=${selectedRoleFilter}`);
      const data = await res.json();
      if (data.success) {
        setMatrixData(data);
      }
    } catch (err) {
      console.error('Error fetching matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Daily Attendance
  const fetchDaily = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/daily?date=${selectedDate}&role=${selectedRoleFilter}`);
      const data = await res.json();
      if (data.success) {
        setDailyData(data);
      }
    } catch (err) {
      console.error('Error fetching daily attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Leaves
  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaves`);
      const data = await res.json();
      if (data.success) {
        setLeavesData(data.leaves);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  // Fetch Google Sheet Info
  const fetchSheetStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sheets/status`);
      const data = await res.json();
      if (data.success) {
        setSheetConfig(data.config);
      }
    } catch (err) {
      console.error('Error fetching sheet status:', err);
    }
  };

  // Fetch Overall Range Matrix Report (Custom Date Range)
  const fetchRangeMatrix = async (start = reportStartDate, end = reportEndDate) => {
    try {
      setReportLoading(true);
      const res = await fetch(`${API_BASE}/attendance/range-matrix?startDate=${start}&endDate=${end}&role=${selectedRoleFilter}`);
      const data = await res.json();
      if (data.success) {
        setRangeMatrixData(data);
      }
    } catch (err) {
      console.error('Error fetching range matrix:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Fetch Individual Student Report
  const fetchIndividualReport = async (studentId = selectedStudentId, start = reportStartDate, end = reportEndDate) => {
    if (!studentId) return;
    try {
      setReportLoading(true);
      const res = await fetch(`${API_BASE}/attendance/individual?memberId=${studentId}&startDate=${start}&endDate=${end}`);
      const data = await res.json();
      if (data.success) {
        setIndividualData(data);
      }
    } catch (err) {
      console.error('Error fetching individual student report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Initial and reactive effects
  useEffect(() => {
    if (activeTab === 'matrix') fetchMatrix();
    if (activeTab === 'daily') fetchDaily();
    if (activeTab === 'leaves') fetchLeaves();
    if (activeTab === 'sheets') fetchSheetStatus();
  }, [activeTab, selectedMonth, selectedDate, selectedRoleFilter]);

  // Load report data when reports tab is active or dates/type change
  useEffect(() => {
    if (activeTab === 'reports') {
      if (reportType === 'OVERALL') {
        fetchRangeMatrix(reportStartDate, reportEndDate);
      } else if (reportType === 'INDIVIDUAL') {
        // If no student selected yet, choose first student from daily records
        const firstStudentId = selectedStudentId || (dailyData?.records[0]?.memberId) || 'stu_2';
        if (!selectedStudentId) setSelectedStudentId(firstStudentId);
        fetchIndividualReport(firstStudentId, reportStartDate, reportEndDate);
      }
    }
  }, [activeTab, reportType, reportStartDate, reportEndDate, selectedRoleFilter, selectedStudentId]);

  // Toast feedback
  const showToast = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
  };

  // Quick Date Range Presets
  const applyDatePreset = (preset) => {
    let s = '2026-10-01';
    let e = '2026-10-31';

    if (preset === 'OCT_2026') {
      s = '2026-10-01'; e = '2026-10-31';
    } else if (preset === 'NOV_2026') {
      s = '2026-11-01'; e = '2026-11-30';
    } else if (preset === 'SEP_2026') {
      s = '2026-09-01'; e = '2026-09-30';
    } else if (preset === 'LAST_7_DAYS') {
      const today = new Date();
      e = today.toISOString().split('T')[0];
      const past = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      s = past.toISOString().split('T')[0];
    } else if (preset === 'LAST_14_DAYS') {
      const today = new Date();
      e = today.toISOString().split('T')[0];
      const past = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
      s = past.toISOString().split('T')[0];
    }

    setReportStartDate(s);
    setReportEndDate(e);
  };

  // Trigger Print for Overall Report
  const handlePrintOverall = () => {
    if (!rangeMatrixData) return;
    printOverallReport({
      startDate: reportStartDate,
      endDate: reportEndDate,
      days: rangeMatrixData.days,
      matrix: rangeMatrixData.matrix,
      role: selectedRoleFilter
    });
  };

  // Trigger Print for Individual Report
  const handlePrintIndividual = () => {
    if (!individualData) return;
    printIndividualReport({
      member: individualData.member,
      stats: individualData.stats,
      history: individualData.history,
      startDate: reportStartDate,
      endDate: reportEndDate
    });
  };

  // Mark single day attendance from Matrix
  const handleMatrixMark = async (memberId, dateStr, currentStatus, newStatus) => {
    const finalStatus = currentStatus === newStatus ? 'ABSENT' : newStatus;
    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          date: dateStr,
          status: finalStatus,
          inTime: finalStatus === 'PRESENT' ? '09:00 AM' : '-',
          outTime: finalStatus === 'PRESENT' ? '05:00 PM' : '-'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMatrix();
        showToast(`Marked ${finalStatus} for ${dateStr}`);
      }
    } catch (err) {
      showToast('Failed to update attendance', 'error');
    }
  };

  // Update Daily attendance row
  const handleDailyStatusChange = (memberId, newStatus) => {
    if (!dailyData) return;
    const updated = dailyData.records.map(r => {
      if (r.memberId === memberId) {
        return {
          ...r,
          status: newStatus,
          inTime: newStatus === 'PRESENT' ? (r.inTime && r.inTime !== '-' ? r.inTime : '09:00 AM') : '-',
          outTime: newStatus === 'PRESENT' ? (r.outTime && r.outTime !== '-' ? r.outTime : '05:00 PM') : '-'
        };
      }
      return r;
    });
    setDailyData({ ...dailyData, records: updated });
  };

  // Save full daily register
  const saveDailyRegister = async () => {
    if (!dailyData) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          topic: dailyData.topic?.topic || 'Python Programming',
          records: dailyData.records.map(r => ({
            memberId: r.memberId,
            date: selectedDate,
            status: r.status || 'ABSENT',
            inTime: r.inTime || '-',
            outTime: r.outTime || '-',
            portionCovered: r.portionCovered || 'Python'
          }))
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Daily register saved successfully!');
        fetchDaily();
      }
    } catch (err) {
      showToast('Error saving daily register', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Absent Alert Modal
  const openAbsentModal = async (member, targetDate = selectedDate) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/absent-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id || member.memberId,
          date: targetDate
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAbsentee(data);
        setCustomMessage(data.defaultMessage);
        setParentPhoneInput(data.parentPhone);
        setParentEmailInput(data.parentEmail);
        setEmailSendResult(null);
        setAlertModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load absent notification details', 'error');
    }
  };

  // Send WhatsApp Web
  const handleSendWhatsApp = () => {
    if (!selectedAbsentee) return;
    const cleanPhone = parentPhoneInput.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const encoded = encodeURIComponent(customMessage);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
    window.open(whatsappUrl, '_blank');
    showToast('WhatsApp Web opened in new tab');
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!parentEmailInput) {
      showToast('Parent email is required', 'error');
      return;
    }
    try {
      setEmailSending(true);
      const res = await fetch(`${API_BASE}/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: parentEmailInput,
          subject: `Attendance Alert: ${selectedAbsentee.studentName} is ABSENT today`,
          message: customMessage,
          studentName: selectedAbsentee.studentName
        })
      });
      const data = await res.json();
      setEmailSendResult(data);
      if (data.success) {
        showToast(`Email dispatched to ${parentEmailInput}`);
      }
    } catch (err) {
      showToast('Failed to send email', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.memberId || !leaveForm.reason) {
      showToast('Please fill all leave fields', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/leaves/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Leave request submitted to Super Admin');
        setLeaveForm({ ...leaveForm, reason: '' });
        fetchLeaves();
      }
    } catch (err) {
      showToast('Failed to submit leave', 'error');
    }
  };

  // Review Leave Request (Super Admin)
  const handleReviewLeave = async (leaveId, action) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${leaveId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: 'HETA Super Admin', adminNotes: `Action ${action} taken by Admin` })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Leave request has been ${action}d!`);
        fetchLeaves();
      }
    } catch (err) {
      showToast(`Error processing leave ${action}`, 'error');
    }
  };

  // Sync to Google Sheets
  const handleSyncGoogleSheets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/sheets/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSheetConfig({
          ...sheetConfig,
          recordsSynced: data.recordsSynced,
          lastSyncedAt: data.lastSyncedAt,
          syncStatus: 'SUCCESS',
          log: data.log
        });
        showToast(`Synchronized ${data.recordsSynced} records to hetahighereducation@gmail.com Google Sheet!`);
      }
    } catch (err) {
      showToast('Failed to sync to Google Sheets', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name) return;
    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${newMember.name} added successfully!`);
        setAddMemberModal(false);
        setNewMember({
          name: '',
          role: 'STUDENT',
          department: 'Python Programming',
          portionCovered: 'Python',
          parentName: '',
          parentPhone: '',
          parentEmail: ''
        });
        fetchMatrix();
        fetchDaily();
      }
    } catch (err) {
      showToast('Failed to add member', 'error');
    }
  };

  // Delete Member
  const handleDeleteMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/members/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`${memberName} removed`);
        fetchMatrix();
        fetchDaily();
      }
    } catch (err) {
      showToast('Failed to delete member', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {statusMessage.text && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          background: statusMessage.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {statusMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER / BRAND BAR */}
      <header className="no-print" style={{
        background: 'linear-gradient(135deg, #111827 0%, #151d2d 100%)',
        borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1500px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/heta-logo.png"
              alt="HETA Emblem"
              style={{
                width: '54px',
                height: '54px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.4))'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '24px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  background: 'linear-gradient(90deg, #fef08a 0%, #d4af37 50%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}>
                  HETA-HRM
                </h1>
                <span style={{
                  background: 'rgba(212,175,55,0.18)',
                  color: '#fef08a',
                  border: '1px solid rgba(212,175,55,0.4)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em'
                }}>
                  ATTENDANCE & HR
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                Higher Education & Training Academy • Official Attendance Register & Portal
              </p>
            </div>
          </div>

          {/* User & Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Google Account Tag */}
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <div>
                <span style={{ color: '#fef08a', fontWeight: '600' }}>hetahighereducation@gmail.com</span>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)' }}>Google Sheets Connected</span>
              </div>
            </div>

            {/* Role Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: userRole === 'SUPER_ADMIN' ? 'rgba(212,175,55,0.2)' : 'rgba(59,130,246,0.2)',
              border: `1px solid ${userRole === 'SUPER_ADMIN' ? '#d4af37' : '#3b82f6'}`,
              borderRadius: '8px',
              padding: '6px 14px',
              color: '#ffffff'
            }}>
              <UserCheck size={16} color={userRole === 'SUPER_ADMIN' ? '#d4af37' : '#60a5fa'} />
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="SUPER_ADMIN" style={{ background: '#111827' }}>👑 Super Admin</option>
                <option value="STAFF" style={{ background: '#111827' }}>👨‍🏫 Staff View</option>
                <option value="STUDENT" style={{ background: '#111827' }}>🎓 Student View</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS BAR */}
      <nav className="no-print" style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-line)',
        padding: '0 24px'
      }}>
        <div style={{
          maxWidth: '1500px',
          margin: '0 auto',
          display: 'flex',
          gap: '4px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'matrix', label: 'Attendance Matrix Register', icon: BookOpen },
            { id: 'daily', label: 'Daily Attendance Marking', icon: CheckCircle },
            { id: 'alerts', label: 'Absent Parent Messenger', icon: MessageCircle },
            { id: 'leaves', label: 'HRM Leave Management', icon: Building },
            { id: 'reports', label: 'Custom Reports (Individual & Overall PDF)', icon: Calendar },
            { id: 'sheets', label: 'Google Sheets & Exports', icon: FileSpreadsheet },
            { id: 'members', label: 'Student & Staff Directory', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--primary-gold)' : '3px solid transparent',
                  color: isActive ? '#fef08a' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--primary-gold)' : 'currentColor'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1500px', margin: '0 auto', width: '100%' }}>

        {/* ========================================================================= */}
        {/* TAB 1: ATTENDANCE MATRIX REGISTER                                         */}
        {/* ========================================================================= */}
        {activeTab === 'matrix' && (
          <div className="animate-fade-in">
            {/* Control Bar */}
            <div className="no-print" style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              background: 'var(--bg-card)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-line)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600' }}>SELECT MONTH</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    <option value="2026-09">September 2026</option>
                    <option value="2026-10">October 2026</option>
                    <option value="2026-11">November 2026</option>
                    <option value="2026-12">December 2026</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600' }}>CATEGORY</label>
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setSelectedRoleFilter('STUDENT')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedRoleFilter === 'STUDENT' ? 'var(--primary-gold)' : 'transparent',
                        color: selectedRoleFilter === 'STUDENT' ? '#000' : 'var(--text-muted)',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🎓 Students ({matrixData ? matrixData.matrix.length : 0})
                    </button>
                    <button
                      onClick={() => setSelectedRoleFilter('STAFF')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedRoleFilter === 'STAFF' ? 'var(--primary-gold)' : 'transparent',
                        color: selectedRoleFilter === 'STAFF' ? '#000' : 'var(--text-muted)',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      👨‍🏫 Staff
                    </button>
                  </div>
                </div>

                {/* Status Badges Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--present)' }}></span> Present (P)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--absent)' }}></span> Absent (A)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--permission)' }}></span> Leave (PR)
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4b5563' }}></span> Weekend
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setAddMemberModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> Add {selectedRoleFilter === 'STUDENT' ? 'Student' : 'Staff'}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setReportType('OVERALL');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                    color: '#000000',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-gold)'
                  }}
                >
                  <Printer size={16} /> Open Complete Reports & PDF Hub
                </button>
              </div>
            </div>

            {/* THE REGISTER TABLE */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-line)',
              overflowX: 'auto',
              boxShadow: 'var(--shadow-md)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                <thead>
                  <tr style={{ background: '#101623', borderBottom: '2px solid var(--border-line)' }}>
                    <th style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      background: '#101623',
                      padding: '12px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fef08a',
                      minWidth: '180px',
                      borderRight: '1px solid var(--border-line)'
                    }}>
                      {selectedRoleFilter === 'STUDENT' ? 'Student Name' : 'Staff Name'}
                    </th>

                    <th style={{
                      position: 'sticky',
                      left: '180px',
                      zIndex: 3,
                      background: '#101623',
                      padding: '12px 14px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#fef08a',
                      minWidth: '150px',
                      borderRight: '2px solid var(--primary-gold)'
                    }}>
                      Portion Covered
                    </th>

                    {matrixData?.days.map((d) => (
                      <th
                        key={d.date}
                        style={{
                          textAlign: 'center',
                          padding: '8px 4px',
                          minWidth: '42px',
                          fontSize: '11px',
                          borderRight: '1px solid var(--border-line)',
                          background: d.isWeekend ? 'rgba(31, 41, 55, 0.6)' : '#101623'
                        }}
                      >
                        <span style={{ display: 'block', fontWeight: '800', fontSize: '13px', color: d.isWeekend ? 'var(--text-dim)' : 'var(--text-main)' }}>
                          {d.day < 10 ? `0${d.day}` : d.day}
                        </span>
                        <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>
                          {d.weekday}
                        </span>
                      </th>
                    ))}

                    <th style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: 'var(--present)', fontWeight: '700', borderLeft: '2px solid var(--border-line)' }}>
                      Present
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: 'var(--absent)', fontWeight: '700' }}>
                      Absent
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: 'var(--primary-gold)', fontWeight: '700' }}>
                      Rate %
                    </th>
                    <th className="no-print" style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Actions
                    </th>
                  </tr>

                  {/* Daily Topic Row */}
                  <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-line)', fontSize: '11px' }}>
                    <th style={{ position: 'sticky', left: 0, zIndex: 3, background: 'var(--bg-subtle)', padding: '6px 14px', color: 'var(--text-muted)', borderRight: '1px solid var(--border-line)' }}>
                      Topic of Day
                    </th>
                    <th style={{ position: 'sticky', left: '180px', zIndex: 3, background: 'var(--bg-subtle)', padding: '6px 14px', color: 'var(--text-dim)', borderRight: '2px solid var(--primary-gold)' }}>
                      Daily Portion
                    </th>
                    {matrixData?.days.map((d) => (
                      <td key={d.date} style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid var(--border-line)' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                          {d.isWeekend ? '—' : 'Python'}
                        </span>
                      </td>
                    ))}
                    <td colSpan={4}></td>
                  </tr>
                </thead>

                <tbody>
                  {matrixData?.matrix.map((row, idx) => {
                    const m = row.member;
                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: '1px solid var(--border-line)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        <td style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 2,
                          background: 'var(--bg-card)',
                          padding: '10px 14px',
                          fontWeight: '600',
                          fontSize: '13px',
                          borderRight: '1px solid var(--border-line)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#fef08a', fontWeight: '700' }}>{m.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({m.code})</span>
                          </div>
                        </td>

                        <td style={{
                          position: 'sticky',
                          left: '180px',
                          zIndex: 2,
                          background: 'var(--bg-card)',
                          padding: '8px 14px',
                          fontSize: '12px',
                          borderRight: '2px solid var(--primary-gold)'
                        }}>
                          <span style={{
                            background: 'rgba(212,175,55,0.12)',
                            color: '#fef08a',
                            border: '1px solid rgba(212,175,55,0.3)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '11px'
                          }}>
                            {row.portionCovered || 'Python'}
                          </span>
                        </td>

                        {matrixData.days.map((d) => {
                          const dayInfo = row.days[d.date];
                          const status = dayInfo ? dayInfo.status : '-';
                          const isPresent = status === 'PRESENT';
                          const isAbsent = status === 'ABSENT';

                          return (
                            <td
                              key={d.date}
                              style={{
                                textAlign: 'center',
                                padding: '4px 2px',
                                borderRight: '1px solid var(--border-line)',
                                background: d.isWeekend ? 'rgba(31, 41, 55, 0.4)' : 'transparent'
                              }}
                            >
                              {d.isWeekend ? (
                                <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>—</span>
                              ) : (
                                <div style={{ display: 'inline-flex', gap: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleMatrixMark(m.id, d.date, status, 'PRESENT')}
                                    title={`${m.name}: Click to mark Present`}
                                    style={{
                                      width: '18px',
                                      height: '24px',
                                      borderRadius: '3px',
                                      border: isPresent ? '1px solid var(--present)' : '1px solid var(--border-line)',
                                      background: isPresent ? 'var(--present)' : 'transparent',
                                      color: isPresent ? '#ffffff' : 'var(--text-dim)',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                  >
                                    P
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMatrixMark(m.id, d.date, status, 'ABSENT')}
                                    title={`${m.name}: Click to mark Absent`}
                                    style={{
                                      width: '18px',
                                      height: '24px',
                                      borderRadius: '3px',
                                      border: isAbsent ? '1px solid var(--absent)' : '1px solid var(--border-line)',
                                      background: isAbsent ? 'var(--absent)' : 'transparent',
                                      color: isAbsent ? '#ffffff' : 'var(--text-dim)',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                  >
                                    A
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: '700', color: 'var(--present)', borderLeft: '2px solid var(--border-line)' }}>
                          {row.presentCount}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: '700', color: 'var(--absent)' }}>
                          {row.absentCount}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: '700', color: '#fef08a' }}>
                          {row.attendanceRate}%
                        </td>

                        <td className="no-print" style={{ textAlign: 'center', padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              onClick={() => openAbsentModal(m, selectedDate)}
                              title="Send Absent Alert via WhatsApp / Email"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <MessageCircle size={12} /> Alert
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m.id, m.name)}
                              title="Delete Member"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DAILY ATTENDANCE MARKING VIEW                                     */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && (
          <div className="animate-fade-in">
            <div style={{
              background: 'var(--bg-card)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-line)',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600' }}>ATTENDANCE DATE</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ minWidth: '300px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600' }}>TOPIC / PORTION COVERED TODAY</label>
                  <input
                    type="text"
                    value={dailyData?.topic?.topic || ''}
                    onChange={(e) => setDailyData({ ...dailyData, topic: { ...dailyData.topic, topic: e.target.value } })}
                    placeholder="e.g. Python - Functions, OOP & SQLite Database"
                    style={{
                      width: '100%',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--present)', fontWeight: '700' }}>Present: {dailyData?.stats.present || 0}</span>
                  <span style={{ color: 'var(--absent)', fontWeight: '700' }}>Absent: {dailyData?.stats.absent || 0}</span>
                  <span style={{ color: '#fef08a', fontWeight: '700' }}>Rate: {dailyData?.stats.attendanceRate || 0}%</span>
                </div>

                <button
                  onClick={saveDailyRegister}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  💾 Save Daily Register
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dailyData?.records.map((r) => {
                const isAbsent = r.status === 'ABSENT';
                const isPresent = r.status === 'PRESENT';
                const isLate = r.status === 'LATE';
                const isPermission = r.status === 'PERMISSION';

                return (
                  <div
                    key={r.memberId}
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${isAbsent ? 'rgba(239, 68, 68, 0.4)' : isPresent ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-line)'}`,
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fef08a',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: '#ffffff' }}>{r.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{r.code}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#fef08a' }}>Portion: {r.portionCovered || 'Python'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block' }}>IN TIME</span>
                        <input
                          type="text"
                          value={r.inTime || '09:00 AM'}
                          onChange={(e) => {
                            const updated = dailyData.records.map(rec => rec.memberId === r.memberId ? { ...rec, inTime: e.target.value } : rec);
                            setDailyData({ ...dailyData, records: updated });
                          }}
                          style={{
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-line)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            width: '85px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block' }}>OUT TIME</span>
                        <input
                          type="text"
                          value={r.outTime || '05:00 PM'}
                          onChange={(e) => {
                            const updated = dailyData.records.map(rec => rec.memberId === r.memberId ? { ...rec, outTime: e.target.value } : rec);
                            setDailyData({ ...dailyData, records: updated });
                          }}
                          style={{
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-line)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            width: '85px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleDailyStatusChange(r.memberId, 'PRESENT')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: isPresent ? '1px solid var(--present)' : '1px solid var(--border-line)',
                          background: isPresent ? 'var(--present)' : 'var(--bg-subtle)',
                          color: isPresent ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDailyStatusChange(r.memberId, 'ABSENT')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: isAbsent ? '1px solid var(--absent)' : '1px solid var(--border-line)',
                          background: isAbsent ? 'var(--absent)' : 'var(--bg-subtle)',
                          color: isAbsent ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDailyStatusChange(r.memberId, 'LATE')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: isLate ? '1px solid var(--late)' : '1px solid var(--border-line)',
                          background: isLate ? 'var(--late)' : 'var(--bg-subtle)',
                          color: isLate ? '#000000' : 'var(--text-muted)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDailyStatusChange(r.memberId, 'PERMISSION')}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '6px',
                          border: isPermission ? '1px solid var(--permission)' : '1px solid var(--border-line)',
                          background: isPermission ? 'var(--permission)' : 'var(--bg-subtle)',
                          color: isPermission ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: '700',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Leave
                      </button>
                    </div>

                    {isAbsent && (
                      <button
                        type="button"
                        onClick={() => openAbsentModal(r, selectedDate)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Send size={14} /> Send Absent Alert to Parent
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ABSENT PARENT MESSENGER (WHATSAPP WEB + EMAIL DISPATCH)            */}
        {/* ========================================================================= */}
        {activeTab === 'alerts' && (
          <div className="animate-fade-in">
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(212,175,55,0.05) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fef08a', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#ef4444" /> Parent Absent Communication Center
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Whenever a student is absent, instantly notify their parents via <strong>WhatsApp Web</strong> or direct <strong>Email</strong> with custom details and today's covered portion.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {dailyData?.records.filter(r => r.status === 'ABSENT').map(stu => (
                <div
                  key={stu.memberId}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-line)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{stu.name}</h4>
                      <span style={{ background: 'var(--absent-bg)', color: 'var(--absent)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                        ABSENT
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0' }}>Roll ID: {stu.code}</p>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <div>👨‍👦 Parent: <strong>{stu.parentName || 'Parent'}</strong></div>
                      <div>📞 Phone: <strong>{stu.parentPhone || 'Not provided'}</strong></div>
                      <div>📧 Email: <strong>{stu.parentEmail || 'Not provided'}</strong></div>
                      <div>📚 Portion: <strong>{stu.portionCovered || 'Python'}</strong></div>
                    </div>
                  </div>

                  <button
                    onClick={() => openAbsentModal(stu, selectedDate)}
                    style={{
                      background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                      color: '#000000',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Send size={14} /> Open Parent Notification Dispatcher
                  </button>
                </div>
              ))}

              {(!dailyData || dailyData.records.filter(r => r.status === 'ABSENT').length === 0) && (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-card)',
                  padding: '30px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  color: 'var(--text-dim)'
                }}>
                  <CheckCircle size={32} color="var(--present)" style={{ margin: '0 auto 10px' }} />
                  <p>All students are present for {selectedDate}! No absent alerts pending.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HRM LEAVE MANAGEMENT                                              */}
        {/* ========================================================================= */}
        {activeTab === 'leaves' && (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-line)',
                padding: '20px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fef08a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building size={18} /> Request Leave / Permission
                </h3>
                <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>APPLICANT</label>
                    <select
                      value={leaveForm.memberId}
                      onChange={(e) => setLeaveForm({ ...leaveForm, memberId: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-line)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="">Select Student or Staff Member</option>
                      {dailyData?.records.map(m => (
                        <option key={m.memberId} value={m.memberId}>{m.name} ({m.code} - {m.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>LEAVE TYPE</label>
                    <select
                      value={leaveForm.leaveType}
                      onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-line)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="CASUAL">Casual Leave (CL)</option>
                      <option value="SICK">Medical / Sick Leave</option>
                      <option value="PERMISSION">Half-Day / On-Duty Permission</option>
                      <option value="EMERGENCY">Emergency Family Leave</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>FROM DATE</label>
                      <input
                        type="date"
                        value={leaveForm.startDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-line)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>TO DATE</label>
                      <input
                        type="date"
                        value={leaveForm.endDate}
                        onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-main)',
                          border: '1px solid var(--border-line)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>REASON FOR LEAVE</label>
                    <textarea
                      rows={3}
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      placeholder="State genuine reason for leave..."
                      required
                      style={{
                        width: '100%',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-line)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                      color: '#000000',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Leave Request
                  </button>
                </form>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-line)',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fef08a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} /> Super Admin Leave Approvals ({leavesData.length})
                  </h3>
                  <button onClick={fetchLeaves} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {leavesData.map((lv) => {
                    const isPending = lv.status === 'PENDING';
                    const isApproved = lv.status === 'APPROVED';
                    const isRejected = lv.status === 'REJECTED';

                    return (
                      <div
                        key={lv.id}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: `1px solid ${isPending ? 'var(--primary-gold)' : 'var(--border-line)'}`,
                          borderRadius: '8px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '14px' }}>{lv.memberName}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>({lv.memberRole})</span>
                          </div>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: isApproved ? 'var(--present-bg)' : isRejected ? 'var(--absent-bg)' : 'rgba(212, 175, 55, 0.2)',
                            color: isApproved ? 'var(--present)' : isRejected ? 'var(--absent)' : '#fef08a'
                          }}>
                            {lv.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          <div>📅 Duration: <strong>{lv.startDate}</strong> to <strong>{lv.endDate}</strong> ({lv.leaveType})</div>
                          <div style={{ marginTop: '4px', color: 'var(--text-main)', fontStyle: 'italic' }}>
                            "{lv.reason}"
                          </div>
                        </div>

                        {isPending && userRole === 'SUPER_ADMIN' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              onClick={() => handleReviewLeave(lv.id, 'approve')}
                              style={{
                                flex: 1,
                                background: 'var(--present)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={14} /> Approve Leave
                            </button>
                            <button
                              onClick={() => handleReviewLeave(lv.id, 'reject')}
                              style={{
                                flex: 1,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid #ef4444',
                                padding: '8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CUSTOM REPORTS (INDIVIDUAL & OVERALL STUDENT WITH LANDSCAPE PDF)   */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="animate-fade-in">
            {/* Top Control Bar: Report Type Selector + Date Range */}
            <div style={{
              background: 'var(--bg-card)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-line)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Row 1: Report Type Toggle (Overall vs Individual) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-subtle)', padding: '4px', borderRadius: '10px' }}>
                  <button
                    onClick={() => setReportType('OVERALL')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: reportType === 'OVERALL' ? 'var(--primary-gold)' : 'transparent',
                      color: reportType === 'OVERALL' ? '#000000' : 'var(--text-muted)',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Users size={16} /> 1. Overall Student Report
                  </button>
                  <button
                    onClick={() => setReportType('INDIVIDUAL')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: reportType === 'INDIVIDUAL' ? 'var(--primary-gold)' : 'transparent',
                      color: reportType === 'INDIVIDUAL' ? '#000000' : 'var(--text-muted)',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <User size={16} /> 2. Individual Student Report
                  </button>
                </div>

                {/* PDF and CSV Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {reportType === 'OVERALL' ? (
                    <button
                      onClick={handlePrintOverall}
                      style={{
                        background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                        color: '#000000',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
                      }}
                    >
                      <Printer size={16} /> Download / Print Complete Overall PDF
                    </button>
                  ) : (
                    <button
                      onClick={handlePrintIndividual}
                      style={{
                        background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                        color: '#000000',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
                      }}
                    >
                      <Printer size={16} /> Download / Print Individual Student PDF
                    </button>
                  )}

                  <a
                    href={`${API_BASE}/export/csv?month=${reportStartDate.slice(0, 7)}&role=${selectedRoleFilter}`}
                    download
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={15} /> Export CSV
                  </a>
                </div>
              </div>

              {/* Row 2: Custom Date Range Selector (From Date & To Date) */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: '16px',
                borderTop: '1px solid var(--border-line)',
                paddingTop: '16px'
              }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '700', marginBottom: '4px' }}>
                    FROM DATE (START)
                  </label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '700', marginBottom: '4px' }}>
                    TO DATE (END)
                  </label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    style={{
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                {/* If Individual Report, select student dropdown */}
                {reportType === 'INDIVIDUAL' && (
                  <div style={{ minWidth: '260px' }}>
                    <label style={{ fontSize: '11px', color: '#fef08a', display: 'block', fontWeight: '700', marginBottom: '4px' }}>
                      SELECT STUDENT
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        fetchIndividualReport(e.target.value, reportStartDate, reportEndDate);
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--primary-gold)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700'
                      }}
                    >
                      {dailyData?.records.map(s => (
                        <option key={s.memberId} value={s.memberId} style={{ background: '#111827' }}>
                          {s.name} ({s.code}) - {s.portionCovered || 'Python'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Presets */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>Presets:</span>
                  {[
                    { label: 'Oct 2026', key: 'OCT_2026' },
                    { label: 'Nov 2026', key: 'NOV_2026' },
                    { label: 'Sep 2026', key: 'SEP_2026' },
                    { label: 'Last 7 Days', key: 'LAST_7_DAYS' },
                    { label: 'Last 14 Days', key: 'LAST_14_DAYS' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => applyDatePreset(p.key)}
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-line)',
                        color: 'var(--text-muted)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* REPORT VIEW 1: OVERALL STUDENT MATRIX REPORT */}
            {reportType === 'OVERALL' && (
              <div>
                {/* KPI Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>Total Students</span>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', margin: '4px 0 0' }}>{rangeMatrixData?.matrix.length || 0}</h3>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>Days in Selected Range</span>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-gold)', margin: '4px 0 0' }}>{rangeMatrixData?.days.length || 0}</h3>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '16px', borderRadius: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>Average Batch Rate</span>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--present)', margin: '4px 0 0' }}>
                      {rangeMatrixData && rangeMatrixData.matrix.length > 0
                        ? (rangeMatrixData.matrix.reduce((acc, curr) => acc + (curr.attendanceRate || 0), 0) / rangeMatrixData.matrix.length).toFixed(1)
                        : 0}%
                    </h3>
                  </div>
                </div>

                {/* The Full Range Matrix Table */}
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-line)',
                  overflowX: 'auto',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                    <thead>
                      <tr style={{ background: '#101623', borderBottom: '2px solid var(--border-line)' }}>
                        <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: '700', color: '#fef08a', minWidth: '180px' }}>
                          Student Name
                        </th>
                        <th style={{ padding: '12px 14px', fontSize: '12px', fontWeight: '700', color: '#fef08a', minWidth: '130px' }}>
                          Portion Covered
                        </th>
                        {rangeMatrixData?.days.map(d => (
                          <th key={d.date} style={{ textAlign: 'center', padding: '6px 4px', fontSize: '11px', borderRight: '1px solid var(--border-line)' }}>
                            <span style={{ display: 'block', fontWeight: '800', color: d.isWeekend ? 'var(--text-dim)' : '#ffffff' }}>
                              {d.day < 10 ? `0${d.day}` : d.day}
                            </span>
                            <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>{d.weekday}</span>
                          </th>
                        ))}
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--present)', fontWeight: '700' }}>P</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--absent)', fontWeight: '700' }}>A</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: 'var(--permission)', fontWeight: '700' }}>PR</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#fef08a', fontWeight: '700' }}>Rate %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rangeMatrixData?.matrix.map((row, idx) => (
                        <tr key={row.member.id} style={{ borderBottom: '1px solid var(--border-line)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#ffffff' }}>
                            {row.member.name} <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({row.member.code})</span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#fef08a', fontSize: '12px' }}>
                            {row.portionCovered || 'Python'}
                          </td>
                          {rangeMatrixData.days.map(d => {
                            const dayInfo = row.days[d.date];
                            const st = dayInfo ? dayInfo.status : '-';
                            return (
                              <td key={d.date} style={{ textAlign: 'center', padding: '4px', borderRight: '1px solid var(--border-line)' }}>
                                {d.isWeekend ? (
                                  <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>—</span>
                                ) : st === 'PRESENT' ? (
                                  <span style={{ color: 'var(--present)', fontWeight: 'bold' }}>P</span>
                                ) : st === 'ABSENT' ? (
                                  <span style={{ color: 'var(--absent)', fontWeight: 'bold' }}>A</span>
                                ) : st === 'PERMISSION' ? (
                                  <span style={{ color: 'var(--permission)', fontWeight: 'bold' }}>PR</span>
                                ) : (
                                  <span style={{ color: 'var(--text-dim)' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--present)' }}>{row.presentCount}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--absent)' }}>{row.absentCount}</td>
                          <td style={{ textAlign: 'center', color: 'var(--permission)' }}>{row.permissionCount}</td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: '#fef08a' }}>{row.attendanceRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORT VIEW 2: INDIVIDUAL STUDENT REPORT */}
            {reportType === 'INDIVIDUAL' && individualData && (
              <div>
                {/* Student Profile Card */}
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-line)',
                  padding: '24px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ background: 'rgba(212,175,55,0.2)', color: '#fef08a', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      STUDENT PROFILE
                    </span>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', margin: '8px 0 4px' }}>
                      {individualData.member.name}
                    </h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
                      Roll ID: <strong>{individualData.member.code}</strong> • Course: <strong>{individualData.member.portionCovered || 'Python'}</strong>
                    </p>
                    <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <div>👨‍👩‍👧 Parent / Guardian: <strong>{individualData.member.parentName || 'Parent'}</strong></div>
                      <div>📞 Phone: <strong>{individualData.member.parentPhone || 'Not provided'}</strong></div>
                      <div>📧 Email: <strong>{individualData.member.parentEmail || 'Not provided'}</strong></div>
                    </div>
                  </div>

                  {/* Attendance Rate Dial / Metric */}
                  <div style={{
                    background: 'var(--bg-subtle)',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    border: `2px solid ${individualData.stats.attendanceRate < 75 ? '#ef4444' : '#10b981'}`
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Overall Attendance Rate
                    </span>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '900',
                      color: individualData.stats.attendanceRate < 75 ? '#ef4444' : '#10b981',
                      margin: '4px 0'
                    }}>
                      {individualData.stats.attendanceRate}%
                    </div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      background: individualData.stats.attendanceRate < 75 ? 'var(--absent-bg)' : 'var(--present-bg)',
                      color: individualData.stats.attendanceRate < 75 ? 'var(--absent)' : 'var(--present)'
                    }}>
                      {individualData.stats.standing}
                    </span>
                  </div>
                </div>

                {/* 5 Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Classes Held</span>
                    <strong style={{ fontSize: '20px', display: 'block', color: '#ffffff', marginTop: '2px' }}>{individualData.stats.totalClasses}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Days Present</span>
                    <strong style={{ fontSize: '20px', display: 'block', color: 'var(--present)', marginTop: '2px' }}>{individualData.stats.presentDays}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Days Absent</span>
                    <strong style={{ fontSize: '20px', display: 'block', color: 'var(--absent)', marginTop: '2px' }}>{individualData.stats.absentDays}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Permissions / Leaves</span>
                    <strong style={{ fontSize: '20px', display: 'block', color: 'var(--permission)', marginTop: '2px' }}>{individualData.stats.permissionDays}</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '14px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Late Marks</span>
                    <strong style={{ fontSize: '20px', display: 'block', color: 'var(--late)', marginTop: '2px' }}>{individualData.stats.lateDays}</strong>
                  </div>
                </div>

                {/* Day-by-Day Detailed Log Table */}
                <div style={{
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-line)',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-line)', background: '#101623' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fef08a', margin: 0 }}>
                      Complete Day-by-Day Attendance & Syllabus Record ({reportStartDate} to {reportEndDate})
                    </h3>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ background: '#101623', borderBottom: '2px solid var(--border-line)' }}>
                      <tr>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Date</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Day</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Status</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>In Time</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Out Time</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Portion</th>
                        <th style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>Topic Covered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {individualData.history.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-line)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 16px', fontWeight: '700', color: '#ffffff' }}>{h.date}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-dim)' }}>{h.weekday}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {h.status === 'PRESENT' && (
                              <span style={{ background: 'var(--present-bg)', color: 'var(--present)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                ✓ PRESENT
                              </span>
                            )}
                            {h.status === 'ABSENT' && (
                              <span style={{ background: 'var(--absent-bg)', color: 'var(--absent)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                ✕ ABSENT
                              </span>
                            )}
                            {h.status === 'PERMISSION' && (
                              <span style={{ background: 'var(--permission-bg)', color: 'var(--permission)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                ON LEAVE
                              </span>
                            )}
                            {h.status === 'LATE' && (
                              <span style={{ background: 'var(--late-bg)', color: 'var(--late)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                LATE
                              </span>
                            )}
                            {h.isWeekend && (
                              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>WEEKEND</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px' }}>{h.inTime}</td>
                          <td style={{ padding: '10px 16px' }}>{h.outTime}</td>
                          <td style={{ padding: '10px 16px', color: '#fef08a' }}>{h.portionCovered}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{h.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: GOOGLE SHEETS & EXPORTS HUB                                        */}
        {/* ========================================================================= */}
        {activeTab === 'sheets' && (
          <div className="animate-fade-in">
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(212,175,55,0.08) 100%)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <FileSpreadsheet size={32} color="#10b981" />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Google Spreadsheet Synchronization Center
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                    Connected Account: <strong>hetahighereducation@gmail.com</strong>
                  </p>
                </div>
              </div>

              <p style={{ color: 'var(--text-main)', fontSize: '14px', maxWidth: '850px', lineHeight: 1.6 }}>
                Every daily attendance entry, portion covered (Python), In/Out time, and Super Admin approved leave request is automatically organized into Google Spreadsheet format. You can perform an on-demand sync or download raw CSV data.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSyncGoogleSheets}
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                  }}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Syncing...' : 'Sync Now to Google Sheet'}
                </button>

                <a
                  href={`${API_BASE}/export/csv?month=${selectedMonth}&role=${selectedRoleFilter}`}
                  download
                  style={{
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={16} /> Download Full CSV for Google Drive
                </a>

                <a
                  href="https://docs.google.com/spreadsheets/u/0/"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#fef08a',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={16} /> Open Google Sheets (hetahighereducation@gmail.com)
                </a>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-line)',
              padding: '20px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fef08a', marginBottom: '12px' }}>
                Synchronization Details & Log
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>TARGET EMAIL</span>
                  <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '13px' }}>{sheetConfig?.accountEmail}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>SHEET NAME</span>
                  <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '13px' }}>{sheetConfig?.sheetName}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>RECORDS SYNCHRONIZED</span>
                  <div style={{ fontWeight: '700', color: 'var(--present)', fontSize: '13px' }}>{sheetConfig?.recordsSynced} Rows</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>LAST SYNC TIMESTAMP</span>
                  <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '13px' }}>{sheetConfig?.lastSyncedAt || 'Ready'}</div>
                </div>
              </div>

              {sheetConfig?.log && (
                <div style={{
                  background: '#090d16',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--present)',
                  border: '1px solid var(--border-line)'
                }}>
                  {sheetConfig.log}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: DIRECTORY (STUDENTS & STAFF)                                       */}
        {/* ========================================================================= */}
        {activeTab === 'members' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Students & Staff Directory
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                  Manage enrolled students, staff members, portions, and parent emergency contacts.
                </p>
              </div>
              <button
                onClick={() => setAddMemberModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                  color: '#000000',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} /> Add New Person
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {dailyData?.records.map(m => (
                <div
                  key={m.memberId}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-line)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: m.role === 'STUDENT' ? '#60a5fa' : '#fef08a',
                        background: m.role === 'STUDENT' ? 'rgba(59,130,246,0.15)' : 'rgba(212,175,55,0.15)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {m.role}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{m.code}</span>
                    </div>

                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', marginTop: '8px', marginBottom: '2px' }}>
                      {m.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#d4af37', margin: 0 }}>
                      Portion: <strong>{m.portionCovered || 'Python'}</strong>
                    </p>

                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>👨‍👩‍👧 Parent / Contact: <strong>{m.parentName || 'Parent'}</strong></div>
                      <div>📞 Phone: <strong>{m.parentPhone || 'Not set'}</strong></div>
                      <div>📧 Email: <strong>{m.parentEmail || 'Not set'}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-line)', paddingTop: '10px' }}>
                    <button
                      onClick={() => handleDeleteMember(m.memberId, m.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ABSENT PARENT NOTIFICATION DISPATCHER                            */}
      {/* ========================================================================= */}
      {alertModalOpen && selectedAbsentee && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--primary-gold)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Absent Alert: {selectedAbsentee.studentName}
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0' }}>
                    Send immediate official attendance alert to parents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAlertModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PARENT WHATSAPP PHONE</label>
                <input
                  type="text"
                  value={parentPhoneInput}
                  onChange={(e) => setParentPhoneInput(e.target.value)}
                  placeholder="+91..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PARENT EMAIL</label>
                <input
                  type="email"
                  value={parentEmailInput}
                  onChange={(e) => setParentEmailInput(e.target.value)}
                  placeholder="parent@example.com"
                  style={{
                    width: '100%',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: '#fef08a', display: 'block', fontWeight: '700', marginBottom: '4px' }}>
                EDITABLE MESSAGE CONTENT (LIVE PREVIEW):
              </label>
              <textarea
                rows={7}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-line)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {emailSendResult && (
              <div style={{
                background: emailSendResult.sent ? 'rgba(16,185,129,0.2)' : 'rgba(212,175,55,0.2)',
                border: `1px solid ${emailSendResult.sent ? '#10b981' : '#d4af37'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '14px',
                color: '#ffffff'
              }}>
                <strong>{emailSendResult.status}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Dispatched via: {emailSendResult.sender} to {emailSendResult.recipient}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <MessageCircle size={18} /> Option 1: WhatsApp Web
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={emailSending}
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                  color: '#000000',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
                }}
              >
                <Mail size={18} /> {emailSending ? 'Sending Email...' : 'Option 2: Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW STUDENT / STAFF MEMBER                                   */}
      {/* ========================================================================= */}
      {addMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--primary-gold)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Add New {newMember.role === 'STUDENT' ? 'Student' : 'Staff'}
              </h3>
              <button onClick={() => setAddMemberModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>FULL NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deepika / Santhosh"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>ROLE</label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="STUDENT">🎓 Student</option>
                    <option value="STAFF">👨‍🏫 Staff</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PORTION COVERED</label>
                  <input
                    type="text"
                    value={newMember.portionCovered}
                    onChange={(e) => setNewMember({ ...newMember, portionCovered: e.target.value })}
                    placeholder="e.g. Python"
                    style={{
                      width: '100%',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PARENT / GUARDIAN NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Sundar / Janakiraman"
                  value={newMember.parentName}
                  onChange={(e) => setNewMember({ ...newMember, parentName: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-line)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PARENT PHONE (WHATSAPP)</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newMember.parentPhone}
                    onChange={(e) => setNewMember({ ...newMember, parentPhone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: '600', marginBottom: '4px' }}>PARENT EMAIL</label>
                  <input
                    type="email"
                    placeholder="parent@example.com"
                    value={newMember.parentEmail}
                    onChange={(e) => setNewMember({ ...newMember, parentEmail: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-line)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b89028 100%)',
                  color: '#000000',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Add to Register
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="no-print" style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-line)',
        padding: '16px 24px',
        marginTop: 'auto',
        fontSize: '12px',
        color: 'var(--text-dim)'
      }}>
        <div style={{
          maxWidth: '1500px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            © 2010 - 2026 <strong>HETA Higher Education & Training Academy</strong> • All Rights Reserved.
          </div>
          <div>
            HRM Attendance Engine v1.0 • Connected to <strong>hetahighereducation@gmail.com</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
