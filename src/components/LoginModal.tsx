import React, { useState } from 'react';
import { Lock, User, Key, CheckCircle, AlertCircle, X, Shield, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = login(username.trim(), password.trim());
    if (success) {
      onClose();
    } else {
      setError('Invalid username or password. Please verify credentials or contact Super Admin.');
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    const success = login(u, p);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black italic text-lg shadow-sm shadow-blue-700/30">
              T
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Staff Authentication</h3>
              <p className="text-xs text-slate-500">Tata AutoComp Systems Limited - Varale / Chakan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Staff Username / Login ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Pranjils0ni, Sureshchavan, Nitin..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In with Credentials</span>
            </button>
          </form>

          {/* Quick Demo Switcher (Passwords securely hidden) */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              1-Click Fast Staff Switcher:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('Pranjils0ni', 'Suhani@12')}
                className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-purple-900 text-[11px]">Pranjil Soni</div>
                <div className="text-[10px] text-purple-700 font-semibold">Super Admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Sureshchavan', 'Swami@123')}
                className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-blue-900 text-[11px]">Suresh Chavan</div>
                <div className="text-[10px] text-blue-700 font-semibold">Manager (Direct Auth)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Nitin', 'Nitin#123')}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-emerald-900 text-[11px]">Nitin Pawar</div>
                <div className="text-[10px] text-emerald-700 font-semibold">Supervisor (Approver)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Vikash', 'Vikash@123')}
                className="p-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-teal-900 text-[11px]">Vikash Kumar Bharti</div>
                <div className="text-[10px] text-teal-700 font-semibold">Supervisor (Approver)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Deepak', 'Deepak@123')}
                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-amber-900 text-[11px]">Deepak Kumar</div>
                <div className="text-[10px] text-amber-700 font-semibold">Employee (Data Entry)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('Jitendra', 'Jitendra@123')}
                className="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-bold text-orange-900 text-[11px]">Jitendra Soni</div>
                <div className="text-[10px] text-orange-700 font-semibold">Employee (Data Entry)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
