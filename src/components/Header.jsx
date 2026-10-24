import { useState, useEffect } from 'react';

export default function Header({
  activeTab,
  onExportAllAudit,
  searchQuery,
  setSearchQuery,
  onOpenMobileSidebar,
  onLogout,
  kpis,
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        }) +
          ' ' +
          now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const titles = {
    dashboard: 'Dashboard Overview',
    stocks_manager: 'Stocks & Return % (50+)',
    deposits: 'Deposit Approvals',
    withdrawals: 'Withdrawal Payouts',
    users: 'Traders Ledger',
    settings: 'System Settings',
  };

  const returnRate = kpis?.adminProfitPercent || 30;

  return (
    <header className="h-[60px] min-h-[60px] bg-[#0d111a] border-b border-[#1a2233] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50 box-border shadow-md">
      {/* Left: Mobile Toggle & Page Breadcrumbs */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 border border-[#1e2638] rounded-none text-amber-500 hover:bg-[#121722] text-lg flex items-center justify-center"
          title="Open Menu"
          aria-label="Open Navigation Drawer"
        >
          ☰
        </button>

        {/* Clean Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-500 font-medium">Admin</span>
          <span className="text-slate-700 text-xs">/</span>
          <span className="text-white font-bold tracking-wide truncate">
            {titles[activeTab] || 'Dashboard'}
          </span>
        </div>

        {/* Live Engine Status Badge in Navbar */}
        <div className="hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-bold rounded-none whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none inline-block"></span>
          <span>+{returnRate}% Return Engine</span>
        </div>
      </div>

      {/* Right: Actions, Search, Live Clock & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Live IST Time */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="text-slate-500">IST</span>
          <span className="text-slate-300 font-semibold">{currentTime}</span>
        </div>

        {/* Global Search */}
        <div className="relative w-28 sm:w-40 md:w-48">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 text-xs pl-7 pr-6 bg-[#0d111a] border border-[#1e2638] text-white rounded-none outline-none focus:border-amber-500 transition-colors placeholder:text-slate-500"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Master Excel Export Button */}
        <button
          onClick={onExportAllAudit}
          className="h-8 px-2.5 sm:px-3 bg-[#0f6c38] hover:bg-[#137d42] text-white text-xs font-semibold border border-[#148043] rounded-none flex items-center gap-1.5 transition-colors shrink-0"
          title="Export complete system audit ledger to CSV / Microsoft Excel"
        >
          <span>📊</span>
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {/* Admin Profile Chip */}
        <div className="flex items-center gap-2 p-1 sm:px-2 bg-[#121722] border border-[#1e2638] rounded-none" title="Logged in as Super Admin">
          <div className="w-6 h-6 bg-amber-500 text-black font-extrabold text-[10.5px] flex items-center justify-center rounded-none">
            SA
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[11px] font-bold text-slate-200">Super Admin</span>
            <span className="text-[9.5px] text-emerald-400 font-semibold">● HQ Online</span>
          </div>
        </div>

        {/* Quick Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="h-8 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            style={{ borderRadius: '0px' }}
            title="Sign Out of Master Admin Console"
          >
            <span>🚪</span>
            <span className="hidden md:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
