import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const TABS = [
  { key: 'overview', label: '📊 Overview', icon: '📊' },
  { key: 'users', label: '👥 Manage Users', icon: '👥' },
  { key: 'campaigns', label: '📋 Manage Campaigns', icon: '📋' },
  { key: 'kyc', label: '🛡️ KYC Reviews', icon: '🛡️' },
  { key: 'withdrawals', label: '💸 Withdrawals', icon: '💸' },
  { key: 'donations', label: '💳 All Donations', icon: '💳' },
  { key: 'settings', label: '⚙️ Settings', icon: '⚙️' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [kycList, setKycList] = useState([]);
  const [donations, setDonations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewDocument, setPreviewDocument] = useState(null);

  // Guard: only admins
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  // Fetch data based on active tab
  useEffect(() => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const fetchData = async () => {
      try {
        if (tab === 'overview') {
          const res = await adminAPI.getStats();
          setStats(res.data.data);
        } else if (tab === 'campaigns') {
          const res = await adminAPI.getAllCampaigns();
          setPending(res.data.data);
        } else if (tab === 'withdrawals') {
          const res = await adminAPI.getPendingWithdrawals();
          setWithdrawals(res.data.data);
        } else if (tab === 'kyc') {
          const res = await adminAPI.getAllKyc();
          setKycList(res.data.data);
        } else if (tab === 'users') {
          const res = await adminAPI.getUsers();
          setUsersList(res.data.data);
        } else if (tab === 'donations') {
          const res = await adminAPI.getDonations();
          setDonations(res.data.data);
        } else if (tab === 'settings') {
          const res = await adminAPI.getSettings();
          setSettings(res.data.data);
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab]);

  const handleCampaignAction = async (id, action) => {
    setActionLoading(id);
    try {
      if (action === 'approve') await adminAPI.approve(id);
      else await adminAPI.reject(id, 'Does not meet guidelines.');
      setPending(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'active' : 'rejected' } : c));
      setMessage({ type: 'success', text: `Campaign ${action}d successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to ${action} campaign.` });
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone and will delete associated donations and updates.')) return;
    setActionLoading(`del-${id}`);
    try {
      await adminAPI.deleteCampaign(id);
      setPending(prev => prev.filter(c => c.id !== id));
      setMessage({ type: 'success', text: 'Campaign deleted successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete campaign.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleWithdrawalAction = async (id, action) => {
    setActionLoading(id);
    try {
      if (action === 'approve') await adminAPI.approveWithdrawal(id);
      else await adminAPI.rejectWithdrawal(id);
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      setMessage({ type: 'success', text: `Withdrawal ${action}d.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to ${action} withdrawal.` });
    } finally {
      setActionLoading('');
    }
  };

  const handleKycAction = async (id, action) => {
    setActionLoading(`kyc-${id}`);
    try {
      if (action === 'approve') await adminAPI.approveKyc(id);
      else await adminAPI.rejectKyc(id);
      setKycList(prev => prev.map(k => k.id === id ? { ...k, kyc_status: action === 'approve' ? 'verified' : 'rejected' } : k));
      setMessage({ type: 'success', text: `KYC ${action}d successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to ${action} KYC.` });
    } finally {
      setActionLoading('');
    }
  };

  const handleSettingUpdate = async (key, value) => {
    try {
      setActionLoading(key);
      await adminAPI.updateSetting(key, value);
      setMessage({ type: 'success', text: `Setting updated successfully.` });
      const res = await adminAPI.getSettings();
      setSettings(res.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update setting.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestEmail = async () => {
    try {
      setActionLoading('test-email');
      const email = prompt("Enter an email address to send the test to:");
      if (!email) return;
      await adminAPI.testEmail({ to: email });
      setMessage({ type: 'success', text: `Test email sent successfully to ${email}. Check your inbox!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send test email. Check your SMTP settings.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserUpdate = async (id, updatedData) => {
    try {
      setActionLoading(`user-${id}`);
      const res = await adminAPI.updateUser(id, updatedData);
      setUsersList(prev => prev.map(u => u.id === id ? res.data.data : u));
      setMessage({ type: 'success', text: 'User updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update user.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      setActionLoading(`user-del-${id}`);
      await adminAPI.deleteUser(id);
      setUsersList(prev => prev.filter(u => u.id !== id));
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
    } finally {
      setActionLoading('');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page" style={{ background: 'var(--bg-secondary)' }} id="admin-dashboard">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--slate-800)' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Welcome back, {user.name}. Manage your platform.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '28px',
          background: '#fff', borderRadius: 'var(--radius-md)', padding: '4px',
          border: '1px solid var(--border)', overflowX: 'auto'
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '12px 16px', background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-body)',
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {/* ── Overview Tab ── */}
            {tab === 'overview' && stats && (
              <div className="animate-in">
                <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                  {[
                    { label: 'Total Campaigns', value: stats.campaigns?.total || 0, color: 'var(--slate-800)' },
                    { label: 'Pending Review', value: stats.campaigns?.pending || 0, color: 'var(--warning)' },
                    { label: 'Total Raised', value: `$${Number(stats.donations?.total_raised || 0).toLocaleString()}`, color: 'var(--emerald-600)' },
                    { label: 'Unique Donors', value: stats.donations?.unique_donors || 0, color: 'var(--accent)' }
                  ].map((s, i) => (
                    <div key={i} className="card" style={{ textAlign: 'center' }}>
                      <div className="card-body" style={{ padding: '28px 20px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: s.color }}>
                          {s.value}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-2">
                  <div className="card">
                    <div className="card-body" style={{ padding: '24px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--slate-800)' }}>Platform Health</h3>
                      <div className="tracking-detail-row"><span className="tracking-label">Active Campaigns</span><span className="tracking-value">{stats.campaigns?.active || 0}</span></div>
                      <div className="tracking-detail-row"><span className="tracking-label">Total Donations</span><span className="tracking-value">{stats.donations?.total_donations || 0}</span></div>
                      <div className="tracking-detail-row"><span className="tracking-label">Registered Users</span><span className="tracking-value">{stats.users?.total_users || 0}</span></div>
                      <div className="tracking-detail-row"><span className="tracking-label">Campaign Creators</span><span className="tracking-value">{stats.users?.creators || 0}</span></div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-body" style={{ padding: '24px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--slate-800)' }}>Quick Actions</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('campaigns')}>
                          📋 Manage Campaigns ({stats.campaigns?.total || 0})
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('kyc')}>
                          🛡️ Review Pending KYC
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('withdrawals')}>
                          💸 Process Withdrawals
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('settings')}>
                          ⚙️ Manage Settings
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Manage Campaigns Tab ── */}
            {tab === 'campaigns' && (
              <div className="animate-in">
                {pending.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No campaigns</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>There are no campaigns on the platform yet.</p>
                    </div>
                  </div>
                ) : (
                  pending.map(c => (
                    <div key={c.id} className="card" style={{ marginBottom: '16px' }}>
                      <div className="card-body" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: 1, minWidth: '250px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <span className="badge badge-category">{c.category}</span>
                              <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {c.status}
                              </span>
                              <span className={`badge ${c.kyc_status === 'verified' ? 'badge-success' : 'badge-danger'}`}>
                                KYC: {c.kyc_status}
                              </span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '6px', color: 'var(--slate-800)' }}>{c.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                              by {c.creator_name} ({c.creator_email})
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.description}
                            </p>
                            <p style={{ color: 'var(--emerald-600)', fontWeight: 700, marginTop: '8px' }}>
                              Raised: ${Number(c.current_amount).toLocaleString()} / Goal: ${Number(c.goal_amount).toLocaleString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            {c.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleCampaignAction(c.id, 'approve')}
                                  disabled={actionLoading === c.id}
                                >
                                  {actionLoading === c.id ? '...' : '✅ Approve'}
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCampaignAction(c.id, 'reject')}
                                  disabled={actionLoading === c.id}
                                >
                                  {actionLoading === c.id ? '...' : '❌ Reject'}
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ background: '#ef4444', color: 'white' }}
                              onClick={() => handleDeleteCampaign(c.id)}
                              disabled={actionLoading === `del-${c.id}`}
                            >
                              {actionLoading === `del-${c.id}` ? '...' : '🗑️ Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── KYC Tab ── */}
            {tab === 'kyc' && (
              <div className="animate-in">
                {kycList.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛡️</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No KYC Submissions</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>No users have submitted KYC documents yet.</p>
                    </div>
                  </div>
                ) : (
                  kycList.map(k => (
                    <div key={k.id} className="card" style={{ marginBottom: '16px' }}>
                      <div className="card-body" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <span className={`badge ${k.kyc_status === 'verified' ? 'badge-success' : k.kyc_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {k.kyc_status.toUpperCase()}
                              </span>
                              {k.kyc_document_type && <span className="badge badge-category">{k.kyc_document_type.replace('_', ' ').toUpperCase()}</span>}
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--slate-800)', marginBottom: '4px' }}>
                              {k.kyc_full_name || k.name}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{k.email}</p>
                            
                            {(k.kyc_dob || k.kyc_address) && (
                              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                {k.kyc_dob && <div><strong>DOB:</strong> {new Date(k.kyc_dob).toLocaleDateString()}</div>}
                                {k.kyc_address && <div><strong>Address:</strong> {k.kyc_address}</div>}
                                {k.kyc_document_url && (
                                  <div style={{ marginTop: '8px' }}>
                                    <button 
                                      className="btn btn-secondary btn-sm" 
                                      onClick={() => setPreviewDocument(k.kyc_document_url)}
                                    >
                                      📄 View Uploaded Document
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <p style={{ color: 'var(--slate-500)', fontSize: '0.8rem', marginTop: '12px' }}>
                              Submitted: {new Date(k.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          {k.kyc_status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleKycAction(k.id, 'approve')} disabled={actionLoading === `kyc-approve-${k.id}`}>
                                {actionLoading === `kyc-approve-${k.id}` ? '...' : '✅ Approve'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleKycAction(k.id, 'reject')} disabled={actionLoading === `kyc-reject-${k.id}`}>
                                {actionLoading === `kyc-reject-${k.id}` ? '...' : '❌ Reject'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Withdrawals Tab ── */}
            {tab === 'withdrawals' && (
              <div className="animate-in">
                {withdrawals.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💰</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No pending withdrawals</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>All withdrawal requests have been processed.</p>
                    </div>
                  </div>
                ) : (
                  withdrawals.map(w => (
                    <div key={w.id} className="card" style={{ marginBottom: '16px' }}>
                      <div className="card-body" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                          <div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--slate-800)' }}>{w.campaign_title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Requested by {w.creator_name}</p>
                            <p style={{ color: 'var(--emerald-600)', fontWeight: 700, fontSize: '1.2rem', marginTop: '8px' }}>${Number(w.amount).toLocaleString()}</p>
                            {w.bank_name && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{w.bank_name} • {w.account_number}</p>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleWithdrawalAction(w.id, 'approve')} disabled={actionLoading === w.id}>
                              ✅ Approve
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleWithdrawalAction(w.id, 'reject')} disabled={actionLoading === w.id}>
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Users Tab ── */}
            {tab === 'users' && (
              <div className="animate-in">
                <div className="card">
                  <div className="card-body" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)', marginBottom: '16px' }}>Manage Users</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Name</th>
                            <th style={{ padding: '12px' }}>Email</th>
                            <th style={{ padding: '12px' }}>Role</th>
                            <th style={{ padding: '12px' }}>KYC</th>
                            <th style={{ padding: '12px' }}>Joined</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                              <td style={{ padding: '12px', fontWeight: 500 }}>{u.name}</td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                              <td style={{ padding: '12px' }}>
                                <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-category'}`}>{u.role}</span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className={`badge ${u.kyc_status === 'verified' ? 'badge-success' : u.kyc_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                  {u.kyc_status}
                                </span>
                              </td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                  const newName = prompt('Enter new name:', u.name);
                                  if (newName === null) return;
                                  const newRole = prompt('Enter new role (admin or creator):', u.role);
                                  if (newRole === null || !['admin', 'creator'].includes(newRole)) return alert('Invalid role');
                                  handleUserUpdate(u.id, { name: newName, email: u.email, role: newRole });
                                }} disabled={actionLoading === `user-${u.id}`} style={{ marginRight: '8px' }}>
                                  {actionLoading === `user-${u.id}` ? 'Saving...' : 'Edit'}
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)} disabled={actionLoading === `user-del-${u.id}`}>
                                  {actionLoading === `user-del-${u.id}` ? 'Deleting...' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Donations Tab ── */}
            {tab === 'donations' && (
              <div className="animate-in">
                {donations.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💳</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No donations yet</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>There are no recorded donations on the platform.</p>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-800)' }}>Date</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-800)' }}>Campaign</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-800)' }}>Donor</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-800)' }}>Amount</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-800)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map(d => (
                          <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              {new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString()}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {d.campaign_title}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                              {d.is_anonymous ? 'Anonymous' : (d.donor_user_name || d.guest_name || 'Guest')}
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--emerald-600)', fontWeight: 700 }}>
                              ${Number(d.amount).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Settings Tab ── */}
            {tab === 'settings' && (
              <div className="animate-in">
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-body" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--slate-800)' }}>
                      Stripe Integration
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      Update your Stripe API keys securely.
                    </p>
                    {settings.filter(s => s.setting_key.startsWith('stripe')).map(s => (
                      <SettingField key={s.setting_key} setting={s} onSave={handleSettingUpdate} />
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-body" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, color: 'var(--slate-800)' }}>
                        Email Server (SMTP)
                      </h3>
                      <button className="btn btn-secondary btn-sm" onClick={handleTestEmail} disabled={actionLoading === 'test-email'}>
                        {actionLoading === 'test-email' ? 'Sending...' : '📧 Send Test Email'}
                      </button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      Configure the automated email system.
                    </p>
                    {settings.filter(s => s.setting_key.startsWith('smtp')).map(s => (
                      <SettingField key={s.setting_key} setting={s} onSave={handleSettingUpdate} />
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-body" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--slate-800)' }}>
                      Platform Details
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      General configuration for Donate Plea.
                    </p>
                    {settings.filter(s => !s.setting_key.startsWith('stripe') && !s.setting_key.startsWith('smtp')).map(s => (
                      <SettingField key={s.setting_key} setting={s} onSave={handleSettingUpdate} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{ width: '100%', maxWidth: '800px', background: '#fff', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px', background: 'var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Document Preview</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewDocument(null)}>Close</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', justifyContent: 'center', background: '#f8f9fa' }}>
              {previewDocument.startsWith('data:application/pdf') ? (
                <iframe src={previewDocument} width="100%" height="600px" style={{ border: 'none' }} title="PDF Preview" />
              ) : (
                <img src={previewDocument} alt="KYC Document" style={{ maxWidth: '100%', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Setting Field Component ──
function SettingField({ setting, onSave }) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0', borderBottom: '1px solid var(--border-light)',
      gap: '16px', flexWrap: 'wrap'
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
          {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{setting.description}</div>
        {!editing && (
          <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '4px', fontFamily: 'monospace' }}>
            {setting.display_value || '(not set)'}
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type={setting.is_encrypted ? 'password' : 'text'}
            className="form-input"
            style={{ width: '260px', padding: '8px 12px', fontSize: '0.85rem' }}
            placeholder={setting.is_encrypted ? 'Enter new key...' : 'Enter value...'}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => { onSave(setting.setting_key, value); setEditing(false); setValue(''); }}>
            Save
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setValue(''); }}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          ✏️ Edit
        </button>
      )}
    </div>
  );
}
