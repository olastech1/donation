import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please check your email again.');
      return;
    }

    authAPI.verifyEmail(token)
      .then(res => {
        const { user, token: jwtToken } = res.data.data;
        // Auto-login the user
        loginWithToken(user, jwtToken);
        setStatus('success');
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate(user.role === 'admin' ? '/admin' : '/dashboard');
        }, 2500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, []);

  return (
    <div className="page container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="tracking-card animate-in" id="verify-email-page" style={{ textAlign: 'center' }}>

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: 'var(--font-display)' }}>Verifying your email…</h2>
            <p style={{ color: 'var(--text-muted)' }}>Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
            <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', color: '#15803d' }}>
              Email Verified!
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
              Your account is now active. Redirecting you to your dashboard…
            </p>
            <div style={{ marginTop: '16px' }}>
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
            </div>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>❌</div>
            <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', color: '#b91c1c' }}>
              Verification Failed
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{message}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <Link to="/register" className="btn btn-primary">
                Create a new account
              </Link>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Already have an account? <Link to="/login">Sign in</Link> to request a new verification link.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
