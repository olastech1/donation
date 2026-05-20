import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import GuestCheckoutForm from '../components/donations/GuestCheckoutForm';
import { campaignAPI, updateAPI } from '../services/api';

export default function CampaignPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [donors, setDonors] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('story');

  useEffect(() => {
    Promise.all([
      campaignAPI.getById(id),
      campaignAPI.getDonors(id),
      updateAPI.list(id)
    ]).then(([campRes, donorRes, updRes]) => {
      setCampaign(campRes.data.data);
      setDonors(donorRes.data.data);
      setUpdates(updRes.data.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Inject / remove noindex meta tag based on seo_visible
  // (must be here, before any conditional returns, to follow Rules of Hooks)
  useEffect(() => {
    if (!campaign) return;
    const existingTag = document.querySelector('meta[name="robots"][data-campaign]');
    if (campaign.seo_visible === false) {
      if (!existingTag) {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex,nofollow';
        meta.setAttribute('data-campaign', 'true');
        document.head.appendChild(meta);
      }
    } else {
      existingTag?.remove();
    }
    return () => document.querySelector('meta[name="robots"][data-campaign]')?.remove();
  }, [campaign]);

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!campaign) return <div className="page container"><h2>Campaign not found</h2></div>;

  const progress = campaign.goal_amount > 0
    ? Math.min(100, (campaign.current_amount / campaign.goal_amount) * 100).toFixed(1)
    : 0;

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600000);
    return hours > 0 ? `${hours}h ago` : 'Just now';
  };

  return (
    <div className="campaign-detail">
      <div className="container">
        {/* Hero: Cover Image with title overlaid */}
        <div style={{ position: 'relative', marginBottom: '0', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
          {campaign.cover_image_url ? (
            <img
              src={campaign.cover_image_url}
              alt={campaign.title}
              style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '320px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }} />
          )}

          {/* Dark gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
            padding: '60px 24px 24px'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                {campaign.category}
              </span>
              {campaign.status === 'active' && (
                <span style={{ background: 'rgba(74,222,128,0.25)', color: '#4ade80', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                  active
                </span>
              )}

            </div>
            <h1 style={{ color: '#ffffff', fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.5)', fontFamily: 'var(--font-display)' }}>
              {campaign.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', margin: 0 }}>
              by <strong style={{ color: '#fff' }}>{campaign.creator_name}</strong> · {timeAgo(campaign.created_at)}
            </p>
          </div>
        </div>

        <div className="campaign-layout">
          {/* Left: Content */}
          <div>

            {/* Circular Progress & CTA Block */}
            <div style={{ margin: '24px 0', padding: '0', background: 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                {/* Circular Progress */}
                <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4ade80" strokeWidth="4" strokeDasharray={`${progress}, 100`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {Math.round(progress)}%
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    ${Number(campaign.current_amount).toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600 }}>raised</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500, marginBottom: '8px' }}>
                    of ${Number(campaign.goal_amount).toLocaleString()} USD
                  </div>
                  {donors.length > 0 && (
                    <div 
                      onClick={() => setTab('donors')}
                      style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {donors[0].donor_name || 'Anonymous'} donated ${Number(donors[0].amount).toLocaleString()} <span style={{ color: '#94a3b8', marginLeft: '4px' }}>›</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => document.querySelector('.checkout-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  style={{ flex: 1, padding: '16px', borderRadius: '30px', border: 'none', background: '#bbf7d0', color: '#166534', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Donate
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Campaign link copied to clipboard!');
                  }}
                  style={{ flex: 1, padding: '16px', borderRadius: '30px', border: 'none', background: '#166534', color: '#ffffff', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Share
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', margin: '32px 0 24px', borderBottom: '1px solid var(--border)' }}>
              {['story', 'updates', 'donors'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s'
                }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)} {t === 'donors' ? `(${campaign.donor_count || 0})` : t === 'updates' ? `(${updates.length})` : ''}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === 'story' && (
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {campaign.description}
              </div>
            )}

            {tab === 'updates' && (
              updates.length > 0 ? updates.map(u => (
                <div key={u.id} className="card" style={{ marginBottom: '16px' }}>
                  <div className="card-body">
                    {u.title && <h4 style={{ marginBottom: '6px' }}>{u.title}</h4>}
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{u.message}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>{timeAgo(u.created_at)}</p>
                  </div>
                </div>
              )) : <p style={{ color: 'var(--text-muted)' }}>No updates yet.</p>
            )}

            {tab === 'donors' && (
              donors.length > 0 ? donors.map(d => (
                <div key={d.id} className="donor-item">
                  <div>
                    <div className="donor-name">{d.donor_name || 'Anonymous'}</div>
                    <div className="donor-time">{timeAgo(d.created_at)}</div>
                  </div>
                  <div className="donor-amount">${Number(d.amount).toLocaleString()}</div>
                </div>
              )) : <p style={{ color: 'var(--text-muted)' }}>Be the first to donate!</p>
            )}
          </div>

          {/* Right: Sticky Donation Box */}
          <div className="checkout-container">
            <GuestCheckoutForm campaignId={campaign.id} campaignTitle={campaign.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
