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
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import { WAREHOUSE_LINES, RACKS_PER_LINE, SLOTS_PER_RACK } from '../data/seedWarehouse';

interface LineInspectorViewProps {
  packs: BatteryPack[];
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
}

export const LineInspectorView: React.FC<LineInspectorViewProps> = ({
  packs,
  onOpenPackDetails,
  onSendToDispatch,
}) => {
  const [selectedLine, setSelectedLine] = useState<string>(WAREHOUSE_LINES[0]);
  const [lineSearchQuery, setLineSearchQuery] = useState('');

  // Line packs summary
  const lineStats = useMemo(() => {
    const stats: Record<string, number> = {};
    WAREHOUSE_LINES.forEach((l) => (stats[l] = 0));
    packs.forEach((p) => {
      if (p.status !== 'DISPATCHED' && p.lineId) {
        stats[p.lineId] = (stats[p.lineId] || 0) + 1;
      }
    });
    return stats;
  }, [packs]);

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

  // Model breakdown in selected line
  const modelBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    packsInSelectedLine.forEach((p) => {
      counts[p.packType] = (counts[p.packType] || 0) + 1;
    });
    return counts;
  }, [packsInSelectedLine]);

  return (
    <div className="space-y-6 animate-fadeIn text-xs">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Physical Line Inspector
            </span>
            <span className="text-slate-500 font-mono-code font-medium">Varale (B300 Plant)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            Warehouse Storage Lines Directory (Line A-01 to B-25)
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Select any warehouse line to inspect active stored battery packs, rack coordinates, and product types.
          </p>
        </div>

        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total in Line {selectedLine}</span>
          <span className="text-xl font-mono-code font-extrabold text-white">{packsInSelectedLine.length} Packs</span>
        </div>
      </div>

      {/* 50 Line Selector Pills Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Select Line to Inspect (50 Lines Total):
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
          {WAREHOUSE_LINES.map((l) => {
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

      {/* Selected Line Content Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
              <Layers className="w-4 h-4 text-blue-600" />
              Packs Stored in Line {selectedLine} ({packsInSelectedLine.length} Units)
            </h3>
            <p className="text-xs text-slate-500">
              {Object.keys(modelBreakdown).length > 0
                ? Object.entries(modelBreakdown).map(([k, v]) => k + ': ' + v).join(' • ')
                : 'No packs currently allocated to this line.'}
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={lineSearchQuery}
              onChange={(e) => setLineSearchQuery(e.target.value)}
              placeholder="Search serial in this line..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {packsInSelectedLine.length === 0 ? (
          <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-1">
            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Line {selectedLine} is currently empty</p>
            <p className="text-[11px] text-slate-400">
              Allocate packs from Inward Area using "Set Line" or use the Super Admin Historical Populator.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">#</th>
                  <th className="p-3">Pack Number</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Rack & Level Coordinates</th>
                  <th className="p-3">Document No</th>
                  <th className="p-3">Inward Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packsInSelectedLine.map((pack, index) => {
                  const model = BATTERY_MODELS[pack.packType];
                  return (
                    <tr key={pack.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono-code text-slate-400">{index + 1}</td>
                      <td className="p-3 font-mono-code font-extrabold text-slate-900 text-sm">
                        #{pack.packNumber}
                      </td>
                      <td className="p-3">
                        <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                          {pack.packType}
                        </span>
                      </td>
                      <td className="p-3 font-mono-code font-bold text-blue-700">
                        {pack.currentLocation || (selectedLine + ', R-' + String(pack.rackNumber || 1).padStart(2, '0') + ', L-' + String(pack.rackSlot || 1).padStart(2, '0'))}
                      </td>
                      <td className="p-3 font-mono-code text-slate-700">{pack.documentNo || '—'}</td>
                      <td className="p-3 font-mono-code text-slate-600">
                        {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSendToDispatch(pack)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Dispatch</span>
                            <span>🚀</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPackDetails(pack)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
