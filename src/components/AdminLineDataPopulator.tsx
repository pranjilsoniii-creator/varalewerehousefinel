import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Table,
  Upload,
  ArrowRight,
  Sparkles,
  Save,
  MapPin,
  RefreshCw,
  X,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';
import { WAREHOUSE_LINES } from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';

interface AdminLineDataPopulatorProps {
  onSaveLinePacks: (newPacks: BatteryPack[]) => void;
  onClose?: () => void;
}

interface GridRow {
  id: string;
  packNumber: string;
  modelInput: string;
  normalizedModel: BatteryPackType;
  rackNumber: number;
  rackSlot: number;
}

// Shorthand mapper dictionary
function normalizeShorthand(input: string): BatteryPackType {
  const clean = input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('gen3') || clean === 'g3' || clean === 'k1gen3') return 'Kanger1.0_Gen3';
  if (clean.includes('ckd') || clean === 'k1ckd') return 'Kanger1.0_CKD';
  if (clean.includes('fbu') || clean === 'k1fbu') return 'Kanger1.0_FBU';
  if (clean.includes('aio') || clean === 'allinone' || clean === 'k1aio' || clean === 'kanger1' || clean === 'k1') return 'Kanger1.0_AIO';
  if (clean.includes('k2') || clean.includes('kanger2')) return 'Kanger2.0';
  if (clean.includes('k3') || clean.includes('kanger3')) return 'Kanger3.0';
  if (clean.includes('tamor') || clean.includes('elr')) return 'Tamor_ELR';
  if (clean.includes('nova') || clean.includes('lrp')) return 'Nova_LRP';
  if (clean.includes('challengermr') || clean === 'mr') return 'Challenger_MR';
  if (clean.includes('challenger') || clean.includes('lr')) return 'Challenger_LR';
  if (clean.includes('nonais') || clean.includes('limbernon')) return 'Limber_Non_Ais';
  if (clean.includes('limber') || clean.includes('ais')) return 'Limber_Ais';
  return 'Kanger1.0_AIO';
}

export const AdminLineDataPopulator: React.FC<AdminLineDataPopulatorProps> = ({
  onSaveLinePacks,
  onClose,
}) => {
  const { isSuperAdmin, currentUser } = useAuth();
  const [selectedLine, setSelectedLine] = useState<string>(WAREHOUSE_LINES[0]);
  const [rows, setRows] = useState<GridRow[]>([
    { id: 'row-1', packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', rackNumber: 1, rackSlot: 1 },
    { id: 'row-2', packNumber: '', modelInput: 'Gen3', normalizedModel: 'Kanger1.0_Gen3', rackNumber: 1, rackSlot: 2 },
    { id: 'row-3', packNumber: '', modelInput: 'CKD', normalizedModel: 'Kanger1.0_CKD', rackNumber: 1, rackSlot: 3 },
    { id: 'row-4', packNumber: '', modelInput: 'FBU', normalizedModel: 'Kanger1.0_FBU', rackNumber: 1, rackSlot: 4 },
  ]);

  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add more rows
  const handleAddRows = (count: number = 5) => {
    const newRows: GridRow[] = [];
    const lastRack = rows[rows.length - 1]?.rackNumber || 1;
    for (let i = 0; i < count; i++) {
      const idx = rows.length + i;
      newRows.push({
        id: 'row-' + Date.now() + '-' + idx,
        packNumber: '',
        modelInput: 'AIO',
        normalizedModel: 'Kanger1.0_AIO',
        rackNumber: Math.min(160, lastRack + Math.floor(idx / 4)),
        rackSlot: (idx % 4) + 1,
      });
    }
    setRows((prev) => [...prev, ...newRows]);
  };

  const handleRowChange = (id: string, field: keyof GridRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === 'modelInput') {
          const norm = normalizeShorthand(value);
          return { ...r, modelInput: value, normalizedModel: norm };
        }
        if (field === 'packNumber') {
          const numOnly = String(value).replace(/[^0-9]/g, '');
          return { ...r, packNumber: numOnly };
        }
        return { ...r, [field]: value };
      })
    );
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Bulk Paste parser (Supports 2-column Excel paste: PackNumber [TAB] Model)
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: GridRow[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,;]+/).map((s) => s.trim());
      const packNum = parts[0]?.replace(/[^0-9]/g, '') || parts[0] || '';
      const modelStr = parts[1] || 'AIO';
      const norm = normalizeShorthand(modelStr);
      const rackNum = Math.min(160, Math.floor(idx / 4) + 1);
      const slotNum = (idx % 4) + 1;

      if (packNum) {
        parsed.push({
          id: 'paste-' + Date.now() + '-' + idx,
          packNumber: packNum,
          modelInput: modelStr,
          normalizedModel: norm,
          rackNumber: rackNum,
          rackSlot: slotNum,
        });
      }
    });

    if (parsed.length > 0) {
      setRows(parsed);
      setBulkPasteText('');
      setShowBulkPaste(false);
    }
  };

  // Save all entered packs directly into Warehouse Line & Supabase
  const handleSaveToLine = () => {
    const validRows = rows.filter((r) => r.packNumber.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please enter at least 1 valid numeric Pack Number.');
      return;
    }

    const nowIso = new Date().toISOString();
    const adminName = currentUser?.name || currentUser?.username || 'Super Admin';

    const newPacks: BatteryPack[] = validRows.map((r, index) => {
      const locStr = selectedLine + ', R-' + String(r.rackNumber).padStart(2, '0') + ', L-' + String(r.rackSlot).padStart(2, '0');
      return {
        id: 'pack-hist-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 6),
        packNumber: r.packNumber.trim(),
        packType: r.normalizedModel,
        status: 'IN_STORAGE',
        locationArea: 'Warehouse Storage',
        currentLocation: locStr,
        lineId: selectedLine,
        rackNumber: Number(r.rackNumber),
        rackSlot: Number(r.rackSlot),
        inwardDate: nowIso,
        documentNo: 'HISTORICAL-POPULATION',
        dealershipName: 'Varale B300 Historical Stock',
        receivedState: 'Maharashtra',
        transportName: 'Direct Line Allocation',
        hasInwardStamp: true,
        inwardBy: adminName,
        inwardApprovedBy: adminName,
        inwardApprovedAt: nowIso,
        movementHistory: [
          {
            id: 'mov-hist-' + Date.now() + '-' + index,
            timestamp: nowIso,
            fromLocation: 'Legacy Plant Stock',
            toLocation: locStr,
            movedBy: adminName,
            reason: 'Super Admin 1-Year Historical Line Population (' + selectedLine + ')',
          },
        ],
      };
    });

    onSaveLinePacks(newPacks);
    setSuccessMessage('Successfully populated ' + newPacks.length + ' packs into Line ' + selectedLine + '!');

    // Reset grid
    setRows([
      { id: 'row-1', packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', rackNumber: 1, rackSlot: 1 },
      { id: 'row-2', packNumber: '', modelInput: 'Gen3', normalizedModel: 'Kanger1.0_Gen3', rackNumber: 1, rackSlot: 2 },
      { id: 'row-3', packNumber: '', modelInput: 'CKD', normalizedModel: 'Kanger1.0_CKD', rackNumber: 1, rackSlot: 3 },
      { id: 'row-4', packNumber: '', modelInput: 'FBU', normalizedModel: 'Kanger1.0_FBU', rackNumber: 1, rackSlot: 4 },
    ]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Table className="w-3.5 h-3.5 text-purple-700" /> Super Admin Historical Tool
            </span>
            <span className="text-slate-500 font-mono-code font-medium">1-Year Legacy Data Populator</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            Direct Warehouse Line Matrix Populator (Excel-Style Grid)
          </h2>
          <p className="text-slate-500 text-xs">
            Rapidly load 30–40 lines of historical warehouse packs. Type or paste pack numbers with model shorthands.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Line Selector & Shorthand Cheat Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
          <label className="block font-bold text-purple-900">
            Select Destination Warehouse Line (50 Lines):
          </label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {WAREHOUSE_LINES.map((l) => (
              <option key={l} value={l}>
                Line {l}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-purple-700">
            Selected Line: <strong className="font-mono-code">{selectedLine}</strong> (R-01 to R-160, Levels L-01 to L-04)
          </p>
        </div>

        <div className="md:col-span-8 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
            ⚡ Fast Model Shorthands Supported:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
            <div><strong className="text-blue-700">AIO</strong> → Kanger1.0_AIO</div>
            <div><strong className="text-sky-700">Gen3</strong> → Kanger1.0_Gen3</div>
            <div><strong className="text-teal-700">CKD</strong> → Kanger1.0_CKD</div>
            <div><strong className="text-emerald-700">FBU</strong> → Kanger1.0_FBU</div>
            <div><strong className="text-indigo-700">K2</strong> → Kanger2.0</div>
            <div><strong className="text-purple-700">K3</strong> → Kanger3.0</div>
            <div><strong className="text-orange-700">Tamor</strong> → Tamor_ELR</div>
            <div><strong className="text-amber-700">Nova</strong> → Nova_LRP</div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{showBulkPaste ? 'Close Bulk Paste' : 'Paste from Excel'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddRows(5)}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold cursor-pointer"
          >
            +5 Rows
          </button>
          <button
            type="button"
            onClick={() => handleAddRows(10)}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold cursor-pointer"
          >
            +10 Rows
          </button>
          <button
            type="button"
            onClick={() => handleAddRows(25)}
            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-bold cursor-pointer"
          >
            +25 Rows
          </button>
        </div>
      </div>

      {/* Bulk Paste Box */}
      {showBulkPaste && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
          <label className="block font-bold text-slate-800">
            Paste Excel Rows (Column 1: Pack Number | Column 2: Shorthand):
          </label>
          <textarea
            value={bulkPasteText}
            onChange={(e) => setBulkPasteText(e.target.value)}
            placeholder="5281	AIO&#10;5282	Gen3&#10;5283	CKD&#10;5284	FBU&#10;5285	K2..."
            rows={4}
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono-code text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulkPaste(false)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyBulkPaste}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
            >
              Populate Matrix
            </button>
          </div>
        </div>
      )}

      {/* Excel Spreadsheet Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="p-2.5 w-12 text-center">#</th>
              <th className="p-2.5">Pack Number (Digits)</th>
              <th className="p-2.5">Model Input / Shorthand</th>
              <th className="p-2.5">Normalized Product Name</th>
              <th className="p-2.5 w-24">Rack (1-160)</th>
              <th className="p-2.5 w-24">Level (1-4)</th>
              <th className="p-2.5 text-right w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const modelInfo = BATTERY_MODELS[row.normalizedModel];
              return (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="p-2.5 text-center font-mono-code font-bold text-slate-400">
                    {index + 1}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.packNumber}
                      onChange={(e) => handleRowChange(row.id, 'packNumber', e.target.value)}
                      placeholder="e.g. 5284, 12, 101..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.modelInput}
                      onChange={(e) => handleRowChange(row.id, 'modelInput', e.target.value)}
                      placeholder="AIO, CKD, Gen3, FBU, K2..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="p-2.5">
                    <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (modelInfo?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                      {row.normalizedModel}
                    </span>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={1}
                      max={160}
                      value={row.rackNumber}
                      onChange={(e) => handleRowChange(row.id, 'rackNumber', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono-code font-bold text-slate-900"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={row.rackSlot}
                      onChange={(e) => handleRowChange(row.id, 'rackSlot', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      <option value={1}>L-01</option>
                      <option value={2}>L-02</option>
                      <option value={3}>L-03</option>
                      <option value={4}>L-04</option>
                    </select>
                  </td>
                  <td className="p-2.5 text-right">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-slate-500 font-medium">
          Ready to save <strong>{rows.filter((r) => r.packNumber.trim().length > 0).length}</strong> packs into <strong>Line {selectedLine}</strong>
        </span>

        <button
          type="button"
          onClick={handleSaveToLine}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Save & Populate Line {selectedLine} 🚀</span>
        </button>
      </div>
    </div>
  );
};
