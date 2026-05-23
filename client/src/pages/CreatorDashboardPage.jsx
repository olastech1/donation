import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { campaignAPI, userAPI, withdrawalAPI, updateAPI } from '../services/api';

const TABS = [
  { key: 'profile', label: '👤 Profile', icon: '👤' },
  { key: 'campaigns', label: '📢 My Campaigns', icon: '📢' },
  { key: 'withdrawals', label: '💸 Withdrawals', icon: '💸' },
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

  // Update Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeCampaignForUpdate, setActiveCampaignForUpdate] = useState(null);
  const [updateForm, setUpdateForm] = useState({ title: '', message: '' });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Withdrawal Form State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    campaign_id: '', amount: '', payout_method: 'bank', bank_name: '', account_number: '', account_name: '', crypto_network: 'USDT (TRC20)', crypto_address: ''
  });

  // Stripe Connect State
  const [stripeStatus, setStripeStatus] = useState(null);

  // KYC State
  const [kycLoading, setKycLoading] = useState(false);

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
          const [withRes, campRes, profileRes, stripeRes] = await Promise.all([
            withdrawalAPI.getMyWithdrawals(),
            campaignAPI.getMyCampaigns(),
            userAPI.getMe(),
            userAPI.getStripeConnectStatus()
          ]);
          setWithdrawals(withRes.data.data);
          setCampaigns(campRes.data.data.filter(c => parseFloat(c.current_amount) > 0));
          setUserData(profileRes.data.data);
          setStripeStatus(stripeRes.data);
        } else if (tab === 'profile') {
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

  const handleStartStripeKyc = async () => {
    try {
      setKycLoading(true);
      setMessage({ type: '', text: '' });
      const res = await userAPI.createStripeKycSession();
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to start Stripe Identity session.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to initialize verification.' });
    } finally {
      setKycLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setLoading(true);
      const res = await userAPI.createStripeConnectAccount();
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to start Stripe Connect session.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to initialize Stripe connection.' });
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
      setWithdrawForm({ campaign_id: '', amount: '', payout_method: 'bank', bank_name: '', account_number: '', account_name: '', crypto_network: 'USDT (TRC20)', crypto_address: '' });
      // Refresh list
      const res = await withdrawalAPI.getMyWithdrawals();
      setWithdrawals(res.data.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to request withdrawal.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!updateForm.message) return;
    setUpdateLoading(true);
    try {
      await updateAPI.create(activeCampaignForUpdate, updateForm);
      setMessage({ type: 'success', text: 'Campaign update posted successfully.' });
      setShowUpdateModal(false);
      setUpdateForm({ title: '', message: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to post update.' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const totalAvailable = campaigns.reduce((acc, c) => acc + parseFloat(c.available_balance || 0), 0);
  const totalPending = campaigns.reduce((acc, c) => acc + parseFloat(c.pending_balance || 0), 0);

  const getNextPayoutDateStr = () => {
    const now = new Date();
    let targetMonth = now.getMonth() + 1; // next month
    let targetYear = now.getFullYear();
    if (now.getDate() < 15) {
      // Releases on 15th of CURRENT month
      targetMonth = now.getMonth();
    }
    const nextDate = new Date(targetYear, targetMonth, 15);
    return nextDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
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
                              <button 
                                className="btn btn-primary btn-sm" 
                                onClick={() => {
                                  setActiveCampaignForUpdate(c.id);
                                  setShowUpdateModal(true);
                                }}
                              >
                                Post Update
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)' }}>Withdrawals</h2>
                  {!showWithdrawForm && campaigns.length > 0 && userData?.kyc_status === 'verified' && (
                    <button className="btn btn-primary" onClick={() => setShowWithdrawForm(true)}>Request Payout</button>
                  )}
                </div>

                {/* Balance Cards Summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '28px'
                }}>
                  {/* Available Balance Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 24px',
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Available to Withdraw
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-display)' }}>
                      ${totalAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🟢 Available & ready for payout</span>
                    </div>
                  </div>

                  {/* Pending Balance Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 24px',
                    color: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pending Balance
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', fontFamily: 'var(--font-display)' }}>
                      ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                      📅 Next Release: <strong>{getNextPayoutDateStr()}</strong>
                    </div>
                  </div>
                </div>

                {/* KYC Gate — shown when not verified and user has made $5 or more */}
                {userData && userData.kyc_status !== 'verified' && (totalAvailable + totalPending) >= 5 && (
                  <div style={{
                    marginBottom: '24px', padding: '24px',
                    background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                    border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)',
                    display: 'flex', gap: '16px', alignItems: 'flex-start'
                  }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>🛡️</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: '#92400e', margin: '0 0 6px' }}>
                        Identity Verification Required
                      </h3>
                      <p style={{ color: '#78350f', fontSize: '0.9rem', margin: '0 0 16px', lineHeight: 1.4 }}>
                        {userData.kyc_status === 'pending'
                          ? 'Your identity documents are under review. Withdrawals will be unlocked once your KYC is approved (usually 24–48 hours).'
                          : 'You have earned $5 or more! To comply with financial regulations and withdraw your funds, you must verify your identity using Stripe Identity.'}
                      </p>
                      {userData.kyc_status !== 'pending' && (
                        <button
                          onClick={handleStartStripeKyc}
                          disabled={kycLoading}
                          className="btn btn-primary"
                          style={{
                            background: 'linear-gradient(135deg, #d97706, #b45309)',
                            border: 'none',
                            padding: '10px 20px',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          {kycLoading ? 'Preparing session...' : '🔒 Verify with Stripe Identity'}
                        </button>
                      )}
                      {userData.kyc_status === 'pending' && (
                        <span style={{
                          display: 'inline-block', padding: '6px 14px',
                          background: '#fde68a', borderRadius: '20px',
                          fontWeight: 700, fontSize: '0.85rem', color: '#92400e'
                        }}>⏳ Review in Progress</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stripe Connect Section */}
                <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--slate-200)' }}>
                  <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px', color: 'var(--slate-800)', fontFamily: 'var(--font-display)' }}>Stripe Automated Payouts</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Connect your Stripe account to receive fast, automatic withdrawals directly to your bank.
                      </p>
                    </div>
                    <div>
                      {stripeStatus === null ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Checking status...</span>
                      ) : stripeStatus.connected ? (
                        <span className="badge badge-success" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>✅ Stripe Connected</span>
                      ) : (
                        <button 
                          className="btn btn-sm" 
                          style={{ background: '#6366f1', color: '#fff', fontWeight: 600 }}
                          onClick={handleConnectStripe}
                          disabled={loading}
                        >
                          🔗 Connect with Stripe
                        </button>
                      )}
                    </div>
                  </div>
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
                              <option key={c.id} value={c.id}>{c.title} (Available: ${Number(c.available_balance).toLocaleString()}, Pending: ${Number(c.pending_balance).toLocaleString()})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Amount ($) <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Min. $50)</span></label>
                          <input type="number" className="form-input" required min="50" step="0.01" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Payout Method</label>
                          <select className="form-input" required value={withdrawForm.payout_method} onChange={e => setWithdrawForm({...withdrawForm, payout_method: e.target.value})}>
                            <option value="bank">Manual Bank Transfer</option>
                            <option value="crypto">Cryptocurrency</option>
                            {stripeStatus?.connected && <option value="stripe">Stripe Auto-Payout (Fastest)</option>}
                          </select>
                        </div>

                        {withdrawForm.payout_method === 'bank' && (
                          <>
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
                          </>
                        )}
                        
                        {withdrawForm.payout_method === 'crypto' && (
                          <>
                            <div className="form-group">
                              <label className="form-label">Crypto Network</label>
                              <select className="form-input" required value={withdrawForm.crypto_network} onChange={e => setWithdrawForm({...withdrawForm, crypto_network: e.target.value})}>
                                <option value="USDT (TRC20)">USDT (TRC20) - Recommended (Low Fee)</option>
                                <option value="USDT (ERC20)">USDT (ERC20)</option>
                                <option value="Ethereum (ERC20)">Ethereum (ERC20)</option>
                                <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Wallet Address</label>
                              <input type="text" className="form-input" required placeholder="Enter public wallet address" value={withdrawForm.crypto_address} onChange={e => setWithdrawForm({...withdrawForm, crypto_address: e.target.value})} />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>⚠️ Double check your wallet address. Crypto transactions are completely irreversible.</span>
                            </div>
                          </>
                        )}
                        
                        {withdrawForm.payout_method === 'stripe' && (
                          <div style={{ padding: '16px', background: '#e0e7ff', borderRadius: '8px', color: '#3730a3', fontSize: '0.9rem', marginBottom: '16px' }}>
                            <strong>ℹ️ Note:</strong> Funds will be automatically disbursed to your connected Stripe account upon approval.
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
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
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payout Method & Details</th>
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
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                              {w.payout_method === 'crypto' ? (
                                <div>
                                  <span className="badge badge-category" style={{ background: '#e0f2fe', color: '#0369a1', marginRight: '6px' }}>🪙 Crypto ({w.crypto_network})</span>
                                  <code style={{ fontSize: '0.8rem', color: 'var(--slate-800)' }}>{w.crypto_address ? `${w.crypto_address.slice(0, 8)}...${w.crypto_address.slice(-6)}` : ''}</code>
                                </div>
                              ) : (
                                <div>
                                  <span className="badge badge-category" style={{ background: '#f1f5f9', color: '#475569', marginRight: '6px' }}>🏦 Bank</span>
                                  <span style={{ color: 'var(--text-muted)' }}>{w.bank_name} • {w.account_number}</span>
                                </div>
                              )}
                            </td>
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


          </>
        )}
      </div>

      {/* Post Update Modal */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="card animate-in" style={{ width: '100%', maxWidth: '500px', background: '#fff' }}>
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Post Campaign Update</h3>
              <form onSubmit={handlePostUpdate}>
                <div className="form-group">
                  <label className="form-label">Update Title (Optional)</label>
                  <input type="text" className="form-input" placeholder="e.g., We reached 50%!" value={updateForm.title} onChange={e => setUpdateForm({...updateForm, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Update Message *</label>
                  <textarea className="form-textarea" required rows="4" placeholder="Share your progress with donors..." value={updateForm.message} onChange={e => setUpdateForm({...updateForm, message: e.target.value})}></textarea>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={updateLoading || !updateForm.message}>
                    {updateLoading ? 'Posting...' : 'Post Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
