import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setOpen(false);
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">💜 Donate Plea</Link>
        <button className="navbar-hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? '✕' : '☰'}
        </button>
        <ul className={`navbar-links ${open ? 'open' : ''}`}>
          <li><Link to="/explore" onClick={() => setOpen(false)}>Explore</Link></li>
          {user ? (
            <>
              {user.role === 'admin' ? (
                <li><Link to="/admin" onClick={() => setOpen(false)} style={{ color: 'var(--accent)', fontWeight: 600 }}>Admin</Link></li>
              ) : (
                <li><Link to="/dashboard" onClick={() => setOpen(false)} style={{ color: 'var(--accent)', fontWeight: 600 }}>Dashboard</Link></li>
              )}
              <li><Link to="/campaigns/create" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">Start Campaign</Link></li>
              <li><button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login" onClick={() => setOpen(false)}>Login</Link></li>
              <li><Link to="/register" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">Get Started</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
