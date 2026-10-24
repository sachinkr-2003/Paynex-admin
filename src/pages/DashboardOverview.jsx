import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';

export default function DashboardOverview({
  kpis,
  setKpis,
  traders = [],
  deposits = [],
  withdrawals = [],
  gameRounds = [],
  setActiveTab = () => {},
  showToast = () => {},
}) {
  const pendingDeposits = deposits.filter((d) => d.status === 'Pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'Pending');

  const pendingDepositsAmount = pendingDeposits.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );
  const pendingWithdrawalsAmount = pendingWithdrawals.reduce(
    (sum, w) => sum + (Number(w.amount) || 0),
    0
  );

  const handleExportRoundsExcel = () => {
    const headers = [
      { label: 'Round ID', accessor: 'id' },
      { label: 'Stock / Asset', accessor: 'asset' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Staked (INR)', accessor: (r) => `₹${r.stakedAmount}` },
      { label: 'Return Rate', accessor: (r) => `+${r.returnPercent}%` },
      { label: 'Profit (INR)', accessor: (r) => `₹${r.profit}` },
      { label: 'Total Payout (INR)', accessor: (r) => `₹${r.payout}` },
      { label: 'Status', accessor: 'status' },
      { label: 'Timestamp', accessor: 'time' },
    ];
    exportToExcel('PAYNEX_Live_Trading_Rounds', headers, gameRounds);
    showToast('📊 Trading rounds log exported to Excel (.csv)');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* 1. Header Bar with Direct Quick Jump Shortcuts */}
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
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
            System Dashboard Overview
          </div>
          <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
            Real-time live monitoring of deposits, payouts, stocks and active trading
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('stocks_manager')}
            className="square-btn-primary"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            📈 Stocks & Return % (50+)
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className="square-btn-secondary"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            💳 Deposits ({pendingDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className="square-btn-secondary"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            🏧 Withdrawals ({pendingWithdrawals.length})
          </button>
        </div>
      </div>

      {/* 2. Four Genuine, Core KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Deposit Requests (Pending Action) */}
        <div
          onClick={() => setActiveTab('deposits')}
          className="square-card"
          style={{
            padding: '18px',
            borderLeft: pendingDeposits.length > 0 ? '4px solid #f59e0b' : '1px solid #1e2638',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Deposits
            </span>
            <span style={{ fontSize: '15px' }}>💳</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace', marginTop: '8px' }}>
            {pendingDeposits.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8b9bb4' }}>
              (₹{pendingDepositsAmount.toLocaleString('en-IN')})
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: pendingDeposits.length > 0 ? '#fbbf24' : '#10b981', marginTop: '6px', fontWeight: 600 }}>
            {pendingDeposits.length > 0 ? '⚠️ Action Required: Verify UTR & Credit' : '✅ All deposits verified'}
          </div>
        </div>

        {/* Card 2: Withdrawal Payouts (Pending Action) */}
        <div
          onClick={() => setActiveTab('withdrawals')}
          className="square-card"
          style={{
            padding: '18px',
            borderLeft: pendingWithdrawals.length > 0 ? '4px solid #ef4444' : '1px solid #1e2638',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Payouts
            </span>
            <span style={{ fontSize: '15px' }}>🏧</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', marginTop: '8px' }}>
            {pendingWithdrawals.length}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#8b9bb4' }}>
              (₹{pendingWithdrawalsAmount.toLocaleString('en-IN')})
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: pendingWithdrawals.length > 0 ? '#f87171' : '#10b981', marginTop: '6px', fontWeight: 600 }}>
            {pendingWithdrawals.length > 0 ? '⚠️ IMPS Payouts Waiting Approval' : '✅ Zero pending payouts'}
          </div>
        </div>

        {/* Card 3: Stock Assets & Interest Engine */}
        <div
          onClick={() => setActiveTab('stocks_manager')}
          className="square-card"
          style={{
            padding: '18px',
            borderLeft: '4px solid #10b981',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Stocks Catalog
            </span>
            <span style={{ fontSize: '15px' }}>📈</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', marginTop: '8px' }}>
            50+ Assets
          </div>
          <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '6px' }}>
            Tata Motors (40%), Tesla (45%), Reliance (22%)
          </div>
        </div>

        {/* Card 4: Registered Users */}
        <div
          onClick={() => setActiveTab('users')}
          className="square-card"
          style={{
            padding: '18px',
            borderLeft: '4px solid #0284c7',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Traders
            </span>
            <span style={{ fontSize: '15px' }}>👥</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', marginTop: '8px' }}>
            {traders.length || kpis.totalTraders}{' '}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>
              ● {kpis.activeTradersNow || 2} Active
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginTop: '6px' }}>
            Click to manage trader wallets & KYC
          </div>
        </div>
      </div>

      {/* 3. High-Priority Alert Strip (Only visible if approvals pending) */}
      {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
        <div
          className="square-card"
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)',
            borderLeft: '4px solid #f59e0b',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                Pending Actions Require Admin Approval
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                You have {pendingDeposits.length} deposit requests and {pendingWithdrawals.length} withdrawal requests waiting.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {pendingDeposits.length > 0 && (
              <button
                onClick={() => setActiveTab('deposits')}
                style={{
                  padding: '6px 12px',
                  background: '#f59e0b',
                  color: '#000',
                  border: 'none',
                  borderRadius: '0px',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Approve Deposits →
              </button>
            )}
            {pendingWithdrawals.length > 0 && (
              <button
                onClick={() => setActiveTab('withdrawals')}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0px',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Approve Withdrawals →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Live Recent Trading Activity Table */}
      <div className="square-card" style={{ padding: '18px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Recent Staking & Trading Activity
            </div>
            <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
              Real-time user bets and return payouts on active stocks
            </div>
          </div>
          <button
            onClick={handleExportRoundsExcel}
            className="square-btn-excel"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Export Activity Log (.csv)
          </button>
        </div>

        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>Round ID</th>
                <th>Stock / Asset</th>
                <th>Trader</th>
                <th>Stake (INR)</th>
                <th>Return %</th>
                <th>Net Profit</th>
                <th>Total Payout</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {gameRounds.slice(0, 15).map((round) => (
                <tr key={round.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    {round.id}
                  </td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>
                    {round.asset}
                  </td>
                  <td style={{ color: '#d1d9e6' }}>
                    {round.traderName}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#ffffff' }}>
                    ₹{round.stakedAmount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="square-badge badge-gold">
                      +{round.returnPercent}%
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>
                    +₹{round.profit.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                    ₹{round.payout.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        round.status === 'Active' ? 'badge-green' : 'badge-gray'
                      }`}
                    >
                      {round.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8b9bb4' }}>
                    {round.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
