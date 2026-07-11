import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/axios.js';
import { Shield, Key, Laptop, QrCode, LogOut, CheckCircle2, Lock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, checkSession } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [twoFaQr, setTwoFaQr] = useState<string | null>(null);
  const [twoFaStatus, setTwoFaStatus] = useState(user?.twoFactorEnabled || false);

  const fetchSessionDetails = async () => {
    try {
      const res = await api.get('/auth/me');
      setSessions(res.data.data.user.sessions || []);
      setTwoFaStatus(res.data.data.user.twoFactorEnabled);
    } catch (e) {
      console.error('Failed to load session details');
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      await api.put('/auth/change-password', { oldPassword, newPassword });
      setPasswordMsg('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMsg(err.response?.data?.error?.message || 'Password update failed.');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      fetchSessionDetails();
    } catch (e) {
      console.error('Session termination failed');
    }
  };

  const handleRevokeOthers = async () => {
    try {
      await api.delete('/auth/sessions');
      fetchSessionDetails();
    } catch (e) {
      console.error('Failed to logout other devices');
    }
  };

  const handleToggle2FA = async () => {
    try {
      const nextState = !twoFaStatus;
      const res = await api.post('/auth/2fa/toggle', { enable: nextState });
      setTwoFaStatus(res.data.data.twoFactorEnabled);
      setTwoFaQr(res.data.data.qrCodeMock || null);
      checkSession(); // sync context
    } catch (e) {
      console.error('Failed to toggle two factor authentication');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Topbar />

        <div style={{ padding: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '32px' }} className="text-gradient">
            Account Settings
          </h1>

          <div className="grid-2">
            {/* Security Profile Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Profile Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--primary)" />
                  <span>Profile Information</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
                    <strong style={{ display: 'block', marginTop: '2px' }}>{user?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Email Address:</span>
                    <strong style={{ display: 'block', marginTop: '2px' }}>{user?.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Role Privileges:</span>
                    <strong style={{ display: 'block', marginTop: '2px', textTransform: 'capitalize' }}>
                      {user?.role.replace('-', ' ')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Password update form */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={18} color="var(--primary)" />
                  <span>Change Password</span>
                </h3>

                {passwordMsg && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {passwordMsg}
                  </div>
                )}

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Current Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="••••••••"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
                    Update Password
                  </button>
                </form>
              </div>
            </div>

            {/* Session Audit and MFA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Two-Factor Authentication Card */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} color="var(--primary)" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
                  Secure your account by requiring an additional TOTP authentication code on logins.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                    Status: {twoFaStatus ? <span style={{ color: 'var(--status-resolved)' }}>Active Enabled</span> : <span style={{ color: 'var(--text-secondary)' }}>Disabled</span>}
                  </span>
                  <button 
                    onClick={handleToggle2FA} 
                    className={`btn ${twoFaStatus ? 'btn-outline' : 'btn-primary'}`}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    {twoFaStatus ? 'Disable' : 'Enable 2FA'}
                  </button>
                </div>

                {twoFaQr && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'rgba(2, 6, 23, 0.4)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                    <QrCode size={120} color="#fff" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Scan QR code using Google Authenticator or Duo app to pair credentials.
                    </span>
                  </div>
                )}
              </div>

              {/* Sessions Logs Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Laptop size={18} color="var(--primary)" />
                    <span>Active Sessions Devices</span>
                  </h3>
                  {sessions.length > 1 && (
                    <button 
                      onClick={handleRevokeOthers} 
                      className="btn btn-outline" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--status-open)', color: 'var(--status-open)' }}
                    >
                      Logout Other Devices
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sessions.map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                          IP: {s.ip || 'Localhost'}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.userAgent}>
                          UA: {s.userAgent || 'Chrome web browser'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRevokeSession(s.id)} 
                        className="btn btn-outline" 
                        style={{ padding: '6px', borderRadius: '50%' }}
                      >
                        <LogOut size={12} color="var(--status-open)" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
