import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  Layers,
  Box,
  Truck,
  Menu,
  FileSpreadsheet,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenDrawer: () => void;
  inwardPacksCount: number;
  totalStockCount: number;
  cartPacksCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenDrawer,
  inwardPacksCount,
  totalStockCount,
  cartPacksCount,
}) => {
  const isTabActive = (tab: string) => {
    if (tab === 'INWARD' && (activeTab === 'INWARD' || activeTab === 'INWARD_LOG')) return true;
    return activeTab === tab;
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-2xl px-1 py-1 flex items-center justify-around safe-area-bottom select-none">
      {/* 1. Dashboard Tab */}
      <button
        type="button"
        onClick={() => onTabChange('DASHBOARD')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-90 ${
          isTabActive('DASHBOARD')
            ? 'text-blue-600 font-extrabold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${isTabActive('DASHBOARD') ? 'bg-blue-50' : ''}`}>
          <LayoutDashboard className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Home</span>
      </button>

      {/* 2. Inward Dock Tab */}
      <button
        type="button"
        onClick={() => onTabChange('INWARD')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative active:scale-90 ${
          isTabActive('INWARD')
            ? 'text-blue-600 font-extrabold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors relative ${isTabActive('INWARD') ? 'bg-blue-50' : ''}`}>
          <QrCode className="w-5 h-5" />
          {inwardPacksCount > 0 && (
            <span className="absolute -top-1 -right-1.5 h-4 min-w-[16px] px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
              {inwardPacksCount > 99 ? '99+' : inwardPacksCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Inward</span>
      </button>

      {/* 3. Lines Storage Matrix Tab */}
      <button
        type="button"
        onClick={() => onTabChange('LINE_INSPECTOR')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all active:scale-90 ${
          isTabActive('LINE_INSPECTOR')
            ? 'text-indigo-600 font-extrabold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${isTabActive('LINE_INSPECTOR') ? 'bg-indigo-50' : ''}`}>
          <Layers className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Lines</span>
      </button>

      {/* 4. Total Stock Inventory Tab */}
      <button
        type="button"
        onClick={() => onTabChange('TOTAL_STOCK')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative active:scale-90 ${
          isTabActive('TOTAL_STOCK')
            ? 'text-purple-600 font-extrabold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors ${isTabActive('TOTAL_STOCK') ? 'bg-purple-50' : ''}`}>
          <Box className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">Stock</span>
      </button>

      {/* 5. Dispatch Staging & Lots Tab */}
      <button
        type="button"
        onClick={() => onTabChange('DISPATCH_CART')}
        className={`flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all relative active:scale-90 ${
          isTabActive('DISPATCH_CART')
            ? 'text-orange-600 font-extrabold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-colors relative ${isTabActive('DISPATCH_CART') ? 'bg-orange-50' : ''}`}>
          <Truck className="w-5 h-5" />
          {cartPacksCount > 0 && (
            <span className="absolute -top-1 -right-1.5 h-4 min-w-[16px] px-1 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
              {cartPacksCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Dispatch</span>
      </button>

      {/* 6. Mobile Menu & More Drawer Button */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex-1 py-1 px-1 flex flex-col items-center justify-center gap-0.5 rounded-xl text-slate-700 hover:text-slate-950 transition-all active:scale-90"
      >
        <div className="p-1 rounded-xl bg-slate-100 text-slate-800">
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold tracking-tight">Menu</span>
      </button>
    </nav>
  );
};
