import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import {
  TrendingUp,
  CreditCard,
  ArrowDownToLine,
  Landmark,
  CircleDollarSign,
  ArrowUpRight,
  Building2,
  Users,
  Bell,
} from 'lucide-react';

export default function DashboardOverview({
  kpis = {},
  setKpis = () => {},
  traders = [],
  deposits = [],
  withdrawals = [],
  gameRounds = [],
  setActiveTab = () => {},
  showToast = () => {},
}) {
  // 1. Pending Approvals
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

  // 2. Approved Deposits (Inflow)
  const approvedDeposits = deposits.filter((d) => d.status === 'Approved');
  const approvedDepositsAmount = approvedDeposits.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0
  );

  // 3. Completed Withdrawals (Outflow)
  const completedWithdrawals = withdrawals.filter(
    (w) => w.status === 'Completed' || w.status === 'Approved'
  );
  const completedWithdrawalsAmount = completedWithdrawals.reduce(
    (sum, w) => sum + (Number(w.amount) || 0),
    0
  );

  // 4. Game Rounds / Stakes Volume
  const totalStakesAmount = gameRounds.reduce(
    (sum, r) => sum + (Number(r.stakedAmount) || 0),
    0
  );
  const totalWonPayouts = gameRounds
    .filter(
      (r) =>
        r.status === 'Won' ||
        r.status === 'Completed' ||
        r.status === 'Matured & Settled'
    )
    .reduce((sum, r) => sum + (Number(r.payout) || 0), 0);

  // 5. Total User Capital Invested (Inflow: strictly approved deposits, not double-counting stakes)
  const totalUserInvested =
    kpis?.totalUserInvested !== undefined
      ? Number(kpis.totalUserInvested)
      : approvedDepositsAmount;

  // 6. Total Money Paid Out to Users (Outflow: real bank / UPI disbursements)
  const totalPaidOut =
    kpis?.totalPaidOut !== undefined
      ? Number(kpis.totalPaidOut)
      : completedWithdrawalsAmount;

  // 7. Overall Net Platform Profit / Balance (Inflow - Outflow)
  const netPlatformProfit =
    kpis?.netPlatformProfit !== undefined
      ? Number(kpis.netPlatformProfit)
      : totalUserInvested - totalPaidOut;

  const isProfit = netPlatformProfit >= 0;

  // Percentage distribution
  const totalCashflow = totalUserInvested + totalPaidOut;
  const inflowPercent =
    totalCashflow > 0
      ? ((totalUserInvested / totalCashflow) * 100).toFixed(1)
      : '0.0';
  const outflowPercent =
    totalCashflow > 0
      ? ((totalPaidOut / totalCashflow) * 100).toFixed(1)
      : '0.0';
  const profitMargin =
    totalUserInvested > 0
      ? ((netPlatformProfit / totalUserInvested) * 100).toFixed(1)
      : '0.0';

  const handleExportRoundsExcel = () => {
    const headers = [
      { label: 'Round ID', accessor: (r) => r.id || (r._id ? `RND-${String(r._id).slice(-5)}` : 'RND') },
      { label: 'Stock / Asset', accessor: 'asset' },
      { label: 'Trader Name', accessor: 'traderName' },
      { label: 'Staked (INR)', accessor: (r) => `₹${(Number(r.stakedAmount) || 0).toLocaleString('en-IN')}` },
      { label: 'Return Rate', accessor: (r) => `+${Number(r.returnPercent) || 0}%` },
      {
        label: 'Profit (INR)',
        accessor: (r) => {
          const s = Number(r.stakedAmount) || 0;
          const ret = Number(r.returnPercent) || 0;
          const p = Number(r.profit) > 0 ? Number(r.profit) : Math.round((s * ret) / 100);
          return `₹${p.toLocaleString('en-IN')}`;
        },
      },
      {
        label: 'Total Payout (INR)',
        accessor: (r) => {
          const s = Number(r.stakedAmount) || 0;
          const ret = Number(r.returnPercent) || 0;
          const p = Number(r.profit) > 0 ? Number(r.profit) : Math.round((s * ret) / 100);
          const py = Number(r.payout) > s ? Number(r.payout) : (s + p);
          return `₹${py.toLocaleString('en-IN')}`;
        },
      },
      { label: 'Status', accessor: 'status' },
      { label: 'Timestamp', accessor: (r) => r.time || 'Active' },
    ];
    exportToExcel('PAYNEX_Live_Trading_Rounds', headers, gameRounds);
    showToast('Trading rounds log exported to Excel (.csv)');
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
            System Financial Ledger & Master Overview
          </div>
          <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
            Real-time tracking of total user invested funds, payout disbursements (-), and net platform profit
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('stocks_manager')}
            className="square-btn-primary flex items-center gap-1.5"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            <TrendingUp size={13} /> Stocks & Return % (50+)
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className="square-btn-secondary flex items-center gap-1.5"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            <CreditCard size={13} /> Deposits ({pendingDeposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className="square-btn-secondary flex items-center gap-1.5"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 12px' }}
          >
            <ArrowDownToLine size={13} /> Withdrawals ({pendingWithdrawals.length})
          </button>
        </div>
      </div>

      {/* 2. MASTER FINANCIAL LEDGER HERO CARDS (User Invested, Paid Out in Minus, Net Profit) */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '0 2px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Landmark size={14} /> Platform Treasury & Financial Ledger (Inflow vs Outflow)
          </div>
          <div style={{ fontSize: '11px', color: '#8b9bb4' }}>
            Updated in Real-Time
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '12px',
          }}
        >
          {/* Card A: TOTAL USER MONEY INVESTED (INFLOW) */}
          <div
            className="square-card"
            style={{
              padding: '11px 14px',
              borderLeft: '4px solid #10b981',
              background: 'linear-gradient(180deg, #121722 0%, rgba(16, 185, 129, 0.05) 100%)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="square-badge badge-green" style={{ fontSize: '9px', fontWeight: 700, padding: '1.5px 6px' }}>
                ● TOTAL USER INVESTED (INFLOW)
              </span>
              <CircleDollarSign size={16} color="#10b981" />
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#10b981',
                fontFamily: 'monospace',
                marginTop: '4px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              +₹{totalUserInvested.toLocaleString('en-IN')}
            </div>

            <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '2px', fontWeight: 500 }}>
              Total money users invested in the platform
            </div>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid #1e2638',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                color: '#8b9bb4',
              }}
            >
              <span>Approved Deposits: <strong style={{ color: '#10b981' }}>₹{approvedDepositsAmount.toLocaleString('en-IN')}</strong></span>
              <span>Share: <strong style={{ color: '#ffffff' }}>{inflowPercent}%</strong></span>
            </div>
          </div>

          {/* Card B: TOTAL MONEY PAID OUT TO USERS (OUTFLOW IN MINUS -) */}
          <div
            className="square-card"
            style={{
              padding: '11px 14px',
              borderLeft: '4px solid #ef4444',
              background: 'linear-gradient(180deg, #121722 0%, rgba(239, 68, 68, 0.05) 100%)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="square-badge badge-red" style={{ fontSize: '9px', fontWeight: 700, padding: '1.5px 6px' }}>
                ● TOTAL MONEY PAID OUT (MINUS)
              </span>
              <ArrowUpRight size={16} color="#ef4444" />
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#ef4444',
                fontFamily: 'monospace',
                marginTop: '4px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              -₹{totalPaidOut.toLocaleString('en-IN')}
            </div>

            <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '2px', fontWeight: 500 }}>
              Total money given / disbursed to users (Bank / UPI)
            </div>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid #1e2638',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                color: '#8b9bb4',
              }}
            >
              <span>Settled Payouts: <strong style={{ color: '#ef4444' }}>₹{completedWithdrawalsAmount.toLocaleString('en-IN')}</strong></span>
              <span>Disbursed: <strong style={{ color: '#ffffff' }}>{outflowPercent}%</strong></span>
            </div>
          </div>

          {/* Card C: OVERALL NET PLATFORM PROFIT / RESERVE */}
          <div
            className="square-card"
            style={{
              padding: '11px 14px',
              borderLeft: `4px solid ${isProfit ? '#f59e0b' : '#ef4444'}`,
              background: `linear-gradient(180deg, #121722 0%, ${
                isProfit ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)'
              } 100%)`,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="square-badge badge-gold" style={{ fontSize: '9px', fontWeight: 700, padding: '1.5px 6px' }}>
                ● OVERALL NET PLATFORM PROFIT
              </span>
              <Building2 size={16} color="#f59e0b" />
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: isProfit ? '#10b981' : '#ef4444',
                fontFamily: 'monospace',
                marginTop: '4px',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {isProfit ? '+' : '-'}₹{Math.abs(netPlatformProfit).toLocaleString('en-IN')}
            </div>

            <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '2px', fontWeight: 500 }}>
              Overall Net Position (Inflow - Outflow)
            </div>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid #1e2638',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                color: '#8b9bb4',
              }}
            >
              <span>Profit Margin: <strong style={{ color: isProfit ? '#10b981' : '#ef4444' }}>{totalUserInvested > 0 ? `+${profitMargin}%` : '0%'}</strong></span>
              <span>Status: <strong style={{ color: isProfit ? '#10b981' : '#f59e0b' }}>{totalUserInvested === 0 && totalPaidOut === 0 ? 'Balanced' : isProfit ? 'Net Surplus' : 'Deficit'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Cash-Flow Ratio Progress Bar */}
      <div
        className="square-card"
        style={{
          padding: '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>Cashflow Balance:</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>Inflow +₹{totalUserInvested.toLocaleString('en-IN')} ({inflowPercent}%)</span>
            <span style={{ color: '#64748b' }}>vs</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>Outflow -₹{totalPaidOut.toLocaleString('en-IN')} ({outflowPercent}%)</span>
          </div>
          <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
            Net Retained: {isProfit ? '+' : '-'}₹{Math.abs(netPlatformProfit).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Progress Split Bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: '#0d111a',
            border: '1px solid #1e2638',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${totalCashflow > 0 ? inflowPercent : 50}%`,
              height: '100%',
              background: '#10b981',
              transition: 'width 0.3s ease',
            }}
            title={`Total Invested: ₹${totalUserInvested.toLocaleString('en-IN')}`}
          />
          <div
            style={{
              width: `${totalCashflow > 0 ? outflowPercent : 50}%`,
              height: '100%',
              background: '#ef4444',
              transition: 'width 0.3s ease',
            }}
            title={`Total Paid Out: -₹${totalPaidOut.toLocaleString('en-IN')}`}
          />
        </div>
      </div>

      {/* 4. Four Core Operational KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Deposit Requests (Pending Action) */}
        <div
          onClick={() => setActiveTab('deposits')}
          className="square-card"
          style={{
            padding: '11px 14px',
            borderLeft: pendingDeposits.length > 0 ? '4px solid #f59e0b' : '1px solid #1e2638',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Deposits
            </span>
            <CreditCard size={15} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace', marginTop: '4px' }}>
            {pendingDeposits.length}{' '}
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#8b9bb4' }}>
              (₹{pendingDepositsAmount.toLocaleString('en-IN')})
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: pendingDeposits.length > 0 ? '#fbbf24' : '#10b981', marginTop: '3px', fontWeight: 600 }}>
            {pendingDeposits.length > 0 ? 'Action Required: Verify UTR & Credit' : 'All deposits verified'}
          </div>
        </div>

        {/* Card 2: Withdrawal Payouts (Pending Action) */}
        <div
          onClick={() => setActiveTab('withdrawals')}
          className="square-card"
          style={{
            padding: '11px 14px',
            borderLeft: pendingWithdrawals.length > 0 ? '4px solid #ef4444' : '1px solid #1e2638',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Payouts
            </span>
            <ArrowDownToLine size={15} color="#ef4444" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', marginTop: '4px' }}>
            {pendingWithdrawals.length}{' '}
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#8b9bb4' }}>
              (₹{pendingWithdrawalsAmount.toLocaleString('en-IN')})
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: pendingWithdrawals.length > 0 ? '#f87171' : '#10b981', marginTop: '3px', fontWeight: 600 }}>
            {pendingWithdrawals.length > 0 ? 'IMPS Payouts Waiting Approval' : 'Zero pending payouts'}
          </div>
        </div>

        {/* Card 3: Stock Assets & Interest Engine */}
        <div
          onClick={() => setActiveTab('stocks_manager')}
          className="square-card"
          style={{
            padding: '11px 14px',
            borderLeft: '4px solid #10b981',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Stocks Catalog
            </span>
            <TrendingUp size={15} color="#10b981" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace', marginTop: '4px' }}>
            59 Assets
          </div>
          <div style={{ fontSize: '10.5px', color: '#8b9bb4', marginTop: '3px' }}>
            Individual UPI & QR Enabled
          </div>
        </div>

        {/* Card 4: Registered Users */}
        <div
          onClick={() => setActiveTab('users')}
          className="square-card"
          style={{
            padding: '11px 14px',
            borderLeft: '4px solid #0284c7',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#8b9bb4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Traders
            </span>
            <Users size={15} color="#0284c7" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', marginTop: '4px' }}>
            {traders.length || kpis?.totalTraders || 1}{' '}
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#10b981' }}>
              ● {traders.length > 0 ? 1 : 0} Active
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#8b9bb4', marginTop: '3px' }}>
            Click to manage trader wallets & KYC
          </div>
        </div>
      </div>

      {/* 5. High-Priority Alert Strip (Only visible if approvals pending) */}
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
            <Bell size={18} color="#f59e0b" />
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

      {/* 6. Live Recent Trading Activity Table */}
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
              {gameRounds.slice(0, 15).map((round) => {
                const stakedAmt = Number(round.stakedAmount) || 0;
                const retPct = Number(round.returnPercent) || 0;
                const rawProfit = Number(round.profit) || 0;
                const profitAmt = rawProfit > 0 ? rawProfit : Math.round((stakedAmt * retPct) / 100);
                const rawPayout = Number(round.payout) || 0;
                const payoutAmt = rawPayout > stakedAmt ? rawPayout : (stakedAmt + profitAmt);
                const roundId = round.id || (round._id ? `RND-${String(round._id).slice(-5)}` : 'RND');
                return (
                  <tr key={round.id || round._id || Math.random()}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                      {roundId}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {round.asset}
                    </td>
                    <td style={{ color: '#d1d9e6' }}>
                      {round.traderName}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#ffffff' }}>
                      ₹{stakedAmt.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className="square-badge badge-gold">
                        +{retPct}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>
                      +₹{profitAmt.toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f59e0b' }}>
                      ₹{payoutAmt.toLocaleString('en-IN')}
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
                      {round.time || 'Active'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
