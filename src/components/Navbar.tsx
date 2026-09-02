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
  onQuickSearch,
}) => {
  const { currentUser, isSuperAdmin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const navItems = [
    {
      id: 'INWARD',
      label: 'AI Inward Scan',
      icon: Camera,
      badge: 'Auto-OCR',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    {
      id: 'INWARD_LOG',
      label: 'Inward Register',
      icon: FileSpreadsheet,
      badge: totalActivePacks > 0 ? `${totalActivePacks} Inwarded` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'TOTAL_STOCK',
      label: 'Total Stock',
      icon: Layers,
      badge: '9 Models',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'DISPATCH_CART',
      label: 'Dispatch Staging',
      icon: Truck,
      badge: cartPacksCount > 0 ? `${cartPacksCount} in Cart` : null,
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      highlight: cartPacksCount > 0,
    },
    {
      id: 'INVOICES',
      label: 'Gate Pass & Invoices',
      icon: FileText,
      badge: null,
    },
    {
      id: 'ANALYTICS',
      label: 'Analytics',
      icon: BarChart3,
      badge: dispatchedLotsCount > 0 ? `${dispatchedLotsCount} Lots` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      if (onQuickSearch) {
        onQuickSearch(globalSearch);
      }
      onTabChange('TOTAL_STOCK');
    }
  };

  const getRoleBadge = () => {
    if (!currentUser) return null;
    const role = currentUser.role;
    if (role === 'superadmin') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">Super Admin</span>;
    }
    if (role === 'manager') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">Manager</span>;
    }
    if (role === 'supervisor') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">Supervisor</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">Employee</span>;
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-xs transition-all">
        {/* Upper Topbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center font-black text-white italic text-lg shadow-sm shadow-blue-700/30 flex-shrink-0">
                T
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 font-display uppercase">
                    Tata AutoComp Systems Limited
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                    Varale / Chakan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden md:block">
                  Lithium Battery Warehouse Management System
                </p>
              </div>
            </div>
          </div>

          {/* Center Quick Search Box */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search Pack Serial (e.g. 5284, 12, 101)..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition"
              />
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            </form>
          </div>

          {/* Right User & Live Status Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Super Admin User Management Button */}
            {isSuperAdmin && (
              <button
                onClick={onOpenUserManagementModal}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Super Admin User Access Panel"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Management</span>
              </button>
            )}

            {/* Cloud Sync Status */}
            <button
              onClick={onOpenSupabaseModal}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Cloud Database Sync"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Cloud Sync</span>
            </button>

            {/* User Session Badge & Switch Button */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-1.5 pr-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</span>
                    {getRoleBadge()}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono-code">@{currentUser.username}</span>
                </div>

                <button
                  onClick={onOpenLoginModal}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                  title="Switch Staff User"
                >
                  <User className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={logout}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>Staff Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-900 border-t border-slate-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : item.highlight ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono-code font-bold border ${
                          item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-72 max-w-[85vw] h-full bg-slate-900 text-white p-5 flex flex-col shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white italic">
                  T
                </div>
                <span className="font-bold text-sm tracking-tight uppercase">Tata AutoComp WMS</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-1.5 flex-1 overflow-y-auto">
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
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono-code font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile User Profile Section */}
            {currentUser && (
              <div className="border-t border-slate-800 pt-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{currentUser.name}</span>
                  {getRoleBadge()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onOpenLoginModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-center"
                  >
                    Switch User
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-1.5 bg-rose-950 text-rose-300 rounded"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
