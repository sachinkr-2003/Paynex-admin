const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://paynex-backend-hsit.onrender.com/api';

/**
 * Universal request wrapper with error handling and optional auth token
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('paynex_admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

export const adminApi = {
  // Auth
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      localStorage.setItem('paynex_admin_token', res.token);
    }
    return res;
  },

  // Dashboard KPIs
  getDashboardKPIs: () => request('/admin/dashboard-kpis'),

  // Traders / Users
  getTraders: (params = '') => request(`/admin/users${params ? `?${params}` : ''}`),
  adjustTraderBalance: (userId, amount, type, note) =>
    request(`/admin/users/${userId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ amount, type, note }),
    }),
  updateTraderStatus: (userId, updates) =>
    request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Deposits
  getDeposits: (params = '') => request(`/admin/deposits${params ? `?${params}` : ''}`),
  approveDeposit: (id, note) =>
    request(`/admin/deposits/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }),
  rejectDeposit: (id, reason) =>
    request(`/admin/deposits/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  // Withdrawals
  getWithdrawals: (params = '') => request(`/admin/withdrawals${params ? `?${params}` : ''}`),
  releaseWithdrawal: (id, impsRef, note) =>
    request(`/admin/withdrawals/${id}/release`, {
      method: 'PUT',
      body: JSON.stringify({ impsRef, note }),
    }),
  rejectWithdrawal: (id, reason) =>
    request(`/admin/withdrawals/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  // Staking & Game Engine
  getLivePool: () => request('/staking/live-pool'),
  updateEngineRate: (profitPercent) =>
    request('/admin/engine/rate', {
      method: 'PUT',
      body: JSON.stringify({ profitPercent }),
    }),

  // Plans
  getPlans: () => request('/plans'),

  // Platform Settings
  getSettings: () => request('/admin/settings'),
  updateSettings: (settingsData) =>
    request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    }),
};

export default adminApi;
