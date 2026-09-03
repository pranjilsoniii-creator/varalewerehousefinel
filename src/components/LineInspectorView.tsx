import React, { useState, useMemo } from 'react';
import {
  Layers,
  MapPin,
  Box,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Eye,
  Filter,
  ArrowRight,
  Sparkles,
  FolderPlus,
  Plus,
  Lock,
  Trash2,
  Tag,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import {
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
  MAX_PACKS_PER_RACK,
  RACKS_PER_LINE,
} from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';

interface LineInspectorViewProps {
  packs: BatteryPack[];
  warehouseLines: string[];
  onAddNewLine?: (newLine: string) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
  onOpenRackLoader?: (line: string, rack: number) => void;
  onDeletePack?: (packId: string) => void;
}

export const LineInspectorView: React.FC<LineInspectorViewProps> = ({
  packs,
  warehouseLines,
  onAddNewLine,
  onOpenPackDetails,
  onSendToDispatch,
  onOpenRackLoader,
  onDeletePack,
}) => {
  const { isSuperAdmin, isManager } = useAuth();
  const [selectedLine, setSelectedLine] = useState<string>(warehouseLines[0] || 'A-01');
  const [lineSearchQuery, setLineSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'RACK_GRID' | 'TABLE_SHEET'>('TABLE_SHEET');

  // Dynamic Line Creator
  const [isCreatingLine, setIsCreatingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');

  // Line stats
  const lineStats = useMemo(() => {
    const stats: Record<string, number> = {};
    warehouseLines.forEach((l) => (stats[l] = 0));
    packs.forEach((p) => {
      if (p.status !== 'DISPATCHED' && p.lineId) {
        stats[p.lineId] = (stats[p.lineId] || 0) + 1;
      }
    });
    return stats;
  }, [warehouseLines, packs]);

  // Map of active packs by Rack Number in selected line
  const rackMap = useMemo(() => {
    const map: Record<number, BatteryPack[]> = {};
    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      map[r] = [];
    }
    packs.forEach((p) => {
      if (p.status !== 'DISPATCHED' && p.lineId === selectedLine && p.rackNumber) {
        if (!map[p.rackNumber]) map[p.rackNumber] = [];
        map[p.rackNumber].push(p);
      }
    });
    return map;
  }, [packs, selectedLine]);

  // Flattened matrix items for Table/Sheet View (Matching User Excel Photo)
  const sheetItems = useMemo(() => {
    const items: Array<{
      rackNumber: number;
      slot: number;
      pack: BatteryPack | null;
    }> = [];

    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      const rackPacks = rackMap[r] || [];
      for (let s = 1; s <= MAX_PACKS_PER_RACK; s++) {
        const found = rackPacks.find((p) => p.rackSlot === s);
        items.push({
          rackNumber: r,
          slot: s,
          pack: found || null,
        });
      }
    }

    if (!lineSearchQuery.trim()) return items;
    const q = lineSearchQuery.toLowerCase().trim();

    return items.filter((item) => {
      if (!item.pack) return false;
      const matchesPack = item.pack.packNumber.toLowerCase().includes(q);
      const matchesType = item.pack.packType.toLowerCase().includes(q);
      const matchesRack = ('r-' + item.rackNumber).includes(q);
      return matchesPack || matchesType || matchesRack;
    });
  }, [rackMap, lineSearchQuery]);

  const handleCreateNewLine = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newLineName.trim().toUpperCase().replace(/\s+/g, '-');
    if (!formatted) return;

    if (warehouseLines.includes(formatted)) {
      alert('Line ' + formatted + ' already exists.');
      return;
    }

    const updatedLines = [...warehouseLines, formatted];
    saveStoredWarehouseLines(updatedLines);
    if (onAddNewLine) onAddNewLine(formatted);
    setSelectedLine(formatted);
    setNewLineName('');
    setIsCreatingLine(false);
  };

  const handleClearSlotPrompt = (pack: BatteryPack) => {
    if (!isSuperAdmin && !isManager) {
      alert('Permission Denied: Only Super Admin and Manager can remove packs from rack slots.');
      return;
    }
    if (confirm('Remove Pack #' + pack.packNumber + ' from Line ' + pack.lineId + ' (Rack ' + pack.rackNumber + ', Level ' + pack.rackSlot + ') to make this rack slot empty?')) {
      if (onDeletePack) onDeletePack(pack.id);
    }
  };

  const totalLinePacks = lineStats[selectedLine] || 0;
  const lineCapacity = RACKS_PER_LINE * MAX_PACKS_PER_RACK; // 160 * 4 = 640 packs
  const utilizationPercent = Math.round((totalLinePacks / lineCapacity) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Physical Line Inspector
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Warehouse Line & Rack Storage Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time visual map of all warehouse lines, 160 racks, and 4 physical slot levels per rack.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenRackLoader && (isSuperAdmin || isManager) && (
            <button
              onClick={() => onOpenRackLoader(selectedLine, 1)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Populate Line {selectedLine}</span>
            </button>
          )}

          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('TABLE_SHEET')}
              className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' +
                (viewMode === 'TABLE_SHEET'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              Sheet Layout
            </button>
            <button
              type="button"
              onClick={() => setViewMode('RACK_GRID')}
              className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' +
                (viewMode === 'RACK_GRID'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              Rack Boxes Grid
            </button>
          </div>
        </div>
      </div>

      {/* Warehouse Lines Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Line:</span>
          <button
            onClick={() => setIsCreatingLine(!isCreatingLine)}
            className="text-xs text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Add New Line</span>
          </button>
        </div>

        {isCreatingLine && (
          <form onSubmit={handleCreateNewLine} className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex gap-2 animate-fadeIn">
            <input
              type="text"
              value={newLineName}
              onChange={(e) => setNewLineName(e.target.value)}
              placeholder="e.g. Line C-01 or Line B300-2..."
              className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-900"
              required
            />
            <button type="submit" className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold">
              Save Line
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingLine(false)}
              className="px-2 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {warehouseLines.map((lineKey) => {
            const count = lineStats[lineKey] || 0;
            const isSelected = selectedLine === lineKey;

            return (
              <button
                key={lineKey}
                onClick={() => setSelectedLine(lineKey)}
                className={'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 ' +
                  (isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200')}
              >
                <span>Line {lineKey}</span>
                <span className={'px-1.5 py-0.5 rounded-full text-[10px] ' + (isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Line KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-slate-500 font-bold">Current Line</p>
          <p className="text-xl font-extrabold text-slate-900 font-mono-code mt-0.5">Line {selectedLine}</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-slate-500 font-bold">Stored Packs</p>
          <p className="text-xl font-extrabold text-indigo-600 font-mono-code mt-0.5">
            {totalLinePacks} <span className="text-xs text-slate-400 font-normal">/ {lineCapacity} Max</span>
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-slate-500 font-bold">Capacity Utilization</p>
          <p className="text-xl font-extrabold text-emerald-600 font-mono-code mt-0.5">{utilizationPercent}%</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-slate-500 font-bold">Total Racks</p>
          <p className="text-xl font-extrabold text-slate-900 font-mono-code mt-0.5">{RACKS_PER_LINE} Racks (4 Slots/Rack)</p>
        </div>
      </div>

      {/* Search Input for Line Racks */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={lineSearchQuery}
          onChange={(e) => setLineSearchQuery(e.target.value)}
          placeholder={'Filter Line ' + selectedLine + ' by Pack Number, Model, or Rack (e.g. 7428, AIO, R-12)...'}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
        />
      </div>

      {/* VIEW 1: TABLE SHEET VIEW (Matching User Photo Layout) */}
      {viewMode === 'TABLE_SHEET' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3 w-16">Rack No.</th>
                  <th className="p-3 w-16">Slot / Level</th>
                  <th className="p-3">Box Code / Serial</th>
                  <th className="p-3">Item Name / Model</th>
                  <th className="p-3">Physical Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheetItems.map((item, idx) => {
                  const p = item.pack;
                  const model = p ? BATTERY_MODELS[p.packType] : null;

                  return (
                    <tr
                      key={'sheet-' + item.rackNumber + '-' + item.slot + '-' + idx}
                      className={'hover:bg-slate-50/80 transition ' + (p ? 'bg-white' : 'bg-slate-50/30')}
                    >
                      <td className="p-3 font-mono-code font-bold text-slate-900">
                        R-{String(item.rackNumber).padStart(2, '0')}
                      </td>
                      <td className="p-3 font-mono-code text-slate-600 font-bold">
                        Level L-0{item.slot}
                      </td>
                      <td className="p-3 font-mono-code">
                        {p ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-sm">#{p.packNumber}</span>
                            {p.isWithoutPlate && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold">
                                NO-PLATE
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic font-normal">Empty Slot (0/4)</span>
                        )}
                      </td>
                      <td className="p-3">
                        {p ? (
                          <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                            {p.packType}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 font-mono-code font-bold text-indigo-700">
                        {selectedLine}, R-{String(item.rackNumber).padStart(2, '0')}, L-0{item.slot}
                      </td>
                      <td className="p-3">
                        {p ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stored
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {p ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onSendToDispatch(p)}
                              className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded text-[11px] font-bold cursor-pointer"
                              title="Stage for Dispatch"
                            >
                              Dispatch
                            </button>
                            {(isSuperAdmin || isManager) && (
                              <button
                                type="button"
                                onClick={() => handleClearSlotPrompt(p)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                title="Remove pack from rack slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenPackDetails(p)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          onOpenRackLoader && (isSuperAdmin || isManager) && (
                            <button
                              type="button"
                              onClick={() => onOpenRackLoader(selectedLine, item.rackNumber)}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold cursor-pointer"
                            >
                              + Fill Rack
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: RACK BOXES GRID VIEW */}
      {viewMode === 'RACK_GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: RACKS_PER_LINE }, (_, idx) => {
            const rackNum = idx + 1;
            const stored = rackMap[rackNum] || [];
            const isFull = stored.length >= MAX_PACKS_PER_RACK;

            return (
              <div
                key={rackNum}
                className={'bg-white border rounded-xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition ' +
                  (isFull ? 'border-rose-200' : stored.length > 0 ? 'border-blue-200' : 'border-slate-200')}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold font-mono-code flex items-center justify-center text-xs">
                      {rackNum}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">Rack R-{String(rackNum).padStart(2, '0')}</span>
                  </div>

                  <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                    (isFull ? 'bg-rose-100 text-rose-800' : stored.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}>
                    {stored.length} / 4 Packs
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {[1, 2, 3, 4].map((slotNum) => {
                    const pack = stored.find((p) => p.rackSlot === slotNum);
                    return (
                      <div
                        key={slotNum}
                        className={'p-2 rounded-lg border flex items-center justify-between ' +
                          (pack ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-dashed border-slate-200')}
                      >
                        <span className="font-mono-code font-bold text-slate-500">L-0{slotNum}</span>
                        {pack ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-code font-bold text-slate-900">#{pack.packNumber}</span>
                            <span className="text-[10px] text-indigo-700 font-semibold">{pack.packType}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Empty</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {onOpenRackLoader && (isSuperAdmin || isManager) && !isFull && (
                  <button
                    type="button"
                    onClick={() => onOpenRackLoader(selectedLine, rackNum)}
                    className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Fill / Edit Rack {rackNum}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
