import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid or missing reset token.' });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await authAPI.resetPassword({ token, password });
      setMessage({ type: 'success', text: res.data.message });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)' }}>Invalid Link</h2>
          <p style={{ marginTop: '16px' }}>This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ marginTop: '24px' }}>Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
      <div className="card animate-in" style={{ maxWidth: '400px', width: '100%', margin: '40px 20px' }}>
        <div className="card-body" style={{ padding: '40px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--slate-800)', marginBottom: '8px' }}>Create New Password</h1>
            <p style={{ color: 'var(--text-muted)' }}>Please enter your new password below.</p>
          </div>

          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                minLength="6"
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                minLength="6"
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: '24px' }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
