export const initialKPIs = {
  totalPlatformVolume: 0,
  totalUserInvested: 0, // Total money invested by users
  totalPaidOut: 0, // Total money paid out to users
  netPlatformProfit: 0, // Inflow - Outflow
  liveStakingPool: 0,
  totalTraders: 1,
  activeTradersNow: 0,
  depositsToday: 0,
  pendingWithdrawalsCount: 0,
  pendingWithdrawalsAmount: 0,
  adminProfitPercent: 5, // 2% - 12% Fixed Return Engine
  reserveBalance: 0,
};

export const initialTraders = [];

export const initialDeposits = [];

export const initialWithdrawals = [];

export const initialGameRounds = [];

export const initialInvestmentPlans = [
  {
    id: 'plan_starter',
    name: 'Starter Plan',
    dailyProfit: 3.5,
    durationDays: 7,
    minAmount: 1000,
    maxAmount: 10000,
    totalYield: 24.5,
    activeSubscribers: 412,
    isEnabled: true,
    color: '#06b6d4',
  },
  {
    id: 'plan_bronze',
    name: 'Bronze Growth Plan',
    dailyProfit: 4.8,
    durationDays: 14,
    minAmount: 5000,
    maxAmount: 25000,
    totalYield: 67.2,
    activeSubscribers: 289,
    isEnabled: true,
    color: '#f59e0b',
  },
  {
    id: 'plan_silver',
    name: 'Silver Wealth Plan',
    dailyProfit: 6.2,
    durationDays: 21,
    minAmount: 10000,
    maxAmount: 50000,
    totalYield: 130.2,
    activeSubscribers: 198,
    isEnabled: true,
    color: '#38bdf8',
  },
  {
    id: 'plan_gold',
    name: 'Gold Staking Elite (+30% Engine)',
    dailyProfit: 7.5,
    durationDays: 30,
    minAmount: 25000,
    maxAmount: 200000,
    totalYield: 225.0,
    activeSubscribers: 345,
    isEnabled: true,
    color: '#eab308',
  },
  {
    id: 'plan_titan',
    name: 'VIP Titan Whale Pool',
    dailyProfit: 9.0,
    durationDays: 45,
    minAmount: 50000,
    maxAmount: 1000000,
    totalYield: 405.0,
    activeSubscribers: 104,
    isEnabled: true,
    color: '#10b981',
  },
];

export const initialSystemSettings = {
  platformName: 'PAYNEX CRYPTO',
  officialUpiId: 'paynex.crypto@icici',
  merchantName: 'Paynex Crypto Technologies Pvt Ltd',
  minDeposit: 500,
  minWithdrawal: 1000,
  withdrawalFeePercent: 0,
  defaultGameProfitPercent: 30,
  emergencyFreeze: false,
  autoApproveKyc: false,
  autoReleaseWithdrawals: false,
  supportHelpline: '1800 234 5678',
  supportEmail: 'support@paynexcrypto.io',
  whatsappCare: '+91 98765 43210',
  telegramChannel: 'https://t.me/paynexcrypto_support',
};
