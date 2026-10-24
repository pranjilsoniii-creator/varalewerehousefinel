import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Camera,
  Layers,
  Search,
  Truck,
  BarChart3,
  Calendar,
  Database,
  Menu,
  X,
  Users,
  LogOut,
  FileSpreadsheet,
  MapPin,
  Table,
  Wrench,
  AlertTriangle,
  Smartphone,
  MessageSquare,
  PackagePlus,
  Boxes,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Shield,
  ChevronRight,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCustomBatteryModels } from '../data/batteryCatalog';

interface RazorpayLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  inwardPacksCount?: number;
  totalStockCount?: number;
  cartPacksCount: number;
  dispatchedLotsCount: number;
  unreadChatCount?: number;
  isCloudConnected?: boolean;
  isCloudSyncing?: boolean;
  lastSyncTime?: Date | null;
  onRefreshCloud?: () => void;
  onOpenSupabaseModal: () => void;
  onOpenLoginModal: () => void;
  onOpenUserManagementModal: () => void;
  onOpenLinePopulatorModal?: () => void;
  onOpenDownloadModal?: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenSuperSearch?: () => void;
}

export const RazorpayLayout: React.FC<RazorpayLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  inwardPacksCount = 0,
  totalStockCount = 0,
  cartPacksCount = 0,
  dispatchedLotsCount = 0,
  unreadChatCount = 0,
  isCloudConnected = true,
  isCloudSyncing = false,
  lastSyncTime,
  onRefreshCloud,
  onOpenSupabaseModal,
  onOpenLoginModal,
  onOpenUserManagementModal,
  onOpenLinePopulatorModal,
  onOpenDownloadModal,
  onOpenMobileDrawer,
  onOpenSuperSearch,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { currentUser, isSuperAdmin, isManager, isSupervisor, hasPermission, isMaintenanceMode, setMaintenanceMode, logout } = useAuth();
  const [customModelsCount, setCustomModelsCount] = useState<number>(0);

  useEffect(() => {
    try {
      const customs = getCustomBatteryModels();
      setCustomModelsCount(Array.isArray(customs) ? customs.length : 0);
    } catch {}
  }, [activeTab]);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K to open Janamkundli / Super Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (onOpenSuperSearch) onOpenSuperSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSuperSearch]);

  // User initials for Razorpay-style circle avatar (e.g. JS, SA, SU)
  const getUserInitials = (name?: string): string => {
    if (!name || typeof name !== 'string') return 'TA';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'TA';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return ((parts[0][0] || 'T') + (parts[parts.length - 1][0] || 'A')).toUpperCase();
  };

  const initials = getUserInitials(currentUser?.name || currentUser?.username);

  // Grouped Navigation Items (Razorpay Sidebar Architecture)
  const coreWmsItems = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permissionKey: 'canViewStock' as const,
      badge: null,
    },
    {
      id: 'INWARD',
      label: 'Inward Scan',
      icon: Camera,
      permissionKey: 'canInward' as const,
      badge: null,
    },
    {
      id: 'INWARD_LOG',
      label: 'Inward Register',
      icon: FileSpreadsheet,
      permissionKey: 'canInward' as const,
      badge: inwardPacksCount > 0 ? `${inwardPacksCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    {
      id: 'TOTAL_STOCK',
      label: 'Total Stock',
      icon: Layers,
      permissionKey: 'canViewStock' as const,
      badge: totalStockCount > 0 ? `${totalStockCount}` : null,
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-300',
    },
    {
      id: 'LINE_INSPECTOR',
      label: 'Warehouse Lines',
      icon: MapPin,
      permissionKey: 'canLineManage' as const,
      badge: null,
    },
    {
      id: 'DISPATCH_CART',
      label: 'Dispatch Staging',
      icon: Truck,
      permissionKey: 'canDispatch' as const,
      badge: cartPacksCount > 0 ? `${cartPacksCount}` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    },
  ];

  const shiftOpsItems = [
    {
      id: 'SHIFT_CHAT',
      label: 'Shift Chat (8h)',
      icon: MessageSquare,
      permissionKey: 'canInward' as const, // all staff can access shift chat
      badge: unreadChatCount > 0 ? `${unreadChatCount} new` : 'LIVE',
      badgeColor: unreadChatCount > 0
        ? 'bg-rose-500 text-white animate-pulse'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-300',
    },
    {
      id: 'DAILY_STOCK',
      label: 'Daily Stock Maint.',
      icon: Calendar,
      permissionKey: 'canViewStock' as const,
      badge: null,
    },
  ];

  const catalogItems = [
    {
      id: 'CUSTOM_PACKS',
      label: 'Custom Pack Types',
      icon: Boxes,
      permissionKey: 'canViewStock' as const,
      badge: customModelsCount > 0 ? `${customModelsCount}` : 'NEW',
      badgeColor: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    },
    {
      id: 'ANALYTICS',
      label: 'Analytics & Reports',
      icon: BarChart3,
      permissionKey: 'canAnalytics' as const,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Maintenance Mode Warning Banner for Super Admin */}
      {isMaintenanceMode && isSuperAdmin && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-inner z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950" />
            <span>Maintenance Mode is currently ACTIVE (Portal is locked for non-admin staff).</span>
          </div>
          <button
            onClick={() => setMaintenanceMode(false)}
            className="px-2.5 py-0.5 bg-slate-950 text-white rounded text-[11px] font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Turn Off Maintenance Mode
          </button>
        </div>
      )}

      {/* 2. Razorpay-style Dark Executive Top Bar Header */}
      <header className="sticky top-0 z-40 bg-[#0c131f] border-b border-slate-800 text-white shadow-md">
        <div className="px-3 sm:px-5">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            
            {/* Left: Mobile Drawer Toggle + Brand Logo & Title */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={onOpenMobileDrawer}
                className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Sidebar Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title={isSidebarCollapsed ? "Show Sidebar Menu" : "Hide Sidebar Menu (Full Screen View)"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 text-blue-400" /> : <PanelLeftClose className="w-5 h-5" />}
              </button>

              {/* TATA Brand Logo */}
              <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs flex-shrink-0">
                <img
                  src="/tata-logo.png"
                  alt="TATA Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-sm sm:text-base tracking-tight text-white leading-none">
                    TATA AUTOCOMP
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-extrabold border border-blue-500/30 font-mono-code leading-none">
                    B300
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono-code font-medium tracking-tight hidden sm:block mt-0.5">
                  Varale Plant • Lithium Battery WMS
                </p>
              </div>
            </div>

            {/* Center: Razorpay-style Global Search Bar (Universal Janamkundli Trigger) */}
            <div className="flex-1 max-w-lg hidden md:block mx-2">
              <button
                type="button"
                onClick={onOpenSuperSearch}
                className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs transition shadow-inner group cursor-pointer"
                title="Search pack number, lot, customer, invoice... (Ctrl+K)"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors shrink-0" />
                  <span className="text-slate-400 group-hover:text-slate-200 truncate">
                    Search serial, pack number, invoice (Janamkundli)...
                  </span>
                </div>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono-code font-bold bg-slate-900 border border-slate-700 rounded text-slate-400">
                  Ctrl+K
                </kbd>
              </button>
            </div>

            {/* Right: Quick Action Controls + User Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Universal Super Search / Janamkundli Shortcut on Mobile/Tablet */}
              <button
                type="button"
                onClick={onOpenSuperSearch}
                className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title="Universal Super Search (Janamkundli)"
              >
                <Search className="w-4 h-4 text-blue-400" />
              </button>

              {/* Shift Chat Quick Pill */}
              <button
                type="button"
                onClick={() => onTabChange('SHIFT_CHAT')}
                className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  activeTab === 'SHIFT_CHAT'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="8-Hour Operations Team Chat"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-display">Shift Chat</span>
                {unreadChatCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold font-mono-code animate-pulse">
                    {unreadChatCount}
                  </span>
                ) : (
                  <span className="hidden xl:inline text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    8h
                  </span>
                )}
              </button>

              {/* Supabase Cloud Live Status */}
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                title={
                  isCloudSyncing
                    ? 'Syncing with Supabase Cloud...'
                    : isCloudConnected
                    ? 'Supabase Cloud Connected & Live'
                    : 'Cloud Offline'
                }
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline text-[11px] font-mono-code">
                  {isCloudSyncing ? 'Syncing...' : isCloudConnected ? 'Cloud Live' : 'Offline'}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCloudSyncing
                      ? 'bg-amber-400 animate-spin'
                      : isCloudConnected
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
              </button>

              {/* Android APK Download Modal */}
              {onOpenDownloadModal && (
                <button
                  type="button"
                  onClick={onOpenDownloadModal}
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Download Android APK"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">APK</span>
                </button>
              )}

              {/* User Management (Admin / Manager) */}
              {(isSuperAdmin || isManager) && (
                <button
                  type="button"
                  onClick={onOpenUserManagementModal}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition cursor-pointer"
                  title="Manage Staff Users & Permissions"
                >
                  <Users className="w-4 h-4 text-purple-400" />
                </button>
              )}

              {/* Razorpay-style User Profile Avatar Circle */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-700">
                  <div
                    onClick={onOpenLoginModal}
                    className="flex items-center gap-2 cursor-pointer group"
                    title={`Logged in as ${currentUser.name} (${currentUser.role})`}
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-slate-700 group-hover:ring-blue-500 transition">
                      {initials}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-xs font-bold text-slate-200 leading-tight group-hover:text-white">
                        {currentUser.name}
                      </p>
                      <p className="text-[10px] text-blue-400 uppercase font-mono-code font-bold tracking-wider">
                        {currentUser.role}
                      </p>
                    </div>
                  </div>

                  {/* Quick Logout Button */}
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Body Structure: Left Sidebar (Desktop) + Right Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* DESKTOP LEFT SIDEBAR (Razorpay Dashboard Architecture) */}
        <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-0 overflow-hidden border-none' : 'w-64'} flex-col transition-all duration-200 bg-white border-r border-slate-200 shrink-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] sticky top-14 sm:top-16 select-none overflow-y-auto`}>
          
          <div className="p-3 space-y-6 flex-1">
            
            {/* GROUP 1: CORE WMS */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Core WMS
              </div>
              <div className="space-y-1">
                {coreWmsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = hasPermission(item.permissionKey);
                  if (!isAllowed) return null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-extrabold border-l-4 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-code font-bold ${
                            item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GROUP 2: SHIFT OPERATIONS */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Shift Operations</span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  8h Shifts
                </span>
              </div>
              <div className="space-y-1">
                {shiftOpsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = hasPermission(item.permissionKey);
                  if (!isAllowed) return null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-extrabold border-l-4 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-code font-bold ${
                            item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GROUP 3: CATALOG & INSIGHTS */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Catalog & Reports
              </div>
              <div className="space-y-1">
                {catalogItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isAllowed = hasPermission(item.permissionKey);
                  if (!isAllowed) return null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-extrabold border-l-4 border-blue-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-code font-bold ${
                            item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GROUP 4: ADMIN TOOLS (Admin / Manager only) */}
            {(isSuperAdmin || isManager) && (
              <div>
                <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Administration
                </div>
                <div className="space-y-1">
                  {onOpenLinePopulatorModal && (
                    <button
                      type="button"
                      onClick={onOpenLinePopulatorModal}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Table className="w-4 h-4 text-purple-500 group-hover:text-purple-600 shrink-0" />
                        <span>Line Populator</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-mono-code font-bold">
                        Matrix
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onOpenUserManagementModal}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Users className="w-4 h-4 text-purple-500 group-hover:text-purple-600 shrink-0" />
                      <span>Staff & Permissions</span>
                    </div>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setMaintenanceMode(!isMaintenanceMode)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isMaintenanceMode
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Wrench className="w-4 h-4 shrink-0" />
                        <span>Maintenance Mode</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/20 font-mono-code font-bold">
                        {isMaintenanceMode ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* GROUP 5: SYSTEM & CONNECTIVITY */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                System
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={onOpenSupabaseModal}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Database className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600 shrink-0" />
                    <span>Supabase Cloud</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-mono-code font-bold">
                    Connected
                  </span>
                </button>

                {onOpenDownloadModal && (
                  <button
                    type="button"
                    onClick={onOpenDownloadModal}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Smartphone className="w-4 h-4 text-blue-500 group-hover:text-blue-600 shrink-0" />
                      <span>Download Android APK</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-mono-code font-bold">
                      APK
                    </span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* SIDEBAR FOOTER (Razorpay Account & Plant Card) */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/80">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Active Plant
                </span>
                <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  Varale B300
                </span>
              </div>
              {currentUser && (
                <div className="flex items-center justify-between">
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[10px] font-mono-code text-blue-600 font-bold uppercase">{currentUser.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
};
