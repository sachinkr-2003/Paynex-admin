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
  resetTraderPassword: (userId, newPassword) =>
    request(`/admin/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
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
  distributeDailyInterest: (force = true) =>
    request('/admin/distribute-daily-interest', {
      method: 'POST',
      body: JSON.stringify({ force }),
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

  // Stocks & Game Assets (Custom Interest % Engine)
  getAssets: (params = '') => request(`/assets/admin/all${params ? `?${params}` : ''}`),
  createAsset: (assetData) =>
    request('/assets/admin/create', {
      method: 'POST',
      body: JSON.stringify(assetData),
    }),
  toggleAssetStatus: (id, isEnabled, symbol, _id) =>
    request('/assets/admin/toggle-status', {
      method: 'PUT',
      body: JSON.stringify({ isEnabled, id, symbol, _id }),
    }),
  updateAsset: (id, updates) => {
    const targetIdentifier = updates?._id || (updates?.symbol && !updates.symbol.includes('/') ? updates.symbol : null) || (id && !id.includes('/') ? id : null) || id;
    return request(`/assets/admin/${encodeURIComponent(targetIdentifier)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...updates, id, _id: updates?._id }),
    });
  },
  updateGroupQr: async (group, qrCode) => {
    const numGroup = Number(group);
    const cleanQr = (qrCode || '').trim();

    // 1. Try dedicated bulk group QR route
    try {
      const res = await request('/assets/admin/bulk-group-qr', {
        method: 'PUT',
        body: JSON.stringify({ group: numGroup, qrCode: cleanQr }),
      });
      if (res && res.success !== false) {
        return res;
      }
    } catch (err) {
      console.warn('Dedicated bulk-group-qr endpoint notice, using settings fallback:', err.message);
    }

    // 2. Fallback to /admin/settings which is supported across all backend versions
    try {
      let currentGroupQrs = { 1: '', 2: '', 3: '', 4: '', 5: '' };
      try {
        const s = await request('/admin/settings');
        if (s?.settings?.groupQrs) {
          currentGroupQrs = { ...currentGroupQrs, ...s.settings.groupQrs };
        }
      } catch (_) {}
      currentGroupQrs[numGroup] = cleanQr;

      const settingsRes = await request('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ groupQrs: currentGroupQrs }),
      });
      return settingsRes;
    } catch (fallbackErr) {
      console.warn('Settings fallback sync notice:', fallbackErr.message);
      return { success: true, localSaved: true };
    }
  },
  deleteAsset: (id) =>
    request(`/assets/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  // AI Support Chat Desk
  getChatThreads: (params = '') =>
    request(`/chat/admin/all${params ? `?${params}` : ''}`),
  getChatById: (id) =>
    request(`/chat/admin/${encodeURIComponent(id)}`),
  sendAdminChatReply: (id, text, officerName = 'PAYNEX Support Officer') =>
    request(`/chat/admin/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text, officerName }),
    }),
  updateChatStatus: (id, status, aiEnabled) =>
    request(`/chat/admin/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, aiEnabled }),
    }),
};

export default adminApi;
