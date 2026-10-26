import { useEffect } from 'react';
import { LayoutDashboard, TrendingUp, CreditCard, ArrowDownToLine, Users, MessageSquare, Settings, LogOut, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingDepositsCount = 0,
  pendingWithdrawalsCount = 0,
  activeRoundsCount = 0,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
  isCollapsed = false,
  setIsCollapsed = () => {},
  onLogout,
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
      badge: null,
    },
    {
      id: 'stocks_manager',
      label: 'Stocks & Return %',
      icon: <TrendingUp size={18} />,
      badge: '50+ STOCKS',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'deposits',
      label: 'Deposit Approvals',
      icon: <CreditCard size={18} />,
      badge: pendingDepositsCount > 0 ? `${pendingDepositsCount}` : null,
      badgeColor: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    },
    {
      id: 'withdrawals',
      label: 'Withdrawal Payouts',
      icon: <ArrowDownToLine size={18} />,
      badge: pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount}` : null,
      badgeColor: 'bg-red-500/15 text-red-400 border border-red-500/30',
    },
    {
      id: 'users',
      label: 'Traders & Users',
      icon: <Users size={18} />,
      badge: null,
    },
    {
      id: 'support_chat',
      label: 'AI Support Chat',
      icon: <MessageSquare size={18} />,
      badge: 'LIVE AI',
      badgeColor: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    },
    {
      id: 'settings',
      label: 'Payment & UPI Settings',
      icon: <Settings size={18} />,
      badge: null,
    },
  ];

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[90] lg:hidden"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#0d111a] border-r border-[#1a2233] flex flex-col justify-between z-[100] transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-[250px]'
        } ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header & Brand */}
        <div className="shrink-0">
          <div
            className={`h-[60px] border-b border-[#1a2233] flex items-center box-border ${
              isCollapsed ? 'justify-center p-3' : 'justify-between px-4'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="w-8 h-8 border border-amber-500 rounded-none overflow-hidden bg-black shrink-0 flex items-center justify-center"
                style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }}
              >
                <img
                  src="/paynex-logo.jpg"
                  alt="PAYNEX Logo"
                  className="w-full h-full object-cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {!isCollapsed && (
                <div className="whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-extrabold text-sm tracking-wide">
                      PAYNEX
                    </span>
                    <span className="text-[10px] text-amber-500 font-bold">
                      CRYPTO
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    Admin Console
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>

            {/* Desktop Collapse Toggle */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex items-center justify-center border border-[#1e2638] rounded-none text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Middle Navigation Menu */}
        <div className={`flex-1 overflow-y-auto flex flex-col gap-0.5 ${isCollapsed ? 'p-1.5' : 'p-2'}`}>
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              className="border border-[#1e2638] rounded-none text-amber-500 text-xs p-1.5 mb-2 hover:bg-[#151c28] flex items-center justify-center"
            >
              <ChevronRight size={14} />
            </button>
          )}

          {menuItems.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left rounded-none border-0 border-l-[3px] py-2 px-3 flex items-center transition-colors box-border ${
                  isSelected
                    ? 'border-amber-500 bg-[#151c28] text-white font-bold'
                    : 'border-transparent text-slate-400 hover:bg-[#121722] hover:text-slate-200 font-medium'
                } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="text-xs tracking-wide whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-none font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}

                {isCollapsed && item.badge && (
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-none absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sign Out Action Button */}
        {onLogout && (
          <div className="shrink-0 p-2 border-t border-[#1a2233] bg-[#0d111a]">
            <button
              onClick={onLogout}
              title={isCollapsed ? 'Sign Out of Master Terminal' : undefined}
              className={`w-full py-2 px-3 text-red-400 hover:text-white hover:bg-red-500/15 border border-red-500/20 text-xs font-bold flex items-center transition-all cursor-pointer ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
              style={{ borderRadius: '0px' }}
            >
              <div className="flex items-center gap-2">
                <LogOut size={16} />
                {!isCollapsed && <span>Sign Out</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] text-slate-500 font-mono">EXIT</span>}
            </button>
          </div>
        )}

        {/* Bottom Platform Reserves Card */}
        <div className={`shrink-0 p-3 border-t border-[#1a2233] bg-[#0b0e15] ${isCollapsed ? 'text-center' : 'text-left'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Platform Reserves</span>
                <span className="text-[11px] text-emerald-400 font-semibold">● Online</span>
              </div>
              <div className="text-sm font-bold text-amber-500 font-mono">
                ₹1,25,00,000
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Engine: <span className="text-amber-500 font-semibold">+12% Max Engine</span>
              </div>
            </>
          ) : (
            <div title="Platform Online (₹1.25 Cr)" className="text-[10px] text-emerald-400 font-bold">
              ● LIVE
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
