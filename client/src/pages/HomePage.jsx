import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CampaignCard from '../components/campaigns/CampaignCard';
import { campaignAPI } from '../services/api';

export default function HomePage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignAPI.list({ limit: 6 })
      .then(res => setCampaigns(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
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
            <Link to="/register" className="btn btn-secondary btn-lg">Start a Campaign</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container">
        <div className="stats-bar animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="stat-item">
            <div className="stat-value">$12.4M</div>
            <div className="stat-label">Total Raised</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">348</div>
            <div className="stat-label">Campaigns Funded</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">5,200+</div>
            <div className="stat-label">Lives Impacted</div>
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
