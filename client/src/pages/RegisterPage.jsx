import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.resendVerification(email);
      setResent(true);
    } catch {
      // silent — always shows success per security design
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  // ── "Check your email" screen ──────────────────────────────
  if (registered) {
    return (
      <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="tracking-card animate-in" id="verify-prompt" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📬</div>
          <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px' }}>Check your inbox</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
            We sent a verification link to:
          </p>
          <p style={{
            fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem',
            marginBottom: '24px', wordBreak: 'break-all'
          }}>
            {email}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>

          {resent ? (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              ✅ A new verification email has been sent!
            </div>
          ) : (
            <button
              className="btn btn-secondary btn-block"
              onClick={handleResend}
              disabled={resending}
              style={{ marginBottom: '16px' }}
            >
              {resending ? 'Sending...' : '🔄 Resend verification email'}
            </button>
          )}

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Already verified? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────
  return (
    <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="tracking-card animate-in" id="register-page">
        <h1 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '8px' }}>Create Account</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '28px' }}>Start raising funds for causes that matter</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required id="register-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required id="register-email" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} id="register-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} id="register-submit">
            {loading ? 'Creating account...' : 'Get Started'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
