import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI, userAPI, withdrawalAPI } from '../services/api';

const TABS = [
  { key: 'profile', label: '👤 Profile', icon: '👤' },
  { key: 'campaigns', label: '📢 My Campaigns', icon: '📢' },
  { key: 'withdrawals', label: '💸 Withdrawals', icon: '💸' },
  { key: 'kyc', label: '🛡️ Identity (KYC)', icon: '🛡️' },
];

export default function CreatorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  
  const [campaigns, setCampaigns] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [userData, setUserData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Withdrawal Form State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    campaign_id: '', amount: '', bank_name: '', account_number: '', account_name: ''
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setMessage({ type: '', text: '' });

    const fetchData = async () => {
      try {
        if (tab === 'campaigns') {
          const res = await campaignAPI.getMyCampaigns();
          setCampaigns(res.data.data);
        } else if (tab === 'withdrawals') {
          const [withRes, campRes] = await Promise.all([
            withdrawalAPI.getMyWithdrawals(),
            campaignAPI.getMyCampaigns()
          ]);
          setWithdrawals(withRes.data.data);
          setCampaigns(campRes.data.data.filter(c => parseFloat(c.current_amount) > 0));
        } else if (tab === 'kyc' || tab === 'profile') {
          const res = await userAPI.getMe();
          setUserData(res.data.data);
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tab, user]);

  const handleKycSubmit = async () => {
    try {
      setLoading(true);
      const res = await userAPI.submitKyc();
      setUserData(res.data.data);
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit KYC.' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await withdrawalAPI.request(withdrawForm);
      setMessage({ type: 'success', text: 'Withdrawal requested successfully.' });
      setShowWithdrawForm(false);
      setWithdrawForm({ campaign_id: '', amount: '', bank_name: '', account_number: '', account_name: '' });
      // Refresh list
      const res = await withdrawalAPI.getMyWithdrawals();
      setWithdrawals(res.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to request withdrawal.' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ background: 'var(--bg-secondary)' }} id="creator-dashboard">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--slate-800)' }}>
            Creator Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            Manage your campaigns, withdraw funds, and verify your identity.
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

        {loading && <div className="spinner" />}

        {!loading && (
          <>
            {/* ── Profile Tab ── */}
            {tab === 'profile' && userData && (
              <div className="animate-in">
                <div className="card">
                  <div className="card-body">
                    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)', marginBottom: '24px' }}>My Profile</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Full Name</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--slate-800)' }}>{userData.name}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Email Address</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--slate-800)' }}>{userData.email}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Account Type</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                          <span className="badge badge-category">{userData.role.toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>Member Since</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--slate-800)' }}>
                          {new Date(userData.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Campaigns Tab ── */}
            {tab === 'campaigns' && (
              <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>My Campaigns</h2>
                  <Link to="/campaigns/create" className="btn btn-primary">Start New Campaign</Link>
                </div>

                {campaigns.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center' }}>
                    <div className="card-body" style={{ padding: '60px 20px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>No campaigns yet</h3>
                      <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>Create your first campaign to start raising funds.</p>
                      <Link to="/campaigns/create" className="btn btn-secondary">Start a Campaign</Link>
                    </div>
                  </div>
                ) : (
                  campaigns.map(c => (
                    <div key={c.id} className="card" style={{ marginBottom: '16px' }}>
                      <div className="card-body" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                              <span className="badge badge-category">{c.category}</span>
                              <span className={`badge ${c.status === 'active' ? 'badge-success' : c.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {c.status}
                              </span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', marginBottom: '6px' }}>{c.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.description}
                            </p>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              <span><strong>Raised:</strong> ${Number(c.current_amount).toLocaleString()}</span>
                              <span><strong>Goal:</strong> ${Number(c.goal_amount).toLocaleString()}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {c.status === 'active' && (
                              <Link to={`/campaigns/${c.id}`} className="btn btn-secondary btn-sm">View Public</Link>
                            )}
                            <button className="btn btn-primary btn-sm" onClick={() => alert('Edit feature coming soon!')}>Edit</button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>Withdrawals</h2>
                  {!showWithdrawForm && campaigns.length > 0 && (
                    <button className="btn btn-primary" onClick={() => setShowWithdrawForm(true)}>Request Payout</button>
                  )}
                </div>

                {showWithdrawForm && (
                  <div className="card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="card-body">
                      <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Request Payout</h3>
                      <form onSubmit={handleWithdrawSubmit}>
                        <div className="form-group">
                          <label className="form-label">Select Campaign</label>
                          <select className="form-input" required value={withdrawForm.campaign_id} onChange={e => setWithdrawForm({...withdrawForm, campaign_id: e.target.value})}>
                            <option value="">-- Choose Campaign --</option>
                            {campaigns.map(c => (
                              <option key={c.id} value={c.id}>{c.title} (Available: ${Number(c.current_amount).toLocaleString()})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Amount ($)</label>
                          <input type="number" className="form-input" required min="1" step="0.01" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Bank Name</label>
                          <input type="text" className="form-input" required value={withdrawForm.bank_name} onChange={e => setWithdrawForm({...withdrawForm, bank_name: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Account Number</label>
                          <input type="text" className="form-input" required value={withdrawForm.account_number} onChange={e => setWithdrawForm({...withdrawForm, account_number: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Account Name</label>
                          <input type="text" className="form-input" required value={withdrawForm.account_name} onChange={e => setWithdrawForm({...withdrawForm, account_name: e.target.value})} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" className="btn btn-success">Submit Request</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setShowWithdrawForm(false)}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {withdrawals.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No withdrawal requests found.</p>
                ) : (
                  <div className="card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Campaign</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map(w => (
                          <tr key={w.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                              {new Date(w.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{w.campaign_title}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--emerald-600)', fontWeight: 700 }}>${Number(w.amount).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span className={`badge ${w.status === 'approved' ? 'badge-success' : w.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                {w.status}
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

            {/* ── KYC Tab ── */}
            {tab === 'kyc' && userData && (
              <div className="animate-in">
                <div className="card">
                  <div className="card-body">
                    <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)', marginBottom: '16px' }}>Identity Verification (KYC)</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                      To prevent fraud and ensure trust, all creators must verify their identity before their campaigns can go live or withdraw funds.
                    </p>

                    <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>Current Status</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your current KYC verification state.</div>
                      </div>
                      <span className={`badge ${userData.kyc_status === 'verified' ? 'badge-success' : userData.kyc_status === 'pending' ? 'badge-warning' : userData.kyc_status === 'rejected' ? 'badge-danger' : 'badge-category'}`} style={{ fontSize: '1rem', padding: '6px 12px' }}>
                        {userData.kyc_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {(userData.kyc_status === 'not_submitted' || userData.kyc_status === 'rejected') && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Submit Documents</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                          For this platform version, you can automatically submit your KYC for review. In a full production environment, this would require ID document uploads.
                        </p>
                        <button className="btn btn-primary" onClick={handleKycSubmit}>
                          Submit KYC for Review
                        </button>
                      </div>
                    )}
                    
                    {userData.kyc_status === 'pending' && (
                      <div className="alert alert-warning">
                        Your documents are currently being reviewed by our admin team. This usually takes 24-48 hours.
                      </div>
                    )}

                    {userData.kyc_status === 'verified' && (
                      <div className="alert alert-success">
                        Your identity has been fully verified! You can now launch campaigns and withdraw funds.
                      </div>
                    )}
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
