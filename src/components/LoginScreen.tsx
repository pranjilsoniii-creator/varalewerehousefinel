import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, AlertCircle, Building2, CheckCircle2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAccount } from '../types';

export const LoginScreen: React.FC = () => {
  const { login, users } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffUser, setSelectedStaffUser] = useState<UserAccount | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const userToLogin = username.trim() || selectedStaffUser?.username || '';
    if (!userToLogin) {
      setError('Please enter your Staff Username or select your account.');
      return;
    }

    const success = login(userToLogin, password.trim());
    if (!success) {
      setError('Invalid username or password. Please verify your credentials.');
    }
  };

  const handleSelectStaff = (u: UserAccount) => {
    setSelectedStaffUser(u);
    setUsername(u.username);
    setError(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'supervisor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black italic text-xl shadow-lg shadow-blue-700/40">
            T
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white font-display">
              TATA AUTOCOMP SYSTEMS LIMITED
            </h1>
            <p className="text-[11px] text-blue-300 font-medium">
              Lithium Battery Warehouse Management System • Varale / Chakan
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Restricted Authorized Staff Portal</span>
        </div>
      </div>

      {/* Center Login Box */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        {/* Left Info Panel */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Secure Authentication Gateway
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
              Tata Lithium Battery Operations & Inventory
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in with your assigned staff credentials to manage battery inward scans, physical warehouse lines (A-01 to B-25), executive stock, and outward dispatch lots.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Plant Facility</span>
              <span className="font-bold text-white text-xs mt-1 block">Varale & Chakan Phase II</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Security Level</span>
              <span className="font-bold text-white text-xs mt-1 block">RBAC Multi-Level Auth</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Form Card */}
        <div className="lg:col-span-6">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 font-display">Staff Login</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your username and password to unlock portal access
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff Username / ID</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. Pranjils0ni, Sureshchavan, Nitin..."
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
                    placeholder="Enter account password..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In to Warehouse Portal</span>
              </button>
            </form>

            {/* Quick Profile Selector */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Select Your Staff Profile:
              </span>
              <div className="grid grid-cols-2 gap-2 text-left">
                {users.map((u) => {
                  const isSelected = (username.toLowerCase() === u.username.toLowerCase());
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => handleSelectStaff(u)}
                      className={'p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ' +
                        (isSelected
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 hover:border-slate-300')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs truncate">{u.name}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className={'px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ' + getRoleBadge(u.role)}>
                          {u.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-code font-semibold">{u.username}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center py-2 text-[11px] text-slate-500">
        &copy; {new Date().getFullYear()} Tata AutoComp Systems Limited • Lithium Battery Division • Varale / Chakan Plant
      </div>
    </div>
  );
};
