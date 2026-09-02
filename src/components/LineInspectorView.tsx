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
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import {
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
  MAX_PACKS_PER_RACK,
  RACKS_PER_LINE,
} from '../data/seedWarehouse';

interface LineInspectorViewProps {
  packs: BatteryPack[];
  warehouseLines: string[];
  onAddNewLine?: (newLine: string) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
  onOpenRackLoader?: (line: string, rack: number) => void;
}

export const LineInspectorView: React.FC<LineInspectorViewProps> = ({
  packs,
  warehouseLines,
  onAddNewLine,
  onOpenPackDetails,
  onSendToDispatch,
  onOpenRackLoader,
}) => {
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
  }, [packs, warehouseLines]);

  // Packs in currently selected line
  const packsInSelectedLine = useMemo(() => {
    return packs.filter((p) => {
      if (p.status === 'DISPATCHED') return false;
      if (p.lineId !== selectedLine) return false;
      if (lineSearchQuery.trim()) {
        const q = lineSearchQuery.toLowerCase().trim();
        return p.packNumber.toLowerCase().includes(q) || p.packType.toLowerCase().includes(q);
      }
      return true;
    });
  }, [packs, selectedLine, lineSearchQuery]);

  // Group packs by rack number (1 to 160)
  const rackGroups = useMemo(() => {
    const groups: Record<number, BatteryPack[]> = {};
    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      groups[r] = [];
    }
    packsInSelectedLine.forEach((p) => {
      const rNum = p.rackNumber || 1;
      if (!groups[rNum]) groups[rNum] = [];
      groups[rNum].push(p);
    });
    return groups;
  }, [packsInSelectedLine]);

  // Racks that have at least 1 pack or are in active range (1 to max filled rack)
  const activeRacksList = useMemo(() => {
    const populatedRacks = Object.keys(rackGroups)
      .map(Number)
      .filter((r) => rackGroups[r]?.length > 0);
    const maxRack = populatedRacks.length > 0 ? Math.max(...populatedRacks, 10) : 23;
    const list: number[] = [];
    for (let i = 1; i <= Math.min(RACKS_PER_LINE, Math.max(maxRack, 10)); i++) {
      list.push(i);
    }
    return list;
  }, [rackGroups]);

  const handleCreateNewLine = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newLineName.trim().toUpperCase().replace(/\s+/g, '-');
    if (!formatted) return;

    if (warehouseLines.includes(formatted)) {
      alert('Line ' + formatted + ' already exists.');
      return;
    }

    const updated = [...warehouseLines, formatted];
    saveStoredWarehouseLines(updated);
    if (onAddNewLine) {
      onAddNewLine(formatted);
    }
    setSelectedLine(formatted);
    setNewLineName('');
    setIsCreatingLine(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Physical Warehouse Lines & Racks
            </span>
            <span className="text-slate-500 font-mono-code font-medium">Varale (B300 Plant)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            Warehouse Line & Rack Storage Inspector
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Capacity: Exactly 4 packs per rack (Max 4/4). View line layouts matching the physical plant storage sheet.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Line {selectedLine} Total</span>
            <span className="text-xl font-mono-code font-extrabold text-white">{packsInSelectedLine.length} Packs</span>
          </div>
        </div>
      </div>

      {/* Line Selector Bar with Dynamic Line Creator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Select Warehouse Line ({warehouseLines.length} Lines):
          </span>

          <button
            type="button"
            onClick={() => setIsCreatingLine(!isCreatingLine)}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Add New Line</span>
          </button>
        </div>

        {/* Dynamic New Line Form */}
        {isCreatingLine && (
          <form onSubmit={handleCreateNewLine} className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center gap-2 animate-fadeIn">
            <input
              type="text"
              value={newLineName}
              onChange={(e) => setNewLineName(e.target.value)}
              placeholder="Enter new line name (e.g. C-01, B300-X)..."
              className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-900 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer"
            >
              Create Line
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingLine(false)}
              className="px-2 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg"
            >
              Cancel
            </button>
          </form>
        )}

        {/* 50 Line Pills Carousel */}
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
          {warehouseLines.map((l) => {
            const count = lineStats[l] || 0;
            const isSelected = selectedLine === l;

            return (
              <button
                key={l}
                type="button"
                onClick={() => setSelectedLine(l)}
                className={'px-3 py-1.5 rounded-lg font-mono-code font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ' +
                  (isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : count > 0
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100')}
              >
                <span>{l}</span>
                {count > 0 && (
                  <span className={'px-1.5 py-0.2 rounded-full text-[10px] ' + (isSelected ? 'bg-white text-blue-700 font-extrabold' : 'bg-blue-200 text-blue-900 font-bold')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Rack View Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
              <Layers className="w-4 h-4 text-blue-600" />
              Line {selectedLine} Rack Storage Manifest ({packsInSelectedLine.length} Packs)
            </h3>
            <p className="text-xs text-slate-500">
              Structured exactly as the plant physical rack register (Rack No. • Box Code • Item Name).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('TABLE_SHEET')}
                className={'px-3 py-1 rounded-md font-bold transition cursor-pointer ' +
                  (viewMode === 'TABLE_SHEET' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600')}
              >
                Sheet Layout
              </button>
              <button
                type="button"
                onClick={() => setViewMode('RACK_GRID')}
                className={'px-3 py-1 rounded-md font-bold transition cursor-pointer ' +
                  (viewMode === 'RACK_GRID' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600')}
              >
                Rack Boxes
              </button>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={lineSearchQuery}
                onChange={(e) => setLineSearchQuery(e.target.value)}
                placeholder="Filter serial..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono-code text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* VIEW 1: TABLE SHEET MATCHING UPLOADED USER PHOTO (Rack No | Box Code | Item Name) */}
        {viewMode === 'TABLE_SHEET' && (
          <div className="overflow-x-auto border border-blue-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-blue-700 text-white font-bold text-xs uppercase tracking-wider">
                  <th className="p-3 w-28 text-center border-r border-blue-600">Rack No.</th>
                  <th className="p-3 w-48 border-r border-blue-600">Box Code (Pack Serial)</th>
                  <th className="p-3">Item Name (Product Model)</th>
                  <th className="p-3 w-32 text-center border-l border-blue-600">Capacity Status</th>
                  <th className="p-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeRacksList.map((rackNum) => {
                  const rackPacks = rackGroups[rackNum] || [];
                  const isFull = rackPacks.length >= MAX_PACKS_PER_RACK;
                  const rowSpan = Math.max(1, rackPacks.length);

                  return (
                    <React.Fragment key={rackNum}>
                      {rackPacks.length === 0 ? (
                        <tr className="hover:bg-slate-50/60 border-b border-slate-200">
                          <td className="p-3 font-extrabold text-center text-slate-800 text-sm bg-slate-50/80 border-r border-slate-200">
                            {rackNum}
                          </td>
                          <td className="p-3 text-slate-400 font-mono-code italic border-r border-slate-100">
                            (Empty Rack)
                          </td>
                          <td className="p-3 text-slate-400 italic">
                            No packs placed
                          </td>
                          <td className="p-3 text-center border-l border-slate-100">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              0/4 Empty
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {onOpenRackLoader && (
                              <button
                                type="button"
                                onClick={() => onOpenRackLoader(selectedLine, rackNum)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-bold text-[11px] cursor-pointer"
                              >
                                + Fill Rack
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        rackPacks.map((pack, idx) => {
                          const model = BATTERY_MODELS[pack.packType];
                          return (
                            <tr key={pack.id} className="hover:bg-amber-50/30 border-b border-slate-100">
                              {/* Rack Number column rendered once for the group */}
                              {idx === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className="p-3 font-extrabold text-center text-slate-900 text-base bg-slate-50 border-r border-slate-200 align-middle"
                                >
                                  <div>{rackNum}</div>
                                  <div className="mt-1">
                                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold border ' +
                                      (isFull ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')}>
                                      {rackPacks.length}/4 {isFull ? 'Full' : ''}
                                    </span>
                                  </div>
                                </td>
                              )}

                              {/* Box Code */}
                              <td className="p-2.5 font-mono-code font-bold text-slate-900 text-sm border-r border-slate-100">
                                #{pack.packNumber}
                              </td>

                              {/* Item Name */}
                              <td className="p-2.5">
                                <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                  {pack.packType}
                                </span>
                              </td>

                              {/* Capacity Status */}
                              {idx === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className="p-2 text-center border-l border-slate-100 align-middle text-slate-600"
                                >
                                  {isFull ? (
                                    <span className="text-rose-600 font-bold flex items-center justify-center gap-1">
                                      <Lock className="w-3.5 h-3.5" /> 4/4 Full
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold">
                                      {4 - rackPacks.length} Slots Free
                                    </span>
                                  )}
                                </td>
                              )}

                              {/* Action */}
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onSendToDispatch(pack)}
                                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold text-[10px] cursor-pointer"
                                    title="Send to Dispatch Cart"
                                  >
                                    🚀
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenPackDetails(pack)}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: RACK BOXES GRID (Visual Cards with 4 Slots) */}
        {viewMode === 'RACK_GRID' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {activeRacksList.map((rackNum) => {
              const rackPacks = rackGroups[rackNum] || [];
              const isFull = rackPacks.length >= MAX_PACKS_PER_RACK;

              return (
                <div
                  key={rackNum}
                  className={'p-3.5 rounded-xl border transition shadow-xs flex flex-col justify-between space-y-2.5 ' +
                    (isFull
                      ? 'bg-rose-50/40 border-rose-200'
                      : rackPacks.length > 0
                      ? 'bg-white border-blue-300'
                      : 'bg-slate-50/80 border-slate-200')}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-extrabold text-slate-900 font-mono-code text-sm">
                      Rack {rackNum}
                    </span>
                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold border ' +
                      (isFull ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-blue-100 text-blue-800 border-blue-200')}>
                      {rackPacks.length} / 4 Packs
                    </span>
                  </div>

                  {/* 4 Physical Slots */}
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map((slotIdx) => {
                      const packInSlot = rackPacks.find((p) => (p.rackSlot || 1) === slotIdx) || rackPacks[slotIdx - 1];
                      return (
                        <div
                          key={slotIdx}
                          className={'p-1.5 rounded-lg border text-[11px] flex items-center justify-between ' +
                            (packInSlot ? 'bg-blue-50/60 border-blue-200 text-slate-900 font-bold' : 'bg-slate-100/60 border-dashed border-slate-300 text-slate-400')}
                        >
                          <span className="font-mono-code text-[10px] text-slate-500">L-0{slotIdx}</span>
                          {packInSlot ? (
                            <span className="font-mono-code text-blue-900">#{packInSlot.packNumber} ({packInSlot.packType})</span>
                          ) : (
                            <span className="italic text-[10px]">Empty Slot</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {onOpenRackLoader && !isFull && (
                    <button
                      type="button"
                      onClick={() => onOpenRackLoader(selectedLine, rackNum)}
                      className="w-full py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-bold text-[10px] cursor-pointer"
                    >
                      + Fill This Rack
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
