import React, { useState, useMemo } from 'react';
import {
  Calendar, CheckCircle, XCircle, Clock, AlertTriangle, FileSpreadsheet,
  Download, Printer, Send, MessageCircle, Mail, UserCheck, Users,
  Building, Check, X, ShieldAlert, Sparkles, RefreshCw, Plus, Trash2,
  ExternalLink, ChevronRight, BookOpen, Search, User, LogOut, Lock,
  Edit2, Save, Filter, LayoutDashboard, CheckSquare, FileText, Bell, Shield, Copy,
  GraduationCap, Briefcase, Menu, Eye, EyeOff
} from './icons';

// =========================================================================
// 1. PASSWORD STRENGTH METER COMPONENT
// =========================================================================
export const calculatePasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: 'Empty', color: '#94a3b8' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Good', color: '#10b981' };
  return { score: 4, label: 'Strong', color: '#127171' };
};

export const PasswordStrengthBar = ({ password, themeTokens }) => {
  const { score, label, color } = calculatePasswordStrength(password);
  if (!password) return null;

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            style={{
              flex: 1,
              borderRadius: 2,
              background: step <= score ? color : (themeTokens?.isGreen ? '#c8e3e3' : '#e4e4e7'),
              transition: 'background 0.2s ease'
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: themeTokens?.mutedText }}>Password Strength:</span>
        <span style={{ fontWeight: 700, color }}>{label}</span>
      </div>
    </div>
  );
};


// =========================================================================
// 2. FORGOT PASSWORD VIEW (SINGLE-USE 30-MIN TOKEN)
// =========================================================================
export const ForgotPasswordCard = ({ themeTokens, API_BASE, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetData, setResetData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setMessage('');
    setResetData(null);
    setCopied(false);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok && data.error) {
        setError(data.error);
        return;
      }
      // Constant generic message returned by API to prevent email enumeration
      setMessage(data.message || 'If an account with that email exists, password reset instructions have been dispatched to your email address.');
      if (data.token) {
        setResetData(data);
      }
    } catch (err) {
      setError('Connection failed. Please ensure the backend server is reachable.');
    } finally {
      setLoading(false);
    }
  };

  const directResetUrl = resetData?.token 
    ? `${window.location.origin}${window.location.pathname}?reset_token=${encodeURIComponent(resetData.token)}`
    : '';

  const handleCopyLink = () => {
    if (directResetUrl) {
      navigator.clipboard.writeText(directResetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>Reset Your Password</h3>
        <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 4, lineHeight: 1.5 }}>
          Enter your registered email address. We will dispatch a secure, single-use password reset link that expires in <strong>30 minutes</strong>.
        </p>
      </div>

      {message && (
        <div style={{ background: themeTokens.isGreen ? '#ecfdf5' : '#f0fdf4', border: '1px solid #10b981', borderRadius: 8, padding: '14px', color: '#065f46', fontSize: 13, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span> Reset Link Dispatched
          </div>
          <div>{message}</div>

          {resetData?.token && (
            <div style={{ marginTop: 12, padding: 12, background: '#ffffff', borderRadius: 6, border: '1px dashed #10b981', color: '#111827' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', marginBottom: 4 }}>
                ⚡ Instant Access Link (Expires in 30 mins):
              </div>
              <p style={{ fontSize: 11, color: '#4b5563', margin: '0 0 10px 0' }}>
                If you prefer not to wait for your inbox, you can use the secure link below immediately:
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={directResetUrl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    background: '#127171',
                    color: '#ffffff',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  👉 Open Reset Page Now
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    padding: '8px 12px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#374151'
                  }}
                >
                  {copied ? '✓ Copied Link!' : '📋 Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!message ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 6 }}>
              Registered Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@example.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: themeTokens.inputBg,
                border: `1px solid ${themeTokens.inputBorder}`,
                borderRadius: 6,
                color: themeTokens.textMain,
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px',
              background: themeTokens.primaryBtn,
              color: themeTokens.primaryBtnFg,
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? 'Dispatching Secure Link...' : 'Send Password Reset Link →'}
          </button>
        </form>
      ) : null}

      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <button
          type="button"
          onClick={onBackToLogin}
          style={{ background: 'none', border: 'none', color: themeTokens.mutedText, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Return to Portal Sign In
        </button>
      </div>
    </div>
  );
};


// =========================================================================
// 3. RESET PASSWORD SCREEN (STANDALONE TOKEN-VERIFIED PAGE)
// =========================================================================
export const ResetPasswordScreen = ({ token, themeTokens, API_BASE, onDone }) => {
  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  React.useEffect(() => {
    const verifyToken = async () => {
      try {
        setVerifying(true);
        const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.success && data.valid) {
          setIsValid(true);
          setUserEmail(data.email);
        } else {
          setIsValid(false);
          setVerifyError(data.error || data.message || 'Reset link is invalid, already used, or expired.');
        }
      } catch (err) {
        setIsValid(false);
        setVerifyError('Failed to verify token with server.');
      } finally {
        setVerifying(false);
      }
    };
    if (token) verifyToken();
    else {
      setVerifying(false);
      setIsValid(false);
      setVerifyError('No reset token provided in URL.');
    }
  }, [token, API_BASE]);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setSubmitError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || data.message || 'Failed to reset password. Link may have expired.');
        return;
      }
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError('Network error while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: themeTokens.canvasBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 450, padding: 32, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <img src="/heta-logo.png" alt="HETA Crest" style={{ width: 68, height: 68, objectFit: 'contain', margin: '0 auto 10px auto', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: themeTokens.headingText }}>
            Set New Account Password
          </h2>
          <div style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 4 }}>
            HETA Student Management Portal &bull; Secure Reset
          </div>
        </div>

        {verifying ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: themeTokens.mutedText, fontSize: 13 }}>
            Verifying your security token...
          </div>
        ) : !isValid ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '14px 16px', color: '#dc2626', fontSize: 13, marginBottom: 18 }}>
              <strong>Invalid Reset Link:</strong><br />
              {verifyError}
            </div>
            <button
              onClick={onDone}
              style={{ padding: '10px 20px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Return to Login
            </button>
          </div>
        ) : submitSuccess ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: themeTokens.isGreen ? '#ecfdf5' : '#f0fdf4', border: '1px solid #10b981', borderRadius: 8, padding: '18px', color: '#065f46', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
              <CheckCircle size={28} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <strong>Password Reset Successful!</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: 13 }}>
                Your password has been securely updated. You can now log in using your new credentials.
              </p>
            </div>
            <button
              onClick={onDone}
              style={{ width: '100%', padding: '11px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Log In to Portal Now →
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {userEmail && (
              <div style={{ background: themeTokens.cardInner, padding: '8px 12px', borderRadius: 6, fontSize: 12, color: themeTokens.mutedText }}>
                Resetting password for: <strong style={{ color: themeTokens.headingText }}>{userEmail}</strong>
              </div>
            )}

            {submitError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
                {submitError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 6 }}>
                New Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    background: themeTokens.inputBg,
                    border: `1px solid ${themeTokens.inputBorder}`,
                    borderRadius: 6,
                    color: themeTokens.textMain,
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeTokens.mutedText, padding: 4 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthBar password={password} themeTokens={themeTokens} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 6 }}>
                Confirm New Password *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  style={{
                    width: '100%',
                    padding: '10px 42px 10px 14px',
                    background: themeTokens.inputBg,
                    border: `1px solid ${themeTokens.inputBorder}`,
                    borderRadius: 6,
                    color: themeTokens.textMain,
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: themeTokens.mutedText, padding: 4 }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '11px',
                background: themeTokens.primaryBtn,
                color: themeTokens.primaryBtnFg,
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: submitting ? 'wait' : 'pointer',
                marginTop: 6
              }}
            >
              {submitting ? 'Updating Password...' : 'Save New Password & Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};


// =========================================================================
// 4. PENDING SIGNUPS APPROVAL TAB (ADMIN PORTAL)
// =========================================================================
export const PendingApprovalsTab = ({ pendingUsers, onApprove, onReject, onRefresh, themeTokens }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm) return pendingUsers;
    const q = searchTerm.toLowerCase();
    return pendingUsers.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.code && u.code.toLowerCase().includes(q))
    );
  }, [pendingUsers, searchTerm]);

  return (
    <div>
      {/* Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>
              Pending Registration Requests
            </h3>
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: '1px solid #fde68a' }}>
              {pendingUsers.length} Awaiting Review
            </span>
          </div>
          <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
            New self-registered students & staff accounts remain pending until approved by an administrator.
          </p>
        </div>

        <button
          onClick={onRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
            border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> Refresh Requests
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by name, email, or registration code..."
          style={{ width: '100%', padding: '8px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center' }}>
          <UserCheck size={36} color={themeTokens.iconColor || (themeTokens.isGreen ? '#127171' : '#09090b')} style={{ margin: '0 auto 10px auto', display: 'block' }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: themeTokens.headingText }}>No Pending Registrations</h4>
          <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 4 }}>
            All user registration requests have been reviewed and approved or processed.
          </p>
        </div>
      ) : (
        <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: themeTokens.tableHeaderBg, borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Applicant</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Role / ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Course &amp; Batch</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Contact Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Applied On</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: themeTokens.headingText }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: themeTokens.mutedText }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: u.role === 'STUDENT' ? (themeTokens.isGreen ? 'rgba(18,113,113,0.1)' : '#f4f4f5') : '#f5f3ff',
                        color: u.role === 'STUDENT' ? themeTokens.accentText : '#7c3aed'
                      }}>
                        {u.role}
                      </span>
                      <div style={{ fontSize: 11, color: themeTokens.dimText, marginTop: 4 }}>{u.code || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: themeTokens.textMain }}>{u.course || '-'}</div>
                      <div style={{ fontSize: 11, color: themeTokens.mutedText }}>{u.batch || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{u.phone || '-'}</div>
                      {u.parentEmail && <div style={{ fontSize: 11, color: themeTokens.mutedText }}>Parent: {u.parentEmail}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: themeTokens.mutedText }}>
                      {(u.createdAt || '').split('T')[0]}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          onClick={() => onApprove(u.id, u.name)}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none',
                            background: themeTokens.isGreen ? '#127171' : '#10b981', color: '#fff',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => onReject(u.id, u.name)}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: '1px solid #ef4444',
                            background: 'transparent', color: '#ef4444',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


// =========================================================================
// 5. ACADEMIC HOLIDAYS MANAGEMENT TAB (ADMIN PORTAL)
// =========================================================================
export const HolidaysTab = ({ holidays, onAdd, onEdit, onDelete, onRefresh, themeTokens }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm) return holidays;
    const q = searchTerm.toLowerCase();
    return holidays.filter(h =>
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.date && h.date.includes(q)) ||
      (h.description && h.description.toLowerCase().includes(q))
    );
  }, [holidays, searchTerm]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>
            Academic Holidays Calendar
          </h3>
          <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
            Manage official institution holidays. On scheduled holidays, daily absent check and classes are automatically skipped.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
              border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={onAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              fontSize: 12, fontWeight: 700, background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg,
              border: 'none', cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Holiday
          </button>
        </div>
      </div>

      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search holidays by name, date (YYYY-MM-DD), or category..."
          style={{ width: '100%', padding: '8px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
        />
      </div>

      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: themeTokens.tableHeaderBg, borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Holiday Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Description / Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.accentText }}>
                    {h.date}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>
                    {h.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: themeTokens.mutedText }}>
                    {h.description || 'Institutional Holiday'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        onClick={() => onEdit(h)}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: `1px solid ${themeTokens.cardBorder}`,
                          background: themeTokens.cardInner, color: themeTokens.textMain, fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        onClick={() => onDelete(h)}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: '1px solid #ef4444',
                          background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <Trash2 size={13} /> Soft Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// =========================================================================
// 6. EMAIL AUDIT LOGS TAB (ADMIN PORTAL)
// =========================================================================
export const EmailLogsTab = ({ emailLogs, onRefresh, themeTokens }) => {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return emailLogs.filter(l => {
      const matchType = filterType === 'ALL' || l.emailType === filterType;
      const matchSearch = !searchTerm ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.subject && l.subject.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [emailLogs, filterType, searchTerm]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>
            Email Notifications Audit Log
          </h3>
          <p style={{ fontSize: 12, color: themeTokens.mutedText, marginTop: 2 }}>
            Complete audit trail for dual leave alerts, password resets, signup updates, and daily absent reminders.
          </p>
        </div>

        <button
          onClick={onRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg,
            border: `1px solid ${themeTokens.secondaryBtnBorder}`, cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by recipient email or subject..."
          style={{ flex: 1, minWidth: 220, padding: '8px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL">All Email Types</option>
          <option value="DAILY_ABSENT_REMINDER">Daily Absent Reminders</option>
          <option value="LEAVE_APPLIED_STUDENT">Leave Confirmation (Student)</option>
          <option value="LEAVE_APPLIED_ADMIN">Leave Alert (Admin)</option>
          <option value="LEAVE_DECISION_STUDENT">Leave Decision</option>
          <option value="SIGNUP_APPROVED">Signup Approved</option>
          <option value="SIGNUP_ALERT_ADMIN">Signup Alert (Admin)</option>
          <option value="PASSWORD_RESET">Password Reset Link</option>
        </select>
      </div>

      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: themeTokens.tableHeaderBg, borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Recipient</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Subject</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Date Ref</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: themeTokens.headingText }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: themeTokens.mutedText }}>
                    No matching email logs found.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: themeTokens.headingText }}>
                      {l.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: themeTokens.cardInner, border: `1px solid ${themeTokens.cardBorder}`, color: themeTokens.textMain }}>
                        {l.emailType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: themeTokens.textMain }}>
                      {l.subject}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: l.status === 'SENT' ? '#ecfdf5' : l.status === 'QUEUED' ? '#eff6ff' : '#fef2f2',
                        color: l.status === 'SENT' ? '#065f46' : l.status === 'QUEUED' ? '#1e40af' : '#991b1b'
                      }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: themeTokens.dimText }}>
                      {l.date || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: themeTokens.mutedText }}>
                      {l.sentAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

