import { useState } from 'react';
import adminApi from '../services/api';
import { showSuccessAlert, showErrorAlert } from '../utils/swal';
import { ShieldCheck, AlertTriangle, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function AdminLoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both Email and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await adminApi.login(email.trim(), password);
      setIsLoading(false);
      showSuccessAlert(
        'Terminal Access Granted',
        `Welcome, <strong>${res.user?.name || 'Super Admin'}</strong>! Session authenticated securely.`
      );
      onLoginSuccess(res.user || { name: 'Paynex Super Admin', email, role: 'admin' }, res.token);
    } catch (err) {
      setIsLoading(false);
      const msg = err.message || 'Invalid administrator credentials. Access denied.';
      setErrorMessage(msg);
      showErrorAlert('Authorization Failed', msg);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-sans"
      style={{
        background: 'radial-gradient(circle at 50% 20%, #151c2c 0%, #0b0e14 70%, #05070a 100%)',
      }}
    >
      {/* Background Matrix/Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(#1e2638 1px, transparent 1px), linear-gradient(90deg, #1e2638 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Decorative Glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none opacity-15 blur-[120px]"
        style={{ background: '#f59e0b', top: '15%', left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Main Strict Square Login Card */}
      <div
        className="relative z-10 w-full max-w-[460px] bg-[#121722] border border-[#2a354d] p-6 sm:p-8 shadow-2xl"
        style={{ borderRadius: '0px' }}
      >
        {/* Top Security Header */}
        <div className="flex items-center justify-between border-b border-[#1e2638] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="border border-amber-500 overflow-hidden bg-black shrink-0 flex items-center justify-center"
              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
            >
              <img
                src="/paynex-logo.jpg"
                alt="PAYNEX Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-extrabold text-base tracking-wider">PAYNEX</span>
                <span className="text-xs text-amber-500 font-black tracking-widest">CRYPTO</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                MASTER ADMIN TERMINAL
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
            LVL 4 CLEARANCE
          </div>
        </div>

        {/* Form Title */}
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-500" /> Terminal Sign In
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional exchange administration console. Enter root credentials.
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Admin Email / Identifier
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Mail size={14} />
              </span>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter administrator email"
                className="w-full bg-[#0b0e14] border border-[#2a354d] focus:border-amber-500 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Root Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-amber-500 hover:text-amber-400 font-semibold cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Lock size={14} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#0b0e14] border border-[#2a354d] focus:border-amber-500 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-60"
              style={{ borderRadius: '0px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verifying Clearances...</span>
                </>
              ) : (
                <>
                  <span>AUTHENTICATE & OPEN CONSOLE</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Credentials Footer */}
        <div className="mt-6 pt-4 border-t border-[#1e2638] text-center">
          <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-mono">
            <Lock size={12} className="text-amber-500" /> 256-Bit TLS End-to-End Encrypted Session
          </div>
        </div>
      </div>
    </div>
  );
}
