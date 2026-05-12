import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'medical', label: '🏥 Medical' },
  { value: 'education', label: '📚 Education' },
  { value: 'community', label: '🏘️ Community' },
  { value: 'crisis_relief', label: '🆘 Crisis Relief' },
  { value: 'personal', label: '👤 Personal' },
  { value: 'general', label: '🌍 General' },
];

export default function CreateCampaignPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', category: 'general', goal_amount: '', description: '', cover_image_url: '', deadline: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return <div className="page"><div className="spinner" /></div>;

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.title || !form.description || !form.goal_amount) {
      setError('Please fill in all required fields.'); return;
    }
    setLoading(true);
    try {
      const res = await campaignAPI.create({ ...form, goal_amount: parseFloat(form.goal_amount), deadline: form.deadline || null });
      navigate(`/campaigns/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container" style={{ maxWidth: '700px', margin: '0 auto' }} id="create-campaign-page">
      <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>Start a Campaign</h1>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>Step {step} of 3</p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: '4px', borderRadius: '100px', background: s <= step ? 'var(--accent)' : 'var(--slate-200)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="animate-in">
          <div className="form-group">
            <label className="form-label">Campaign Title *</label>
            <input type="text" className="form-input" value={form.title} onChange={e => update('title', e.target.value)} maxLength={150} />
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => update('category', c.value)}
                  className={`amount-preset ${form.category === c.value ? 'active' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Funding Goal ($) *</label>
            <input type="number" className="form-input" placeholder="e.g., 500000" value={form.goal_amount} onChange={e => update('goal_amount', e.target.value)} min="1000" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => { if (form.title && form.goal_amount) setStep(2); else setError('Title and goal amount are required.'); }}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Story */}
      {step === 2 && (
        <div className="animate-in">
          <div className="form-group">
            <label className="form-label">Tell Your Story *</label>
            <textarea className="form-textarea" style={{ minHeight: '200px' }} placeholder="Share the details of why this campaign matters..." value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Cover Image URL (optional)</label>
            <input type="url" className="form-input" placeholder="https://example.com/image.jpg" value={form.cover_image_url} onChange={e => update('cover_image_url', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-block" onClick={() => { if (form.description) setStep(3); else setError('Please tell your story.'); }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="animate-in">
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Review Your Campaign</h3>
              <div className="tracking-detail-row"><span className="tracking-label">Title</span><span className="tracking-value">{form.title}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Category</span><span className="tracking-value">{form.category}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Goal</span><span className="tracking-value">${Number(form.goal_amount).toLocaleString()}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Story</span><span className="tracking-value" style={{ maxWidth: '300px', textAlign: 'right' }}>{form.description.substring(0, 100)}...</span></div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input type="date" className="form-input" value={form.deadline} onChange={e => update('deadline', e.target.value)} />
          </div>
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            ⏳ Your campaign will be reviewed by an admin before going live.
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
