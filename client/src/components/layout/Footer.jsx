import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer" style={{ padding: '40px 20px', background: 'var(--slate-800)', color: '#fff', textAlign: 'center' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Donate Plea</p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/about" style={{ color: 'var(--slate-300)', textDecoration: 'none' }}>About Us</Link>
          <Link to="/contact" style={{ color: 'var(--slate-300)', textDecoration: 'none' }}>Contact</Link>
          <Link to="/privacy" style={{ color: 'var(--slate-300)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--slate-300)', textDecoration: 'none' }}>Terms & Conditions</Link>
          <Link to="/refund-policy" style={{ color: 'var(--slate-300)', textDecoration: 'none' }}>Refund & Cancellation Policy</Link>
        </div>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '16px' }}>
          © {new Date().getFullYear()} Donate Plea. Every plea deserves an answer.
        </p>
      </div>
    </footer>
  );
}
