import { useState, useEffect } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import {
  showAdminSuccess,
  showAdminError,
  showAdminWarning,
  showAdminConfirm,
  showToast as swalToast,
} from '../utils/swal';
import {
  FIFTY_STOCKS,
  getCompanyQrUrl,
  enrichStockWithPayment,
  GROUP_INFO,
  getStockGroup,
  getSavedGroupQrs,
  saveGroupQrToStorage,
  getSavedGroupInterestRates,
  saveGroupInterestRateToStorage,
} from '../data/stocksData';
import AssetIcon from '../components/AssetIcon';
import { TrendingUp, QrCode, Check, X, Edit, Trash2, Plus, Save, Ban, Upload, Layers } from 'lucide-react';

const QR_STORAGE_KEY = 'paynex_custom_stock_qrs';

const getSavedCustomQrs = () => {
  try {
    const raw = localStorage.getItem(QR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCustomQrToStorage = (assetKey, data) => {
  try {
    const existing = getSavedCustomQrs();
    existing[assetKey] = {
      ...(existing[assetKey] || {}),
      ...data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Storage save notice:', e);
  }
};

const mergeCustomQrsWithAssets = (assetList) => {
  const saved = getSavedCustomQrs();
  const groupQrs = getSavedGroupQrs();
  const groupRates = getSavedGroupInterestRates();
  return assetList.map((item, idx) => {
    const key = (item.id || item.symbol || '').toUpperCase();
    const symKey = (item.symbol || '').toUpperCase();
    const custom = saved[key] || saved[symKey] || (item.id ? saved[item.id] : null) || (item._id ? saved[item._id] : null);
    const grp = getStockGroup(item, idx);
    const groupQr = (groupQrs && groupQrs[grp]) ? groupQrs[grp].trim() : '';
    const groupRate = groupRates && groupRates[grp] ? Number(groupRates[grp]) : null;

    const effectiveQr = groupQr || custom?.qrCode || item.qrCode || '';
    const effectiveRate = groupRate || Number(custom?.returnPercent ?? item.returnPercent ?? 5);

    if (custom) {
      return {
        ...item,
        group: grp,
        isEnabled: custom.isEnabled !== undefined ? Boolean(custom.isEnabled) : (item.isEnabled !== false),
        upiId: custom.upiId !== undefined && custom.upiId.trim() ? custom.upiId : item.upiId,
        payeeName: custom.payeeName !== undefined && custom.payeeName.trim() ? custom.payeeName : item.payeeName,
        qrCode: effectiveQr,
        returnPercent: effectiveRate,
      };
    }
    return {
      ...item,
      group: grp,
      isEnabled: item.isEnabled !== false,
      qrCode: effectiveQr,
      returnPercent: effectiveRate,
    };
  });
};

export default function StocksManagerPage({ showToast, searchQuery = '' }) {
  const [assets, setAssets] = useState(() => mergeCustomQrsWithAssets(FIFTY_STOCKS.map(enrichStockWithPayment)));
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DISABLED'
  const [groupFilter, setGroupFilter] = useState('ALL'); // 'ALL' | 1 | 2 | 3 | 4 | 5
  const [groupQrs, setGroupQrs] = useState(getSavedGroupQrs);
  const [groupRates, setGroupRates] = useState(getSavedGroupInterestRates);
  const [groupUploading, setGroupUploading] = useState(null);
  const [groupRateSaving, setGroupRateSaving] = useState(null);

  // Modal State for Add / Edit Asset (Full CRUD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    group: 1,
    minStake: 100, // Min kitna ka le sakte ho
    returnPercent: 5, // Interest rate (strictly 2% to 12%)
    qrCode: '', // Payment QR Image (base64 or URL)
    payeeName: '',
    isEnabled: true,
  });

  // Dedicated QR Preview Modal State
  const [viewingQrAsset, setViewingQrAsset] = useState(null);

  // Fetch all assets from backend
  const fetchAssets = async () => {
    try {
      const res = await adminApi.getAssets();
      if (res && res.success && Array.isArray(res.assets) && res.assets.length > 0) {
        setAssets(mergeCustomQrsWithAssets(res.assets));
      }
      if (res && res.groupQrs) {
        setGroupQrs(res.groupQrs);
        try {
          localStorage.setItem('paynex_group_qrs', JSON.stringify(res.groupQrs));
        } catch (_) {}
      } else {
        // Fallback: check if settings has groupQrs
        try {
          const sRes = await adminApi.getSettings();
          if (sRes?.settings?.groupQrs) {
            setGroupQrs(sRes.settings.groupQrs);
            localStorage.setItem('paynex_group_qrs', JSON.stringify(sRes.settings.groupQrs));
          }
        } catch (_) {}
      }
      if (res && res.groupInterestRates) {
        setGroupRates(res.groupInterestRates);
        try {
          localStorage.setItem('paynex_group_interest_rates', JSON.stringify(res.groupInterestRates));
        } catch (_) {}
      } else {
        // Fallback: check if settings has groupInterestRates
        try {
          const sRes = await adminApi.getSettings();
          if (sRes?.settings?.groupInterestRates) {
            setGroupRates(sRes.settings.groupInterestRates);
            localStorage.setItem('paynex_group_interest_rates', JSON.stringify(sRes.settings.groupInterestRates));
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Assets fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Assets list
  const filteredAssets = assets.filter((item) => {
    if (statusFilter === 'ACTIVE' && item.isEnabled === false) return false;
    if (statusFilter === 'DISABLED' && item.isEnabled !== false) return false;
    const itemGroup = item.group || getStockGroup(item);
    if (groupFilter !== 'ALL' && Number(groupFilter) !== itemGroup) return false;
    const q = (searchQuery || '').toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.symbol && item.symbol.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
    );
  });

  // Handle 1-Click Bulk Group QR Upload
  const handleGroupQrUpload = async (groupNum, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showAdminWarning('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showAdminWarning('File Too Large', 'Please upload an image smaller than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const base64Url = uploadEvent.target?.result;
      if (!base64Url) return;

      try {
        setGroupUploading(groupNum);
        // 1. Save to local storage
        saveGroupQrToStorage(groupNum, base64Url);
        // Synchronize individual custom QR storage for this group so no conflicting override lingers
        try {
          const customQrs = getSavedCustomQrs();
          assets.forEach((a) => {
            const grp = getStockGroup(a);
            if (grp === groupNum) {
              const k1 = (a.id || '').toUpperCase();
              const k2 = (a.symbol || '').toUpperCase();
              if (k1 && customQrs[k1]) customQrs[k1].qrCode = base64Url;
              if (k2 && customQrs[k2]) customQrs[k2].qrCode = base64Url;
            }
          });
          localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(customQrs));
        } catch (_) {}

        // 2. Update local state optimistically
        setGroupQrs((prev) => ({ ...prev, [groupNum]: base64Url }));
        setAssets((prev) =>
          prev.map((a) => {
            const grp = getStockGroup(a);
            if (grp === groupNum) {
              return { ...a, qrCode: base64Url };
            }
            return a;
          })
        );
        // 3. Sync to backend API
        await adminApi.updateGroupQr(groupNum, base64Url);
        showAdminSuccess(
          `Group ${groupNum} QR Updated`,
          `Payment QR for all companies in Group ${groupNum} has been updated in 1-Click!`
        );
        fetchAssets();
      } catch (err) {
        showAdminError('Group QR Update Failed', err.message);
      } finally {
        setGroupUploading(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove Group QR
  const handleRemoveGroupQr = async (groupNum) => {
    const confirmed = await showAdminConfirm(
      `Remove Group ${groupNum} QR?`,
      `Are you sure you want to remove the custom QR for Group ${groupNum}? Companies in this group will revert to their individual default QR.`,
      'YES, REMOVE',
      'CANCEL'
    );
    if (!confirmed) return;

    try {
      saveGroupQrToStorage(groupNum, '');
      setGroupQrs((prev) => ({ ...prev, [groupNum]: '' }));
      await adminApi.updateGroupQr(groupNum, '');
      showAdminSuccess(`Group ${groupNum} QR Removed`, `Custom QR for Group ${groupNum} has been cleared.`);
      fetchAssets();
    } catch (err) {
      showAdminError('Remove QR Failed', err.message);
    }
  };

  // Handle 1-Click Group Interest Rate Change
  const handleGroupRateChange = async (groupNum, newRate) => {
    const cleanRate = Math.min(12, Math.max(2, Number(newRate) || 5));
    try {
      setGroupRateSaving(groupNum);
      // 1. Save to local storage
      saveGroupInterestRateToStorage(groupNum, cleanRate);
      // Synchronize individual custom storage for this group so no conflicting override lingers
      try {
        const customQrs = getSavedCustomQrs();
        assets.forEach((a) => {
          const grp = getStockGroup(a);
          if (grp === groupNum) {
            const k1 = (a.id || '').toUpperCase();
            const k2 = (a.symbol || '').toUpperCase();
            if (k1 && customQrs[k1]) customQrs[k1].returnPercent = cleanRate;
            if (k2 && customQrs[k2]) customQrs[k2].returnPercent = cleanRate;
          }
        });
        localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(customQrs));
      } catch (_) {}

      // 2. Update local state optimistically
      setGroupRates((prev) => ({ ...prev, [groupNum]: cleanRate }));
      setAssets((prev) =>
        prev.map((a) => {
          const grp = getStockGroup(a);
          if (grp === groupNum) {
            return { ...a, returnPercent: cleanRate };
          }
          return a;
        })
      );

      // 3. Sync to backend API
      await adminApi.updateGroupInterestRate(groupNum, cleanRate);
      showAdminSuccess(
        `Group ${groupNum} Interest Set to +${cleanRate}%`,
        `Daily return for all 12 companies in Group ${groupNum} has been updated to +${cleanRate}%!`
      );
      fetchAssets();
    } catch (err) {
      showAdminError('Group Interest Update Failed', err.message);
    } finally {
      setGroupRateSaving(null);
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      group: groupFilter !== 'ALL' ? Number(groupFilter) : 1,
      minStake: 100,
      returnPercent: 5,
      qrCode: '',
      payeeName: '',
      isEnabled: true,
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    setEditingAsset(item);
    const itemGroup = item.group || getStockGroup(item);
    const existingQr = item.qrCode || (item.symbol ? getCompanyQrUrl(item) : '');
    setFormData({
      name: item.name || '',
      group: itemGroup,
      minStake: Number(item.minStake) || 100,
      returnPercent: Math.min(12, Math.max(2, Number(item.returnPercent) || 5)),
      qrCode: item.qrCode || existingQr || '',
      payeeName: item.payeeName || `${item.name} Desk`,
      isEnabled: item.isEnabled !== false,
    });
    setIsModalOpen(true);
  };

  // Handle Custom QR Image File Upload
  const handleQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAdminWarning('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showAdminWarning('File Too Large', 'Please upload an image smaller than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result;
      if (base64Url) {
        setFormData((prev) => ({ ...prev, qrCode: base64Url }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save (Create or Update CRUD)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAdminWarning('Missing Name', 'Please enter a Stock Name.');
      return;
    }

    const cleanName = formData.name.trim();
    const cleanGroup = Number(formData.group) || 1;
    const cleanMinStake = Math.max(100, Number(formData.minStake) || 100);
    const cleanInterest = Math.min(12, Math.max(2, Number(formData.returnPercent) || 5));
    const cleanSym = cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase() || 'STOCK';
    const targetPayee = formData.payeeName.trim() || `${cleanName} Trading Desk`;
    const targetUpi = (editingAsset && editingAsset.upiId) ? editingAsset.upiId : '';

    const payload = {
      name: cleanName,
      group: cleanGroup,
      minStake: cleanMinStake,
      returnPercent: cleanInterest,
      upiId: targetUpi,
      payeeName: targetPayee,
      qrCode: formData.qrCode || '',
      isEnabled: Boolean(formData.isEnabled),
    };

    try {
      if (editingAsset) {
        // Update existing stock
        const key = (editingAsset.id || editingAsset.symbol || '').toUpperCase();
        saveCustomQrToStorage(key, payload);
        if (editingAsset._id) saveCustomQrToStorage(editingAsset._id, payload);

        await adminApi.updateAsset(editingAsset._id || editingAsset.symbol || editingAsset.id, {
          ...payload,
          _id: editingAsset._id,
          symbol: editingAsset.symbol,
        });

        setAssets((prev) =>
          prev.map((a) =>
            (a.id === editingAsset.id || a._id === editingAsset._id)
              ? { ...a, ...payload }
              : a
          )
        );
        showAdminSuccess('Stock Updated', `"${cleanName}" (Group ${cleanGroup}) updated: Min ₹${cleanMinStake}, Return +${cleanInterest}%.`);
      } else {
        // Create new stock
        const res = await adminApi.createAsset(payload);
        const createdAsset = res?.asset || {
          ...payload,
          id: `${cleanSym}/INR`,
          symbol: cleanSym,
          category: 'Stock',
          basePrice: cleanMinStake,
        };

        const key = (createdAsset.id || cleanSym).toUpperCase();
        saveCustomQrToStorage(key, payload);

        setAssets((prev) => [createdAsset, ...prev]);
        showAdminSuccess('New Stock Created', `"${cleanName}" added to Group ${cleanGroup} with +${cleanInterest}% interest!`);
      }

      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      showAdminError('Operation Failed', err.message);
    }
  };

  // Toggle Active / Disabled
  const handleToggleStatus = async (item) => {
    const currentEnabled = item.isEnabled !== false;
    const nextStatus = !currentEnabled;
    const key = (item.id || item.symbol || '').toUpperCase();

    // 1. Persist to localStorage for instant client-side sync across tabs
    saveCustomQrToStorage(key, { isEnabled: nextStatus });
    if (item.symbol) saveCustomQrToStorage(item.symbol.toUpperCase(), { isEnabled: nextStatus });
    if (item.id) saveCustomQrToStorage(item.id.toUpperCase(), { isEnabled: nextStatus });
    if (item._id) saveCustomQrToStorage(item._id, { isEnabled: nextStatus });

    // 2. Optimistic UI update
    setAssets((prev) =>
      prev.map((a) =>
        (a.id === item.id || a._id === item._id || (a.symbol && a.symbol === item.symbol))
          ? { ...a, isEnabled: nextStatus }
          : a
      )
    );

    // 3. Sync to backend API via dedicated toggle status endpoint
    try {
      const res = await adminApi.toggleAssetStatus(item.id, nextStatus, item.symbol, item._id);
      showAdminSuccess(
        nextStatus ? 'Stock Enabled' : 'Stock Disabled',
        `"${item.name}" is now ${nextStatus ? 'ACTIVE (visible in user app & portal)' : 'DISABLED (hidden & blocked from trading)'}.`
      );
      // Re-sync server stats and active counts
      fetchAssets();
    } catch (err) {
      console.error('Backend toggle status sync error:', err.message);
      // Revert optimistic update on failure
      setAssets((prev) =>
        prev.map((a) =>
          (a.id === item.id || a._id === item._id || (a.symbol && a.symbol === item.symbol))
            ? { ...a, isEnabled: currentEnabled }
            : a
        )
      );
      showAdminError('Toggle Status Failed', err.message || 'Could not update stock status in backend.');
    }
  };

  // Delete Stock (CRUD Delete)
  const handleDeleteAsset = async (item) => {
    const confirmed = await showAdminConfirm(
      `Delete "${item.name}"?`,
      `Are you sure you want to remove <strong>${item.name}</strong> (+${item.returnPercent}% interest) from the system?`,
      'YES, DELETE',
      'CANCEL'
    );
    if (!confirmed) return;

    try {
      await adminApi.deleteAsset(item.id || item._id);
      setAssets((prev) => prev.filter((a) => a.id !== item.id && a._id !== item._id));
      showAdminSuccess('Stock Deleted', `"${item.name}" has been removed from system.`);
    } catch (err) {
      showAdminError('Delete Failed', err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      { label: 'Stock Name', accessor: 'name' },
      { label: 'Min Buy Amount (INR)', accessor: (a) => `₹${a.minStake || 100}` },
      { label: 'Interest Rate (%)', accessor: (a) => `+${a.returnPercent}%` },
      { label: 'Payment QR', accessor: (a) => a.qrCode ? 'Custom QR' : 'Active QR' },
      { label: 'Payee Name', accessor: (a) => a.payeeName || 'N/A' },
      { label: 'Status', accessor: (a) => (a.isEnabled ? 'ACTIVE' : 'PAUSED') },
    ];
    exportToExcel('PAYNEX_Stocks_Management_Catalog', headers, filteredAssets);
    swalToast?.('Stocks catalog exported to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header Bar with Quick Action */}
      <div
        className="square-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} /> Stock & Investment Engine Manager
          </span>
          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: statusFilter === 'ALL' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.12)',
                background: statusFilter === 'ALL' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                color: statusFilter === 'ALL' ? '#f59e0b' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              All ({assets.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: statusFilter === 'ACTIVE' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
                background: statusFilter === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: statusFilter === 'ACTIVE' ? '#10b981' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Active ({assets.filter((a) => a.isEnabled !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DISABLED')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: statusFilter === 'DISABLED' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
                background: statusFilter === 'DISABLED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                color: statusFilter === 'DISABLED' ? '#ef4444' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Disabled ({assets.filter((a) => a.isEnabled === false).length})
            </button>
          </div>
          <span className="square-badge badge-gold">
            Interest Cap: 2% – 12%
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            className="square-btn-excel"
            style={{ height: '34px', fontSize: '12px' }}
          >
            Export to Excel
          </button>
          <button
            onClick={handleOpenCreate}
            className="square-btn-primary"
            style={{
              height: '34px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              fontWeight: 800,
              padding: '0 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)',
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            <span>Add New Stock</span>
          </button>
        </div>
      </div>

      {/* 2. 5-Group QR Code Bulk Manager (1-Click Update for 12 Companies each) */}
      <div
        className="square-card"
        style={{
          padding: '16px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.4))',
          border: '1.5px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#f59e0b" /> 5-Group Company Engine (1-Click Bulk QR & Group Interest Setup)
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              All 60 companies are divided into 5 groups (12 stocks each). Set Group QR and Interest Rate (+2% to +12%) here to apply to all 12 companies in that group at once!
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '4px' }}>
            ⚡ Live 1-Click Sync to Admin, User Web & Mobile APK
          </span>
        </div>

        {/* 5 Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
          }}
        >
          {[1, 2, 3, 4, 5].map((grpId) => {
            const info = GROUP_INFO[grpId];
            const grpQr = groupQrs[grpId];
            const groupStocks = assets.filter((a) => (a.group || getStockGroup(a)) === grpId);
            const isSelected = groupFilter === grpId;
            const isUploading = groupUploading === grpId;
            const isRateSaving = groupRateSaving === grpId;
            const currentRate = groupRates[grpId] || (groupStocks[0] ? Number(groupStocks[0].returnPercent) : 5);
            const previewUrl = grpQr || (groupStocks[0] ? getCompanyQrUrl(groupStocks[0]) : '');

            return (
              <div
                key={grpId}
                style={{
                  background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                  border: isSelected ? `1.5px solid ${info.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: info.color,
                        background: info.badgeBg,
                        border: `1px solid ${info.badgeBorder}`,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        display: 'inline-block',
                      }}
                    >
                      {info.short}
                    </span>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#f1f5f9', marginTop: '4px', lineHeight: '1.2' }}>
                      {info.name.replace(/Group \d \((.*)\)/, '$1')}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
                    {groupStocks.length} Stocks
                  </span>
                </div>

                {/* QR Preview & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
                  <div
                    onClick={() => {
                      if (previewUrl) {
                        setViewingQrAsset({
                          name: info.name,
                          symbol: info.short,
                          qrCode: previewUrl,
                        });
                      }
                    }}
                    style={{
                      width: '60px',
                      height: '60px',
                      background: '#fff',
                      borderRadius: '6px',
                      padding: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      border: grpQr ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                    title="Click to view QR"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Group ${grpId} QR`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <QrCode size={28} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: grpQr ? '#10b981' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={11} color={grpQr ? '#10b981' : '#38bdf8'} />
                      {grpQr ? 'Custom QR Set' : 'Default QR'}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.2' }}>
                      {grpQr ? 'Applied to all 12 stocks' : '1-click to override all 12'}
                    </div>
                  </div>
                </div>

                {/* 1-Click Group Interest Rate Setup */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={12} color="#10b981" /> Group Interest:
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      +{currentRate}% Return
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={currentRate}
                      disabled={isRateSaving}
                      onChange={(e) => handleGroupRateChange(grpId, e.target.value)}
                      style={{
                        width: '100%',
                        height: '26px',
                        background: '#0f172a',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '4px',
                        color: '#34d399',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '0 6px',
                        cursor: isRateSaving ? 'wait' : 'pointer',
                        outline: 'none',
                      }}
                      title={`Change interest rate for all companies in Group ${grpId}`}
                    >
                      {[2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12].map((r) => (
                        <option key={r} value={r} style={{ background: '#0f172a', color: '#f1f5f9' }}>
                          +{r}% Guaranteed Daily Profit
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                  <label
                    style={{
                      flex: 1,
                      height: '28px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '4px',
                      color: '#fbbf24',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: isUploading ? 'wait' : 'pointer',
                    }}
                  >
                    <Upload size={11} /> {isUploading ? 'Saving...' : 'Upload QR'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      style={{ display: 'none' }}
                      onChange={(e) => handleGroupQrUpload(grpId, e.target.files?.[0])}
                    />
                  </label>

                  {grpQr && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGroupQr(grpId)}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '4px',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove custom group QR"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setGroupFilter(groupFilter === grpId ? 'ALL' : grpId)}
                    style={{
                      padding: '0 8px',
                      height: '28px',
                      background: isSelected ? info.color : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isSelected ? info.color : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '4px',
                      color: isSelected ? '#000' : '#cbd5e1',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title={`Filter table to Group ${grpId}`}
                  >
                    {isSelected ? 'Filtered' : 'Filter'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Group Filter Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <Layers size={13} /> Group Filter:
        </span>
        <button
          type="button"
          onClick={() => setGroupFilter('ALL')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            border: groupFilter === 'ALL' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.12)',
            background: groupFilter === 'ALL' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
            color: groupFilter === 'ALL' ? '#f59e0b' : '#cbd5e1',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All ({assets.length})
        </button>
        {[1, 2, 3, 4, 5].map((g) => {
          const info = GROUP_INFO[g];
          const count = assets.filter((a) => (a.group || getStockGroup(a)) === g).length;
          const isSel = groupFilter === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(g)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: isSel ? `1px solid ${info.color}` : '1px solid rgba(255,255,255,0.12)',
                background: isSel ? info.badgeBg : 'rgba(255,255,255,0.03)',
                color: isSel ? info.color : '#cbd5e1',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {info.short} ({count})
            </button>
          );
        })}
      </div>

      {/* 4. Classic Stocks CRUD Data Grid */}
      <div className="square-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Stock Name</th>
                <th>Group</th>
                <th>Min Buy Amount (INR)</th>
                <th>Daily Interest Return</th>
                <th>Payment QR Code</th>
                <th style={{ textAlign: 'center' }}>Active Status</th>
                <th style={{ textAlign: 'center' }}>Action (CRUD)</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px 14px', textAlign: 'center', color: '#8b9bb4', fontSize: '13px' }}>
                    No stocks found for selected group. Click <strong>"+ Add New Stock"</strong> to create one!
                  </td>
                </tr>
              ) : (
                filteredAssets.map((item, index) => {
                  const qrUrl = item.qrCode || getCompanyQrUrl(item);

                  return (
                    <tr key={item.id || item._id || index}>
                      <td style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                        {index + 1}
                      </td>

                      {/* 1. Stock Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: item.color || '#38bdf8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '15px',
                              fontWeight: 800,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            <AssetIcon symbol={item.symbol || item.id} iconName={item.icon} size={16} color="#fff" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '13px' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>
                              {item.symbol || item.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Group Badge */}
                      <td>
                        {(() => {
                          const grp = item.group || getStockGroup(item, index);
                          const grpInfo = GROUP_INFO[grp] || GROUP_INFO[1];
                          return (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: grpInfo.color,
                                background: grpInfo.badgeBg,
                                border: `1px solid ${grpInfo.badgeBorder}`,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {grpInfo.short}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 2. Min Kitna Ka Le Sakte Ho */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#fbbf24',
                            fontSize: '13px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          ₹{Number(item.minStake || 100).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* 3. Interest Set Karne Ka Option */}
                      <td>
                        <span
                          className="square-badge badge-green"
                          style={{
                            fontWeight: 800,
                            fontSize: '12px',
                            letterSpacing: '0.3px',
                          }}
                        >
                          +{item.returnPercent ?? 5}% Return
                        </span>
                      </td>

                      {/* 4. Payment QR Preview & Action */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            onClick={() => setViewingQrAsset(item)}
                            style={{
                              cursor: 'pointer',
                              padding: '2px',
                              background: '#fff',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)',
                              border: '1px solid #f59e0b',
                              flexShrink: 0,
                            }}
                            title="Click to view full Stock Deposit QR"
                          >
                            <img
                              src={qrUrl}
                              alt="QR"
                              style={{ width: '32px', height: '32px', display: 'block', borderRadius: '2px', objectFit: 'contain' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: item.qrCode ? '#10b981' : '#cbd5e1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={11} color={item.qrCode ? '#10b981' : '#38bdf8'} /> {item.qrCode ? 'Custom QR' : 'Active QR'}
                            </div>
                            <span
                              onClick={() => setViewingQrAsset(item)}
                              style={{ fontSize: '10.5px', color: '#f59e0b', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                            >
                              <QrCode size={11} /> View QR Code
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Active / Disabled Status Toggle */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            title={item.isEnabled !== false ? 'Click to DISABLE this stock' : 'Click to ENABLE this stock'}
                            style={{
                              cursor: 'pointer',
                              border: item.isEnabled !== false ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                              background: item.isEnabled !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              padding: '5px 12px',
                              borderRadius: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: item.isEnabled !== false ? '#10b981' : '#ef4444',
                                boxShadow: item.isEnabled !== false ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                              }}
                            />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: item.isEnabled !== false ? '#10b981' : '#ef4444',
                                letterSpacing: '0.3px',
                              }}
                            >
                              {item.isEnabled !== false ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </button>
                          <span style={{ fontSize: '9.5px', color: item.isEnabled !== false ? '#94a3b8' : '#f87171', fontWeight: 600 }}>
                            {item.isEnabled !== false ? 'Visible to Users' : 'Hidden from Users'}
                          </span>
                        </div>
                      </td>

                      {/* Actions (CRUD: Toggle Disable/Enable, Edit, Delete) */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              borderRadius: '4px',
                              background: item.isEnabled !== false ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: item.isEnabled !== false ? '#f59e0b' : '#10b981',
                              border: item.isEnabled !== false ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={item.isEnabled !== false ? 'Disable stock from user view' : 'Enable stock for user view'}
                          >
                            {item.isEnabled !== false ? (
                              <>
                                <Ban size={11} /> Disable
                              </>
                            ) : (
                              <>
                                <Check size={11} strokeWidth={3} /> Enable
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="square-btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Stock Name, Min Amount, Interest, or QR"
                          >
                            <Edit size={11} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(item)}
                            className="square-btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Delete Stock"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Add / Edit Stock Modal (CRUD) */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 4, 18, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="square-card"
            style={{
              width: '500px',
              maxWidth: '96vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              background: '#0d111a',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>
                  {editingAsset ? `Edit Stock: ${editingAsset.name}` : 'Add New Stock'}
                </h3>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
                  Configure Stock Name, Min Buy Limit, Daily Interest (2% - 12%), and Deposit QR.
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* FIELD 1: Stock Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  1. Stock Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors, Reliance Industries, HDFC Bank"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="square-input"
                  style={{ width: '100%', height: '38px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* FIELD 2: Stock Group (1 to 5) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                    2. Company Group (Group 1 – 5) *
                  </label>
                  <span style={{ fontSize: '11px', color: GROUP_INFO[formData.group || 1]?.color || '#f59e0b', fontWeight: 700 }}>
                    {GROUP_INFO[formData.group || 1]?.short}
                  </span>
                </div>
                <select
                  value={formData.group || 1}
                  onChange={(e) => setFormData({ ...formData, group: Number(e.target.value) })}
                  className="square-input"
                  style={{
                    width: '100%',
                    height: '38px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    borderRadius: '6px',
                  }}
                >
                  {Object.entries(GROUP_INFO).map(([grpId, info]) => (
                    <option key={grpId} value={grpId}>
                      {info.name}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '10.5px', color: '#8b9bb4', marginTop: '4px' }}>
                  ⚡ Auto-inherits Group {formData.group || 1} QR code if no custom QR is uploaded below.
                </div>
              </div>

              {/* FIELD 3: Min Kitna Ka Le Sakte Ho */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                    3. Minimum Buy Amount (₹) *
                  </label>
                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>
                    User can buy from ₹{formData.minStake}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="100"
                  step="50"
                  placeholder="100"
                  value={formData.minStake}
                  onChange={(e) => setFormData({ ...formData, minStake: Number(e.target.value) })}
                  className="square-input"
                  style={{ width: '100%', height: '38px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[100, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData({ ...formData, minStake: amt })}
                      style={{
                        background: formData.minStake === amt ? '#fbbf24' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${formData.minStake === amt ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)'}`,
                        borderRadius: '4px',
                        color: formData.minStake === amt ? '#000' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* FIELD 4: Interest Set Karne Ka Option (2% to 12%) */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.2px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                    4. Fixed Interest Rate (Profit %) *
                  </label>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      color: '#10b981',
                      fontSize: '15px',
                    }}
                  >
                    +{formData.returnPercent}% Guaranteed
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="0.5"
                  value={formData.returnPercent}
                  onChange={(e) => setFormData({ ...formData, returnPercent: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#8b9bb4', marginTop: '4px' }}>
                  <span>Min: 2%</span>
                  <span>Max: 12%</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[2, 3.5, 5, 7.5, 10, 12].map((rt) => (
                    <button
                      key={rt}
                      type="button"
                      onClick={() => setFormData({ ...formData, returnPercent: rt })}
                      style={{
                        background: formData.returnPercent === rt ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${formData.returnPercent === rt ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}`,
                        borderRadius: '4px',
                        color: formData.returnPercent === rt ? '#000' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      +{rt}%
                    </button>
                  ))}
                </div>
              </div>

              {/* FIELD 5: QR Set Karne Ka Option */}
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1.2px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', display: 'block', margin: 0 }}>
                    5. Stock Payment QR Setup (Optional Custom QR)
                  </label>
                  {formData.qrCode ? (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Custom QR Added
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Using Group {formData.group || 1} QR
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  {/* Live QR Preview Box */}
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
                      border: '1.5px solid #f59e0b',
                    }}
                  >
                    {formData.qrCode ? (
                      <img
                        src={formData.qrCode}
                        alt="QR Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <QrCode size={30} color="#94a3b8" />
                        <span style={{ fontSize: '9.5px', color: '#64748b', textAlign: 'center', fontWeight: 600, marginTop: '3px' }}>
                          No QR Added
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Upload Stock Payment QR:
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileUpload}
                        style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block', width: '100%' }}
                      />
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', lineHeight: '1.3' }}>
                        Upload PhonePe, GPay, Paytm or Bank QR (PNG, JPG, WEBP). Users will scan this to pay.
                      </div>
                    </div>

                    {formData.qrCode && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, qrCode: '' })}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          color: '#f87171',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          width: 'fit-content',
                        }}
                      >
                        <Trash2 size={11} /> Remove QR Code
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Toggle Card */}
              <div
                onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: formData.isEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: formData.isEnabled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                    6. Stock Availability Status
                  </div>
                  <div style={{ fontSize: '11px', color: formData.isEnabled ? '#10b981' : '#f87171', fontWeight: 600, marginTop: '2px' }}>
                    {formData.isEnabled ? 'ENABLED (Visible & tradable by users)' : 'DISABLED (Hidden from users in portal & APK)'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="square-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="square-btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {editingAsset ? (
                    <>
                      <Save size={13} /> Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={13} /> Create Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Dedicated Quick QR Preview Modal */}
      {viewingQrAsset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 4, 18, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setViewingQrAsset(null)}
        >
          <div
            className="square-card"
            style={{
              width: '400px',
              maxWidth: '94vw',
              padding: '24px',
              background: '#0d111a',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>
                  {viewingQrAsset.name} Deposit QR
                </h3>
                <div style={{ fontSize: '11.5px', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                  +{viewingQrAsset.returnPercent ?? 5}% Interest Rate • Min ₹{viewingQrAsset.minStake || 100}
                </div>
              </div>
              <button
                onClick={() => setViewingQrAsset(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                width: '210px',
                height: '210px',
                margin: '0 auto 14px',
                background: '#fff',
                padding: '10px',
                borderRadius: '12px',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={viewingQrAsset.qrCode || getCompanyQrUrl(viewingQrAsset)}
                alt={`${viewingQrAsset.name} QR`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <div style={{ background: '#090d14', border: '1px solid #1a2233', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b9bb4' }}>Stock Payment QR Code:</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                {viewingQrAsset.name} (Min ₹{viewingQrAsset.minStake || 100})
              </div>
            </div>

            <button
              onClick={() => setViewingQrAsset(null)}
              className="square-btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '12px' }}
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
