import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'medical',      label: '🏥 Medical' },
  { value: 'education',   label: '📚 Education' },
  { value: 'community',   label: '🏘️ Community' },
  { value: 'crisis_relief', label: '🆘 Crisis Relief' },
  { value: 'personal',    label: '👤 Personal' },
  { value: 'general',     label: '🌍 General' },
];

// ── Client-side image compression using Canvas API ────────────
// Resizes to max 1200×630 and converts to JPEG base64 (~50–150 KB)
function compressImage(file, maxWidth = 1200, maxHeight = 630, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate scaled dimensions
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreateCampaignPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', category: 'general', goal_amount: '',
    description: '', cover_image_url: '', deadline: ''
  });

  // Image state
  const [imagePreview, setImagePreview] = useState('');   // local blob URL for instant preview
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return <div className="page"><div className="spinner" /></div>;

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── File picked / dropped ─────────────────────────────────
  const handleFileSelect = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file (JPG, PNG, WebP, GIF).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImageError('Image must be under 15 MB.');
      return;
    }

    setImageError('');
    // Show instant local preview
    setImagePreview(URL.createObjectURL(file));

    // Compress in background
    setCompressing(true);
    try {
      const base64 = await compressImage(file);
      update('cover_image_url', base64);
    } catch {
      setImageError('Could not process this image. Please try another.');
      setImagePreview('');
    } finally {
      setCompressing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleRemove = () => {
    setImagePreview('');
    setImageError('');
    update('cover_image_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Step navigation ───────────────────────────────────────
  const goToStep2 = () => {
    if (!form.title || !form.goal_amount) {
      setError('Title and goal amount are required.');
    } else {
      setError(''); setStep(2);
    }
  };

  const goToStep3 = () => {
    if (!form.description) {
      setError('Please tell your story.');
    } else if (compressing) {
      setError('Please wait — image is still being processed.');
    } else {
      setError(''); setStep(3);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await campaignAPI.create({
        ...form,
        goal_amount: parseFloat(form.goal_amount),
        deadline: form.deadline || null,
      });
      navigate(`/campaigns/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setLoading(false);
    }
  };

  // ── Image drop zone ───────────────────────────────────────
  const ImageZone = () => (
    <div className="form-group">
      <label className="form-label">Cover Image (optional)</label>

      {imagePreview ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '12px' }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
          />

          {/* Compressing spinner overlay */}
          {compressing && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#fff'
            }}>
              <div className="spinner" style={{ width: '28px', height: '28px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Optimising image…</span>
            </div>
          )}

          {/* Hover controls */}
          {!compressing && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
            >
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ background: '#fff', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                🔄 Change
              </button>
              <button type="button" onClick={handleRemove}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                🗑 Remove
              </button>
            </div>
          )}

          {/* Size badge */}
          {!compressing && form.cover_image_url && (
            <div style={{
              position: 'absolute', bottom: '8px', right: '8px',
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '100px',
              backdropFilter: 'blur(4px)'
            }}>
              ✅ {Math.round(form.cover_image_url.length * 0.75 / 1024)} KB
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--slate-300)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '44px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(139,92,246,0.06)' : 'var(--slate-50)',
            transition: 'all 0.2s',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>🖼️</div>
          <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            {dragOver ? 'Drop it here!' : 'Click to upload or drag & drop'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            JPG · PNG · WebP · GIF · up to 15 MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileSelect(e.target.files[0])}
      />

      {imageError && (
        <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '6px' }}>⚠️ {imageError}</p>
      )}
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
        Images are compressed automatically — no storage account needed.
      </p>
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="page container" style={{ maxWidth: '700px', margin: '0 auto' }} id="create-campaign-page">
      <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>Start a Campaign</h1>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>Step {step} of 3</p>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: '4px', borderRadius: '100px',
            background: s <= step ? 'var(--accent)' : 'var(--slate-200)',
            transition: 'background 0.3s'
          }} />
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Step 1: Basics ── */}
      {step === 1 && (
        <div className="animate-in">
          <div className="form-group">
            <label className="form-label">Campaign Title *</label>
            <input type="text" className="form-input" value={form.title}
              onChange={e => update('title', e.target.value)} maxLength={150}
              placeholder="e.g., Help John get surgery" id="campaign-title" />
          </div>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  onClick={() => update('category', c.value)}
                  className={`amount-preset ${form.category === c.value ? 'active' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Funding Goal ($) *</label>
            <input type="number" className="form-input" placeholder="e.g., 500000"
              value={form.goal_amount} onChange={e => update('goal_amount', e.target.value)} min="1000" id="campaign-goal" />
          </div>
          <button className="btn btn-primary btn-block btn-lg" onClick={goToStep2}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Story + Image ── */}
      {step === 2 && (
        <div className="animate-in">
          <div className="form-group">
            <label className="form-label">Tell Your Story *</label>
            <textarea className="form-textarea" style={{ minHeight: '200px' }}
              placeholder="Share the details of why this campaign matters..."
              value={form.description} onChange={e => update('description', e.target.value)} />
          </div>

          <ImageZone />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-block" onClick={goToStep3} disabled={compressing}>
              {compressing ? '⏳ Processing image…' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <div className="animate-in">
          {form.cover_image_url && (
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px', boxShadow: 'var(--shadow-md)' }}>
              <img src={form.cover_image_url} alt="Campaign cover"
                style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Review Your Campaign</h3>
              <div className="tracking-detail-row">
                <span className="tracking-label">Title</span>
                <span className="tracking-value">{form.title}</span>
              </div>
              <div className="tracking-detail-row">
                <span className="tracking-label">Category</span>
                <span className="tracking-value">{form.category}</span>
              </div>
              <div className="tracking-detail-row">
                <span className="tracking-label">Goal</span>
                <span className="tracking-value">${Number(form.goal_amount).toLocaleString()}</span>
              </div>
              <div className="tracking-detail-row">
                <span className="tracking-label">Cover Image</span>
                <span className="tracking-value">{form.cover_image_url ? '✅ Uploaded' : '—  No image'}</span>
              </div>
              <div className="tracking-detail-row">
                <span className="tracking-label">Story</span>
                <span className="tracking-value" style={{ maxWidth: '300px', textAlign: 'right' }}>
                  {form.description.substring(0, 100)}{form.description.length > 100 ? '…' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deadline (optional)</label>
            <input type="date" className="form-input" value={form.deadline}
              onChange={e => update('deadline', e.target.value)} id="campaign-deadline" />
          </div>

          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            ⏳ Your campaign will be reviewed by an admin before going live.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading} id="campaign-submit">
              {loading ? 'Submitting…' : 'Submit Campaign 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
