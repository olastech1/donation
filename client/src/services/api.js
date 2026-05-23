import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// --- Campaigns ---
export const campaignAPI = {
  list: (params) => api.get('/campaigns', { params }),
  getStats: () => api.get('/campaigns/stats/platform'),
  getById: (id) => api.get(`/campaigns/${id}`),
  getDonors: (id, params) => api.get(`/campaigns/${id}/donors`, { params }),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  getMyCampaigns: () => api.get('/campaigns/me/all'),
};

// --- Users ---
export const userAPI = {
  getMe: () => api.get('/auth/me'),
  submitKyc: (data) => api.post('/users/kyc', data),
  createStripeKycSession: () => api.post('/users/kyc/stripe-session'),
  syncStripeKycSession: (sessionId) => api.get(`/users/kyc/stripe-sync?session_id=${sessionId}`),
};

// --- Withdrawals ---
export const withdrawalAPI = {
  request: (data) => api.post('/withdrawals', data),
  getMyWithdrawals: () => api.get('/withdrawals/me'),
};

// --- Donations (Stripe) ---
export const donationAPI = {
  initiate: (data) => api.post('/donations/initiate', data),
  track: (sessionId) => api.get(`/donations/track/${sessionId}`),
  callback: (sessionId) => api.get(`/donations/callback?session_id=${sessionId}`),
  getRecent: () => api.get('/donations/recent'),
};

// --- Updates ---
export const updateAPI = {
  list: (campaignId) => api.get(`/updates/${campaignId}`),
  create: (campaignId, data) => api.post(`/updates/${campaignId}`, data),
};

// --- Admin ---
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPending: () => api.get('/admin/campaigns/pending'),
  getAllCampaigns: () => api.get('/admin/campaigns'),
  approve: (id) => api.put(`/admin/campaigns/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/campaigns/${id}/reject`, { reason }),
  deleteCampaign: (id) => api.delete(`/admin/campaigns/${id}`),
  toggleCampaign: (id) => api.put(`/admin/campaigns/${id}/toggle`),
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  approveWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/reject`),
  getAllKyc: () => api.get('/admin/kyc/all'),
  approveKyc: (id) => api.put(`/admin/kyc/${id}/approve`),
  rejectKyc: (id) => api.put(`/admin/kyc/${id}/reject`),
  getStats: () => api.get('/admin/stats'),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  getStripeStatus: () => api.get('/admin/settings/stripe-status'),
  testEmail: (data) => api.post('/admin/settings/test-email', data),
  getDonations: () => api.get('/admin/donations'),
  verifyPendingDonations: () => api.post('/admin/donations/verify-pending'),
  deleteDonation: (id) => api.delete(`/admin/donations/${id}`),
  toggleSeoVisibility: (id) => api.put(`/admin/campaigns/${id}/seo`),
  addFunds: (id, amount) => api.post(`/admin/campaigns/${id}/add-funds`, { amount }),
  addUserFunds: (id, amount, campaign_id = null) => api.post(`/admin/users/${id}/add-funds`, { amount, campaign_id }),
  banUser: (id, data) => api.post(`/admin/users/${id}/ban`, data),
  unbanUser: (id) => api.post(`/admin/users/${id}/unban`),
};

export default api;
