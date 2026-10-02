import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Printer,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { BatteryPack } from '../types';
import { getProductNameAndType } from '../data/batteryCatalog';
import { RACKS_PER_LINE } from '../data/seedWarehouse';

interface PublicLineSheetViewProps {
  lineId: string;
  packs: BatteryPack[];
  warehouseLines: string[];
  onSelectLine: (lineId: string) => void;
  onGoToLogin: () => void;
}

export const PublicLineSheetView: React.FC<PublicLineSheetViewProps> = ({
  lineId,
  packs,
  warehouseLines,
  onSelectLine,
  onGoToLogin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState(lineId || 'A-01');

  // Keep synced if prop changes
  React.useEffect(() => {
    if (lineId) setSelectedLine(lineId);
  }, [lineId]);

  // Packs in selected line
  const linePacks = useMemo(() => {
    return packs.filter((p) => p.status !== 'DISPATCHED' && p.lineId === selectedLine);
  }, [packs, selectedLine]);

  // Primary model summary
  const primaryModelName = useMemo(() => {
    if (linePacks.length === 0) return 'Kanger 1.0 (AIO)';
    const modelCounts: Record<string, number> = {};
    linePacks.forEach((p) => {
      const { productName } = getProductNameAndType(p.packType);
      modelCounts[productName] = (modelCounts[productName] || 0) + 1;
    });
    let topModel = 'Kanger 1.0 (AIO)';
    let maxCount = 0;
    Object.entries(modelCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topModel = name;
      }
    });
    return topModel;
  }, [linePacks]);

  // Rack map
  const rackMap = useMemo(() => {
    const map: Record<number, BatteryPack[]> = {};
    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      map[r] = [];
    }
    linePacks.forEach((p) => {
      if (p.rackNumber) {
        if (!map[p.rackNumber]) map[p.rackNumber] = [];
        map[p.rackNumber].push(p);
      }
    });
    return map;
  }, [linePacks]);

  const maxOccupiedRack = useMemo(() => {
    let max = 38;
    Object.entries(rackMap).forEach(([rackStr, pList]) => {
      const list = pList as BatteryPack[];
      if (list && list.length > 0) {
        const rNum = parseInt(rackStr, 10);
        if (rNum > max) max = rNum;
      }
    });
    return Math.min(max, RACKS_PER_LINE);
  }, [rackMap]);

  // Filtered racks
  const visibleRacks = useMemo(() => {
    const totalToShow = Math.max(38, maxOccupiedRack);
    const racks: Array<{ rackNumber: number; packs: BatteryPack[] }> = [];

    for (let i = 1; i <= totalToShow; i++) {
      const pList = rackMap[i] || [];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPack = pList.some(
          (p) =>
            p.packNumber.toLowerCase().includes(q) ||
            (p.secondaryStickerNumber && p.secondaryStickerNumber.toLowerCase().includes(q)) ||
            p.packType.toLowerCase().includes(q) ||
            (p.remark && p.remark.toLowerCase().includes(q))
        );
        const matchesRack = `r-${i}`.includes(q) || String(i) === q;
        if (matchesPack || matchesRack) {
          racks.push({ rackNumber: i, packs: pList });
        }
      } else {
        racks.push({ rackNumber: i, packs: pList });
      }
    }
    return racks;
  }, [rackMap, maxOccupiedRack, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md">
              <img src="/tata-logo.png" alt="TATA Logo" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white font-display uppercase">
                  TATA AUTOCOMP SYSTEMS LIMITED
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  Public Live Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Varale (B300 Plant) • Lithium Battery Storage Matrix
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onGoToLogin}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Staff Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Banner with Line Selection & Summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-black border-2 border-slate-600 flex items-center justify-center text-white text-2xl font-black tracking-widest shadow-inner">
                {selectedLine}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white uppercase font-display">
                    Storage Line {selectedLine}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                    {primaryModelName}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Total Active Battery Packs: <strong className="text-white">{linePacks.length}</strong> • Total Occupied Rows: <strong className="text-white">{maxOccupiedRack}</strong>
                </p>
              </div>
            </div>

            {/* Line Switcher & Search Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedLine}
                onChange={(e) => {
                  setSelectedLine(e.target.value);
                  onSelectLine(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-slate-600 bg-slate-900 text-white text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {warehouseLines.map((line) => (
                  <option key={line} value={line}>
                    Line {line} ({packs.filter((p) => p.status !== 'DISPATCHED' && p.lineId === line).length} packs)
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search pack / sticker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl border border-slate-600 bg-slate-900 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none w-48 sm:w-60"
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Total Stored Packs</p>
              <p className="text-lg font-black text-emerald-400">{linePacks.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Occupied Racks</p>
              <p className="text-lg font-black text-blue-400">{maxOccupiedRack} / {RACKS_PER_LINE}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Dominant Series</p>
              <p className="text-sm font-bold text-purple-300 truncate">{primaryModelName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Line Health</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Stock</span>
              </p>
            </div>
          </div>
        </div>

        {/* High-Contrast Warehouse Matrix Grid Sheet (White Card for Maximum Contrast and Barcode Reader Visibility) */}
        <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <h3 className="text-base font-black tracking-tight text-black uppercase font-display">
                TATA AUTOCOMP SYSTEM PVT LTD • LINE {selectedLine}
              </h3>
              <p className="text-xs text-slate-600 font-semibold">
                Physical Crate / Rack Alignment Sheet • 4 Slots per Rack
              </p>
            </div>
            <span className="px-3 py-1 rounded bg-black text-white text-xs font-black font-mono">
              TOTAL: {linePacks.length} PACKS
            </span>
          </div>

          {/* Responsive Rack Grid Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleRacks.map((item) => {
              const rackPacks = item.packs;
              const sortedPacks = [1, 2, 3, 4].map((s) => rackPacks.find((p) => p.rackSlot === s));
              const hasPacks = rackPacks.length > 0;

              return (
                <div
                  key={item.rackNumber}
                  className={`border-2 rounded-lg p-2.5 transition-all ${
                    hasPacks
                      ? 'border-slate-800 bg-slate-50/80 hover:bg-slate-100 shadow-xs'
                      : 'border-dashed border-slate-300 bg-white opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded bg-black text-white text-[11px] font-black font-mono">
                      Rack {item.rackNumber}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">
                      {rackPacks.length} / 4 Slots
                    </span>
                  </div>

                  {hasPacks ? (
                    <div className="space-y-1.5">
                      {sortedPacks.map((pack, sIdx) => {
                        if (!pack) {
                          return (
                            <div
                              key={sIdx}
                              className="text-[10px] text-slate-300 italic flex items-center justify-between px-2 py-0.5 bg-white/60 rounded border border-slate-100"
                            >
                              <span>Level L-0{sIdx + 1}</span>
                              <span>— Empty —</span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={pack.id || sIdx}
                            className="p-1.5 rounded-md bg-white border border-slate-300 shadow-2xs text-[11px]"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-black text-black text-xs">
                                #{pack.packNumber}
                                {pack.secondaryStickerNumber && (
                                  <span className="text-[9px] text-slate-500 font-normal ml-1">
                                    (2nd: #{pack.secondaryStickerNumber})
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                L-0{pack.rackSlot}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1 mt-1 text-[9.5px] text-slate-600">
                              <span className="font-semibold truncate">
                                {getProductNameAndType(pack.packType).fullBadgeName}
                              </span>
                              {pack.remark && (
                                <span className="px-1 py-0 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200 truncate max-w-[100px]">
                                  {pack.remark}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Empty Rack (0 Packs)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
        <p>Tata AutoComp Systems Limited • Lithium Battery Division • Varale (B300 Plant)</p>
      </footer>
    </div>
  );
};
