import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';

export default function DashboardOverview({
  kpis,
  setKpis,
  traders,
  deposits,
  withdrawals,
  gameRounds,
  setActiveTab,
  showToast,
}) {
  const [rateInput, setRateInput] = useState(kpis.adminProfitPercent);

  const pendingDeposits = deposits.filter((d) => d.status === 'Pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'Pending');

  const handleUpdateRate = (newRate) => {
    setKpis((prev) => ({ ...prev, adminProfitPercent: newRate }));
    setRateInput(newRate);
    try {
      localStorage.setItem('paynex_admin_percent', String(newRate));
    } catch {}
    showToast(`⚡ Staking Engine rate updated to +${newRate}% Guaranteed`);
  };

  const handleExportOverviewExcel = () => {
    const headers = [
      { label: 'Metric', accessor: 'metric' },
      { label: 'Value', accessor: 'val' },
      { label: 'Status / Notes', accessor: 'notes' },
    ];
    const rows = [
      { metric: 'Total Platform Turnover', val: `₹${kpis.totalPlatformVolume.toLocaleString('en-IN')}`, notes: 'Cumulative volume' },
      { metric: 'Live Staking Pool Disbursed', val: `₹${kpis.liveStakingPool.toLocaleString('en-IN')}`, notes: 'Current round payout reservoir' },
      { metric: 'Total Registered Traders', val: kpis.totalTraders, notes: 'Active trading community' },
      { metric: 'Deposits (Today)', val: `₹${kpis.depositsToday.toLocaleString('en-IN')}`, notes: `${pendingDeposits.length} pending verification` },
      { metric: 'Pending Withdrawals', val: `₹${kpis.pendingWithdrawalsAmount.toLocaleString('en-IN')}`, notes: `${pendingWithdrawals.length} waiting for IMPS release` },
      { metric: 'Guaranteed Return Engine Rate', val: `+${kpis.adminProfitPercent}%`, notes: 'Fixed payout multiplier' },
    ];
    exportToExcel('PAYNEX_Dashboard_KPI_Report', headers, rows);
    showToast('📊 KPI Report exported to Excel (.csv)');
  };

  const handleExportRoundsExcel = () => {
    const headers = [
      { label: 'Round ID', accessor: 'id' },
      { label: 'Asset', accessor: 'asset' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Staked (INR)', accessor: (r) => `₹${r.stakedAmount}` },
      { label: 'Return Rate', accessor: (r) => `+${r.returnPercent}%` },
      { label: 'Profit (INR)', accessor: (r) => `₹${r.profit}` },
      { label: 'Total Payout (INR)', accessor: (r) => `₹${r.payout}` },
      { label: 'Status', accessor: 'status' },
      { label: 'Timestamp', accessor: 'time' },
    ];
    exportToExcel('PAYNEX_Live_Staking_Rounds', headers, gameRounds);
    showToast('📊 Staking Rounds exported to Excel (.csv)');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Clean Quick Action Ribbon */}
      <div
        className="square-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: '#0e131d',
          border: '1px solid #1a2233',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
            ⚡ System Live Hub
          </span>
          <span style={{ color: '#2a354d' }}>•</span>
          <span style={{ fontSize: '12px', color: '#8b9bb4' }}>
            Multiplayer Room: <strong style={{ color: '#f1f5f9' }}>{kpis.totalTraders} Stakers</strong>
          </span>
          <span style={{ color: '#2a354d' }}>•</span>
          <span style={{ fontSize: '12px', color: '#10b981' }}>
            ● {kpis.activeTradersNow} Online Now
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('deposits')}
            className="square-btn-secondary"
            style={{ padding: '5px 12px', fontSize: '11.5px' }}
          >
            Review Deposits ({pendingDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className="square-btn-secondary"
            style={{ padding: '5px 12px', fontSize: '11.5px' }}
          >
            Review Payouts ({pendingWithdrawals.length})
          </button>
        </div>
      </div>

      {/* 6 Classic KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Card 1: Total Volume */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Platform Volume
            </span>
            <span style={{ fontSize: '14px', color: '#8b9bb4' }}>📈</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', marginTop: '6px' }}>
            ₹{kpis.totalPlatformVolume.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
            +18.4% this week
          </div>
        </div>

        {/* Card 2: Live Staking Pool */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Live Staking Pool
            </span>
            <span style={{ fontSize: '14px', color: '#8b9bb4' }}>⚡</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#06b6d4', fontFamily: 'monospace', marginTop: '6px' }}>
            ₹{kpis.liveStakingPool.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '4px' }}>
            Active round payout pool
          </div>
        </div>

        {/* Card 3: Registered Traders */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Traders
            </span>
            <span style={{ fontSize: '14px', color: '#8b9bb4' }}>👥</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', marginTop: '6px' }}>
            {kpis.totalTraders.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
            ● {kpis.activeTradersNow} online now
          </div>
        </div>

        {/* Card 4: Deposits (24h) */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Deposits (24h)
            </span>
            <span style={{ fontSize: '14px', color: '#8b9bb4' }}>💳</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', marginTop: '6px' }}>
            ₹{kpis.depositsToday.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '4px' }}>
            {pendingDeposits.length} pending review
          </div>
        </div>

        {/* Card 5: Withdrawals Due */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Withdrawals
            </span>
            <span style={{ fontSize: '14px', color: '#8b9bb4' }}>🏧</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', marginTop: '6px' }}>
            ₹{kpis.pendingWithdrawalsAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', fontWeight: 500 }}>
            {pendingWithdrawals.length} IMPS requests waiting
          </div>
        </div>

        {/* Card 6: Fixed Return Rate */}
        <div className="square-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#8b9bb4', fontWeight: 600, textTransform: 'uppercase' }}>
              Return Engine
            </span>
            <span style={{ fontSize: '14px', color: '#f59e0b' }}>⚡</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', marginTop: '6px' }}>
            +{kpis.adminProfitPercent}%
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
            Guaranteed Fixed Payout
          </div>
        </div>
      </div>

      {/* Classic Return Rate Engine Box */}
      <div className="square-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Staking Return Rate Controller
            </div>
            <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
              Admin profit return percentage (e.g. ₹5,000 stake earns +{kpis.adminProfitPercent}% = ₹{(5000 * (1 + kpis.adminProfitPercent / 100)).toLocaleString('en-IN')})
            </div>
          </div>
          <span className="square-badge badge-gold" style={{ fontSize: '11px', padding: '4px 8px' }}>
            Current Rate: +{kpis.adminProfitPercent}%
          </span>
        </div>

        {/* Preset Buttons + Custom Input */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#8b9bb4', marginRight: '4px' }}>Quick Presets:</span>
          {[15, 20, 25, 30, 40, 50, 75, 100].map((rate) => {
            const isCur = kpis.adminProfitPercent === rate;
            return (
              <button
                key={rate}
                onClick={() => handleUpdateRate(rate)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '0px',
                  border: isCur ? '1px solid #f59e0b' : '1px solid #1e2638',
                  background: isCur ? '#f59e0b' : '#141a26',
                  color: isCur ? '#0b0e14' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                +{rate}%
              </button>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', color: '#8b9bb4' }}>Custom:</span>
            <input
              type="number"
              min="1"
              max="200"
              placeholder="30"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="square-input"
              style={{ width: '65px', padding: '5px 8px', fontSize: '12px', textAlign: 'center' }}
            />
            <button
              onClick={() => {
                const val = Number(rateInput);
                if (val > 0) handleUpdateRate(val);
              }}
              className="square-btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Live Staking Rounds Excel Grid */}
      <div className="square-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Live Staking Rounds
            </div>
            <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
              Real-time trading rounds and automated +{kpis.adminProfitPercent}% payouts
            </div>
          </div>
          <button onClick={handleExportRoundsExcel} className="square-btn-excel" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Export Rounds (Excel)
          </button>
        </div>

        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>Round ID</th>
                <th>Asset</th>
                <th>Trader</th>
                <th>Stake (INR)</th>
                <th>Return Rate</th>
                <th>Profit (INR)</th>
                <th>Total Payout</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {gameRounds.map((round) => (
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
