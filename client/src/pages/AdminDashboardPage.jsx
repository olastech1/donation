import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const TABS = [
  { key: 'overview', label: '📊 Overview', icon: '📊' },
  { key: 'campaigns', label: '📋 Pending Campaigns', icon: '📋' },
  { key: 'withdrawals', label: '💸 Withdrawals', icon: '💸' },
  { key: 'settings', label: '⚙️ Settings', icon: '⚙️' },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

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
          const res = await adminAPI.getPending();
          setPending(res.data.data);
        } else if (tab === 'withdrawals') {
          const res = await adminAPI.getWithdrawals();
          setWithdrawals(res.data.data);
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
      setPending(prev => prev.filter(c => c.id !== id));
      setMessage({ type: 'success', text: `Campaign ${action}d successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to ${action} campaign.` });
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

  const handleSettingUpdate = async (key, value) => {
    try {
      await adminAPI.updateSetting(key, value);
      setMessage({ type: 'success', text: `"${key}" updated successfully.` });
      // Refresh settings
      const res = await adminAPI.getSettings();
      setSettings(res.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update "${key}".` });
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
                          📋 Review Pending Campaigns ({stats.campaigns?.pending || 0})
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('withdrawals')}>
                          💸 Process Withdrawals
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={() => setTab('settings')}>
                          ⚙️ Manage Stripe Keys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Pending Campaigns Tab ── */}
            {tab === 'campaigns' && (
              <div className="animate-in">
                {pending.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>All caught up!</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>No campaigns pending review.</p>
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
                              <span className="badge badge-warning">Pending</span>
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
                              Goal: ${Number(c.goal_amount).toLocaleString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
                          </div>
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

            {/* ── Settings Tab ── */}
            {tab === 'settings' && (
              <div className="animate-in">
                <div className="card" style={{ marginBottom: '24px' }}>
                  <div className="card-body" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--slate-800)' }}>
                      Stripe Integration
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      Update your Stripe API keys without touching the codebase. Keys are stored encrypted.
                    </p>

                    {settings.filter(s => s.is_encrypted).map(s => (
                      <SettingField
                        key={s.setting_key}
                        setting={s}
                        onSave={handleSettingUpdate}
                      />
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-body" style={{ padding: '24px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--slate-800)' }}>
                      Platform Settings
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                      General configuration for Donate Plea.
                    </p>

                    {settings.filter(s => !s.is_encrypted).map(s => (
                      <SettingField
                        key={s.setting_key}
                        setting={s}
                        onSave={handleSettingUpdate}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
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
