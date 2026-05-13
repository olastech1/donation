import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../components/campaigns/CampaignCard';
import { campaignAPI, donationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tracking State
  const [trackId, setTrackId] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await donationAPI.track(trackId.trim());
      // The API returns an object like { donation, campaign, updates }
      // We will extract what we need to display it cleanly.
      setTrackResult(res.data.data);
    } catch (err) {
      setTrackError('Donation not found. Please verify your tracking ID and try again.');
    } finally {
      setTrackLoading(false);
    }
  };

  useEffect(() => {
    campaignAPI.list({ limit: 6 })
      .then(res => setCampaigns(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
      
    campaignAPI.getStats()
      .then(res => setStats(res.data.data))
      .catch(console.error);

    donationAPI.getRecent()
      .then(res => setRecentDonations(res.data.data))
      .catch(console.error);
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero" id="hero-section">
        <div className="container">
          <h1 className="animate-in">
            Every Plea<br />
            <span className="gradient-text">Deserves an Answer</span>
          </h1>
          <p className="animate-in" style={{ animationDelay: '0.1s' }}>
            A transparent crowdfunding platform where every dollar is tracked, 
            every campaign is verified, and no account is needed to make a difference.
          </p>
          <div className="hero-actions animate-in" style={{ animationDelay: '0.2s' }}>
            <Link to="/explore" className="btn btn-primary btn-lg">Explore Campaigns</Link>
            <Link to={user ? "/campaigns/create" : "/register"} className="btn btn-secondary btn-lg">Start a Campaign</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container">
        <div className="stats-bar animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="stat-item">
            <div className="stat-value">{stats ? `$${Number(stats.donations.total_raised).toLocaleString()}` : '...'}</div>
            <div className="stat-label">Total Raised</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats ? stats.campaigns.funded : '...'}</div>
            <div className="stat-label">Campaigns Funded</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats ? stats.donations.unique_donors : '...'}</div>
            <div className="stat-label">Donors Impacting Lives</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">100%</div>
            <div className="stat-label">Transparency</div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="container" style={{ padding: '60px 20px' }} id="featured-campaigns">
        <div className="section-header">
          <h2>Active Campaigns</h2>
          <p>Discover causes that need your support right now</p>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : campaigns.length > 0 ? (
          <div className="grid grid-3">
            {campaigns.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 0.1}s` }}>
                <CampaignCard campaign={c} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No active campaigns yet. Be the first to start one!
          </p>
        )}

        {campaigns.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/explore" className="btn btn-secondary">View All Campaigns →</Link>
          </div>
        )}
      </section>

      {/* Recent Donations */}
      {recentDonations.length > 0 && (
        <section className="container" style={{ padding: '40px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '60px' }}>
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <h2>Recent Donations</h2>
            <p>See the live impact from our generous community</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
            {recentDonations.map(d => (
              <div key={d.id} className="card animate-in" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {d.donor_name ? d.donor_name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.donor_name || 'Anonymous'}</div>
                    {d.campaign_status === 'active' && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>donated to <span style={{ color: 'var(--slate-800)', fontWeight: 500 }}>{d.campaign_title}</span></div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--emerald-600)', fontWeight: 'bold', fontSize: '1.2rem' }}>${Number(d.amount).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Track Transaction Widget */}
      <section className="container" style={{ padding: '40px 20px', marginBottom: '60px' }}>
        <div className="card animate-in" style={{ maxWidth: '700px', margin: '0 auto', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', border: '1px solid var(--slate-200)' }}>
          <div className="card-body" style={{ padding: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-800)', marginBottom: '8px' }}>Track Your Impact</h2>
              <p style={{ color: 'var(--text-muted)' }}>Enter your Donation ID or Stripe Session ID to track your payment status and see campaign updates.</p>
            </div>
            
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter Tracking ID (e.g., cs_test_...)" 
                value={trackId} 
                onChange={(e) => setTrackId(e.target.value)} 
                required 
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={trackLoading || !trackId.trim()}>
                {trackLoading ? 'Searching...' : 'Track'}
              </button>
            </form>

            {trackError && (
              <div style={{ padding: '12px', background: 'var(--rose-50)', color: 'var(--rose-600)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', textAlign: 'center' }}>
                {trackError}
              </div>
            )}

            {trackResult && (
              <div className="animate-in" style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-100)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--slate-800)', borderBottom: '1px solid var(--slate-100)', paddingBottom: '12px' }}>
                  Transaction Details
                </h4>
                <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span className={`badge ${trackResult.donation.status === 'success' ? 'badge-success' : trackResult.donation.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                      {trackResult.donation.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--slate-800)' }}>${Number(trackResult.donation.amount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                    <span style={{ color: 'var(--slate-800)' }}>{new Date(trackResult.donation.created_at).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Supported Campaign:</span>
                    <Link to={`/campaigns/${trackResult.campaign.id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {trackResult.campaign.title}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container" style={{ padding: '60px 20px 80px' }} id="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Three simple steps to make an impact</p>
        </div>
        <div className="grid grid-3">
          {[
            { icon: '🎯', title: 'Find a Cause', desc: 'Browse verified campaigns across medical, education, community, and more.' },
            { icon: '💳', title: 'Donate Instantly', desc: 'No account needed. Enter your amount, pay securely with Stripe, done.' },
            { icon: '📊', title: 'Track Your Impact', desc: 'Get a unique tracking link to see exactly how your donation is being used.' }
          ].map((step, i) => (
            <div key={i} className="card animate-in" style={{ animationDelay: `${i * 0.15}s`, textAlign: 'center' }}>
              <div className="card-body" style={{ padding: '32px 24px' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{step.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
