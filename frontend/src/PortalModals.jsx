import React, { useState } from 'react';
import { X, Check, AlertTriangle, Shield, User, Calendar, BookOpen, Clock, Lock, RefreshCw } from './icons';

export const AddUserModal = ({ open, onClose, onSubmit, themeTokens }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'STUDENT',
    studentId: '',
    course: 'Python Programming',
    batch: 'Batch-2026-A',
    dateOfJoining: new Date().toISOString().split('T')[0],
    temporaryPassword: 'Heta@' + Math.floor(100 + Math.random() * 900),
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 26, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: `1px solid ${themeTokens.cardBorder}`, paddingBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>Add New Portal User</h3>
            <p style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>Create user account with full credentials and roster record.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: themeTokens.mutedText, cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Full Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Deepika J"
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+919876543210"
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {/* Role & Student ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Account Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff / Faculty</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Student / Staff ID</label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="Leave empty for auto-assign"
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {/* Course / Program & Date of Joining */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Course / Department</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                placeholder="e.g. Python Programming"
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Date of Joining *</label>
              <input
                type="date"
                required
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          {/* Temporary Password & Account Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: themeTokens.headingText }}>Temporary Password *</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, temporaryPassword: 'Heta@' + Math.floor(100 + Math.random() * 900) })}
                  style={{ background: 'none', border: 'none', color: themeTokens.accentText, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.temporaryPassword}
                onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Initial Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="ACTIVE">Active (Immediate Login)</option>
                <option value="PENDING">Pending Approval</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Creating...' : 'Create User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export const EditUserModal = ({ open, user, onClose, onSubmit, themeTokens }) => {
  const [formData, setFormData] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'STUDENT',
    status: user?.userStatus || user?.status || 'ACTIVE',
    course: user?.course || '',
    batch: user?.batch || '',
    dateOfJoining: user?.dateOfJoining || '2026-01-10'
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'STUDENT',
        status: user.userStatus || user.status || 'ACTIVE',
        course: user.course || '',
        batch: user.batch || '',
        dateOfJoining: user.dateOfJoining || '2026-01-10'
      });
    }
  }, [user]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(user.userId || user.id, formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 500, padding: 26, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: `1px solid ${themeTokens.cardBorder}`, paddingBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>Edit User Account</h3>
            <p style={{ fontSize: 11, color: themeTokens.mutedText, marginTop: 2 }}>{user.email} &bull; {user.code || 'No Code'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: themeTokens.mutedText, cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff / Faculty</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.cardInner, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="REJECTED">REJECTED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Course / Department</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Date of Joining</label>
              <input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 16px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export const ViewUserModal = ({ open, user, onClose, themeTokens }) => {
  if (!open || !user) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 480, padding: 26, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: `1px solid ${themeTokens.cardBorder}`, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: themeTokens.cardInner, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: themeTokens.headingText }}>
              {user.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: themeTokens.headingText }}>{user.name}</h3>
              <div style={{ fontSize: 11, color: themeTokens.mutedText }}>{user.role} &bull; {user.code || 'ID not assigned'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: themeTokens.mutedText, cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600, width: '40%' }}>Official Email</td>
              <td style={{ padding: '8px 0', color: themeTokens.headingText, fontWeight: 700 }}>{user.email}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Contact Phone</td>
              <td style={{ padding: '8px 0', color: themeTokens.textMain }}>{user.phone || '-'}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Account Status</td>
              <td style={{ padding: '8px 0' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: user.userStatus === 'ACTIVE' ? '#ecfdf5' : '#fef3c7',
                  color: user.userStatus === 'ACTIVE' ? '#065f46' : '#b45309'
                }}>
                  {user.userStatus || user.status || 'ACTIVE'}
                </span>
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Enrolled Program</td>
              <td style={{ padding: '8px 0', color: themeTokens.textMain }}>{user.course || '-'}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Assigned Batch</td>
              <td style={{ padding: '8px 0', color: themeTokens.textMain }}>{user.batch || '-'}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${themeTokens.cardBorder}` }}>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Date of Joining</td>
              <td style={{ padding: '8px 0', color: themeTokens.textMain }}>{user.dateOfJoining || '2026-01-10'}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: themeTokens.mutedText, fontWeight: 600 }}>Registration Date</td>
              <td style={{ padding: '8px 0', color: themeTokens.dimText }}>{user.signupDate || '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};


export const HolidayModal = ({ open, holiday, onClose, onSubmit, themeTokens }) => {
  const [name, setName] = useState(holiday?.name || '');
  const [date, setDate] = useState(holiday?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(holiday?.description || '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setName(holiday?.name || '');
    setDate(holiday?.date || new Date().toISOString().split('T')[0]);
    setDescription(holiday?.description || '');
  }, [holiday]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ name, date, description }, holiday?.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: themeTokens.cardBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, width: '100%', maxWidth: 450, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: themeTokens.headingText }}>
            {holiday?.id ? 'Edit Holiday' : 'Add New Academic Holiday'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: themeTokens.mutedText, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Holiday Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pongal Harvest Festival"
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Date (YYYY-MM-DD) *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: themeTokens.headingText, marginBottom: 4 }}>Description / Category</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. National Festival Holiday"
              style={{ width: '100%', padding: '9px 12px', background: themeTokens.inputBg, border: `1px solid ${themeTokens.inputBorder}`, borderRadius: 6, color: themeTokens.textMain, fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 14px', background: themeTokens.secondaryBtn, color: themeTokens.secondaryBtnFg, border: `1px solid ${themeTokens.secondaryBtnBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 16px', background: themeTokens.primaryBtn, color: themeTokens.primaryBtnFg, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Saving...' : holiday?.id ? 'Save Holiday' : 'Add Holiday'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
