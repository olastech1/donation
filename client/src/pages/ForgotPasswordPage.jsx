import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await authAPI.forgotPassword({ email });
      setMessage({ type: 'success', text: res.data.message });
      setEmail('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
      <div className="card animate-in" style={{ maxWidth: '400px', width: '100%', margin: '40px 20px' }}>
        <div className="card-body" style={{ padding: '40px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--slate-800)', marginBottom: '8px' }}>Reset Password</h1>
            <p style={{ color: 'var(--text-muted)' }}>Enter your email to receive a reset link.</p>
          </div>

          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="you@example.com"
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '24px' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Remembered your password? </span>
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
