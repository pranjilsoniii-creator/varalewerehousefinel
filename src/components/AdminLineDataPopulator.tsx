import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
  Sparkles,
  Save,
  MapPin,
  RefreshCw,
  X,
  Lock,
  ChevronRight,
  FolderPlus,
  Tag,
  QrCode,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import {
  ALL_PACK_TYPES,
  BATTERY_MODELS,
  deriveModelFromShorthand,
  parseBoxCodeAndModel,
  parseBulkLineEntry,
} from '../data/batteryCatalog';
import {
  getStoredWarehouseLines,
  saveStoredWarehouseLines,
  MAX_PACKS_PER_RACK,
  RACKS_PER_LINE,
} from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';

interface AdminLineDataPopulatorProps {
  existingPacks: BatteryPack[];
  warehouseLines: string[];
  onAddNewLine?: (newLine: string) => void;
  onSaveLinePacks: (newPacks: BatteryPack[]) => void;
  onClearEntireLine?: (lineId: string) => void;
  onOpenPrintModal?: (lineId: string) => void;
  onClose?: () => void;
}

interface RackSlotInput {
  slot: number; // 1, 2, 3, 4
  packNumber: string;
  secondaryStickerNumber?: string;
  modelInput: string;
  normalizedModel: BatteryPackType;
  remark?: string;
  isWithoutPlate?: boolean;
}

export const AdminLineDataPopulator: React.FC<AdminLineDataPopulatorProps> = ({
  existingPacks,
  warehouseLines,
  onAddNewLine,
  onSaveLinePacks,
  onClearEntireLine,
  onOpenPrintModal,
  onClose,
}) => {
  const { currentUser, isSuperAdmin, isManager } = useAuth();

  // Mode Tab: 'STEPPER' (Rack-by-Rack Save & Next) vs 'EXCEL_SHEET' (Full Sheet Matrix)
  const [activeEntryMode, setActiveEntryMode] = useState<'STEPPER' | 'EXCEL_SHEET'>('STEPPER');

  // Selected Line
  const [selectedLine, setSelectedLine] = useState<string>(warehouseLines[0] || 'A-01');

  // Dynamic New Line Creator State
  const [isCreatingLine, setIsCreatingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');

  // Current active rack number (1 to 160) for Stepper Mode
  const [activeRackNumber, setActiveRackNumber] = useState<number>(1);

  // Toggle for Dual-Sticker Mode (2 serial numbers on 1 pack)
  const [showDualStickerMode, setShowDualStickerMode] = useState(false);

  // 4 Slots for currently active rack (Level 1, 2, 3, 4)
  const [rackSlots, setRackSlots] = useState<RackSlotInput[]>([
    { slot: 1, packNumber: '', secondaryStickerNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', remark: '', isWithoutPlate: false },
    { slot: 2, packNumber: '', secondaryStickerNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', remark: '', isWithoutPlate: false },
    { slot: 3, packNumber: '', secondaryStickerNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', remark: '', isWithoutPlate: false },
    { slot: 4, packNumber: '', secondaryStickerNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', remark: '', isWithoutPlate: false },
  ]);

  // Bulk Paste Text for Excel Sheet Matrix Mode
  const [matrixText, setMatrixText] = useState('');
  const [showMatrixPaste, setShowMatrixPaste] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Check how many packs are already stored in each rack for the selected line
  const existingRackCounts = useMemo(() => {
    const counts: Record<number, { count: number; packs: BatteryPack[] }> = {};
    for (let r = 1; r <= RACKS_PER_LINE; r++) {
      counts[r] = { count: 0, packs: [] };
    }
    existingPacks.forEach((p) => {
      if (p.status !== 'DISPATCHED' && p.lineId === selectedLine && p.rackNumber) {
        if (!counts[p.rackNumber]) {
          counts[p.rackNumber] = { count: 0, packs: [] };
        }
        counts[p.rackNumber].count += 1;
        counts[p.rackNumber].packs.push(p);
      }
    });
    return counts;
  }, [existingPacks, selectedLine]);

  // Total packs currently stored in selected line
  const totalPacksInLine = useMemo(() => {
    return existingPacks.filter((p) => p.status !== 'DISPATCHED' && p.lineId === selectedLine).length;
  }, [existingPacks, selectedLine]);

  // Load existing packs for active rack into slot inputs
  useEffect(() => {
    const existing = existingRackCounts[activeRackNumber]?.packs || [];
    const newSlots: RackSlotInput[] = [1, 2, 3, 4].map((slotNum) => {
      const foundPack = existing.find((p) => p.rackSlot === slotNum);
      if (foundPack) {
        return {
          slot: slotNum,
          packNumber: foundPack.packNumber,
          secondaryStickerNumber: foundPack.secondaryStickerNumber || foundPack.challanPackNumber || '',
          modelInput: foundPack.packType,
          normalizedModel: foundPack.packType,
          remark: foundPack.remark || '',
          isWithoutPlate: foundPack.isWithoutPlate,
        };
      }
      return {
        slot: slotNum,
        packNumber: '',
        secondaryStickerNumber: '',
        modelInput: 'AIO',
        normalizedModel: 'Kanger1.0_AIO',
        remark: '',
        isWithoutPlate: false,
      };
    });
    setRackSlots(newSlots);
  }, [activeRackNumber, selectedLine, existingRackCounts]);

  // Handle slot change with auto-derivation & parseBulkLineEntry
  const handleSlotChange = (
    slotIndex: number,
    field: 'packNumber' | 'secondaryStickerNumber' | 'modelInput' | 'remark',
    value: string
  ) => {
    setRackSlots((prev) => {
      const next = [...prev];
      if (field === 'packNumber') {
        const rawVal = value;
        next[slotIndex].packNumber = rawVal;
        if (rawVal.trim() && rawVal.trim() !== '0') {
          const parsed = parseBulkLineEntry(rawVal, next[slotIndex].modelInput);
          next[slotIndex].normalizedModel = parsed.derivedModel;
          next[slotIndex].isWithoutPlate = parsed.isWithoutPlate;
          if (parsed.secondaryStickerNumber && !next[slotIndex].secondaryStickerNumber) {
            next[slotIndex].secondaryStickerNumber = parsed.secondaryStickerNumber;
          }
          if (parsed.remark && !next[slotIndex].remark) {
            next[slotIndex].remark = parsed.remark;
          }
        }
      } else if (field === 'secondaryStickerNumber') {
        next[slotIndex].secondaryStickerNumber = value;
      } else if (field === 'modelInput') {
        next[slotIndex].modelInput = value;
        const parsed = parseBoxCodeAndModel(next[slotIndex].packNumber, value);
        next[slotIndex].normalizedModel = parsed.derivedModel;
      } else if (field === 'remark') {
        next[slotIndex].remark = value;
      }
      return next;
    });
  };

  // Quick apply model to all 4 slots
  const handleApplyModelToAllSlots = (modelKey: string) => {
    setRackSlots((prev) =>
      prev.map((slot) => {
        const parsed = parseBoxCodeAndModel(slot.packNumber, modelKey);
        return {
          ...slot,
          modelInput: modelKey,
          normalizedModel: parsed.derivedModel,
        };
      })
    );
  };

  // Create new warehouse line
  const handleCreateNewLine = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newLineName.trim().toUpperCase().replace(/\s+/g, '-');
    if (!formatted) return;

    if (warehouseLines.includes(formatted)) {
      alert(`Line "${formatted}" already exists.`);
      return;
    }

    const updatedLines = [...warehouseLines, formatted];
    saveStoredWarehouseLines(updatedLines);
    if (onAddNewLine) onAddNewLine(formatted);
    setSelectedLine(formatted);
    setNewLineName('');
    setIsCreatingLine(false);
  };

  // Handle Clear / Delete Entire Line
  const handleClearLine = () => {
    if (!isSuperAdmin && !isManager) {
      alert('Permission Denied: Only Super Admin (Pranjil) and Manager (Suresh Chavan) can clear entire line data.');
      return;
    }

    const count = totalPacksInLine;
    if (
      confirm(
        `⚠️ CLEAR ENTIRE LINE WARNING:\n\nAre you sure you want to remove all ${count} battery packs from Line ${selectedLine}?\n\nThis will clear the line from local cache & Supabase cloud so you can re-stock / re-populate the line cleanly.`
      )
    ) {
      if (onClearEntireLine) {
        onClearEntireLine(selectedLine);
        setNotification({
          message: `Line ${selectedLine} has been completely cleared (removed ${count} packs). Ready for fresh stocking!`,
          type: 'success',
        });
      }
    }
  };

  // Save current 4 slots for active rack
  const handleSaveCurrentRack = (e: React.FormEvent) => {
    e.preventDefault();

    const validSlotEntries = rackSlots.filter((s) => s.packNumber.trim().length > 0 && s.packNumber.trim() !== '0');

    if (validSlotEntries.length > MAX_PACKS_PER_RACK) {
      alert('Capacity Error: A rack can hold a maximum of 4 packs (Slots 1 to 4).');
      return;
    }

    if (validSlotEntries.length === 0) {
      // Advance to next rack without saving if all slots are 0 or blank
      if (activeRackNumber < RACKS_PER_LINE) {
        setActiveRackNumber((prev) => prev + 1);
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const operatorName = currentUser?.name || currentUser?.username || 'Line Manager';

    // Create BatteryPack items using parseBulkLineEntry
    const newPacks: BatteryPack[] = validSlotEntries.map((slotItem, idx) => {
      const parsed = parseBulkLineEntry(slotItem.packNumber, slotItem.modelInput);
      const locStr = `${selectedLine}, R-${String(activeRackNumber).padStart(2, '0')}, L-0${slotItem.slot}`;
      const finalRemark = (slotItem.remark && slotItem.remark.trim()) || parsed.remark || undefined;
      const secondarySticker = (slotItem.secondaryStickerNumber && slotItem.secondaryStickerNumber.trim()) || parsed.secondaryStickerNumber || undefined;

      return {
        id: `pack-line-${Date.now()}-${activeRackNumber}-${slotItem.slot}-${idx}`,
        packNumber: parsed.cleanPackNumber || slotItem.packNumber.trim(),
        secondaryStickerNumber: secondarySticker,
        packType: parsed.derivedModel,
        status: 'IN_STORAGE',
        locationArea: 'Warehouse Storage',
        currentLocation: locStr,
        lineId: selectedLine,
        rackNumber: activeRackNumber,
        rackSlot: slotItem.slot,
        sourceType: 'LINE_POPULATE',
        remark: finalRemark,
        isWithoutPlate: parsed.isWithoutPlate || slotItem.isWithoutPlate,
        isDifferentSerial: Boolean(secondarySticker),
        challanPackNumber: secondarySticker,
        mismatchReason: secondarySticker ? 'Dual Sticker / Secondary Barcode' : undefined,
        inwardDate: nowIso,
        documentNo: `LINE-LOAD-${selectedLine}`,
        dealershipName: 'Varale B300 Line Stock',
        receivedState: 'Maharashtra',
        transportName: 'Direct Line Allocation',
        hasInwardStamp: true,
        inwardBy: operatorName,
        inwardApprovedBy: operatorName,
        inwardApprovedAt: nowIso,
        movementHistory: [
          {
            id: `mov-${Date.now()}-${idx}`,
            timestamp: nowIso,
            fromLocation: 'Initial Line Stocking',
            toLocation: locStr,
            movedBy: operatorName,
            reason: `Sequential Rack Allocation (Line ${selectedLine}, Rack ${activeRackNumber}${finalRemark ? ` - Note: ${finalRemark}` : ''})`,
          },
        ],
      };
    });

    onSaveLinePacks(newPacks);
    setNotification({
      message: `Saved ${newPacks.length} pack(s) into Rack ${activeRackNumber} (Line ${selectedLine})! Moving to next rack...`,
      type: 'success',
    });

    // Advance to next rack (e.g. Rack 1 -> Rack 2 -> Rack 3)
    if (activeRackNumber < RACKS_PER_LINE) {
      setActiveRackNumber((prev) => prev + 1);
    }
  };

  // MULTI-PASTE MATRIX PARSER WITH FLEXIBLE REMARK & 2-STICKER SUPPORT
  // Formats supported:
  // "1245 ckd rejected pack"
  // "1245 ckd - 4545 ckd rejected pack"
  // "1245 AIO"
  // "0" (empty slot)
  const handleApplyMatrixPaste = () => {
    if (!matrixText.trim()) return;
    const lines = matrixText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const nowIso = new Date().toISOString();
    const operatorName = currentUser?.name || currentUser?.username || 'Line Manager';
    const newPacks: BatteryPack[] = [];

    let currentRackIndex = activeRackNumber;
    let slotInRack = 1;

    lines.forEach((lineText, idx) => {
      const parsed = parseBulkLineEntry(lineText, 'AIO');

      // If not empty slot
      if (!parsed.isEmptySlot && parsed.cleanPackNumber) {
        const locStr = `${selectedLine}, R-${String(currentRackIndex).padStart(2, '0')}, L-0${slotInRack}`;
        newPacks.push({
          id: `pack-matrix-${Date.now()}-${currentRackIndex}-${slotInRack}-${idx}`,
          packNumber: parsed.cleanPackNumber,
          secondaryStickerNumber: parsed.secondaryStickerNumber,
          packType: parsed.derivedModel,
          status: 'IN_STORAGE',
          locationArea: 'Warehouse Storage',
          currentLocation: locStr,
          lineId: selectedLine,
          rackNumber: currentRackIndex,
          rackSlot: slotInRack,
          sourceType: 'LINE_POPULATE',
          remark: parsed.remark,
          isWithoutPlate: parsed.isWithoutPlate,
          isDifferentSerial: parsed.isDifferentSerial,
          challanPackNumber: parsed.secondaryStickerNumber,
          mismatchReason: parsed.secondaryStickerNumber ? 'Dual Sticker / Secondary Barcode' : undefined,
          inwardDate: nowIso,
          documentNo: `MATRIX-LOAD-${selectedLine}`,
          dealershipName: 'Varale B300 Line Stock',
          receivedState: 'Maharashtra',
          transportName: 'Direct Line Matrix Allocation',
          hasInwardStamp: true,
          inwardBy: operatorName,
          inwardApprovedBy: operatorName,
          inwardApprovedAt: nowIso,
          movementHistory: [
            {
              id: `mov-mat-${Date.now()}-${idx}`,
              timestamp: nowIso,
              fromLocation: 'Matrix Batch Stock',
              toLocation: locStr,
              movedBy: operatorName,
              reason: `Excel Batch Line Stock (Line ${selectedLine}, Rack ${currentRackIndex}, Slot ${slotInRack}${parsed.remark ? ` - Note: ${parsed.remark}` : ''})`,
            },
          ],
        });
      }

      // Increment slot (4 slots per rack)
      slotInRack += 1;
      if (slotInRack > MAX_PACKS_PER_RACK) {
        slotInRack = 1;
        currentRackIndex += 1;
      }
    });

    if (newPacks.length > 0) {
      onSaveLinePacks(newPacks);
      setNotification({
        message: `Successfully populated ${newPacks.length} packs across ${Math.ceil(newPacks.length / 4)} racks into Line ${selectedLine}!`,
        type: 'success',
      });
      setMatrixText('');
      setShowMatrixPaste(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn max-w-5xl mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              Direct Line Stocking & Audit Manager
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold font-mono">
              Line {selectedLine}
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 font-display">
            Line Populator, Remarks & Dual-Sticker Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Rapid sequential rack allocation (Slots 1 to 4) with automated model derivation, per-pack remarks & 2-sticker support
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print & QR Sheet Action */}
          {onOpenPrintModal && (
            <button
              type="button"
              onClick={() => onOpenPrintModal(selectedLine)}
              className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet & QR</span>
            </button>
          )}

          {/* Clear Entire Line (Manager / SuperAdmin) */}
          {(isSuperAdmin || isManager) && (
            <button
              type="button"
              onClick={handleClearLine}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Delete all packs in this line for re-stocking or audits"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Entire Line ({totalPacksInLine})</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Line Selection & Mode Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        {/* Line Selector */}
        <div className="md:col-span-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Select Target Warehouse Line:
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingLine(!isCreatingLine)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Create New Line</span>
            </button>
          </div>

          {isCreatingLine ? (
            <form onSubmit={handleCreateNewLine} className="flex gap-2 animate-fadeIn">
              <input
                type="text"
                placeholder="e.g. A-11, B-05..."
                value={newLineName}
                onChange={(e) => setNewLineName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 bg-white text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Save Line
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingLine(false)}
                className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedLine}
                onChange={(e) => {
                  setSelectedLine(e.target.value);
                  setActiveRackNumber(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              >
                {warehouseLines.map((line) => (
                  <option key={line} value={line}>
                    Line {line} ({existingPacks.filter((p) => p.status !== 'DISPATCHED' && p.lineId === line).length} packs stored)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="md:col-span-6 space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Entry Workflow Method:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveEntryMode('STEPPER')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeEntryMode === 'STEPPER'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>Rack-by-Rack Stepper</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveEntryMode('EXCEL_SHEET')}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                activeEntryMode === 'EXCEL_SHEET'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Paste & Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: STEPPER MODE (Rack-by-Rack) */}
      {activeEntryMode === 'STEPPER' && (
        <div className="space-y-4">
          {/* Rack Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveRackNumber((prev) => Math.max(1, prev - 1))}
                disabled={activeRackNumber <= 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Current Rack:</span>
                <select
                  value={activeRackNumber}
                  onChange={(e) => setActiveRackNumber(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {Array.from({ length: RACKS_PER_LINE }, (_, i) => i + 1).map((rNum) => (
                    <option key={rNum} value={rNum}>
                      Rack R-{String(rNum).padStart(2, '0')} (
                      {existingRackCounts[rNum]?.count || 0} / 4 Packs)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setActiveRackNumber((prev) => Math.min(RACKS_PER_LINE, prev + 1))}
                disabled={activeRackNumber >= RACKS_PER_LINE}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dual-Sticker Mode Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDualStickerMode}
                  onChange={(e) => setShowDualStickerMode(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <span>🔍 Dual Sticker Mode (2 Barcodes per Pack)</span>
              </label>
            </div>

            {/* Quick Series Set */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-500">Quick Model:</span>
              <button
                type="button"
                onClick={() => handleApplyModelToAllSlots('AIO')}
                className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold"
              >
                AIO
              </button>
              <button
                type="button"
                onClick={() => handleApplyModelToAllSlots('CKD')}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold"
              >
                CKD
              </button>
              <button
                type="button"
                onClick={() => handleApplyModelToAllSlots('FBU')}
                className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
              >
                FBU
              </button>
              <button
                type="button"
                onClick={() => handleApplyModelToAllSlots('K2')}
                className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 text-[10px] font-bold"
              >
                K2
              </button>
            </div>
          </div>

          {/* 4 Slot Form Inputs */}
          <form onSubmit={handleSaveCurrentRack} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {rackSlots.map((slotItem, sIdx) => (
                <div
                  key={slotItem.slot}
                  className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 space-y-2.5 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-black font-mono">
                      Slot Level 0{slotItem.slot}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      R-{String(activeRackNumber).padStart(2, '0')}, L-0{slotItem.slot}
                    </span>
                  </div>

                  {/* Pack Number / Serial Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Battery Pack No. / Shorthand:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1245 ckd"
                      value={slotItem.packNumber}
                      onChange={(e) => handleSlotChange(sIdx, 'packNumber', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Dual Sticker Input (If enabled) */}
                  {showDualStickerMode && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-purple-700 uppercase">
                        2nd Sticker / Barcode:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4545"
                        value={slotItem.secondaryStickerNumber || ''}
                        onChange={(e) => handleSlotChange(sIdx, 'secondaryStickerNumber', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50/50 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Model Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Model / Type:</label>
                    <select
                      value={slotItem.modelInput}
                      onChange={(e) => handleSlotChange(sIdx, 'modelInput', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {ALL_PACK_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {BATTERY_MODELS[type]?.name || type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remark / Damage Note */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Remark (Optional):</label>
                    <input
                      type="text"
                      placeholder="e.g. rejected pack, damage"
                      value={slotItem.remark || ''}
                      onChange={(e) => handleSlotChange(sIdx, 'remark', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-[11px] text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Save & Advance Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Enter</kbd> to save and advance automatically to next rack.
              </span>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all hover:shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>Save Rack {activeRackNumber} & Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODE 2: EXCEL SHEET & MATRIX BULK PASTE MODE */}
      {activeEntryMode === 'EXCEL_SHEET' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                Bulk Line Populator Matrix (Excel / Multi-Format Paste)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 font-bold text-[10px]">
                Sequential Chunking: 4 Packs per Rack
              </span>
            </div>

            <p className="text-xs text-purple-800">
              Paste single numbers, full lines, or tab-delimited columns copied from Excel. System automatically verifies, detects dual-stickers, parses model types and remarks!
            </p>

            {/* Format Instructions Box */}
            <div className="p-3 bg-white rounded-lg border border-purple-200 text-[11px] text-slate-700 space-y-1">
              <p className="font-bold text-purple-950">Supported Formats:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 font-mono text-[10.5px]">
                <li><code>1245 ckd rejected pack</code> — Pack #1245, Model CKD, Remark: rejected pack</li>
                <li><code>1245 ckd - 4545 ckd rejected pack</code> — 2 Stickers (#1245 & #4545), Model CKD</li>
                <li><code>1245 AIO</code> or <code>1245</code> — Standard Pack Serial Number</li>
                <li><code>0</code> — Empty Slot (Skip slot without adding pack)</li>
              </ul>
            </div>

            <textarea
              rows={10}
              placeholder={`1245 ckd rejected pack\n1246 AIO\n1247 ckd - 4547 ckd box damage\n0\n5284 FBU\n5285 FBU\n5286 FBU\n5287 FBU`}
              value={matrixText}
              onChange={(e) => setMatrixText(e.target.value)}
              className="w-full p-3 rounded-xl border border-purple-300 bg-white font-mono text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-purple-700 font-semibold">
                Starting from Rack: <strong className="font-mono">R-{String(activeRackNumber).padStart(2, '0')}</strong> (Line {selectedLine})
              </span>
              <button
                type="button"
                onClick={handleApplyMatrixPaste}
                disabled={!matrixText.trim()}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Populate & Allocate Line {selectedLine}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
