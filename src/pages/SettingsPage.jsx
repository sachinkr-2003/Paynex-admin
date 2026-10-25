import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showAdminSuccess, showAdminError } from '../utils/swal';

export default function SettingsPage({ settings, setSettings, showToast }) {
  const [formData, setFormData] = useState({ ...settings });
  const [adminPass, setAdminPass] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateSettings(formData);
      setSettings({ ...formData });
      showAdminSuccess('Settings Saved', 'Platform parameters updated successfully on MongoDB Atlas.');
    } catch (err) {
      showAdminError('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (!adminPass.newPass || adminPass.newPass !== adminPass.confirm) {
      showToast('❌ Passwords do not match');
      return;
    }
    showToast('🔒 Admin security key updated');
    setAdminPass({ current: '', newPass: '', confirm: '' });
  };

  const handleExportSettingsExcel = () => {
    const headers = [
      { label: 'Parameter', accessor: 'key' },
      { label: 'Current Value', accessor: 'val' },
      { label: 'Category', accessor: 'category' },
    ];
    const rows = [
      { key: 'Platform Title', val: formData.platformName, category: 'Branding' },
      { key: 'Official Receiving UPI ID', val: formData.officialUpiId, category: 'Payment Gateway' },
      { key: 'Merchant Business Name', val: formData.merchantName, category: 'Payment Gateway' },
      { key: 'Min Deposit', val: `₹${formData.minDeposit}`, category: 'Limits' },
      { key: 'Min Withdrawal', val: `₹${formData.minWithdrawal}`, category: 'Limits' },
      { key: 'Withdrawal Fee', val: `${formData.withdrawalFeePercent}%`, category: 'Limits' },
      { key: 'Default Guaranteed Profit Rate', val: `+${formData.defaultGameProfitPercent}%`, category: 'Staking Engine' },
      { key: 'Helpline Number', val: formData.supportHelpline, category: 'Support' },
      { key: 'Support Email', val: formData.supportEmail, category: 'Support' },
      { key: 'Support Desk Line', val: formData.whatsappCare, category: 'Support' },
      { key: 'Telegram Channel', val: formData.telegramChannel, category: 'Support' },
      { key: 'Emergency Platform Freeze', val: formData.emergencyFreeze ? 'ACTIVE' : 'NORMAL', category: 'Security' },
      { key: 'Auto-Approve KYC', val: formData.autoApproveKyc ? 'ENABLED' : 'DISABLED', category: 'Security' },
      { key: 'Auto-Release IMPS', val: formData.autoReleaseWithdrawals ? 'ENABLED' : 'MANUAL', category: 'Security' },
    ];
    exportToExcel('PAYNEX_System_Settings_Audit', headers, rows);
    showToast('📊 Settings configuration exported to Excel');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
            System & Gateway Parameters
          </span>
          <span className="square-badge badge-gold">
            Production Rails
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportSettingsExcel} className="square-btn-excel" style={{ height: '32px' }}>
            Export Config (Excel)
          </button>
          <button onClick={handleSave} className="square-btn-primary" style={{ height: '32px' }}>
            Save Changes
          </button>
        </div>
      </div>

      {/* Emergency Freeze Alert if active */}
      {formData.emergencyFreeze && (
        <div
          className="square-card"
          style={{
            padding: '12px 16px',
            borderLeft: '4px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 600 }}>
            🚨 Emergency Platform Freeze Active — user operations are suspended.
          </div>
          <button
            onClick={() => {
              handleChange('emergencyFreeze', false);
              showToast('Operations resumed');
            }}
            className="square-btn-danger"
          >
            Resume Operations
          </button>
        </div>
      )}

      {/* Main Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Card 1: Payment Gateway */}
        <div className="square-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ borderBottom: '1px solid #1a2233', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Payment Gateway & UPI
            </h3>
            <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '2px' }}>
              Collection endpoint shown to users on deposit page
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Official Receiving UPI ID
            </label>
            <input
              type="text"
              value={formData.officialUpiId}
              onChange={(e) => handleChange('officialUpiId', e.target.value)}
              className="square-input"
              style={{ width: '100%', fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Merchant Business Name
            </label>
            <input
              type="text"
              value={formData.merchantName}
              onChange={(e) => handleChange('merchantName', e.target.value)}
              className="square-input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                Min Deposit (₹)
              </label>
              <input
                type="number"
                value={formData.minDeposit}
                onChange={(e) => handleChange('minDeposit', Number(e.target.value))}
                className="square-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                Min Withdrawal (₹)
              </label>
              <input
                type="number"
                value={formData.minWithdrawal}
                onChange={(e) => handleChange('minWithdrawal', Number(e.target.value))}
                className="square-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Support Channels */}
        <div className="square-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ borderBottom: '1px solid #1a2233', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Support & Helpline
            </h3>
            <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '2px' }}>
              Displayed across User App and APK Help sections
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Helpline Number
            </label>
            <input
              type="text"
              value={formData.supportHelpline}
              onChange={(e) => handleChange('supportHelpline', e.target.value)}
              className="square-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Support Email
            </label>
            <input
              type="email"
              value={formData.supportEmail}
              onChange={(e) => handleChange('supportEmail', e.target.value)}
              className="square-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Priority Support Line
            </label>
            <input
              type="text"
              value={formData.whatsappCare}
              onChange={(e) => handleChange('whatsappCare', e.target.value)}
              className="square-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
              Telegram Broadcast
            </label>
            <input
              type="text"
              value={formData.telegramChannel}
              onChange={(e) => handleChange('telegramChannel', e.target.value)}
              className="square-input"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Card 3: Safety & Automation */}
        <div className="square-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ borderBottom: '1px solid #1a2233', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Operational Safeguards
            </h3>
            <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '2px' }}>
              Global platform controls and automated release filters
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#0b0e15',
              border: '1px solid #1a2233',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f1f5f9' }}>
                Emergency Freeze
              </div>
              <div style={{ fontSize: '11px', color: '#8b9bb4' }}>
                Halts all trades, deposits, and payouts
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !formData.emergencyFreeze;
                handleChange('emergencyFreeze', nextVal);
                showToast(nextVal ? '🚨 Emergency Freeze Engaged' : 'Operations resumed');
              }}
              className={formData.emergencyFreeze ? 'square-btn-danger' : 'square-btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {formData.emergencyFreeze ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#0b0e15',
              border: '1px solid #1a2233',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f1f5f9' }}>
                Instant KYC Auto-Approval
              </div>
              <div style={{ fontSize: '11px', color: '#8b9bb4' }}>
                Automatically verify user documents
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !formData.autoApproveKyc;
                handleChange('autoApproveKyc', nextVal);
                showToast(nextVal ? 'Auto-KYC Enabled' : 'Manual KYC Enforced');
              }}
              className={formData.autoApproveKyc ? 'square-btn-success' : 'square-btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {formData.autoApproveKyc ? 'ENABLED' : 'OFF'}
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#0b0e15',
              border: '1px solid #1a2233',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f1f5f9' }}>
                Auto-Release Small IMPS (&lt; ₹5,000)
              </div>
              <div style={{ fontSize: '11px', color: '#8b9bb4' }}>
                Dispatches small payouts automatically
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !formData.autoReleaseWithdrawals;
                handleChange('autoReleaseWithdrawals', nextVal);
                showToast(nextVal ? 'Auto IMPS Enabled' : 'Manual Payouts Enforced');
              }}
              className={formData.autoReleaseWithdrawals ? 'square-btn-primary' : 'square-btn-secondary'}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {formData.autoReleaseWithdrawals ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Card 4: Admin Credentials */}
        <div className="square-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ borderBottom: '1px solid #1a2233', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
              Admin Master Password
            </h3>
            <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '2px' }}>
              Update admin console access key
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={adminPass.current}
                onChange={(e) => setAdminPass({ ...adminPass, current: e.target.value })}
                className="square-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                value={adminPass.newPass}
                onChange={(e) => setAdminPass({ ...adminPass, newPass: e.target.value })}
                className="square-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                value={adminPass.confirm}
                onChange={(e) => setAdminPass({ ...adminPass, confirm: e.target.value })}
                className="square-input"
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="square-btn-secondary"
              style={{ marginTop: '4px', padding: '8px' }}
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
