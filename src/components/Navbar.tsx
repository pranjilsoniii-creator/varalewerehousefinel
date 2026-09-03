import React, { useState } from 'react';
import {
  Camera,
  Layers,
  Search,
  Truck,
  FileText,
  BarChart3,
  Database,
  Menu,
  X,
  User,
  Users,
  ShieldCheck,
  LogOut,
  Sparkles,
  FileSpreadsheet,
  Building,
  MapPin,
  Table,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalActivePacks: number;
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
  totalActivePacks,
  cartPacksCount,
  dispatchedLotsCount,
  onOpenSupabaseModal,
  onOpenLoginModal,
  onOpenUserManagementModal,
  onOpenLinePopulatorModal,
  onQuickSearch,
}) => {
  const { currentUser, isSuperAdmin, isManager, hasPermission, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const allNavItems = [
    {
      id: 'INWARD',
      label: 'AI Inward Scan',
      icon: Camera,
      permissionKey: 'canInward' as const,
      badge: 'Auto-OCR',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    {
      id: 'INWARD_LOG',
      label: 'Inward Register',
      icon: FileSpreadsheet,
      permissionKey: 'canInward' as const,
      badge: totalActivePacks > 0 ? totalActivePacks + ' Inward' : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'TOTAL_STOCK',
      label: 'Total Stock',
      icon: Layers,
      permissionKey: 'canViewStock' as const,
      badge: 'All Stock',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'LINE_INSPECTOR',
      label: 'Warehouse Lines',
      icon: MapPin,
      permissionKey: 'canLineManage' as const,
      badge: '50 Lines',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'DISPATCH_CART',
      label: 'Dispatch Staging',
      icon: Truck,
      permissionKey: 'canDispatch' as const,
      badge: cartPacksCount > 0 ? cartPacksCount + ' in Cart' : null,
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      highlight: cartPacksCount > 0,
    },
    {
      id: 'INVOICES',
      label: 'Gate Pass & Invoices',
      icon: FileText,
      permissionKey: 'canInvoices' as const,
      badge: null,
    },
    {
      id: 'ANALYTICS',
      label: 'Analytics',
      icon: BarChart3,
      permissionKey: 'canAnalytics' as const,
      badge: dispatchedLotsCount > 0 ? dispatchedLotsCount + ' Lots' : null,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
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
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="font-display font-extrabold text-lg text-orange-400">T</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-white">
                  TATA AUTOCOMP
                </span>
                <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30">
                  B300
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-code -mt-0.5">Varale Plant • Lithium Battery WMS</p>
            </div>
          </div>

          {/* Global Header Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Global Search (e.g. 7428, AIO)..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:bg-slate-800 transition"
              />
            </form>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={'relative px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ' +
                    (isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : item.highlight
                      ? 'text-orange-400 bg-orange-500/10 hover:bg-orange-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80')}
                >
                  <Icon className={'w-4 h-4 ' + (isActive ? 'text-white' : item.highlight ? 'text-orange-400' : 'text-slate-400')} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={'text-[10px] px-1.5 py-0.2 rounded-full font-bold border ' +
                        (isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor || 'bg-slate-700 text-slate-300 border-slate-600')}
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
                className="hidden xl:flex px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition items-center gap-1.5 cursor-pointer"
                title="Populate Line Historical Matrix"
              >
                <Table className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Populate Lines</span>
              </button>
            )}

            {/* Super Admin & Manager: User Management */}
            {(isSuperAdmin || isManager) && (
              <button
                onClick={onOpenUserManagementModal}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition cursor-pointer"
                title="Manage Staff Users & Section Permissions"
              >
                <Users className="w-4 h-4 text-purple-400" />
              </button>
            )}

            {/* Cloud Database Connection Status Indicator */}
            <button
              onClick={onOpenSupabaseModal}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition cursor-pointer flex items-center gap-1.5"
              title="Supabase Cloud Database Settings"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* Current User Badge / Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-100 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-orange-400 uppercase font-bold tracking-wider font-mono-code">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 rounded-xl border border-slate-700/80 transition cursor-pointer"
                  title="Log out of session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 animate-fadeIn">
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
                className={'w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ' +
                  (isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800')}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
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
              className="w-full px-4 py-2.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Table className="w-4 h-4 text-purple-400" />
              <span>Populate Warehouse Lines</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
