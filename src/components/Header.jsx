import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  X,
  FileSpreadsheet,
  LogOut,
  Bell,
  Clock,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  ArrowDownToLine,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import adminApi from '../services/api';

export default function Header({
  activeTab,
  setActiveTab = () => {},
  onExportAllAudit,
  searchQuery,
  setSearchQuery,
  onOpenMobileSidebar,
  onLogout,
  kpis,
}) {
  const [currentTime, setCurrentTime] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'pending'
  const notifRef = useRef(null);

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

  // Fetch real notifications from backend
  const fetchNotifications = async () => {
    try {
      const res = await adminApi.getNotifications();
      if (res?.success && Array.isArray(res?.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isNotifOpen]);

  const titles = {
    dashboard: 'Dashboard Overview',
    stocks_manager: 'Stocks & Return % (50+)',
    deposits: 'Deposit Approvals',
    withdrawals: 'Withdrawal Payouts',
    users: 'Traders Ledger',
    settings: 'System Settings',
  };

  const returnRate = kpis?.adminProfitPercent || 30;

  const filteredNotifs = notifications.filter((n) => {
    if (notifFilter === 'pending') {
      return n.category === 'pending' || n.severity === 'warning' || n.severity === 'danger';
    }
    return true;
  });

  const handleNotificationClick = (item) => {
    if (item.actionTab) {
      setActiveTab(item.actionTab);
    }
    setIsNotifOpen(false);
  };

  const formatNotifTime = (d) => {
    if (!d) return 'Just now';
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="h-[60px] min-h-[60px] bg-[#0d111a] border-b border-[#1a2233] flex items-center justify-between px-2.5 sm:px-4 lg:px-6 sticky top-0 z-50 box-border shadow-md">
      {/* Left: Mobile Toggle & Page Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 border border-[#1e2638] rounded-none text-amber-500 hover:bg-[#121722] text-lg flex items-center justify-center shrink-0 w-8 h-8"
          title="Open Menu"
          aria-label="Open Navigation Drawer"
        >
          <Menu size={16} />
        </button>

        {/* Clean Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
          <span className="hidden sm:inline text-slate-500 font-medium">Admin</span>
          <span className="hidden sm:inline text-slate-700 text-xs">/</span>
          <span className="text-white font-bold tracking-wide truncate max-w-[80px] xs:max-w-[140px] sm:max-w-none">
            {titles[activeTab] || 'Dashboard'}
          </span>
        </div>

        {/* Live Engine Status Badge in Navbar */}
        <div className="hidden md:inline-flex items-center gap-1.5 py-1 px-2.5 bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-bold rounded-none whitespace-nowrap">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none inline-block"></span>
          <span>+{returnRate}% Return Engine</span>
        </div>
      </div>

      {/* Right: Actions, Search, Live Clock & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Live IST Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="text-slate-500">IST</span>
          <span className="text-slate-300 font-semibold">{currentTime}</span>
        </div>

        {/* Global Search */}
        <div className="relative w-20 xs:w-28 sm:w-40 md:w-48 flex items-center">
          <Search size={12} className="absolute left-1.5 sm:left-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 text-xs pl-6 sm:pl-7 pr-5 sm:pr-6 bg-[#0d111a] border border-[#1e2638] text-white rounded-none outline-none focus:border-amber-500 transition-colors placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-0.5 flex items-center"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Real-Time System Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`h-8 w-8 border ${
              unreadCount > 0 ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-[#1e2638] bg-[#0d111a] text-slate-400'
            } hover:text-white flex items-center justify-center relative rounded-none transition-colors`}
            title="Real-Time System Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] bg-red-600 text-white font-mono font-bold text-[9px] flex items-center justify-center rounded-none shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#10141e] border border-[#1e2638] shadow-2xl z-50 rounded-none overflow-hidden text-xs">
              {/* Header */}
              <div className="px-3.5 py-2.5 bg-[#0d111a] border-b border-[#1a2233] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-200">System Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                      {unreadCount} Pending
                    </span>
                  )}
                </div>
                <button
                  onClick={fetchNotifications}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Refresh Notifications"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#1a2233] bg-[#0b0e14]">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`flex-1 py-1.5 text-center font-semibold text-[11px] ${
                    notifFilter === 'all'
                      ? 'bg-[#151a26] text-amber-400 border-b-2 border-amber-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Activity ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('pending')}
                  className={`flex-1 py-1.5 text-center font-semibold text-[11px] ${
                    notifFilter === 'pending'
                      ? 'bg-[#151a26] text-amber-400 border-b-2 border-amber-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pending Actions ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-[#182030]">
                {filteredNotifs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <Clock size={20} className="mx-auto mb-2 opacity-40" />
                    <div>No notifications right now</div>
                    <div className="text-[10px] text-slate-600 mt-1">Platform operations running cleanly.</div>
                  </div>
                ) : (
                  filteredNotifs.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="p-3 hover:bg-[#151b27] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-[#1a2233] border border-[#232d42] shrink-0 mt-0.5">
                          {item.type === 'deposit' && <CreditCard size={13} className="text-amber-400" />}
                          {item.type === 'withdrawal' && <ArrowDownToLine size={13} className="text-red-400" />}
                          {item.type === 'contract' && <TrendingUp size={13} className="text-emerald-400" />}
                          {item.type === 'user' && <UserCheck size={13} className="text-sky-400" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-200 truncate group-hover:text-amber-400">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {formatNotifTime(item.date)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {item.message}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span
                              className={`text-[9.5px] px-1 py-0.2 font-bold ${
                                item.severity === 'danger'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : item.severity === 'warning'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {item.status || item.type?.toUpperCase()}
                            </span>
                            <span className="text-[10.5px] font-semibold text-amber-500 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              Open <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 bg-[#0b0e14] border-t border-[#1a2233] text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 inline-block"></span>
                <span>Live Paynex Notification Switch</span>
              </div>
            </div>
          )}
        </div>

        {/* Master Excel Export Button */}
        <button
          onClick={onExportAllAudit}
          className="h-8 px-2 sm:px-3 bg-[#0f6c38] hover:bg-[#137d42] text-white text-xs font-semibold border border-[#148043] rounded-none flex items-center gap-1.5 transition-colors shrink-0"
          title="Export complete system audit ledger to CSV / Microsoft Excel"
        >
          <FileSpreadsheet size={13} />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {/* Admin Profile Chip */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 bg-[#121722] border border-[#1e2638] rounded-none" title="Logged in as Super Admin">
          <div className="w-6 h-6 bg-amber-500 text-black font-extrabold text-[10.5px] flex items-center justify-center rounded-none shrink-0">
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
            className="h-8 px-2 sm:px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            style={{ borderRadius: '0px' }}
            title="Sign Out of Master Admin Console"
          >
            <LogOut size={13} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
