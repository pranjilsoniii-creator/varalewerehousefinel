import React, { useState, useEffect } from 'react';
import { User, Clock, Search, ShieldCheck, RefreshCw, Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WelcomeHeaderProps {
  onOpenSuperSearch: () => void;
  isCloudConnected?: boolean;
  isCloudSyncing?: boolean;
  lastSyncTime?: Date | null;
  onRefreshCloud?: () => void;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  onOpenSuperSearch,
  isCloudConnected = true,
  isCloudSyncing = false,
  lastSyncTime,
  onRefreshCloud,
}) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentUser) return null;

  const hour = currentTime.getHours();
  let timeGreeting = 'Good Morning';
  if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good Afternoon';
  } else if (hour >= 17 && hour < 22) {
    timeGreeting = 'Good Evening';
  } else if (hour >= 22 || hour < 5) {
    timeGreeting = 'Welcome (Night Shift)';
  }

  const isSirTitle = isManager || isSupervisor || isSuperAdmin;
  const greetingHeading = isSirTitle ? `${timeGreeting}, Sir!` : `${timeGreeting}!`;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-blue-800/40 px-4 sm:px-6 py-2.5 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Side: Dynamic Personalized Greeting */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg text-blue-200 shadow-inner">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white font-display">
                {greetingHeading} <span className="text-blue-300 font-bold">Welcome {currentUser.name}</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[10px] font-mono-code font-bold uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-blue-200/80 font-mono-code -mt-0.5">
              Tata AutoComp Systems Limited • Varale (B300 Plant)
            </p>
          </div>
        </div>

        {/* Right Side: Realtime Cloud Status + Super Search + Live Clock */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start md:self-auto">
          {/* Cloud Realtime Live Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[11px] font-mono-code">
            {isCloudSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="text-amber-200 font-bold">Syncing...</span>
              </>
            ) : isCloudConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 font-bold">Cloud Realtime Live</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-blue-200">Local Active</span>
              </>
            )}

            {onRefreshCloud && (
              <button
                onClick={onRefreshCloud}
                disabled={isCloudSyncing}
                title="Force refresh database from Supabase Cloud"
                className="ml-1 p-0.5 text-blue-200 hover:text-white hover:bg-white/20 rounded transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Universal Super Search Button */}
          <button
            onClick={onOpenSuperSearch}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-blue-400/30"
            title="Search complete history and lifecycle of any battery pack"
          >
            <Search className="w-3.5 h-3.5 text-blue-200" />
            <span>Super Search (Janamkundli)</span>
          </button>

          {/* Live Indian Time */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono-code text-blue-100">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {currentTime.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}{' '}
              • {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
