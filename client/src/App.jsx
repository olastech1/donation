import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import CampaignPage from './pages/CampaignPage';
import TrackingPage from './pages/TrackingPage';
import DonationCallbackPage from './pages/DonationCallbackPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/campaigns/:id" element={<CampaignPage />} />
          <Route path="/campaigns/create" element={<CreateCampaignPage />} />
          <Route path="/track/:sessionId" element={<TrackingPage />} />
          <Route path="/donation/callback" element={<DonationCallbackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/dashboard" element={<CreatorDashboardPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={
            <div className="page container" style={{ textAlign: 'center' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', marginBottom: '16px' }}>404</h1>
              <p style={{ color: 'var(--text-muted)' }}>This page doesn't exist.</p>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
