import React, { useState } from 'react';
import { Camera, Search, X, Plus, Sparkles, QrCode } from 'lucide-react';

interface MobileScannerFABProps {
  onOpenScanner: () => void;
  onOpenSuperSearch: () => void;
}

export const MobileScannerFAB: React.FC<MobileScannerFABProps> = ({
  onOpenScanner,
  onOpenSuperSearch,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sm:hidden fixed bottom-18 right-3 z-30 flex flex-col items-end gap-2 select-none">
      {/* Expanded Quick Options */}
      {isExpanded && (
        <div className="flex flex-col items-end gap-2 animate-fadeIn mb-1">
          {/* Quick Search Action */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenSuperSearch();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold active:scale-95 transition-transform"
          >
            <span>Universal Search</span>
            <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Search className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Quick Inward Scanner Action */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              onOpenScanner();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold active:scale-95 transition-transform"
          >
            <span>Inward Camera Scan</span>
            <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Main Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`h-13 w-13 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 cursor-pointer ${
          isExpanded
            ? 'bg-slate-800 text-white rotate-45 border-2 border-slate-700'
            : 'bg-gradient-to-tr from-blue-700 to-indigo-600 text-white border-2 border-white/40 ring-4 ring-blue-500/20 shadow-blue-600/40'
        }`}
        title="Quick Mobile Action"
      >
        <Plus className="w-7 h-7 font-black stroke-[3]" />
      </button>
    </div>
  );
};
