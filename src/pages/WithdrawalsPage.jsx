import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showConfirmDialog, showSuccessAlert, showToast as swalToast } from '../utils/swal';
import { QrCode, Zap, X, Landmark, Copy, Check, ArrowDownToLine } from 'lucide-react';

export default function WithdrawalsPage({
  withdrawals,
  setWithdrawals,
  traders,
  setTraders,
  setKpis,
  showToast,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [releaseModalItem, setReleaseModalItem] = useState(null);

  const getPayoutQrUrl = (w) => {
    if (!w) return '';
    const targetAcc = (w.accountNumber || '').trim();
    const targetIfsc = (w.ifsc || '').trim().toUpperCase();
    const payee = encodeURIComponent(w.accountHolder || w.traderName || 'Trader');
    const amt = Number(w.amount || 0);

    let upiString = '';
    if (targetAcc && targetIfsc) {
      // Standard NPCI Bank IFSC URI: scanning in PhonePe / GPay / Paytm directly transfers to this bank account
      upiString = `upi://pay?pa=${targetAcc}@${targetIfsc}.ifsc.npci&pn=${payee}&am=${amt}&cu=INR&tn=${encodeURIComponent(`Bank Payout ${w.traderUid || w.id}`)}`;
    } else if (w.payoutUpiString) {
      upiString = w.payoutUpiString;
    } else if (w.payoutQrCode) {
      return w.payoutQrCode;
    } else {
      upiString = `upi://pay?pn=${payee}&am=${amt}&cu=INR`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
  };

  const getPayoutUpiString = (w) => {
    if (!w) return '';
    const targetAcc = (w.accountNumber || '').trim();
    const targetIfsc = (w.ifsc || '').trim().toUpperCase();
    const payee = encodeURIComponent(w.accountHolder || w.traderName || 'Trader');
    const amt = Number(w.amount || 0);
    if (targetAcc && targetIfsc) {
      return `upi://pay?pa=${targetAcc}@${targetIfsc}.ifsc.npci&pn=${payee}&am=${amt}&cu=INR&tn=${encodeURIComponent(`Bank Payout ${w.traderUid || w.id}`)}`;
    }
    if (w.payoutUpiString) return w.payoutUpiString;
    return `upi://pay?pn=${payee}&am=${amt}&cu=INR`;
  };

  const copyToClipboard = (text, label = 'Copied') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      swalToast(`${label} copied to clipboard!`);
    } else {
      swalToast(text);
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      w.traderName.toLowerCase().includes(q) ||
      w.traderUid.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      w.upiId?.toLowerCase().includes(q) ||
      w.bankName?.toLowerCase().includes(q) ||
      w.impsRef?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportWithdrawalsExcel = () => {
    const headers = [
      { label: 'Payout ID', accessor: 'id' },
      { label: 'Trader UID', accessor: 'traderUid' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Payout Amount (INR)', accessor: (w) => `₹${w.amount}` },
      { label: 'Destination Rail', accessor: 'destinationType' },
      { label: 'Account / UPI Details', accessor: (w) => w.upiId || `${w.bankName} (${w.accountNumber})` },
      { label: 'IFSC Code', accessor: (w) => w.ifsc || 'N/A' },
      { label: 'IMPS Ref Number', accessor: (w) => w.impsRef || 'Pending' },
      { label: 'Request Timestamp', accessor: 'time' },
      { label: 'Payout Status', accessor: 'status' },
    ];
    exportToExcel('PAYNEX_Withdrawals_Disbursement_Ledger', headers, filteredWithdrawals);
    swalToast('Withdrawals Ledger exported to Excel');
  };

  const handleConfirmRelease = async (item) => {
    const confirmed = await showConfirmDialog(
      'Release Payout via IMPS',
      `Dispatch <strong>₹${item.amount.toLocaleString('en-IN')}</strong> to <strong>${item.traderName}</strong> (${item.destinationType === 'UPI' ? item.upiId : item.accountNumber || item.upiId})?`,
      'DISPATCH PAYOUT',
      'CANCEL'
    );
    if (!confirmed) return;

    const generatedImps = `IMPS${Date.now().toString().slice(-8)}`;

    try {
      const res = await adminApi.releaseWithdrawal(item._id || item.id, generatedImps);
      const finalImps = res.withdrawal?.impsRef || generatedImps;

      setWithdrawals((prev) =>
        prev.map((w) =>
          (w._id && item._id && w._id === item._id) || w.id === item.id
            ? { ...w, status: 'Completed', impsRef: finalImps, ...(res.withdrawal || {}) }
            : w
        )
      );

      setKpis((prev) => {
        const newPaid = (prev.totalPaidOut || 0) + item.amount;
        const currentInvested = prev.totalUserInvested || 0;
        return {
          ...prev,
          pendingWithdrawalsAmount: Math.max(0, prev.pendingWithdrawalsAmount - item.amount),
          pendingWithdrawalsCount: Math.max(0, prev.pendingWithdrawalsCount - 1),
          totalPaidOut: newPaid,
          netPlatformProfit: currentInvested - newPaid,
        };
      });

      showSuccessAlert(
        'Payout Dispatched via IMPS',
        res.message || `₹${item.amount.toLocaleString('en-IN')} successfully released to ${item.traderName}.<br/><br/><span style="font-family:monospace; color:#f59e0b;">Ref: ${finalImps}</span>`
      );
      setReleaseModalItem(null);
    } catch (err) {
      console.error('Backend release withdrawal error:', err);
      swalToast(err.message || 'Failed to release withdrawal on backend', 'error');
    }
  };

  const handleRejectWithdrawal = async (item) => {
    const confirmed = await showConfirmDialog(
      'Reject Withdrawal Payout',
      `Decline payout <strong>${item.id}</strong> (₹${item.amount.toLocaleString('en-IN')}) and refund to ${item.traderName}'s wallet?`,
      'REJECT & REFUND',
      'CANCEL'
    );
    if (!confirmed) return;

    try {
      const res = await adminApi.rejectWithdrawal(item._id || item.id);

      setWithdrawals((prev) =>
        prev.map((w) =>
          (w._id && item._id && w._id === item._id) || w.id === item.id
            ? { ...w, status: 'Rejected', ...(res.withdrawal || {}) }
            : w
        )
      );

      setTraders((prev) =>
        prev.map((u) => {
          if (u.uid === item.traderUid || (u._id && item.userId && u._id === item.userId)) {
            return { ...u, balance: res.newBalance !== undefined ? res.newBalance : u.balance + item.amount };
          }
          return u;
        })
      );

      setKpis((prev) => ({
        ...prev,
        pendingWithdrawalsAmount: Math.max(0, prev.pendingWithdrawalsAmount - item.amount),
        pendingWithdrawalsCount: Math.max(0, prev.pendingWithdrawalsCount - 1),
      }));

      swalToast(
        res.message || `Payout ${item.id} rejected. ₹${item.amount.toLocaleString('en-IN')} refunded to ${item.traderName}'s wallet.`,
        'info'
      );
    } catch (err) {
      console.error('Backend reject withdrawal error:', err);
      swalToast(err.message || 'Failed to reject withdrawal on backend', 'error');
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === 'Pending').length;

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
            Withdrawal Payouts Desk
          </span>
          <span className="square-badge badge-red">
            {pendingCount} Due for Settlement
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="square-input"
            style={{ height: '32px', fontSize: '12px', padding: '4px 10px' }}
          >
            <option value="All">All Requests</option>
            <option value="Pending">Pending Only</option>
            <option value="Completed">Completed Only</option>
            <option value="Rejected">Rejected Only</option>
          </select>

          <button onClick={handleExportWithdrawalsExcel} className="square-btn-excel" style={{ height: '32px' }}>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Classic Excel Data Grid Table */}
      <div className="square-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Trader</th>
                <th>Amount (INR)</th>
                <th>Channel</th>
                <th>Beneficiary Details</th>
                <th>IMPS Ref</th>
                <th>Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '36px 14px', textAlign: 'center', color: '#8b9bb4', fontSize: '13px' }}>
                    No withdrawal payout requests found. New withdrawal requests from traders will appear here live!
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    {w.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{w.traderName}</div>
                    <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>{w.traderUid}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
                    ₹{w.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="square-badge badge-gray">{w.destinationType}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        onClick={() => setReleaseModalItem(w)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px',
                          background: '#fff',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
                          border: '1.5px solid #f59e0b',
                          flexShrink: 0,
                          transition: 'transform 0.15s ease',
                        }}
                        title="Click to view Dynamic Payout QR Code (Exact Amount Encoded)"
                      >
                        <img
                          src={getPayoutQrUrl(w)}
                          alt="QR"
                          style={{ width: '34px', height: '34px', display: 'block', borderRadius: '2px' }}
                        />
                      </div>
                      <div>
                        <div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{w.bankName || 'Bank'} ({w.accountNumber || 'N/A'})</div>
                          <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>
                            IFSC: <strong style={{ color: '#38bdf8' }}>{w.ifsc || 'N/A'}</strong> • Holder: {w.accountHolder || w.traderName}
                          </div>
                        </div>
                        <span
                          style={{ fontSize: '10.5px', color: '#f59e0b', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setReleaseModalItem(w)}
                        >
                          <QrCode size={11} /> Scan Payout QR (₹{w.amount.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11.5px', color: w.impsRef ? '#10b981' : '#64748b' }}>
                    {w.impsRef || '—'}
                  </td>
                  <td style={{ fontSize: '11px', color: '#8b9bb4' }}>
                    {w.time}
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        w.status === 'Completed'
                          ? 'badge-green'
                          : w.status === 'Pending'
                          ? 'badge-red'
                          : 'badge-gray'
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {w.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => setReleaseModalItem(w)}
                          className="square-btn-primary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                          }}
                          title="Scan dynamic QR code with exact payout amount pre-filled"
                        >
                          <QrCode size={13} />
                          <span>Scan QR (₹{w.amount.toLocaleString('en-IN')})</span>
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(w)}
                          className="square-btn-danger"
                          style={{ padding: '6px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '11.5px', color: w.status === 'Completed' ? '#10b981' : '#64748b', fontWeight: 600 }}>
                        {w.status === 'Completed' ? 'Disbursed' : 'Rejected'}
                      </div>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Confirmation & Scan-to-Pay QR Modal */}
      {releaseModalItem && (
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
            if (e.target === e.currentTarget) setReleaseModalItem(null);
          }}
        >
          <div
            className="square-card"
            style={{
              width: '490px',
              maxWidth: '96vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '24px',
              background: '#0d111a',
              border: '1.5px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={20} color="#f59e0b" />
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>
                    Scan & Pay Withdrawal Payout
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '4px' }}>
                  Payout #{releaseModalItem.id} • Trader: <strong style={{ color: '#fff' }}>{releaseModalItem.traderName}</strong> ({releaseModalItem.traderUid})
                </div>
              </div>
              <button
                onClick={() => setReleaseModalItem(null)}
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

            {/* Dynamic QR Showcase */}
            <div
              style={{
                background: 'linear-gradient(180deg, #131926 0%, #0a0d15 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '16px',
                position: 'relative',
              }}
            >
              {/* Amount Banner */}
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #f59e0b',
                  borderRadius: '20px',
                  padding: '4px 14px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} /> EXACT PAYOUT: ₹{releaseModalItem.amount.toLocaleString('en-IN')} AUTO-ENCODED
                </span>
              </div>

              {/* QR Image Frame */}
              <div
                style={{
                  width: '210px',
                  height: '210px',
                  margin: '0 auto',
                  background: '#ffffff',
                  padding: '10px',
                  borderRadius: '12px',
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.3), inset 0 0 0 1px #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={getPayoutQrUrl(releaseModalItem)}
                  alt="Dynamic Payout QR"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>

              {/* Supported UPI Apps Row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10.5px', background: '#5f259f', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  PhonePe
                </span>
                <span style={{ fontSize: '10.5px', background: '#1a73e8', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Google Pay
                </span>
                <span style={{ fontSize: '10.5px', background: '#00b9f1', color: '#000', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  Paytm
                </span>
                <span style={{ fontSize: '10.5px', background: '#006838', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  BHIM
                </span>
                <span style={{ fontSize: '10.5px', background: '#222', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid #444' }}>
                  CRED
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '12px 0 0', lineHeight: 1.4 }}>
                <strong>Admin Instruction:</strong> Scan this QR using any UPI app on your phone.
                Amount <strong style={{ color: '#f59e0b' }}>₹{releaseModalItem.amount.toLocaleString('en-IN')}</strong> and payee <strong style={{ color: '#fff' }}>{releaseModalItem.traderName}</strong> are automatically pre-filled!
              </p>
            </div>

            {/* Beneficiary Details Breakdown */}
            <div
              style={{
                background: '#090d14',
                border: '1px solid #1a2233',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>Payee Name:</span>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                  {releaseModalItem.accountHolder || releaseModalItem.traderName}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>Disbursement Rail:</span>
                <span className="square-badge badge-green flex items-center gap-1">
                  <Landmark size={12} /> IMPS Direct Bank Transfer
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>Bank Name:</span>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                  {releaseModalItem.bankName || 'Verified Bank'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>Bank Account Number:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 800, fontSize: '13px' }}>
                    {releaseModalItem.accountNumber || 'N/A'}
                  </span>
                  {releaseModalItem.accountNumber && (
                    <button
                      onClick={() => copyToClipboard(releaseModalItem.accountNumber, 'Account Number')}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#f59e0b',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Copy size={11} /> Copy A/C
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>IFSC Code:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800, fontSize: '13px' }}>
                    {releaseModalItem.ifsc || 'N/A'}
                  </span>
                  {releaseModalItem.ifsc && (
                    <button
                      onClick={() => copyToClipboard(releaseModalItem.ifsc, 'IFSC Code')}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Copy size={11} /> Copy IFSC
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8b9bb4' }}>Payout Amount:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 900, fontSize: '14px' }}>
                    ₹{Number(releaseModalItem.amount || 0).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => copyToClipboard(String(releaseModalItem.amount), 'Amount')}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <Copy size={11} /> Copy ₹
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #1a2233' }}>
                <span style={{ color: '#8b9bb4' }}>Amount to Pay:</span>
                <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 800, fontSize: '16px' }}>
                  ₹{releaseModalItem.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Quick Copy UPI String Action */}
            <div style={{ marginBottom: '18px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => copyToClipboard(getPayoutUpiString(releaseModalItem), 'UPI Deep Link URL')}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  padding: '6px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'monospace',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <Copy size={12} /> Copy Raw UPI Deep Link String
              </button>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => handleRejectWithdrawal(releaseModalItem)}
                className="square-btn-danger"
                style={{ padding: '9px 14px', fontSize: '12px', cursor: 'pointer' }}
              >
                Reject & Refund
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setReleaseModalItem(null)}
                  className="square-btn-secondary"
                  style={{ padding: '9px 14px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  onClick={() => handleConfirmRelease(releaseModalItem)}
                  className="square-btn-primary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
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
                  <Check size={14} strokeWidth={3} /> I Have Paid / Release IMPS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
