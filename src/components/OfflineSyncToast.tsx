import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle2, RefreshCw, X, AlertCircle } from 'lucide-react';
import { getOfflineQueue, processOfflineQueue } from '../utils/offlineSyncEngine';

export const OfflineSyncToast: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      const { syncedCount } = await processOfflineQueue();
      setIsSyncing(false);
      if (syncedCount > 0) {
        setSyncSuccessMessage(`✅ Reconnected! Successfully synced ${syncedCount} offline record(s) to Supabase cloud.`);
        setTimeout(() => setSyncSuccessMessage(null), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      setQueueCount(getOfflineQueue().length);
    };

    const handleSyncComplete = (e: any) => {
      const synced = e.detail?.syncedCount || 0;
      setQueueCount(getOfflineQueue().length);
      if (synced > 0) {
        setSyncSuccessMessage(`✅ Synced ${synced} record(s) to cloud!`);
        setTimeout(() => setSyncSuccessMessage(null), 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('tata-wms-queue-change', handleQueueChange);
    window.addEventListener('tata-wms-sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('tata-wms-queue-change', handleQueueChange);
      window.removeEventListener('tata-wms-sync-completed', handleSyncComplete);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const { syncedCount } = await processOfflineQueue();
    setIsSyncing(false);
    setQueueCount(getOfflineQueue().length);
    if (syncedCount > 0) {
      setSyncSuccessMessage(`✅ Successfully synced ${syncedCount} record(s) to Supabase cloud!`);
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    }
  };

  return (
    <>
      {/* 1. Offline Mode Alert Pill (Shows when internet is offline) */}
      {!isOnline && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl border border-amber-600 flex items-center justify-between gap-3 text-xs font-bold animate-slideDown">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0 text-slate-950 animate-pulse" />
            <span>
              Offline Mode • All changes saved locally on phone
              {queueCount > 0 && <span className="ml-1 bg-black text-white px-1.5 py-0.2 rounded-full text-[10px]">{queueCount}</span>}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-mono opacity-80">Auto-Sync on Reconnect</span>
        </div>
      )}

      {/* 2. Success Toast when Reconnected & Synced */}
      {syncSuccessMessage && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-500 flex items-center justify-between gap-3 text-xs font-bold animate-slideDown">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-white" />
            <span>{syncSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSuccessMessage(null)}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
