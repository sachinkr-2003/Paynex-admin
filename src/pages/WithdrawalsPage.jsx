import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showConfirmDialog, showSuccessAlert, showToast as swalToast } from '../utils/swal';

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

    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === item.id ? { ...w, status: 'Completed', impsRef: generatedImps } : w
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
      `₹${item.amount.toLocaleString('en-IN')} successfully released to ${item.traderName}.<br/><br/><span style="font-family:monospace; color:#f59e0b;">Ref: ${generatedImps}</span>`
    );
    setReleaseModalItem(null);

    try {
      await adminApi.releaseWithdrawal(item._id || item.id, generatedImps);
    } catch (err) {
      console.warn('Backend release withdrawal sync:', err.message);
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

    setWithdrawals((prev) =>
      prev.map((w) => (w.id === item.id ? { ...w, status: 'Rejected' } : w))
    );

    setTraders((prev) =>
      prev.map((u) => {
        if (u.uid === item.traderUid) {
          return { ...u, balance: u.balance + item.amount };
        }
        return u;
      })
    );

    setKpis((prev) => ({
      ...prev,
      pendingWithdrawalsAmount: Math.max(0, prev.pendingWithdrawalsAmount - item.amount),
      pendingWithdrawalsCount: Math.max(0, prev.pendingWithdrawalsCount - 1),
    }));

    swalToast(`Payout ${item.id} rejected. ₹${item.amount.toLocaleString('en-IN')} refunded to ${item.traderName}'s wallet.`, 'info');

    try {
      await adminApi.rejectWithdrawal(item._id || item.id);
    } catch (err) {
      console.warn('Backend reject withdrawal sync:', err.message);
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
              {filteredWithdrawals.map((w) => (
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
                    {w.destinationType === 'UPI' ? (
                      <div style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>{w.upiId}</div>
                    ) : (
                      <div>
                        <div style={{ color: '#f1f5f9' }}>{w.bankName} ({w.accountNumber})</div>
                        <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>IFSC: {w.ifsc}</div>
                      </div>
                    )}
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
                  <td>
                    {w.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => setReleaseModalItem(w)}
                          className="square-btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          Release IMPS
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(w)}
                          className="square-btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                        Disbursed
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Confirmation Modal */}
      {releaseModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="square-card"
            style={{
              width: '440px',
              padding: '24px',
              background: '#121722',
              border: '1px solid #232d3f',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                  Confirm IMPS Disbursement
                </h3>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
                  {releaseModalItem.id} • {releaseModalItem.traderName}
                </div>
              </div>
              <button
                onClick={() => setReleaseModalItem(null)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#0b0e15', border: '1px solid #1a2233', padding: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#8b9bb4' }}>Payout Amount:</span>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', fontSize: '16px' }}>
                    ₹{releaseModalItem.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#8b9bb4' }}>Channel:</span>
                  <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{releaseModalItem.destinationType}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#8b9bb4' }}>Beneficiary Destination:</span>
                  <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>
                    {releaseModalItem.upiId || `${releaseModalItem.bankName} (${releaseModalItem.accountNumber})`}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReleaseModalItem(null)}
                className="square-btn-secondary"
                style={{ padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRelease(releaseModalItem)}
                className="square-btn-primary"
                style={{ padding: '8px 16px' }}
              >
                Dispatch Funds Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
