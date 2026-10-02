import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  QrCode,
  Layers,
  Box,
  Truck,
  FileSpreadsheet,
  TrendingUp,
  Search,
  Users,
  Database,
  Download,
  LogOut,
  X,
  ShieldCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Smartphone,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getOfflineQueue, processOfflineQueue } from '../utils/offlineSyncEngine';

interface MobileAppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  onRefreshCloud: () => void;
  onOpenSuperSearch: () => void;
  onOpenDownloadModal: () => void;
  onOpenUserManagementModal: () => void;
  onOpenSupabaseModal: () => void;
  inwardPacksCount: number;
  totalStockCount: number;
  cartPacksCount: number;
}

export const MobileAppDrawer: React.FC<MobileAppDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  isCloudConnected,
  isCloudSyncing,
  onRefreshCloud,
  onOpenSuperSearch,
  onOpenDownloadModal,
  onOpenUserManagementModal,
  onOpenSupabaseModal,
  inwardPacksCount,
  totalStockCount,
  cartPacksCount,
}) => {
  const { currentUser, isSuperAdmin, isManager, logout } = useAuth();
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  // Touch Swipe Gesture State for smooth finger sliding
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  // Update offline queue count
  useEffect(() => {
    const updateCount = () => {
      setOfflineCount(getOfflineQueue().length);
    };
    updateCount();
    window.addEventListener('tata-wms-queue-change', updateCount);
    window.addEventListener('tata-wms-sync-completed', updateCount);
    return () => {
      window.removeEventListener('tata-wms-queue-change', updateCount);
      window.removeEventListener('tata-wms-sync-completed', updateCount);
    };
  }, []);

  // Handle Touch Gestures for Drawer Dragging / Swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      setTouchCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null && touchCurrentX !== null) {
      const deltaX = touchStartX - touchCurrentX;
      // If swiped left by more than 60px -> close drawer
      if (deltaX > 60) {
        onClose();
      }
    }
    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  const handleManualOfflineSync = async () => {
    setIsSyncingQueue(true);
    await processOfflineQueue();
    await onRefreshCloud();
    setIsSyncingQueue(false);
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard Overview', icon: LayoutDashboard, color: 'text-blue-600', count: null },
    { id: 'INWARD', label: 'Inward Scanner & Dock', icon: QrCode, color: 'text-blue-600', count: null },
    { id: 'INWARD_LOG', label: 'Inward Shipment Register', icon: FileSpreadsheet, color: 'text-blue-700', count: inwardPacksCount },
    { id: 'LINE_INSPECTOR', label: 'Storage Lines Matrix', icon: Layers, color: 'text-indigo-600', count: null },
    { id: 'TOTAL_STOCK', label: 'Total Stock Inventory', icon: Box, color: 'text-purple-600', count: totalStockCount },
    { id: 'DISPATCH_CART', label: 'Outward Dispatch Staging', icon: Truck, color: 'text-orange-600', count: cartPacksCount },
    { id: 'DAILY_STOCK', label: 'Daily Stock Maintenance', icon: Calendar, color: 'text-emerald-600', count: null },
    { id: 'ANALYTICS', label: 'Reports & Analytics', icon: TrendingUp, color: 'text-cyan-600', count: null },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden animate-fadeIn select-none">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 text-slate-100 h-full flex flex-col shadow-2xl z-10 border-r border-slate-800 animate-slideRight"
      >
        {/* Drawer Top Profile Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
                <img src="/tata-logo.png" alt="TATA Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-white uppercase font-display">
                  TATA AUTOCOMP SYSTEMS
                </h3>
                <p className="text-[10px] text-slate-400 font-mono-code">Varale (B300 Plant) WMS</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Account Info Pill */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{currentUser?.name || 'Staff User'}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold uppercase tracking-wider">
                  {currentUser?.role || 'Staff'}
                </span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">@{currentUser?.username}</p>
            </div>

            <div className="flex items-center gap-1">
              {isCloudConnected ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Offline Buffer Action Pill */}
          {offlineCount > 0 && (
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-[11px] animate-fadeIn">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                💾 <strong>{offlineCount}</strong> actions saved offline
              </span>
              <button
                type="button"
                onClick={handleManualOfflineSync}
                disabled={isSyncingQueue}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                <span>{isSyncingQueue ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Warehouse Navigation
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                  <span>{item.label}</span>
                </div>

                {item.count !== null && item.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-blue-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-800 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Mobile Actions
            </p>

            {/* Universal Super Search */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSuperSearch();
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Super Search ("Janamkundli")</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            {/* Download Native APK / Install App */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDownloadModal();
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Download Android APK / App</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            {/* User Management (SuperAdmin & Manager) */}
            {(isSuperAdmin || isManager) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserManagementModal();
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Staff & User Management</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            )}

            {/* Cloud Supabase Sync Modal */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSupabaseModal();
              }}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Cloud Supabase Database</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Drawer Bottom Logout Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock & Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
