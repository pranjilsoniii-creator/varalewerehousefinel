import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your Staff Username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your account password.');
      return;
    }

    const success = login(username.trim(), password.trim());
    if (!success) {
      setError('Invalid username or password. Please verify credentials or contact Super Admin.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
            <img
              src="/tata-logo.png"
              alt="TATA Logo"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white font-display">
              TATA AUTOCOMP SYSTEMS LIMITED
            </h1>
            <p className="text-[11px] text-slate-400 font-mono-code">
              Varale (B300 Plant) Warehouse Management System
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Restricted Authorized Staff Portal</span>
        </div>
      </div>

      {/* Center Login Box */}
      <div className="max-w-md mx-auto w-full py-8">
        <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          <div className="text-center space-y-3 border-b border-slate-100 pb-5">
            <div className="h-16 w-16 mx-auto bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center justify-center shadow-2xs">
              <img
                src="/tata-logo.png"
                alt="TATA Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Staff Authentication Gateway</h2>
              <p className="text-xs text-slate-500 font-mono-code">
                Varale B300 Plant • Lithium Battery System
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Staff Username / Login ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter staff username..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>Authenticate & Enter Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 font-mono-code">
            Secure Warehouse Access • Plant B300
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-slate-500 text-xs py-2">
        <p>© 2026 Tata AutoComp Systems Limited. All rights reserved. Varale Plant (B300).</p>
      </div>
    </div>
  );
};
