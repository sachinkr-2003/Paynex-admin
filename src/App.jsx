import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './pages/DashboardOverview';
import GameEnginePage from './pages/GameEnginePage';
import DepositsPage from './pages/DepositsPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import UsersPage from './pages/UsersPage';
import PlansPage from './pages/PlansPage';
import SettingsPage from './pages/SettingsPage';
import StocksManagerPage from './pages/StocksManagerPage';
import AdminLoginPage from './pages/AdminLoginPage';
import {
  initialKPIs,
  initialTraders,
  initialDeposits,
  initialWithdrawals,
  initialGameRounds,
  initialInvestmentPlans,
  initialSystemSettings,
} from './data/adminData';
import { exportToExcel } from './utils/exportToExcel';
import adminApi from './services/api';
import { showConfirmDialog, showToast as swalToast } from './utils/swal';

export default function App() {
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('paynex_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
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

  const [traders, setTraders] = useState(initialTraders);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [gameRounds, setGameRounds] = useState(initialGameRounds);
  const [plans, setPlans] = useState(initialInvestmentPlans);
  const [settings, setSettings] = useState(initialSystemSettings);

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

  // Live Backend Data Fetching on mount & background auto-sync
  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
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
          setKpis(kpiRes.value.kpis);
        }
        if (tradersRes.status === 'fulfilled' && tradersRes.value?.traders?.length) {
          setTraders(tradersRes.value.traders);
        }
        if (depositsRes.status === 'fulfilled' && depositsRes.value?.deposits?.length) {
          setDeposits(depositsRes.value.deposits);
        }
        if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value?.withdrawals?.length) {
          setWithdrawals(withdrawalsRes.value.withdrawals);
        }
        if (poolRes.status === 'fulfilled' && poolRes.value?.activeStakers?.length) {
          setGameRounds(poolRes.value.activeStakers);
        }
        if (plansRes.status === 'fulfilled' && plansRes.value?.plans?.length) {
          setPlans(plansRes.value.plans);
        }
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
          setSettings(settingsRes.value.settings);
        }
      } catch (err) {
        console.warn('Backend live sync warning:', err.message);
      }
    };

    fetchBackendData();
    const interval = setInterval(fetchBackendData, 12000); // 12s live polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
    showToast('📊 Platform Master Audit exported to Excel (.csv)!');
  };

  const handleAdminLoginSuccess = (user, token) => {
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

  // If not authenticated as Super Admin, display dedicated Admin Login Page
  if (!currentAdmin) {
    return <AdminLoginPage onLoginSuccess={handleAdminLoginSuccess} />;
  }

  const pendingDepositsCount = deposits.filter((d) => d.status === 'Pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'Pending').length;
  const activeRoundsCount = gameRounds.filter((r) => r.status === 'Active').length;

  return (
    <div className="flex min-h-screen w-full bg-[#0b0e14] text-slate-100 overflow-x-clip relative font-sans">
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
          onExportAllAudit={handleExportAllAudit}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={handleAdminLogout}
          kpis={kpis}
        />

        {/* Dynamic Page Router */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto box-border">
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

          {activeTab === 'game_engine' && (
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
          <span className="text-base">⚡</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="bg-transparent border-none text-amber-500 hover:text-white cursor-pointer text-sm px-1 ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
