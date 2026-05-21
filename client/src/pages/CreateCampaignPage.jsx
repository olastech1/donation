import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI, uploadAPI } from '../services/api';
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
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', category: 'general', goal_amount: '', description: '', cover_image_url: '', deadline: ''
  });

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return <div className="page"><div className="spinner" /></div>;

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // ── Image selection ───────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10 MB.');
      return;
    }
    setUploadError('');
    setImageFile(file);
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    // Clear any previously uploaded URL
    update('cover_image_url', '');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadError('');
    update('cover_image_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload to Cloudinary when moving from step 2 → 3 ─────
  const uploadImageIfNeeded = async () => {
    if (!imageFile) return true; // no file selected, that's fine
    setUploading(true);
    setUploadError('');
    try {
      const res = await uploadAPI.image(imageFile);
      const url = res.data.data.url;
      update('cover_image_url', url);
      setImageFile(null); // already uploaded
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'Image upload failed. Please try again.';
      setUploadError(msg);
      return false;
    } finally {
      setUploading(false);
    }
  };

  // ── Step navigation ───────────────────────────────────────
  const goToStep2 = () => {
    if (!form.title || !form.goal_amount) {
      setError('Title and goal amount are required.');
    } else {
      setError('');
      setStep(2);
    }
  };

  const goToStep3 = async () => {
    if (!form.description) {
      setError('Please tell your story.');
      return;
    }
    setError('');
    const ok = await uploadImageIfNeeded();
    if (ok) setStep(3);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await campaignAPI.create({
        ...form,
        goal_amount: parseFloat(form.goal_amount),
        deadline: form.deadline || null
      });
      navigate(`/campaigns/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setLoading(false);
    }
  };

  // ── Image Drop Zone component ─────────────────────────────
  const ImageDropZone = () => (
    <div className="form-group">
      <label className="form-label">Cover Image (optional)</label>

      {/* Preview */}
      {imagePreview ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '12px' }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
          />
          {/* Overlay buttons */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
            opacity: 0, transition: 'opacity 0.2s',
          }}
            className="image-preview-overlay"
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#fff', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Change
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
            >
              🗑 Remove
            </button>
          </div>
          {/* Filename badge */}
          <div style={{
            position: 'absolute', bottom: '10px', left: '10px',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px',
            backdropFilter: 'blur(4px)'
          }}>
            {imageFile?.name || 'Uploaded image'}
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--slate-300)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(139,92,246,0.05)' : 'var(--slate-50)',
            transition: 'all 0.2s',
            marginBottom: '12px',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🖼️</div>
          <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            {dragOver ? 'Drop it here!' : 'Click to upload or drag & drop'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            JPG, PNG, WebP, GIF · Max 10 MB
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      {uploadError && (
        <div className="alert alert-error" style={{ marginTop: '8px', padding: '10px 14px', fontSize: '0.875rem' }}>
          {uploadError}
        </div>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
        A great cover image increases donation rates significantly.
      </p>
    </div>
  );

  return (
    <div className="page container" style={{ maxWidth: '700px', margin: '0 auto' }} id="create-campaign-page">
      <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>Start a Campaign</h1>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '40px' }}>Step {step} of 3</p>

      {/* Step indicator */}
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
            <input type="text" className="form-input" value={form.title} onChange={e => update('title', e.target.value)} maxLength={150} placeholder="e.g., Help John get surgery" />
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

          <ImageDropZone />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary btn-block" onClick={() => setStep(1)}>← Back</button>
            <button
              className="btn btn-primary btn-block"
              onClick={goToStep3}
              disabled={uploading}
            >
              {uploading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  Uploading image...
                </span>
              ) : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <div className="animate-in">
          {/* Cover image preview in review */}
          {form.cover_image_url && (
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px' }}>
              <img src={form.cover_image_url} alt="Campaign cover" style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-body">
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Review Your Campaign</h3>
              <div className="tracking-detail-row"><span className="tracking-label">Title</span><span className="tracking-value">{form.title}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Category</span><span className="tracking-value">{form.category}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Goal</span><span className="tracking-value">${Number(form.goal_amount).toLocaleString()}</span></div>
              <div className="tracking-detail-row"><span className="tracking-label">Cover Image</span><span className="tracking-value">{form.cover_image_url ? '✅ Uploaded' : '—'}</span></div>
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
