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
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banForm, setBanForm] = useState({ ban_type: 'temporary', duration_days: 7, reason: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [addFundsModal, setAddFundsModal] = useState({ open: false, userId: '', userName: '', campaigns: [], selectedCampaign: '', amount: '' });

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

  const handleToggleSeo = async (id, currentSeoVisible) => {
    setActionLoading(`seo-${id}`);
    try {
      const res = await adminAPI.toggleSeoVisibility(id);
      const newVal = res.data.data.seo_visible;
      setPending(prev => prev.map(c => c.id === id ? { ...c, seo_visible: newVal } : c));
      setMessage({ type: 'success', text: `SEO visibility ${newVal ? 'enabled ✅' : 'disabled 🚫'} successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to toggle SEO.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleCampaign = async (id, currentStatus) => {
    setActionLoading(`tog-${id}`);
    try {
      const res = await adminAPI.toggleCampaign(id);
      const newStatus = res.data.data.status;
      setPending(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      setMessage({ type: 'success', text: `Campaign ${newStatus === 'active' ? 'turned ON ✅' : 'turned OFF ⏸️'} successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to toggle campaign.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleAddFunds = async (id, title) => {
    const amountStr = prompt(`Enter the amount to add to campaign "${title}" ($):`);
    if (amountStr === null || amountStr.trim() === '') return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    setActionLoading(`funds-${id}`);
    try {
      const res = await adminAPI.addFunds(id, amount);
      // Fetch updated campaigns to refresh current_amount and balances
      const updatedCampaignsRes = await adminAPI.getAllCampaigns();
      setPending(updatedCampaignsRes.data.data);
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add funds.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleOpenAddUserFunds = async (id, name) => {
    setActionLoading(`user-funds-${id}`);
    try {
      // We can check if `pending` (which holds all campaigns) has the user's campaigns
      let userCampaigns = pending.filter(c => c.creator_id === id && (c.status === 'active' || c.status === 'paused'));
      if (userCampaigns.length === 0) {
         // Fallback to fetch from backend just in case
         const res = await adminAPI.getAllCampaigns();
         userCampaigns = res.data.data.filter(c => c.creator_id === id && (c.status === 'active' || c.status === 'paused'));
      }
      setAddFundsModal({ open: true, userId: id, userName: name, campaigns: userCampaigns, selectedCampaign: '', amount: '' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to fetch user campaigns.' });
    } finally {
      setActionLoading('');
    }
  };

  const submitAddUserFunds = async (e) => {
    e.preventDefault();
    const { userId, selectedCampaign, amount } = addFundsModal;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    setActionLoading(`user-funds-${userId}`);
    try {
      // Pass campaign_id if selected, else null (auto-create)
      const res = await adminAPI.addUserFunds(userId, parsedAmount, selectedCampaign || null);
      setMessage({ type: 'success', text: res.data.message });
      setAddFundsModal({ open: false, userId: '', userName: '', campaigns: [], selectedCampaign: '', amount: '' });
      const resUsers = await adminAPI.getUsers();
      setUsersList(resUsers.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add funds to user.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteDonation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation record? This action cannot be undone.')) return;
    setActionLoading(`del-don-${id}`);
    try {
      await adminAPI.deleteDonation(id);
      setDonations(prev => prev.filter(d => d.id !== id));
      setMessage({ type: 'success', text: 'Donation deleted successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete donation.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleUserBan = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setActionLoading(`user-ban-${selectedUserId}`);
    try {
      const res = await adminAPI.banUser(selectedUserId, {
        ban_type: banForm.ban_type,
        duration_days: banForm.ban_type === 'temporary' ? parseInt(banForm.duration_days) : null,
        reason: banForm.reason
      });
      setMessage({ type: 'success', text: res.data.message });
      setShowBanModal(false);
      setBanForm({ ban_type: 'temporary', duration_days: 7, reason: '' });
      // Refresh list
      const resUsers = await adminAPI.getUsers();
      setUsersList(resUsers.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to ban user.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleUserUnban = async (id, name) => {
    if (!window.confirm(`Are you sure you want to unban user "${name}"?`)) return;
    setActionLoading(`user-unban-${id}`);
    try {
      const res = await adminAPI.unbanUser(id);
      setMessage({ type: 'success', text: res.data.message });
      // Refresh list
      const resUsers = await adminAPI.getUsers();
      setUsersList(resUsers.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to unban user.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleWithdrawalAction = async (id, action, method = 'manual') => {
    setActionLoading(id);
    try {
      if (action === 'approve') await adminAPI.approveWithdrawal(id, method);
      else await adminAPI.rejectWithdrawal(id);
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      setMessage({ type: 'success', text: `Withdrawal ${action}d.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || `Failed to ${action} withdrawal.` });
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
          border: '1px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch'
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, flexShrink: 0, padding: '12px 16px', background: tab === t.key ? 'var(--accent)' : 'transparent',
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
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span className="badge badge-category">{c.category}</span>
                              <span className={`badge ${
                                c.status === 'active' ? 'badge-success' :
                                c.status === 'pending' ? 'badge-warning' :
                                c.status === 'paused' ? '' : 'badge-danger'
                              }`} style={c.status === 'paused' ? { background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc' } : {}}>
                                {c.status === 'paused' ? '🚫 Hidden from Public' : c.status}
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
                            {/* Share link for paused/hidden campaigns */}
                            {c.status === 'paused' && (
                              <div style={{ marginTop: '10px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', flex: 1, wordBreak: 'break-all' }}>
                                  🔗 {window.location.origin}/campaigns/{c.id}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/campaigns/${c.id}`);
                                    setMessage({ type: 'success', text: 'Share link copied to clipboard!' });
                                  }}
                                  style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 10px', fontSize: '0.8rem', cursor: 'pointer', color: '#475569', whiteSpace: 'nowrap' }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                            {/* Toggle On/Off — active or paused */}
                            {(c.status === 'active' || c.status === 'paused') && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: c.status === 'active' ? '#fef9c3' : '#d1fae5',
                                  color: c.status === 'active' ? '#92400e' : '#065f46',
                                  border: `1px solid ${c.status === 'active' ? '#fde047' : '#6ee7b7'}`,
                                  fontWeight: 700
                                }}
                                onClick={() => handleToggleCampaign(c.id, c.status)}
                                disabled={actionLoading === `tog-${c.id}`}
                              >
                                {actionLoading === `tog-${c.id}` ? '...' : c.status === 'active' ? '🚫 Hide' : '🟢 Show'}
                              </button>
                            )}
                             {/* Add Funds Button */}
                             {(c.status === 'active' || c.status === 'paused') && (
                               <button
                                 className="btn btn-sm"
                                 style={{ background: '#10b981', color: 'white', border: '1px solid #059669', fontWeight: 700 }}
                                 onClick={() => handleAddFunds(c.id, c.title)}
                                 disabled={actionLoading === `funds-${c.id}`}
                               >
                                 {actionLoading === `funds-${c.id}` ? '...' : '💵 Add Funds'}
                               </button>
                             )}
                             {/* SEO Visibility Toggle */}
                             {(c.status === 'active' || c.status === 'paused') && (
                               <button
                                 className="btn btn-sm"
                                 style={{
                                   background: c.seo_visible !== false ? '#e0f2fe' : '#fee2e2',
                                   color: c.seo_visible !== false ? '#0369a1' : '#b91c1c',
                                   border: `1px solid ${c.seo_visible !== false ? '#7dd3fc' : '#fca5a5'}`,
                                   fontWeight: 700
                                 }}
                                 onClick={() => handleToggleSeo(c.id, c.seo_visible)}
                                 disabled={actionLoading === `seo-${c.id}`}
                               >
                                 {actionLoading === `seo-${c.id}` ? '...' : c.seo_visible !== false ? '🌐 SEO On' : '🚫 SEO Off'}
                               </button>
                             )}
                             {/* Share / Copy Link — always visible */}
                            <button
                              className="btn btn-sm"
                              style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', fontWeight: 700 }}
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/campaigns/${c.id}`);
                                setMessage({ type: 'success', text: `Link for “${c.title}” copied!` });
                              }}
                            >
                              🔗 Share Link
                            </button>
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
                            {w.payout_method === 'crypto' ? (
                              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                <span className="badge badge-category" style={{ background: '#e0f2fe', color: '#0369a1', marginRight: '6px' }}>🪙 Crypto ({w.crypto_network})</span>
                                <code style={{ fontSize: '0.9rem', color: 'var(--slate-800)', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px' }}>{w.crypto_address}</code>
                              </p>
                            ) : w.payout_method === 'stripe' ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                                <span className="badge badge-success" style={{ marginRight: '6px' }}>✅ Stripe Auto-Payout</span>
                              </p>
                            ) : (
                              w.bank_name && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                                  <span className="badge badge-category" style={{ background: '#f1f5f9', color: '#475569', marginRight: '6px' }}>🏦 Bank</span>
                                  {w.bank_name} • {w.account_number} ({w.account_name})
                                </p>
                              )
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {w.payout_method === 'stripe' && (
                              <button className="btn btn-sm" style={{ background: '#6366f1', color: '#fff', fontWeight: 600 }} onClick={() => handleWithdrawalAction(w.id, 'approve', 'stripe')} disabled={actionLoading === w.id}>
                                ⚡ Approve & Disburse via Stripe
                              </button>
                            )}
                            <button className="btn btn-success btn-sm" onClick={() => handleWithdrawalAction(w.id, 'approve', 'manual')} disabled={actionLoading === w.id}>
                              ✅ Approve (Manual Payment)
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
                      <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                  <span className={`badge ${u.kyc_status === 'verified' ? 'badge-success' : u.kyc_status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                    {u.kyc_status}
                                  </span>
                                  {u.is_banned && (
                                    <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontWeight: 700, fontSize: '0.75rem', padding: '2px 6px' }}>
                                      BANNED ({u.ban_type.toUpperCase()})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {(u.role === 'creator' || u.role === 'admin') && (
                                  <button
                                    className="btn btn-sm"
                                    style={{ background: '#10b981', color: 'white', border: '1px solid #059669', fontWeight: 700, marginRight: '8px' }}
                                    onClick={() => handleOpenAddUserFunds(u.id, u.name)}
                                    disabled={actionLoading === `user-funds-${u.id}`}
                                  >
                                    {actionLoading === `user-funds-${u.id}` ? '...' : '💵 Add Funds'}
                                  </button>
                                )}
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                  const newName = prompt('Enter new name:', u.name);
                                  if (newName === null) return;
                                  const newRole = prompt('Enter new role (admin or creator):', u.role);
                                  if (newRole === null || !['admin', 'creator'].includes(newRole)) return alert('Invalid role');
                                  handleUserUpdate(u.id, { name: newName, email: u.email, role: newRole });
                                }} disabled={actionLoading === `user-${u.id}`} style={{ marginRight: '8px' }}>
                                  {actionLoading === `user-${u.id}` ? 'Saving...' : 'Edit'}
                                </button>
                                
                                {u.id !== user.id && (
                                  u.is_banned ? (
                                    <button 
                                      className="btn btn-sm" 
                                      style={{ background: '#3b82f6', color: 'white', border: '1px solid #2563eb', fontWeight: 700, marginRight: '8px' }}
                                      onClick={() => handleUserUnban(u.id, u.name)}
                                      disabled={actionLoading === `user-unban-${u.id}`}
                                    >
                                      {actionLoading === `user-unban-${u.id}` ? '...' : '✅ Unban'}
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-sm" 
                                      style={{ background: '#ef4444', color: 'white', border: '1px solid #dc2626', fontWeight: 700, marginRight: '8px' }}
                                      onClick={() => {
                                        setSelectedUserId(u.id);
                                        setSelectedUserName(u.name);
                                        setShowBanModal(true);
                                      }}
                                      disabled={actionLoading === `user-ban-${u.id}`}
                                    >
                                      🚫 Ban
                                    </button>
                                  )
                                )}

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
                {/* Verify Payments Banner */}
                <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac' }}>
                  <div className="card-body" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', color: '#166534', fontFamily: 'var(--font-display)' }}>🔍 Verify Pending Payments</h4>
                      <p style={{ margin: 0, color: '#15803d', fontSize: '0.88rem' }}>Check all pending donations against Stripe and automatically mark confirmed payments as success.</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ background: '#16a34a', whiteSpace: 'nowrap' }}
                      disabled={verifyLoading}
                      onClick={async () => {
                        setVerifyLoading(true);
                        setVerifyResult(null);
                        try {
                          const res = await adminAPI.verifyPendingDonations();
                          setVerifyResult(res.data);
                          setMessage({ type: 'success', text: res.data.message });
                          // Reload donations list
                          const fresh = await adminAPI.getDonations();
                          setDonations(fresh.data.data);
                        } catch (err) {
                          setMessage({ type: 'error', text: err.response?.data?.message || 'Verification failed.' });
                        } finally {
                          setVerifyLoading(false);
                        }
                      }}
                    >
                      {verifyLoading ? '⏳ Verifying...' : '✅ Verify Payments Now'}
                    </button>
                  </div>
                  {verifyResult && (
                    <div style={{ padding: '0 24px 20px', display: 'flex', gap: '24px' }}>
                      <span style={{ color: '#166534', fontWeight: 700 }}>✅ {verifyResult.verified} verified</span>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>❌ {verifyResult.failed} not paid / error</span>
                    </div>
                  )}
                </div>
                {donations.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💳</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No donations yet</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>There are no recorded donations on the platform.</p>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                              <span className={`badge ${d.status === 'success' ? 'badge-success' : d.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ marginRight: '8px' }}>
                                {d.status}
                              </span>
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}
                                onClick={() => handleDeleteDonation(d.id)}
                                disabled={actionLoading === `del-don-${d.id}`}
                              >
                                {actionLoading === `del-don-${d.id}` ? '...' : '🗑️'}
                              </button>
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

      {/* ── Ban User Modal ── */}
      {showBanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowBanModal(false); }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>🚫 Ban User</h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>
                  Banning: <strong>{selectedUserName}</strong>
                </p>
              </div>
              <button onClick={() => setShowBanModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUserBan} style={{ padding: '28px' }}>
              {/* Ban Type */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '10px' }}>Ban Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['temporary', 'permanent'].map(type => (
                    <label key={type} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${banForm.ban_type === type ? (type === 'permanent' ? '#ef4444' : '#f97316') : 'var(--border)'}`,
                      background: banForm.ban_type === type ? (type === 'permanent' ? '#fef2f2' : '#fff7ed') : '#f8fafc',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="ban_type"
                        value={type}
                        checked={banForm.ban_type === type}
                        onChange={e => setBanForm(f => ({ ...f, ban_type: e.target.value }))}
                        style={{ accentColor: type === 'permanent' ? '#ef4444' : '#f97316' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: type === 'permanent' ? '#dc2626' : '#ea580c', textTransform: 'capitalize' }}>
                          {type === 'temporary' ? '⏱ Temporary' : '🔒 Permanent'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {type === 'temporary' ? 'Expires after X days' : 'No expiry date'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration (only for temporary) */}
              {banForm.ban_type === 'temporary' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '8px' }}>
                    Duration (days)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[1, 3, 7, 14, 30].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBanForm(f => ({ ...f, duration_days: d }))}
                        style={{
                          padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                          border: `2px solid ${banForm.duration_days === d ? '#f97316' : 'var(--border)'}`,
                          background: banForm.duration_days === d ? '#fff7ed' : '#f8fafc',
                          color: banForm.duration_days === d ? '#ea580c' : 'var(--text-secondary)'
                        }}
                      >{d}d</button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={banForm.duration_days}
                      onChange={e => setBanForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 1 }))}
                      style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}
                      placeholder="Custom"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '8px' }}>
                  Reason <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(sent in email)</span>
                </label>
                <textarea
                  rows={3}
                  className="form-input"
                  placeholder="Describe why this user is being banned…"
                  value={banForm.reason}
                  onChange={e => setBanForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowBanModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', fontWeight: 700 }}
                  disabled={actionLoading === `user-ban-${selectedUserId}`}
                >
                  {actionLoading === `user-ban-${selectedUserId}` ? '⏳ Banning...' : `🚫 Ban ${banForm.ban_type === 'temporary' ? `for ${banForm.duration_days}d` : 'Permanently'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Funds Modal ── */}
      {addFundsModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }} onClick={(e) => { if (e.target === e.currentTarget) setAddFundsModal(prev => ({ ...prev, open: false })); }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>💵 Add Funds</h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem' }}>
                  User: <strong>{addFundsModal.userName}</strong>
                </p>
              </div>
              <button onClick={() => setAddFundsModal(prev => ({ ...prev, open: false }))} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <form onSubmit={submitAddUserFunds} style={{ padding: '28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '8px' }}>Select Campaign (Optional)</label>
                <select 
                  className="form-input" 
                  value={addFundsModal.selectedCampaign} 
                  onChange={e => setAddFundsModal(f => ({ ...f, selectedCampaign: e.target.value }))}
                >
                  <option value="">-- Create new adjustment campaign --</option>
                  {addFundsModal.campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>If no campaign is selected, the system will automatically create a general balance adjustment campaign for them.</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-700)', marginBottom: '8px' }}>Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="e.g. 50.00"
                  value={addFundsModal.amount}
                  onChange={e => setAddFundsModal(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddFundsModal(prev => ({ ...prev, open: false }))}>
                  Cancel
                </button>
                <button type="submit" className="btn" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700 }} disabled={actionLoading === `user-funds-${addFundsModal.userId}`}>
                  {actionLoading === `user-funds-${addFundsModal.userId}` ? '⏳ Adding...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
