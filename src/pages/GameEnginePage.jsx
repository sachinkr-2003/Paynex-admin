import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showAdminSuccess, showAdminWarning, showAdminError } from '../utils/swal';

export default function GameEnginePage({
  kpis,
  setKpis,
  gameRounds,
  setGameRounds,
  showToast,
  searchQuery = '',
  setActiveTab = () => {},
}) {
  const [selectedRate, setSelectedRate] = useState(kpis.adminProfitPercent);
  const [customRate, setCustomRate] = useState('');
  const [assetFilter, setAssetFilter] = useState('All');

  const filteredRounds = gameRounds.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.traderName.toLowerCase().includes(q) ||
      r.asset.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q);

    const matchesAsset = assetFilter === 'All' || r.asset.includes(assetFilter);
    return matchesSearch && matchesAsset;
  });

  const handleApplyRate = async (rate) => {
    const num = Number(rate);
    if (!num || num < 1 || num > 500) {
      showAdminWarning('Invalid Rate', 'Please enter a valid rate between 1% and 500%.');
      return;
    }
    setSelectedRate(num);
    setKpis((prev) => ({ ...prev, adminProfitPercent: num }));
    try {
      localStorage.setItem('paynex_admin_percent', String(num));
    } catch {}

    try {
      await adminApi.updateEngineRate(num);
      showAdminSuccess('Engine Rate Updated', `Staking Engine Rate locked at +${num}% guaranteed across all platforms.`);
    } catch (err) {
      showAdminError('Rate Sync Warning', err.message);
    }
  };

  const handleExportEngineExcel = () => {
    const headers = [
      { label: 'Round ID', accessor: 'id' },
      { label: 'Crypto Asset', accessor: 'asset' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Staked Capital (INR)', accessor: (r) => `₹${r.stakedAmount}` },
      { label: 'Fixed Profit %', accessor: (r) => `+${r.returnPercent}%` },
      { label: 'Net Profit (INR)', accessor: (r) => `₹${r.profit}` },
      { label: 'Guaranteed Payout (INR)', accessor: (r) => `₹${r.payout}` },
      { label: 'Round Duration', accessor: (r) => `${r.durationSeconds}s` },
      { label: 'Status', accessor: 'status' },
      { label: 'Timestamp', accessor: 'time' },
    ];
    exportToExcel('PAYNEX_Staking_Engine_Log', headers, filteredRounds);
    showToast('📊 Staking Engine log exported to Excel');
  };

  const activeRoundsCount = gameRounds.filter((r) => r.status === 'Active').length;

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
            Staking Return Engine Controller
          </span>
          <span className="square-badge badge-gold">
            Current Rate: +{kpis.adminProfitPercent}%
          </span>
          <span className="square-badge badge-green">
            {activeRoundsCount} Active Rounds
          </span>
        </div>

        <button onClick={handleExportEngineExcel} className="square-btn-excel" style={{ height: '32px' }}>
          Export Engine Log
        </button>
      </div>

      {/* Stock-specific Return % Shortcut Banner */}
      <div
        className="square-card"
        style={{
          padding: '12px 18px',
          background: 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(14,165,233,0.05) 100%)',
          borderLeft: '4px solid #10b981',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>📈</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
              Want to set different Profit / Return % for individual Stocks?
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Configure Tata Motors (+40%), Reliance (+22%), Tesla (+45%), Gold (+18%) or Add brand new stocks.
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('stocks_manager')}
          style={{
            padding: '7px 14px',
            background: '#10b981',
            color: '#041c10',
            border: 'none',
            borderRadius: '0px',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Open Stocks & Return % Manager →
        </button>
      </div>

      {/* Controller & Calculator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Card 1: Rate Presets */}
        <div className="square-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
            Adjust Fixed Return Rate
          </div>
          <div style={{ fontSize: '12px', color: '#8b9bb4', marginBottom: '14px' }}>
            Controls user winnings multiplier (e.g. 30% means 1.3x payout)
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {[10, 15, 20, 25, 30, 40, 50, 75, 100].map((rate) => {
              const isSelected = kpis.adminProfitPercent === rate;
              return (
                <button
                  key={rate}
                  onClick={() => handleApplyRate(rate)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '0px',
                    border: isSelected ? '1px solid #f59e0b' : '1px solid #1e2638',
                    background: isSelected ? '#f59e0b' : '#141a26',
                    color: isSelected ? '#0b0e14' : '#cbd5e1',
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
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Custom % rate"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              className="square-input"
              style={{ width: '130px', fontSize: '13px' }}
            />
            <button
              onClick={() => {
                if (customRate) {
                  handleApplyRate(customRate);
                  setCustomRate('');
                }
              }}
              className="square-btn-primary"
              style={{ padding: '8px 16px' }}
            >
              Set Rate
            </button>
          </div>
        </div>

        {/* Card 2: Payout Preview */}
        <div className="square-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
            Live Stake Payout Simulation
          </div>
          <div style={{ fontSize: '12px', color: '#8b9bb4', marginBottom: '14px' }}>
            Preview payout calculated on a sample ₹5,000 stake at +{kpis.adminProfitPercent}%
          </div>

          <div style={{ background: '#0b0e15', border: '1px solid #1a2233', padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#8b9bb4' }}>User Stake:</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>
                  ₹5,000
                </div>
              </div>
              <div>
                <span style={{ color: '#8b9bb4' }}>Admin Return:</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                  +{kpis.adminProfitPercent}%
                </div>
              </div>
              <div>
                <span style={{ color: '#8b9bb4' }}>Calculated Profit:</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                  +₹{(5000 * (kpis.adminProfitPercent / 100)).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ color: '#8b9bb4' }}>Total Payout:</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                  ₹{(5000 * (1 + kpis.adminProfitPercent / 100)).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Rounds Table */}
      <div className="square-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Staking Rounds Audit
            </div>
            <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
              Real-time user positions and execution timestamps
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="square-input"
              style={{ height: '32px', fontSize: '12px', padding: '4px 10px' }}
            >
              <option value="All">All Assets</option>
              <option value="BTC">BTC Pairs</option>
              <option value="ETH">ETH Pairs</option>
              <option value="SOL">SOL Pairs</option>
            </select>
          </div>
        </div>

        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>Round ID</th>
                <th>Asset</th>
                <th>Trader</th>
                <th>Capital</th>
                <th>Return Rate</th>
                <th>Net Profit</th>
                <th>Payout</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRounds.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    {r.id}
                  </td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>
                    {r.asset}
                  </td>
                  <td style={{ color: '#d1d9e6' }}>
                    {r.traderName}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#ffffff' }}>
                    ₹{r.stakedAmount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="square-badge badge-gold">
                      +{r.returnPercent}%
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>
                    +₹{r.profit.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                    ₹{r.payout.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        r.status === 'Active' ? 'badge-green' : 'badge-gray'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#8b9bb4' }}>
                    {r.time}
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
