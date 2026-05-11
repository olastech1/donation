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
  getMe: () => api.get('/users/me'),
  submitKyc: () => api.post('/users/kyc'),
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
  getPending: () => api.get('/admin/campaigns/pending'),
  approve: (id) => api.put(`/admin/campaigns/${id}/approve`),
  reject: (id, reason) => api.put(`/admin/campaigns/${id}/reject`, { reason }),
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  approveWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/reject`),
  getPendingKyc: () => api.get('/admin/kyc/pending'),
  approveKyc: (id) => api.put(`/admin/kyc/${id}/approve`),
  rejectKyc: (id) => api.put(`/admin/kyc/${id}/reject`),
  getStats: () => api.get('/admin/stats'),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  getStripeStatus: () => api.get('/admin/settings/stripe-status'),
  testEmail: (data) => api.post('/admin/settings/test-email', data),
  getDonations: () => api.get('/admin/donations'),
};

export default api;
