import React, { useState } from 'react';
import {
  LayoutDashboard,
  Camera,
  Layers,
  Search,
  Truck,
  BarChart3,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalActivePacks?: number;
  inwardPacksCount?: number;
  totalStockCount?: number;
  cartPacksCount: number;
  dispatchedLotsCount: number;
  onOpenSupabaseModal: () => void;
  onOpenLoginModal: () => void;
  onOpenUserManagementModal: () => void;
  onOpenLinePopulatorModal?: () => void;
  onQuickSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  totalActivePacks = 0,
  inwardPacksCount,
  totalStockCount = 0,
  cartPacksCount,
  dispatchedLotsCount,
  onOpenSupabaseModal,
  onOpenLoginModal,
  onOpenUserManagementModal,
  onOpenLinePopulatorModal,
  onQuickSearch,
}) => {
  const { currentUser, isSuperAdmin, isManager, hasPermission, isMaintenanceMode, setMaintenanceMode, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const finalInwardCount = inwardPacksCount !== undefined ? inwardPacksCount : totalActivePacks;

  const allNavItems = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permissionKey: 'canViewStock' as const,
    },
    {
      id: 'INWARD',
      label: 'Inward Scan',
      icon: Camera,
      permissionKey: 'canInward' as const,
    },
    {
      id: 'INWARD_LOG',
      label: 'Inward Register',
      icon: FileSpreadsheet,
      permissionKey: 'canInward' as const,
      badge: finalInwardCount > 0 ? `${finalInwardCount}` : null,
    },
    {
      id: 'TOTAL_STOCK',
      label: 'Total Stock',
      icon: Layers,
      permissionKey: 'canViewStock' as const,
      badge: totalStockCount > 0 ? `${totalStockCount}` : null,
    },
    {
      id: 'LINE_INSPECTOR',
      label: 'Warehouse Lines',
      icon: MapPin,
      permissionKey: 'canLineManage' as const,
    },
    {
      id: 'DISPATCH_CART',
      label: 'Dispatch Staging',
      icon: Truck,
      permissionKey: 'canDispatch' as const,
      badge: cartPacksCount > 0 ? `${cartPacksCount}` : null,
    },
    {
      id: 'ANALYTICS',
      label: 'Analytics',
      icon: BarChart3,
      permissionKey: 'canAnalytics' as const,
    },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((it) => hasPermission(it.permissionKey));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onQuickSearch && globalSearch.trim()) {
      onQuickSearch(globalSearch.trim());
      onTabChange('TOTAL_STOCK');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-2xs">
      {/* Maintenance Mode Top Banner for Super Admin */}
      {isMaintenanceMode && isSuperAdmin && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-inner">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-10 w-auto flex items-center justify-center">
              <img
                src="/tata-logo.png"
                alt="TATA Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                  TATA AUTOCOMP
                </span>
                <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                  B300
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono-code -mt-0.5 font-medium">Varale Plant • Lithium Battery WMS</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Clean text-only) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & User Profile */}
          <div className="flex items-center gap-2">
            {/* Super Admin & Manager: Line Populator Matrix Shortcut */}
            {(isSuperAdmin || isManager) && onOpenLinePopulatorModal && (
              <button
                onClick={onOpenLinePopulatorModal}
                className="hidden xl:flex px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition items-center gap-1.5 cursor-pointer"
                title="Populate Warehouse Line Stock"
              >
                <Table className="w-3.5 h-3.5 text-purple-600" />
                <span>Line Populator</span>
              </button>
            )}

            {/* Super Admin & Manager: Maintenance Toggle */}
            {isSuperAdmin && (
              <button
                onClick={() => setMaintenanceMode(!isMaintenanceMode)}
                className={`p-2 rounded-lg border transition cursor-pointer ${
                  isMaintenanceMode
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
                title={isMaintenanceMode ? 'Maintenance Mode Active (Click to Disable)' : 'Enable Maintenance Lockdown'}
              >
                <Wrench className="w-4 h-4" />
              </button>
            )}

            {/* Super Admin & Manager: User Management */}
            {(isSuperAdmin || isManager) && (
              <button
                onClick={onOpenUserManagementModal}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                title="Manage Staff Users & Permissions"
              >
                <Users className="w-4 h-4 text-purple-600" />
              </button>
            )}

            {/* Cloud Database Status */}
            <button
              onClick={onOpenSupabaseModal}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
              title="Supabase Cloud Database Settings"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            {/* Current User Badge / Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider font-mono-code">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-2 animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold font-mono-code">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {(isSuperAdmin || isManager) && onOpenLinePopulatorModal && (
            <button
              onClick={() => {
                onOpenLinePopulatorModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Table className="w-4 h-4 text-purple-600" />
              <span>Line Populator</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
