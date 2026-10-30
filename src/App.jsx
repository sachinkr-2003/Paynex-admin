import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './pages/DashboardOverview';
import DepositsPage from './pages/DepositsPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import StocksManagerPage from './pages/StocksManagerPage';
import SupportChatPage from './pages/SupportChatPage';
import GameEnginePage from './pages/GameEnginePage';
import PlansPage from './pages/PlansPage';
import AdminLoginPage from './pages/AdminLoginPage';
import {
  initialKPIs,
  initialTraders,
  initialDeposits,
  initialWithdrawals,
  initialGameRounds,
  initialSystemSettings,
} from './data/adminData';
import { exportToExcel } from './utils/exportToExcel';
import adminApi from './services/api';
import { showConfirmDialog, showToast as swalToast } from './utils/swal';
import { Zap, X } from 'lucide-react';

export default function App() {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [serverOfflineError, setServerOfflineError] = useState(null);
  const [isServerDisconnected, setIsServerDisconnected] = useState(false);
  const [verifyRetryTrigger, setVerifyRetryTrigger] = useState(0);

  const VALID_TABS = [
    'dashboard',
    'stocks_manager',
    'deposits',
    'withdrawals',
    'users',
    'support_chat',
    'settings',
    'engine',
    'plans',
  ];

  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && VALID_TABS.includes(hash)) {
        return hash;
      }
      const savedTab = localStorage.getItem('paynex_admin_active_tab');
      if (savedTab && VALID_TABS.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('paynex_admin_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } catch {}
  };

  useEffect(() => {
    try {
      if (!window.location.hash || window.location.hash === '#') {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch {}

    const handleHashChange = () => {
      try {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash && VALID_TABS.includes(hash)) {
          setActiveTabState(hash);
          localStorage.setItem('paynex_admin_active_tab', hash);
        }
      } catch {}
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Core Platform State
  const [kpis, setKpis] = useState(() => {
    try {
      const savedRate = localStorage.getItem('paynex_admin_percent');
      if (savedRate && !isNaN(Number(savedRate))) {
        return { ...initialKPIs, adminProfitPercent: Number(savedRate) };
      }
    } catch {}
    return initialKPIs;
  });

  const [traders, setTraders] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [gameRounds, setGameRounds] = useState([]);
  const [settings, setSettings] = useState(initialSystemSettings);
  const [plans, setPlans] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Synchronize Return Engine Rate with local storage
  useEffect(() => {
    try {
      localStorage.setItem('paynex_admin_percent', String(kpis.adminProfitPercent));
    } catch {}
  }, [kpis.adminProfitPercent]);

  // Strict Server Verification on Mount: Only allow admin in if live server verifies token
  useEffect(() => {
    let isMounted = true;
    const verifySessionOnMount = async () => {
      const token = localStorage.getItem('paynex_admin_token');
      if (!token) {
        if (isMounted) {
          setCurrentAdmin(null);
          setIsVerifyingSession(false);
        }
        return;
      }

      setIsVerifyingSession(true);
      try {
        const user = await adminApi.verifySession();
        if (isMounted) {
          setCurrentAdmin(user);
          localStorage.setItem('paynex_admin_user', JSON.stringify(user));
          setServerOfflineError(null);
          setIsServerDisconnected(false);
          setIsVerifyingSession(false);
        }
      } catch (err) {
        console.error('Session verification error:', err.message);
        if (isMounted) {
          setCurrentAdmin(null);
          localStorage.removeItem('paynex_admin_user');
          const isOffline =
            err.message?.includes('502') ||
            err.message?.includes('offline') ||
            err.message?.includes('Cannot reach') ||
            err.message?.includes('NetworkError') ||
            err.message?.includes('Failed to fetch');

          if (isOffline) {
            setServerOfflineError(
              'Server is currently offline (502 Bad Gateway). Admin Terminal offline kaam nahi karta. Please Hostinger par server start karein.'
            );
          } else {
            localStorage.removeItem('paynex_admin_token');
            setServerOfflineError(err.message || 'Session expired. Please log in again.');
          }
          setIsVerifyingSession(false);
        }
      }
    };

    verifySessionOnMount();
    return () => {
      isMounted = false;
    };
  }, [verifyRetryTrigger]);

  // Live Backend Data Fetching on mount & background auto-sync
  useEffect(() => {
    if (!currentAdmin) return; // only fetch when logged in
    let isMounted = true;

    const fetchBackendData = async (isInitial = false) => {
      if (isInitial) setIsLoadingData(true);
      try {
        const [kpiRes, tradersRes, depositsRes, withdrawalsRes, poolRes, plansRes, settingsRes] = await Promise.allSettled([
          adminApi.getDashboardKPIs(),
          adminApi.getTraders(),
          adminApi.getDeposits(),
          adminApi.getWithdrawals(),
          adminApi.getLivePool(),
          adminApi.getPlans(),
          adminApi.getSettings(),
        ]);

        if (!isMounted) return;

        if (kpiRes.status === 'fulfilled' && kpiRes.value?.kpis) {
          setKpis((prev) => ({ ...prev, ...kpiRes.value.kpis }));
        } else if (kpiRes.status === 'rejected') {
          console.warn('KPIs fetch failed:', kpiRes.reason?.message);
        }

        if (tradersRes.status === 'fulfilled' && Array.isArray(tradersRes.value?.traders)) {
          setTraders(tradersRes.value.traders);
        } else if (tradersRes.status === 'rejected') {
          console.warn('Traders fetch failed:', tradersRes.reason?.message);
        }

        if (depositsRes.status === 'fulfilled' && Array.isArray(depositsRes.value?.deposits)) {
          setDeposits(depositsRes.value.deposits);
        } else if (depositsRes.status === 'rejected') {
          console.warn('Deposits fetch failed:', depositsRes.reason?.message);
        }

        if (withdrawalsRes.status === 'fulfilled' && Array.isArray(withdrawalsRes.value?.withdrawals)) {
          setWithdrawals(withdrawalsRes.value.withdrawals);
        } else if (withdrawalsRes.status === 'rejected') {
          console.warn('Withdrawals fetch failed:', withdrawalsRes.reason?.message);
        }

        // staking pool — also fallback to stakers array key
        if (poolRes.status === 'fulfilled') {
          const stakers = poolRes.value?.activeStakers || poolRes.value?.stakers || [];
          if (Array.isArray(stakers)) setGameRounds(stakers);
        } else if (poolRes.status === 'rejected') {
          console.warn('Live pool fetch failed:', poolRes.reason?.message);
        }

        if (plansRes.status === 'fulfilled') {
          const fetchedPlans = plansRes.value?.plans || plansRes.value?.data || [];
          if (Array.isArray(fetchedPlans)) setPlans(fetchedPlans);
        } else if (plansRes.status === 'rejected') {
          console.warn('Plans fetch failed:', plansRes.reason?.message);
        }

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
          setSettings((prev) => ({ ...prev, ...settingsRes.value.settings }));
        } else if (settingsRes.status === 'rejected') {
          console.warn('Settings fetch failed:', settingsRes.reason?.message);
        }

        const results = [kpiRes, tradersRes, depositsRes, withdrawalsRes, poolRes, plansRes, settingsRes];
        const isOffline = results.some(
          (r) =>
            r.status === 'rejected' &&
            (r.reason?.message?.includes('502') ||
              r.reason?.message?.includes('offline') ||
              r.reason?.message?.includes('Cannot reach') ||
              r.reason?.message?.includes('NetworkError'))
        );
        const allFailed = results.every((r) => r.status === 'rejected');
        setIsServerDisconnected(isOffline || allFailed);

      } catch (err) {
        console.warn('Backend live sync warning:', err.message);
      } finally {
        if (isMounted && isInitial) setIsLoadingData(false);
      }
    };

    fetchBackendData(true);
    const interval = setInterval(() => fetchBackendData(false), 12000); // 12s live polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentAdmin]);

  // Master Audit Export to Excel
  const handleExportAllAudit = () => {
    const combinedData = [
      ...traders.map((t) => ({
        Type: 'TRADER',
        Identifier: t.uid,
        Name: t.name,
        Amount: `₹${t.balance}`,
        Status: t.kycStatus,
        Extra: `Staked: ₹${t.totalStaked} | Won: ₹${t.totalWon}`,
        Timestamp: t.joinDate,
      })),
      ...deposits.map((d) => ({
        Type: 'DEPOSIT',
        Identifier: d.id,
        Name: d.traderName,
        Amount: `₹${d.amount}`,
        Status: d.status,
        Extra: `UTR: ${d.utr} (${d.method})`,
        Timestamp: d.timestamp,
      })),
      ...withdrawals.map((w) => ({
        Type: 'WITHDRAWAL',
        Identifier: w.id,
        Name: w.traderName,
        Amount: `₹${w.amount}`,
        Status: w.status,
        Extra: w.upiId ? `UPI: ${w.upiId}` : `Bank: ${w.accountNumber}`,
        Timestamp: w.timestamp,
      })),
      ...gameRounds.map((g) => ({
        Type: 'STAKING_ROUND',
        Identifier: g.id,
        Name: g.traderName,
        Amount: `₹${g.stakedAmount}`,
        Status: g.status,
        Extra: `${g.asset} | +${g.returnPercent}% Return (₹${g.payout})`,
        Timestamp: g.time,
      })),
    ];

    const headers = [
      { label: 'Category', accessor: 'Type' },
      { label: 'Reference / ID', accessor: 'Identifier' },
      { label: 'Trader Name', accessor: 'Name' },
      { label: 'Volume (INR)', accessor: 'Amount' },
      { label: 'Current Status', accessor: 'Status' },
      { label: 'Details / Rails', accessor: 'Extra' },
      { label: 'Timestamp', accessor: 'Timestamp' },
    ];

    exportToExcel('PAYNEX_Master_Platform_Audit_Log', headers, combinedData);
    showToast('Platform Master Audit exported to Excel (.csv)!');
  };

  const handleAdminLoginSuccess = (user, token) => {
    // security: only allow admin/superadmin role
    if (user?.role && user.role !== 'admin' && user.role !== 'superadmin') {
      swalToast('Access denied. Admin credentials required.');
      return;
    }
    setCurrentAdmin(user);
    try {
      localStorage.setItem('paynex_admin_user', JSON.stringify(user));
      if (token) localStorage.setItem('paynex_admin_token', token);
    } catch {}
  };

  const handleAdminLogout = async () => {
    const confirmed = await showConfirmDialog(
      'Sign Out of Terminal',
      'Are you sure you want to exit the Master Administration Terminal?',
      'YES, SIGN OUT',
      'STAY CONNECTED'
    );
    if (confirmed) {
      setCurrentAdmin(null);
      try {
        localStorage.removeItem('paynex_admin_user');
        localStorage.removeItem('paynex_admin_token');
      } catch {}
      swalToast('Master Terminal session ended');
    }
  };

  // While verifying session with live server on boot
  if (isVerifyingSession) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0b0e14] text-white p-6 font-sans">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-amber-500 bg-black flex items-center justify-center p-1">
            <img
              src="/paynex-logo.jpg"
              alt="Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-wider text-white">PAYNEX CRYPTO</div>
            <div className="text-[10px] text-amber-500 font-mono tracking-widest">MASTER ADMIN TERMINAL</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to live server (api.paynex.co.in)...</span>
        </div>
      </div>
    );
  }

  // If not authenticated as Super Admin, display dedicated Admin Login Page
  if (!currentAdmin) {
    return (
      <AdminLoginPage
        onLoginSuccess={handleAdminLoginSuccess}
        initialServerError={serverOfflineError}
        onRetryServer={() => {
          setServerOfflineError(null);
          setVerifyRetryTrigger((prev) => prev + 1);
        }}
      />
    );
  }

  const pendingDepositsCount = deposits.filter((d) => d.status === 'Pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'Pending').length;
  const activeRoundsCount = gameRounds.filter((r) => r.status === 'Active').length;

  return (
    <div className="flex min-h-screen w-full bg-[#0b0e14] text-slate-100 overflow-x-clip relative font-sans">
      {/* Real-time Server Offline Banner */}
      {isServerDisconnected && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600/95 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-sm border-b border-red-400">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <span>⚠️ SERVER OFFLINE (502 Bad Gateway) — Hostinger VPS se live backend disconnected hai. Data updates pause hain.</span>
          </div>
          <button
            onClick={() => setVerifyRetryTrigger((p) => p + 1)}
            className="px-3 py-1 bg-white text-red-700 hover:bg-slate-100 font-black text-[10px] uppercase tracking-wider rounded transition-colors shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Strict Square Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSearchQuery('');
        }}
        pendingDepositsCount={pendingDepositsCount}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        activeRoundsCount={activeRoundsCount}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        onLogout={handleAdminLogout}
      />

      {/* Main Terminal Viewport */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#0b0e14] min-h-screen transition-all duration-200 ${isCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[250px]'}`}>
        {/* Strict Square Top Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onExportAllAudit={handleExportAllAudit}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={handleAdminLogout}
          kpis={kpis}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 p-2.5 sm:p-4 lg:p-6 max-w-[1600px] w-full mx-auto box-border">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              kpis={kpis}
              setKpis={setKpis}
              traders={traders}
              deposits={deposits}
              withdrawals={withdrawals}
              gameRounds={gameRounds}
              setActiveTab={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'stocks_manager' && (
            <StocksManagerPage
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'deposits' && (
            <DepositsPage
              deposits={deposits}
              setDeposits={setDeposits}
              traders={traders}
              setTraders={setTraders}
              setKpis={setKpis}
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'withdrawals' && (
            <WithdrawalsPage
              withdrawals={withdrawals}
              setWithdrawals={setWithdrawals}
              traders={traders}
              setTraders={setTraders}
              setKpis={setKpis}
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'users' && (
            <UsersPage
              traders={traders}
              setTraders={setTraders}
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'support_chat' && (
            <SupportChatPage
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'engine' && (
            <GameEnginePage
              kpis={kpis}
              setKpis={setKpis}
              gameRounds={gameRounds}
              setGameRounds={setGameRounds}
              showToast={showToast}
              searchQuery={searchQuery}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'plans' && (
            <PlansPage
              plans={plans}
              setPlans={setPlans}
              showToast={showToast}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              setSettings={setSettings}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Floating Square Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#141a26] text-amber-500 border border-[#2b374e] border-l-4 border-l-amber-500 shadow-2xl py-3 px-4 text-xs font-semibold flex items-center gap-2.5 z-[9999] rounded-none">
          <Zap size={15} className="text-amber-500 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="bg-transparent border-none text-amber-500 hover:text-white cursor-pointer p-0 ml-2 flex items-center"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
