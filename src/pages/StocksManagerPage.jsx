import { useState, useEffect } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import {
  showAdminSuccess,
  showAdminError,
  showAdminWarning,
  showAdminConfirm,
} from '../utils/swal';
import { FIFTY_STOCKS, getCompanyQrUrl, enrichStockWithPayment } from '../data/stocksData';

export default function StocksManagerPage({ showToast, searchQuery = '' }) {
  const [assets, setAssets] = useState(() => FIFTY_STOCKS.map(enrichStockWithPayment));
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stats, setStats] = useState({ totalCount: FIFTY_STOCKS.length, activeCount: FIFTY_STOCKS.length, stockCount: 50, cryptoCount: 6 });

  // Modal State for Add / Edit Asset
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    category: 'Stock',
    basePrice: 1000,
    step: 5,
    icon: '📈',
    color: '#38bdf8',
    returnPercent: 30, // Default 30% interest rate
    minStake: 100,
    maxStake: 500000,
    isEnabled: true,
    upiId: '',
    payeeName: '',
    qrCode: '',
    description: '',
  });

  // Dedicated Company QR & UPI Modal State
  const [qrModalAsset, setQrModalAsset] = useState(null);
  const [qrFormData, setQrFormData] = useState({
    upiId: '',
    payeeName: '',
    qrCode: '',
  });
  const [qrMode, setQrMode] = useState('auto'); // 'auto' | 'upload' | 'url'

  // Fetch all assets from backend
  const fetchAssets = async () => {
    try {
      const res = await adminApi.getAssets();
      if (res && res.success && Array.isArray(res.assets) && res.assets.length > 0) {
        setAssets(res.assets);
        if (res.stats) setStats(res.stats);
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
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.symbol.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      symbol: '',
      category: 'Stock',
      basePrice: 1000,
      step: 5,
      icon: '📈',
      color: '#38bdf8',
      returnPercent: 30,
      minStake: 100,
      maxStake: 500000,
      isEnabled: true,
      upiId: '',
      payeeName: '',
      qrCode: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    const cleanSym = (item.symbol || item.id || 'stock').toLowerCase().replace(/[^a-z0-9]/g, '');
    setEditingAsset(item);
    setFormData({
      name: item.name,
      symbol: item.symbol,
      category: item.category || 'Stock',
      basePrice: item.basePrice,
      step: item.step || 5,
      icon: item.icon || '📈',
      color: item.color || '#38bdf8',
      returnPercent: item.returnPercent || 30,
      minStake: item.minStake || 100,
      maxStake: item.maxStake || 500000,
      isEnabled: item.isEnabled !== false,
      upiId: item.upiId || `${cleanSym}.paynex@icici`,
      payeeName: item.payeeName || `${item.name} Trading Desk`,
      qrCode: item.qrCode || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  // Open Dedicated Company QR Modal
  const handleOpenQrModal = (item) => {
    const cleanSym = (item.symbol || item.id || 'stock').toLowerCase().replace(/[^a-z0-9]/g, '');
    const currentUpi = item.upiId || `${cleanSym}.paynex@icici`;
    const currentPayee = item.payeeName || `${item.name} Trading Desk`;
    setQrModalAsset(item);
    setQrFormData({
      upiId: currentUpi,
      payeeName: currentPayee,
      qrCode: item.qrCode || '',
    });
    setQrMode(item.qrCode ? 'upload' : 'auto');
  };

  // Handle Custom QR Image File Upload
  const handleQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAdminWarning('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showAdminWarning('File Too Large', 'Please upload an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result;
      if (base64Url) {
        setQrFormData((prev) => ({ ...prev, qrCode: base64Url }));
        setQrMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle QR File Upload inside Add/Edit Asset modal
  const handleEditQrFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAdminWarning('Invalid File', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showAdminWarning('File Too Large', 'Please upload an image smaller than 2MB.');
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


  // Save Dedicated Company QR Code
  const handleSaveCompanyQr = async (e) => {
    e.preventDefault();
    if (!qrModalAsset) return;

    if (!qrFormData.upiId.trim()) {
      showAdminWarning('Missing UPI ID', 'Please enter a UPI ID for this company.');
      return;
    }

    const payload = {
      upiId: qrFormData.upiId.trim(),
      payeeName: qrFormData.payeeName.trim() || `${qrModalAsset.name} Trading Desk`,
      qrCode: qrMode === 'auto' ? '' : qrFormData.qrCode,
    };

    setAssets((prev) =>
      prev.map((a) =>
        (a.id === qrModalAsset.id || a._id === qrModalAsset._id)
          ? { ...a, ...payload }
          : a
      )
    );

    try {
      await adminApi.updateAsset(qrModalAsset.id || qrModalAsset._id, payload);
      showAdminSuccess(
        'Company QR Saved',
        `Payment QR Code and UPI ID for <strong>${qrModalAsset.name}</strong> successfully updated.`
      );
    } catch (err) {
      console.warn('Backend QR save fallback:', err.message);
      showAdminSuccess(
        'Company QR Saved Locally',
        `QR & UPI for ${qrModalAsset.name} updated.`
      );
    } finally {
      setQrModalAsset(null);
    }
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.symbol.trim() || !formData.basePrice) {
      showAdminWarning('Missing Details', 'Asset name, symbol, and price are required.');
      return;
    }

    try {
      if (editingAsset) {
        // Update
        const res = await adminApi.updateAsset(editingAsset.id || editingAsset._id, formData);
        showAdminSuccess('Stock Updated', `"${formData.name}" interest set to +${formData.returnPercent}%.`);
      } else {
        // Create
        const res = await adminApi.createAsset(formData);
        showAdminSuccess('New Stock Created', `"${formData.name}" added to trading engine with +${formData.returnPercent}% return.`);
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      showAdminError('Operation Failed', err.message);
    }
  };

  // Quick Inline Return Rate Update
  const handleQuickRateChange = async (item, newRate) => {
    const num = Number(newRate);
    if (!num || num < 1 || num > 500) {
      showAdminWarning('Invalid Rate', 'Please enter a valid rate between 1% and 500%.');
      return;
    }

    try {
      await adminApi.updateAsset(item.id || item._id, { returnPercent: num });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, returnPercent: num } : a
        )
      );
      showToast(`⚡ ${item.symbol} interest rate set to +${num}%`);
    } catch (err) {
      showAdminError('Update Failed', err.message);
    }
  };

  // Toggle Active / Inactive
  const handleToggleStatus = async (item) => {
    const nextStatus = !item.isEnabled;
    try {
      await adminApi.updateAsset(item.id || item._id, { isEnabled: nextStatus });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, isEnabled: nextStatus } : a
        )
      );
      showToast(`Status: ${item.symbol} is now ${nextStatus ? 'ACTIVE' : 'PAUSED'}`);
    } catch (err) {
      showAdminError('Failed to change status', err.message);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (item) => {
    const confirmed = await showAdminConfirm(
      `Delete "${item.name}"?`,
      `Are you sure you want to remove ${item.symbol} (+${item.returnPercent}%) from the trading engine?`,
      'YES, DELETE',
      'CANCEL'
    );
    if (!confirmed) return;

    try {
      await adminApi.deleteAsset(item.id || item._id);
      setAssets((prev) => prev.filter((a) => a.id !== item.id));
      showAdminSuccess('Stock Removed', `"${item.name}" has been removed from live engine.`);
    } catch (err) {
      showAdminError('Delete Failed', err.message);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      { label: 'Asset Name', accessor: 'name' },
      { label: 'Symbol', accessor: 'symbol' },
      { label: 'Category', accessor: 'category' },
      { label: 'Base Price (INR)', accessor: (a) => `₹${a.basePrice}` },
      { label: 'Admin Interest Rate', accessor: (a) => `+${a.returnPercent}%` },
      { label: 'Min Stake (INR)', accessor: (a) => `₹${a.minStake}` },
      { label: 'Max Stake (INR)', accessor: (a) => `₹${a.maxStake}` },
      { label: 'Active Status', accessor: (a) => (a.isEnabled ? 'ACTIVE' : 'PAUSED') },
    ];
    exportToExcel('PAYNEX_Stocks_And_Assets_Catalog', headers, filteredAssets);
    showToast('📊 Stocks & Assets catalog exported to Excel');
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
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
            📈 Stocks & Game Assets Engine Manager
          </span>
          <span className="square-badge badge-green">
            {assets.filter((a) => a.isEnabled).length} Tradable Assets Active
          </span>
          <span className="square-badge badge-gold">
            Custom Profit Engine
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportExcel}
            className="square-btn-excel"
            style={{ height: '34px', fontSize: '12px' }}
          >
            Export Catalog
          </button>
          <button
            onClick={handleOpenCreate}
            className="square-btn-primary"
            style={{ height: '34px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Add New Stock / Game
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Catalogued
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', marginTop: '4px', fontFamily: 'monospace' }}>
            {assets.length}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
            Across all asset classes
          </div>
        </div>

        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
            Indian Stocks & Shares
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
            {assets.filter((a) => a.category === 'Stock').length}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Tata Motors, Reliance, Apple, etc.
          </div>
        </div>

        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
            Crypto Currency Pairs
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', fontFamily: 'monospace' }}>
            {assets.filter((a) => a.category === 'Crypto').length}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            BTC, ETH, SOL, BNB
          </div>
        </div>

        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
            Highest Profit Rate
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>
            +{Math.max(...(assets.map((a) => a.returnPercent) || [30]))}%
          </div>
          <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '4px' }}>
            Guaranteed admin fixed return
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div
        className="square-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['All', 'Stock', 'Crypto', 'Commodity', 'Forex'].map((cat) => {
            const isSel = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '0px',
                  border: isSel ? '1px solid #f59e0b' : '1px solid #1e2638',
                  background: isSel ? '#f59e0b' : '#141a26',
                  color: isSel ? '#0b0e14' : '#cbd5e1',
                  fontWeight: isSel ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {cat === 'All' ? 'All Assets' : `${cat}s`}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', color: '#8b9bb4' }}>
          Showing <strong>{filteredAssets.length}</strong> of {assets.length} items
        </div>
      </div>

      {/* 4. Complete Stocks & Assets Table */}
      <div className="square-card" style={{ padding: '16px 20px' }}>
        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>Stock / Asset</th>
                <th>Category</th>
                <th>Live Base Price</th>
                <th>Admin Interest Rate (% Return)</th>
                <th>Payment QR & UPI (Company)</th>
                <th>Stake Limits</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((item) => (
                <tr key={item.id || item._id}>
                  {/* Stock Name + Symbol + Icon */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          background: item.color ? `${item.color}22` : '#141a26',
                          border: `1px solid ${item.color || '#f59e0b'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        {item.icon || '📈'}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '13px' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>
                          {item.symbol}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor:
                          item.category === 'Stock'
                            ? '#38bdf8'
                            : item.category === 'Crypto'
                            ? '#f59e0b'
                            : '#10b981',
                        color:
                          item.category === 'Stock'
                            ? '#38bdf8'
                            : item.category === 'Crypto'
                            ? '#f59e0b'
                            : '#10b981',
                        background:
                          item.category === 'Stock'
                            ? 'rgba(56, 189, 248, 0.1)'
                            : item.category === 'Crypto'
                            ? 'rgba(245, 158, 11, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)',
                      }}
                    >
                      {item.category || 'Stock'}
                    </span>
                  </td>

                  {/* Base Price */}
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f1f5f9', fontSize: '13.5px' }}>
                      ₹{Number(item.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Step: ±₹{item.step || 5}
                    </div>
                  </td>

                  {/* Guaranteed Return Rate % (with inline adjustment buttons) */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="square-badge badge-gold"
                        style={{ fontSize: '13px', fontWeight: 800, padding: '4px 10px' }}
                      >
                        +{item.returnPercent}%
                      </span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[20, 30, 40, 50].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => handleQuickRateChange(item, preset)}
                            title={`Set ${item.symbol} rate to +${preset}%`}
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              background: item.returnPercent === preset ? '#f59e0b' : '#141a26',
                              color: item.returnPercent === preset ? '#000' : '#8b9bb4',
                              border: '1px solid #1e2638',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Company Payment QR & UPI */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        onClick={() => handleOpenQrModal(item)}
                        style={{
                          width: '38px',
                          height: '38px',
                          background: '#fff',
                          padding: '2px',
                          cursor: 'pointer',
                          border: '1px solid #f59e0b',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={`Click to preview / edit QR for ${item.name}`}
                      >
                        <img
                          src={getCompanyQrUrl(item)}
                          alt={`${item.symbol} QR`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#f59e0b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '140px',
                          }}
                        >
                          {item.upiId || `${(item.symbol || 'stock').toLowerCase().replace(/[^a-z0-9]/g, '')}.paynex@icici`}
                        </div>
                        <button
                          onClick={() => handleOpenQrModal(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: 0,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          📱 Set / Change QR
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Min / Max Stake */}
                  <td>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                      Min: ₹{Number(item.minStake || 100).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                      Max: ₹{Number(item.maxStake || 500000).toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: item.isEnabled ? '#10b981' : '#64748b',
                        color: item.isEnabled ? '#10b981' : '#64748b',
                        background: item.isEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                      }}
                    >
                      {item.isEnabled ? 'ACTIVE ●' : 'PAUSED ○'}
                    </button>
                  </td>

                  {/* Action Buttons */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenQrModal(item)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(16, 185, 129, 0.15))',
                          border: '1px solid #f59e0b',
                          color: '#fbbf24',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Set / Upload Custom QR Code for ${item.name}`}
                      >
                        📱 Set Stock QR
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#141a26',
                          border: '1px solid #1e2638',
                          color: '#38bdf8',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(item)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD / EDIT STOCK MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="square-card"
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              border: '1px solid #f59e0b',
              background: '#0e121a',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
                {editingAsset ? `✏️ Edit "${editingAsset.name}"` : '➕ Add New Stock / Game Asset'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b9bb4',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Asset / Stock Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tata Motors Ltd, Reliance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="square-input"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Symbol *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TATAMOTORS"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="square-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="square-input"
                  >
                    <option value="Stock">Stock (Indian / US Equities)</option>
                    <option value="Crypto">Crypto Currency Pair</option>
                    <option value="Commodity">Commodity (Gold, Silver, Crude)</option>
                    <option value="Forex">Forex Currency Pair</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Base Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 980"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="square-input"
                    required
                  />
                </div>
              </div>

              {/* HIGHLIGHT: Custom Guaranteed Interest % Rate */}
              <div style={{ background: '#141a26', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 800 }}>
                    ⚡ Admin Guaranteed Return Rate (% Profit) *
                  </label>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                    +{formData.returnPercent}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="e.g. 30"
                    value={formData.returnPercent}
                    onChange={(e) => setFormData({ ...formData, returnPercent: e.target.value })}
                    className="square-input"
                    style={{ width: '120px', fontWeight: 800, color: '#f59e0b' }}
                    required
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[15, 25, 30, 40, 50, 75].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setFormData({ ...formData, returnPercent: p })}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          border: '1px solid #1e2638',
                          background: formData.returnPercent === p ? '#f59e0b' : '#0b0e14',
                          color: formData.returnPercent === p ? '#000' : '#8b9bb4',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        +{p}%
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '10.5px', color: '#8b9bb4', marginTop: '6px' }}>
                  Trader betting on this stock will receive exact <strong>+{formData.returnPercent}%</strong> profit on maturity.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Icon / Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🏢, 🏎️, ₿"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="square-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '100%', height: '36px', background: '#141a26', border: '1px solid #1e2638', cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Min Stake (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.minStake}
                    onChange={(e) => setFormData({ ...formData, minStake: e.target.value })}
                    className="square-input"
                  />
                </div>
              </div>

              {/* DEDICATED STOCK PAYMENT QR & UPI SECTION INSIDE EDIT MODAL */}
              <div style={{ background: '#0b0e14', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📱 Stock Payment Receiver (Custom QR & UPI)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10.5px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Company UPI ID (Receiver) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. tatamotors.paynex@icici"
                        value={formData.upiId}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        className="square-input"
                        style={{ fontFamily: 'monospace', color: '#f59e0b' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10.5px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Payee / Merchant Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tata Motors Trading Desk"
                        value={formData.payeeName}
                        onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                        className="square-input"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10.5px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Upload Custom QR Image (PNG/JPG)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditQrFileUpload}
                        style={{ fontSize: '10px', color: '#cbd5e1' }}
                      />
                      {formData.qrCode && (
                        <div style={{ marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, qrCode: '' })}
                            style={{ fontSize: '9.5px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '2px 6px', cursor: 'pointer' }}
                          >
                            ✕ Clear Custom QR (Use Auto UPI)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Live Thumbnail Preview */}
                  <div style={{ textAlign: 'center', background: '#141a26', padding: '8px', border: '1px solid #1e2638' }}>
                    <div style={{ width: '90px', height: '90px', background: '#fff', margin: '0 auto', padding: '4px' }}>
                      <img
                        src={getCompanyQrUrl(formData)}
                        alt="Stock QR Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ fontSize: '9.5px', color: formData.qrCode ? '#f59e0b' : '#10b981', fontWeight: 700, marginTop: '4px' }}>
                      {formData.qrCode ? 'Custom QR Uploaded' : 'Auto UPI QR'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electric Vehicle sector market leader"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="square-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  className="square-btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800 }}
                >
                  {editingAsset ? 'Save Asset Modifications' : 'Create & Activate Stock in Engine'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    background: '#141a26',
                    border: '1px solid #1e2638',
                    color: '#8b9bb4',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DEDICATED COMPANY QR & PAYMENT MODAL */}
      {qrModalAsset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(5, 7, 12, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setQrModalAsset(null)}
        >
          <div
            className="square-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              border: '1px solid #f59e0b',
              background: '#0e121a',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
                  📱 Set Payment QR & UPI • {qrModalAsset.name}
                </div>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
                  Symbol: <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>{qrModalAsset.symbol}</span> • Return Rate: <span style={{ color: '#10b981', fontWeight: 700 }}>+{qrModalAsset.returnPercent}% Guaranteed</span>
                </div>
              </div>
              <button
                onClick={() => setQrModalAsset(null)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompanyQr} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Company UPI ID */}
              <div>
                <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Company Designated UPI ID *
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={qrFormData.upiId}
                    onChange={(e) => setQrFormData({ ...qrFormData, upiId: e.target.value })}
                    className="square-input"
                    style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}
                    placeholder="e.g. tatamotors.paynex@icici"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = (qrModalAsset.symbol || 'stock').toLowerCase().replace(/[^a-z0-9]/g, '');
                      setQrFormData({ ...qrFormData, upiId: `${clean}.paynex@icici` });
                    }}
                    className="square-btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    title="Generate default branded UPI ID"
                  >
                    Auto Format
                  </button>
                </div>
              </div>

              {/* Payee / Receiver Name */}
              <div>
                <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Receiver / Payee Name (Appears on GPay / PhonePe scan)
                </label>
                <input
                  type="text"
                  value={qrFormData.payeeName}
                  onChange={(e) => setQrFormData({ ...qrFormData, payeeName: e.target.value })}
                  className="square-input"
                  placeholder="e.g. Tata Motors Trading Desk"
                />
              </div>

              {/* QR Code Mode Selection */}
              <div>
                <label style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  QR Code Source:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setQrMode('auto');
                      setQrFormData((prev) => ({ ...prev, qrCode: '' }));
                    }}
                    style={{
                      padding: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: qrMode === 'auto' ? '1px solid #10b981' : '1px solid #1e2638',
                      background: qrMode === 'auto' ? 'rgba(16, 185, 129, 0.15)' : '#141a26',
                      color: qrMode === 'auto' ? '#10b981' : '#8b9bb4',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Auto UPI QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('upload')}
                    style={{
                      padding: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: qrMode === 'upload' ? '1px solid #f59e0b' : '1px solid #1e2638',
                      background: qrMode === 'upload' ? 'rgba(245, 158, 11, 0.15)' : '#141a26',
                      color: qrMode === 'upload' ? '#f59e0b' : '#8b9bb4',
                      cursor: 'pointer',
                    }}
                  >
                    📁 Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('url')}
                    style={{
                      padding: '8px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: qrMode === 'url' ? '1px solid #38bdf8' : '1px solid #1e2638',
                      background: qrMode === 'url' ? 'rgba(56, 189, 248, 0.15)' : '#141a26',
                      color: qrMode === 'url' ? '#38bdf8' : '#8b9bb4',
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Image URL
                  </button>
                </div>

                {qrMode === 'upload' && (
                  <div style={{ background: '#141a26', border: '1px dashed #f59e0b', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600, marginBottom: '6px' }}>
                      Upload Custom QR Code (PNG / JPG / WEBP)
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      style={{ fontSize: '11px', color: '#8b9bb4' }}
                    />
                  </div>
                )}

                {qrMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      placeholder="Paste Image URL (https://.../my_qr.png)"
                      value={qrFormData.qrCode}
                      onChange={(e) => setQrFormData({ ...qrFormData, qrCode: e.target.value })}
                      className="square-input"
                    />
                  </div>
                )}
              </div>

              {/* Live QR Preview Box */}
              <div
                style={{
                  background: '#070a10',
                  border: '1px solid #1e2638',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    background: '#fff',
                    padding: '6px',
                    border: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={
                      qrFormData.qrCode && qrFormData.qrCode.trim().length > 0
                        ? qrFormData.qrCode
                        : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                            `upi://pay?pa=${qrFormData.upiId || 'paynex@icici'}&pn=${encodeURIComponent(
                              qrFormData.payeeName || qrModalAsset.name
                            )}&cu=INR`
                          )}`
                    }
                    alt="Live QR Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                <div style={{ fontSize: '12px', color: '#8b9bb4' }}>
                  <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '3px' }}>
                    ● Real-Time Scannable QR Code
                  </div>
                  <div>
                    User payments for <strong>{qrModalAsset.name}</strong> will route directly to:
                  </div>
                  <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700, marginTop: '4px' }}>
                    {qrFormData.upiId || 'No UPI ID set'}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '6px' }}>
                    Works seamlessly with PhonePe, Google Pay, Paytm & BHIM UPI.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="square-btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 800 }}
                >
                  💾 Save Company QR Code & UPI
                </button>
                <button
                  type="button"
                  onClick={() => setQrModalAsset(null)}
                  style={{
                    padding: '10px 16px',
                    background: '#141a26',
                    border: '1px solid #1e2638',
                    color: '#8b9bb4',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
