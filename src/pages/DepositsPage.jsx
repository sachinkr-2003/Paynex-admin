import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showConfirmDialog, showSuccessAlert, showToast as swalToast } from '../utils/swal';

export default function DepositsPage({
  deposits,
  setDeposits,
  traders,
  setTraders,
  setKpis,
  showToast,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewProofModal, setViewProofModal] = useState(null);

  const filteredDeposits = deposits.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      d.traderName.toLowerCase().includes(q) ||
      d.traderUid.toLowerCase().includes(q) ||
      d.utr.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportDepositsExcel = () => {
    const headers = [
      { label: 'Transaction ID', accessor: 'id' },
      { label: 'Trader UID', accessor: 'traderUid' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Deposit Amount (INR)', accessor: (d) => `₹${d.amount}` },
      { label: 'Payment Method', accessor: 'method' },
      { label: '12-Digit UTR / Ref No', accessor: 'utr' },
      { label: 'Date & Time', accessor: 'time' },
      { label: 'Approval Status', accessor: 'status' },
    ];
    exportToExcel('PAYNEX_Deposits_Audit_Ledger', headers, filteredDeposits);
    swalToast('Deposits Excel Ledger downloaded');
  };

  const handleApproveDeposit = async (deposit) => {
    if (deposit.status === 'Approved') return;

    const confirmed = await showConfirmDialog(
      'Approve Deposit Payment',
      `Verify 12-digit UTR <strong>${deposit.utr}</strong> and credit <strong>₹${deposit.amount.toLocaleString('en-IN')}</strong> to <strong>${deposit.traderName}</strong>?`,
      'APPROVE & CREDIT',
      'CANCEL'
    );
    if (!confirmed) return;

    setDeposits((prev) =>
      prev.map((d) => (d.id === deposit.id ? { ...d, status: 'Approved' } : d))
    );

    setTraders((prev) =>
      prev.map((u) => {
        if (u.uid === deposit.traderUid) {
          return { ...u, balance: u.balance + deposit.amount };
        }
        return u;
      })
    );

    setKpis((prev) => {
      const newInvested = (prev.totalUserInvested || 0) + deposit.amount;
      const currentPaid = prev.totalPaidOut || 0;
      return {
        ...prev,
        depositsToday: (prev.depositsToday || 0) + deposit.amount,
        totalPlatformVolume: (prev.totalPlatformVolume || 0) + deposit.amount,
        totalUserInvested: newInvested,
        netPlatformProfit: newInvested - currentPaid,
      };
    });

    showSuccessAlert(
      'Deposit Approved & Credited',
      `₹${deposit.amount.toLocaleString('en-IN')} has been added to ${deposit.traderName}'s live wallet balance.`
    );

    try {
      await adminApi.approveDeposit(deposit._id || deposit.id);
    } catch (err) {
      console.warn('Backend deposit approve sync:', err.message);
    }
  };

  const handleRejectDeposit = async (deposit) => {
    if (deposit.status === 'Rejected') return;

    const confirmed = await showConfirmDialog(
      'Reject Deposit Request',
      `Decline deposit <strong>${deposit.id}</strong> (₹${deposit.amount.toLocaleString('en-IN')}) from ${deposit.traderName}?`,
      'REJECT DEPOSIT',
      'CANCEL'
    );
    if (!confirmed) return;

    setDeposits((prev) =>
      prev.map((d) => (d.id === deposit.id ? { ...d, status: 'Rejected' } : d))
    );
    swalToast(`Deposit ${deposit.id} rejected`, 'error');

    try {
      await adminApi.rejectDeposit(deposit._id || deposit.id);
    } catch (err) {
      console.warn('Backend deposit reject sync:', err.message);
    }
  };

  const pendingCount = deposits.filter((d) => d.status === 'Pending' || d.status === 'Under Review').length;
  const underReviewCount = deposits.filter((d) => d.status === 'Under Review').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-time Under Review Queue Alert */}
      {underReviewCount > 0 && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b' }}>
                {underReviewCount} UTR Submission(s) Awaiting Review
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Traders have submitted 12-digit UTR references via UPI Gateway. Check bank statement and approve to credit wallet balance.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('Under Review')}
            className="square-btn-primary"
            style={{ fontSize: '11.5px', padding: '6px 12px' }}
          >
            Filter Under Review ({underReviewCount})
          </button>
        </div>
      )}

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
            Deposit Verification Queue
          </span>
          <span className="square-badge badge-cyan">
            {pendingCount} Total In Queue
          </span>
          {underReviewCount > 0 && (
            <span className="square-badge badge-gold" style={{ animation: 'pulse 2s infinite' }}>
              🟡 {underReviewCount} Under Review
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="square-input"
            style={{ height: '32px', fontSize: '12px', padding: '4px 10px' }}
          >
            <option value="All">All Transactions</option>
            <option value="Under Review">🟡 Under Review Only ({underReviewCount})</option>
            <option value="Pending">Pending Only</option>
            <option value="Approved">Approved Only</option>
            <option value="Rejected">Rejected Only</option>
          </select>

          <button onClick={handleExportDepositsExcel} className="square-btn-excel" style={{ height: '32px' }}>
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
                <th>Txn ID</th>
                <th>Trader</th>
                <th>Amount (INR)</th>
                <th>Method</th>
                <th>12-Digit UTR</th>
                <th>Receipt Proof</th>
                <th>Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px 14px', textAlign: 'center', color: '#8b9bb4', fontSize: '13px' }}>
                    💳 No deposits recorded yet. New incoming user deposits will appear here live!
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    {d.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{d.traderName}</div>
                    <div style={{ fontSize: '11px', color: '#8b9bb4', fontFamily: 'monospace' }}>{d.traderUid}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                    ₹{d.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="square-badge badge-gray">{d.method}</span>
                    {d.companyName && (
                      <div style={{ fontSize: '10.5px', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
                        🏢 {d.companyName}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: '#f1f5f9', fontWeight: 500 }}>
                    {d.utr}
                  </td>
                  <td>
                    <button
                      onClick={() => setViewProofModal(d)}
                      className="square-btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      View Slip
                    </button>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8b9bb4' }}>
                    {d.time}
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        d.status === 'Approved'
                          ? 'badge-green'
                          : d.status === 'Under Review'
                          ? 'badge-gold'
                          : d.status === 'Pending'
                          ? 'badge-cyan'
                          : 'badge-red'
                      }`}
                      style={d.status === 'Under Review' ? { animation: 'pulse 2s infinite', fontWeight: 800 } : {}}
                    >
                      {d.status === 'Under Review' ? '🟡 Under Review' : d.status}
                    </span>
                  </td>
                  <td>
                    {d.status === 'Pending' || d.status === 'Under Review' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleApproveDeposit(d)}
                          className="square-btn-success"
                          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleRejectDeposit(d)}
                          className="square-btn-danger"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                        Settled
                      </div>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip / Proof Modal */}
      {viewProofModal && (
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
              width: '460px',
              padding: '24px',
              background: '#121722',
              border: '1px solid #232d3f',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                  Payment Receipt Slip
                </h3>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
                  {viewProofModal.id} • {viewProofModal.traderName}
                </div>
              </div>
              <button
                onClick={() => setViewProofModal(null)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#0b0e15', border: '1px solid #1a2233', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#8b9bb4' }}>Amount:</span>
                  <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    ₹{viewProofModal.amount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#8b9bb4' }}>Method:</span>
                  <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{viewProofModal.method}</div>
                </div>
                <div>
                  <span style={{ color: '#8b9bb4' }}>12-Digit UTR:</span>
                  <div style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 600 }}>
                    {viewProofModal.utr}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#8b9bb4' }}>Status:</span>
                  <div>
                    <span className="square-badge badge-gold">{viewProofModal.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#0d111a',
                border: '1px dashed #232d3f',
                height: '140px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                color: '#8b9bb4',
                fontSize: '12px',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
              <div>Bank Transfer Reference Slip Verified</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Ref: {viewProofModal.utr}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewProofModal(null)}
                className="square-btn-secondary"
                style={{ padding: '8px 14px' }}
              >
                Close
              </button>
              {viewProofModal.status === 'Pending' && (
                <button
                  onClick={() => {
                    handleApproveDeposit(viewProofModal);
                    setViewProofModal(null);
                  }}
                  className="square-btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Approve & Credit Balance
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
