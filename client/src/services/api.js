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
};

// --- Campaigns ---
export const campaignAPI = {
  list: (params) => api.get('/campaigns', { params }),
  getById: (id) => api.get(`/campaigns/${id}`),
  getDonors: (id, params) => api.get(`/campaigns/${id}/donors`, { params }),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
};

// --- Donations (Stripe) ---
export const donationAPI = {
  initiate: (data) => api.post('/donations/initiate', data),
  track: (sessionId) => api.get(`/donations/track/${sessionId}`),
  callback: (sessionId) => api.get(`/donations/callback?session_id=${sessionId}`),
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
  getWithdrawals: () => api.get('/admin/withdrawals'),
  approveWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id) => api.put(`/admin/withdrawals/${id}/reject`),
  getStats: () => api.get('/admin/stats'),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  getStripeStatus: () => api.get('/admin/settings/stripe-status'),
};

export default api;
