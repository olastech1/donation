import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // email-not-verified state
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setResent(false);
    setLoading(true);
    try {
      const result = await login(email, password);
      const role = result?.data?.user?.role;
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'EMAIL_NOT_VERIFIED') {
        // Show inline resend prompt instead of generic error
        setUnverifiedEmail(data.email || email);
      } else {
        setError(data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification(unverifiedEmail);
    } catch {
      // silent
    } finally {
      setResending(false);
      setResent(true);
    }
  };

  return (
    <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="tracking-card animate-in" id="login-page">
        <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>Sign in to manage your campaigns</p>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Email not verified banner */}
        {unverifiedEmail && (
          <div style={{
            marginBottom: '20px', padding: '16px 20px',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)'
          }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#92400e' }}>
              📧 Email not verified
            </p>
            <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#78350f' }}>
              You need to verify your email before logging in. Check your inbox at <strong>{unverifiedEmail}</strong>.
            </p>
            {resent ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803d', fontWeight: 600 }}>
                ✅ Verification email resent! Please check your inbox.
              </p>
            ) : (
              <button
                className="btn btn-sm"
                style={{ background: '#d97706', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending...' : '🔄 Resend verification email'}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required id="login-email" />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              className="form-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              id="login-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} id="login-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
