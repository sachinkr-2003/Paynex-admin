import React from 'react';
import {
  Bitcoin,
  Coins,
  DollarSign,
  Layers,
  Building2,
  Car,
  Laptop,
  Cpu,
  Landmark,
  Radio,
  CreditCard,
  TrendingUp,
  Pill,
  Zap,
  Ship,
  Watch,
  Palette,
  Lightbulb,
  Hammer,
  Tractor,
  Flame,
  Activity,
  Coffee,
  Factory,
  FlaskConical,
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  Bike,
  Fuel,
  Utensils,
  ShoppingBag,
  Boxes,
  Wrench,
  Sparkles,
  BarChart3,
  Globe,
  Wallet,
} from 'lucide-react';

/**
 * Universal Asset Icon Component for Admin Panel.
 * Maps stock / crypto symbols, categories, or icon keys to clean vector icons.
 * Replaces cartoon emojis across the entire platform.
 */
export default function AssetIcon({
  symbol = '',
  name = '',
  iconName = '',
  category = '',
  size = 18,
  color,
  className = '',
  style = {},
}) {
  const sym = (symbol || '').toUpperCase().replace('/USDT', '').replace('/INR', '').trim();
  const rawKey = (iconName || '').toLowerCase().trim();

  // 1. Direct Crypto Mappings
  if (sym === 'BTC' || sym === 'BITCOIN') {
    return <Bitcoin size={size} color={color || '#f59e0b'} className={className} style={style} />;
  }
  if (sym === 'ETH' || sym === 'ETHEREUM') {
    return <Coins size={size} color={color || '#627eea'} className={className} style={style} />;
  }
  if (sym === 'SOL' || sym === 'SOLANA') {
    return <Zap size={size} color={color || '#06b6d4'} className={className} style={style} />;
  }
  if (sym === 'BNB') {
    return <Layers size={size} color={color || '#eab308'} className={className} style={style} />;
  }
  if (sym === 'USDT' || sym === 'TETHER') {
    return <DollarSign size={size} color={color || '#10b981'} className={className} style={style} />;
  }
  if (sym === 'XRP' || sym === 'RIPPLE') {
    return <Activity size={size} color={color || '#38bdf8'} className={className} style={style} />;
  }
  if (sym === 'DOGE' || sym === 'DOGECOIN') {
    return <Coins size={size} color={color || '#fb923c'} className={className} style={style} />;
  }
  if (sym === 'PEPE' || sym === 'NEAR' || sym === 'AVAX') {
    return <TrendingUp size={size} color={color || '#10b981'} className={className} style={style} />;
  }

  // 2. Direct Indian Stocks Mappings
  // Automobiles
  if (['TATAMOTORS', 'MARUTI', 'M&M'].includes(sym)) {
    return <Car size={size} color={color || '#38bdf8'} className={className} style={style} />;
  }
  if (['BAJAJ-AUTO', 'EICHERMOT', 'HEROMOTOCO', 'TVSMOTOR'].includes(sym)) {
    return <Bike size={size} color={color || '#f59e0b'} className={className} style={style} />;
  }

  // Tech & IT
  if (['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM', 'LTIM'].includes(sym)) {
    return <Laptop size={size} color={color || '#6366f1'} className={className} style={style} />;
  }

  // Banking & Financials
  if (['HDFCBANK', 'HDFC', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'INDUSINDBK'].includes(sym)) {
    return <Landmark size={size} color={color || '#3b82f6'} className={className} style={style} />;
  }
  if (['BAJFINANCE', 'BAJAJFINSV', 'CHOLAFIN'].includes(sym)) {
    return <CreditCard size={size} color={color || '#2563eb'} className={className} style={style} />;
  }
  if (['SBILIFE', 'HDFCLIFE', 'LICI', 'ICICIPRULI'].includes(sym)) {
    return <ShieldCheck size={size} color={color || '#10b981'} className={className} style={style} />;
  }

  // Conglomerate & Energy & Infra
  if (['RELIANCE', 'ADANIENT'].includes(sym)) {
    return <Building2 size={size} color={color || '#10b981'} className={className} style={style} />;
  }
  if (['ADANIPORTS'].includes(sym)) {
    return <Ship size={size} color={color || '#0ea5e9'} className={className} style={style} />;
  }
  if (['LT', 'ULTRACEMCO', 'GRASIM', 'SHREECEM', 'AMBUJACEM'].includes(sym)) {
    return <Hammer size={size} color={color || '#ca8a04'} className={className} style={style} />;
  }
  if (['POWERGRID', 'NTPC', 'TATAPOWER', 'ADANIGREEN'].includes(sym)) {
    return <Zap size={size} color={color || '#eab308'} className={className} style={style} />;
  }
  if (['ONGC', 'BPCL', 'COALINDIA', 'IOC'].includes(sym)) {
    return <Fuel size={size} color={color || '#ef4444'} className={className} style={style} />;
  }
  if (['TATASTEEL', 'JSWSTEEL', 'HINDALCO'].includes(sym)) {
    return <Boxes size={size} color={color || '#64748b'} className={className} style={style} />;
  }

  // Telecom
  if (['BHARTIARTL', 'IDEA'].includes(sym)) {
    return <Radio size={size} color={color || '#ef4444'} className={className} style={style} />;
  }

  // Pharma & Healthcare
  if (['SUNPHARMA', 'CIPLA', 'DRREDDY', 'DIVISLAB'].includes(sym)) {
    return <Pill size={size} color={color || '#ec4899'} className={className} style={style} />;
  }
  if (['APOLLOHOSP'].includes(sym)) {
    return <HeartPulse size={size} color={color || '#ef4444'} className={className} style={style} />;
  }

  // Consumer & Retail
  if (['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM', 'DABUR', 'MARICO', 'VBL'].includes(sym)) {
    return <Coffee size={size} color={color || '#16a34a'} className={className} style={style} />;
  }
  if (['TITAN'].includes(sym)) {
    return <Watch size={size} color={color || '#d97706'} className={className} style={style} />;
  }
  if (['ASIANPAINT', 'BERGEPAINT'].includes(sym)) {
    return <Palette size={size} color={color || '#8b5cf6'} className={className} style={style} />;
  }

  // 3. Match by icon name keyword
  if (rawKey.includes('car') || rawKey.includes('auto')) return <Car size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('laptop') || rawKey.includes('comp') || rawKey.includes('tech')) return <Laptop size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('bank') || rawKey.includes('landmark')) return <Landmark size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('build') || rawKey.includes('office')) return <Building2 size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('card') || rawKey.includes('finance')) return <CreditCard size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('zap') || rawKey.includes('power') || rawKey.includes('electric')) return <Zap size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('pill') || rawKey.includes('pharma')) return <Pill size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('fuel') || rawKey.includes('oil') || rawKey.includes('gas')) return <Fuel size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('ship') || rawKey.includes('port')) return <Ship size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('radio') || rawKey.includes('telecom')) return <Radio size={size} color={color} className={className} style={style} />;
  if (rawKey.includes('shield') || rawKey.includes('insur')) return <ShieldCheck size={size} color={color} className={className} style={style} />;

  // Category fallbacks
  const cat = (category || '').toLowerCase();
  if (cat === 'crypto') return <Coins size={size} color={color || '#f59e0b'} className={className} style={style} />;
  if (cat === 'stock') return <Building2 size={size} color={color || '#38bdf8'} className={className} style={style} />;

  // Default clean financial trend icon
  return <TrendingUp size={size} color={color || '#10b981'} className={className} style={style} />;
}
