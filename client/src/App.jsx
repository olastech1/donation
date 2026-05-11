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
import CreateCampaignPage from './pages/CreateCampaignPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
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
          <Route path="/admin" element={<AdminDashboardPage />} />
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
