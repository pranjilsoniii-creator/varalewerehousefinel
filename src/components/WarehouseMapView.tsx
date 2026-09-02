import React, { useState, useMemo } from 'react';
import {
  Grid3X3,
  Layers,
  Search,
  Filter,
  ArrowLeftRight,
  Truck,
  Box,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';

interface WarehouseMapViewProps {
  warehouseLines: string[];
  packs: BatteryPack[];
  selectedLine: string;
  onSelectLine: (lineId: string) => void;
  onSelectPackForMove: (pack: BatteryPack) => void;
  onAddPackToDispatch: (pack: BatteryPack) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
}

export const WarehouseMapView: React.FC<WarehouseMapViewProps> = ({
  warehouseLines,
  packs,
  selectedLine,
  onSelectLine,
  onSelectPackForMove,
  onAddPackToDispatch,
  onOpenPackDetails,
}) => {
  const [rackRange, setRackRange] = useState<'1-40' | '41-80' | '81-120' | '121-160' | 'ALL'>('1-40');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [searchInLine, setSearchInLine] = useState('');
  const [hoveredSlot, setHoveredSlot] = useState<BatteryPack | null>(null);

  // Filter packs in storage
  const activePacks = useMemo(() => {
    return packs.filter((p) => p.status === 'IN_STORAGE');
  }, [packs]);

  // Packs in current selected line
  const packsInCurrentLine = useMemo(() => {
    return activePacks.filter((p) => p.lineId === selectedLine);
  }, [activePacks, selectedLine]);

  // Create a fast lookup map: `rackNumber-slotNumber` -> BatteryPack
  const rackSlotMap = useMemo(() => {
    const map = new Map<string, BatteryPack>();
    packsInCurrentLine.forEach((p) => {
      map.set(`${p.rackNumber}-${p.rackSlot}`, p);
    });
    return map;
  }, [packsInCurrentLine]);

  // Calculate range of racks to show
  const displayedRackNumbers = useMemo(() => {
    if (rackRange === '1-40') return Array.from({ length: 40 }, (_, i) => i + 1);
    if (rackRange === '41-80') return Array.from({ length: 40 }, (_, i) => i + 41);
    if (rackRange === '81-120') return Array.from({ length: 40 }, (_, i) => i + 81);
    if (rackRange === '121-160') return Array.from({ length: 40 }, (_, i) => i + 121);
    return Array.from({ length: 160 }, (_, i) => i + 1);
  }, [rackRange]);

  // Line stats
  const totalSlotsInLine = 160 * 4; // 640 total slots per line
  const occupiedSlotsInLine = packsInCurrentLine.length;
  const lineOccupancyPercent = Math.round((occupiedSlotsInLine / totalSlotsInLine) * 100);

  // Breakdown of models in this line
  const lineModelBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    packsInCurrentLine.forEach((p) => {
      counts[p.packType] = (counts[p.packType] || 0) + 1;
    });
    return counts;
  }, [packsInCurrentLine]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Header with Line Selector & Stats */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <Grid3X3 className="w-3.5 h-3.5 text-blue-600" /> 160-Rack Storage Architecture
              </span>
              <span className="text-xs text-slate-500 font-medium">4 Stacks per Rack (Levels 1 to 4)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3 font-display">
              Warehouse Line <span className="text-orange-600 font-mono-code font-extrabold">{selectedLine}</span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-mono-code">
                {occupiedSlotsInLine} / {totalSlotsInLine} Packs ({lineOccupancyPercent}% Occupancy)
              </span>
            </h2>
          </div>

          {/* Quick Line Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Switch Line:</span>
            <select
              value={selectedLine}
              onChange={(e) => onSelectLine(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 font-mono-code font-bold text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              {warehouseLines.map((line) => {
                const count = activePacks.filter((p) => p.lineId === line).length;
                return (
                  <option key={line} value={line}>
                    Line {line} ({count} packs)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Scrollable Line Navigation Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-t border-slate-100 pt-3 no-scrollbar">
          {warehouseLines.slice(0, 30).map((line) => {
            const isCurrent = line === selectedLine;
            const count = activePacks.filter((p) => p.lineId === line).length;
            const percent = Math.round((count / (160 * 4)) * 100);

            return (
              <button
                key={line}
                onClick={() => onSelectLine(line)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 border ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Line {line}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isCurrent ? 'bg-orange-500 text-white font-bold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count} ({percent}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls: Rack Range, Model Filter, Search within Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Rack Range Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-bold px-2 text-[11px] uppercase tracking-wider">Racks:</span>
            {(['1-40', '41-80', '81-120', '121-160', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setRackRange(range)}
                className={`px-2.5 py-1 rounded-md font-bold font-mono-code transition cursor-pointer ${
                  rackRange === range
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'ALL' ? 'View 160 Racks' : `R-${range}`}
              </button>
            ))}
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Battery Models</option>
              {ALL_PACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} ({lineModelBreakdown[t] || 0})
                </option>
              ))}
            </select>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchInLine}
                onChange={(e) => setSearchInLine(e.target.value)}
                placeholder="Search serial in line..."
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 text-xs focus:border-blue-500 focus:outline-none w-44 font-mono-code"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model Legend */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs shadow-xs">
        <span className="text-slate-500 font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-orange-500" /> Battery Models:
        </span>
        {ALL_PACK_TYPES.slice(0, 8).map((t) => {
          const model = BATTERY_MODELS[t];
          return (
            <div key={t} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: model?.color }} />
              <span className="text-slate-700 font-semibold text-[11px]">{t}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-auto text-slate-500 text-[11px]">
          <span className="w-2.5 h-2.5 rounded border border-slate-300 bg-slate-100" />
          <span>Empty Slot (Available)</span>
        </div>
      </div>

      {/* 160-Rack Visual Grid */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
            <Grid3X3 className="w-4 h-4 text-orange-400" />
            Rack Layout for Line {selectedLine} (Showing Racks {displayedRackNumbers[0]} to {displayedRackNumbers[displayedRackNumbers.length - 1]})
          </h3>
          <span className="text-xs text-slate-400 font-mono-code">
            Slot 4 (Top) ➔ Slot 1 (Base Ground)
          </span>
        </div>

        {/* Dense Grid of Racks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {displayedRackNumbers.map((rackNum) => {
            // Check slots 1 to 4 for this rack
            const slot4 = rackSlotMap.get(`${rackNum}-4`);
            const slot3 = rackSlotMap.get(`${rackNum}-3`);
            const slot2 = rackSlotMap.get(`${rackNum}-2`);
            const slot1 = rackSlotMap.get(`${rackNum}-1`);

            const slots = [
              { slotNum: 4, label: 'L4 (Top)', pack: slot4 },
              { slotNum: 3, label: 'L3 (Up-Mid)', pack: slot3 },
              { slotNum: 2, label: 'L2 (Low-Mid)', pack: slot2 },
              { slotNum: 1, label: 'L1 (Base)', pack: slot1 },
            ];

            const totalOccupiedInRack = [slot1, slot2, slot3, slot4].filter(Boolean).length;

            return (
              <div
                key={rackNum}
                className={`bg-slate-950 border rounded-xl p-2.5 flex flex-col justify-between transition-all duration-200 ${
                  totalOccupiedInRack === 4
                    ? 'border-slate-700 bg-slate-950/90'
                    : totalOccupiedInRack > 0
                    ? 'border-blue-500/40 hover:border-blue-400'
                    : 'border-slate-800/60 hover:border-slate-700'
                }`}
              >
                {/* Rack Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
                  <span className="font-mono-code font-bold text-xs text-white">
                    R-{rackNum}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      totalOccupiedInRack === 4
                        ? 'bg-slate-800 text-slate-400'
                        : totalOccupiedInRack > 0
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-slate-900 text-slate-600'
                    }`}
                  >
                    {totalOccupiedInRack}/4
                  </span>
                </div>

                {/* 4 Stacked Slots (Level 4 on top down to Level 1) */}
                <div className="space-y-1">
                  {slots.map(({ slotNum, label, pack }) => {
                    const isOccupied = !!pack;
                    const model = pack ? BATTERY_MODELS[pack.packType] : null;
                    
                    // Filter match
                    const matchesModel = modelFilter === 'ALL' || (pack && pack.packType === modelFilter);
                    const matchesSearch =
                      !searchInLine ||
                      (pack && pack.packNumber.toLowerCase().includes(searchInLine.toLowerCase()));

                    const isDimmed = (modelFilter !== 'ALL' && !matchesModel) || (searchInLine && !matchesSearch);

                    return (
                      <div
                        key={slotNum}
                        onClick={() => {
                          if (pack) {
                            onOpenPackDetails(pack);
                          }
                        }}
                        onMouseEnter={() => pack && setHoveredSlot(pack)}
                        onMouseLeave={() => setHoveredSlot(null)}
                        className={`p-1 rounded-md text-[10px] transition cursor-pointer flex items-center justify-between border ${
                          isOccupied
                            ? `${model?.badgeBg || 'bg-blue-950 text-blue-200 border-blue-800'} ${
                                isDimmed ? 'opacity-25' : 'hover:scale-102 hover:shadow-md'
                              }`
                            : 'bg-slate-900/40 border-dashed border-slate-800/80 text-slate-600 hover:border-slate-700'
                        }`}
                        title={
                          pack
                            ? `Level ${slotNum}: ${pack.packNumber} (${pack.packType})\nInward: ${new Date(
                                pack.inwardDate
                              ).toLocaleDateString()}`
                            : `Rack ${rackNum} - Level ${slotNum}: Empty`
                        }
                      >
                        <span className="font-mono-code text-[9px] font-semibold text-slate-400">
                          S{slotNum}
                        </span>

                        {isOccupied ? (
                          <span className="font-mono-code font-bold truncate max-w-[70px] text-white">
                            {pack.packNumber.replace('TATA-', '')}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-600 italic">Empty</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Tooltip / Quick Pack Preview Footer if hovering */}
      {hoveredSlot && (
        <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-4 animate-slideUp text-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold font-mono-code shadow-xs">
              {hoveredSlot.lineId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code font-bold text-slate-900 text-sm">
                  #{hoveredSlot.packNumber}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700 border border-blue-200 font-mono-code">
                  {hoveredSlot.packType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Location: <span className="text-slate-800 font-bold">Line {hoveredSlot.lineId} • Rack R-{hoveredSlot.rackNumber} • Slot Level {hoveredSlot.rackSlot}</span> • LR: {hoveredSlot.lrNumber} ({hoveredSlot.transportName})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectPackForMove(hoveredSlot)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Move / Relocate</span>
            </button>

            <button
              onClick={() => onAddPackToDispatch(hoveredSlot)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Add to Dispatch Cart</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
