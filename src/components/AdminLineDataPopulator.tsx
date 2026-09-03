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
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, deriveModelFromShorthand } from '../data/batteryCatalog';
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
  onClose?: () => void;
}

interface RackSlotInput {
  slot: number; // 1, 2, 3, 4
  packNumber: string;
  modelInput: string;
  normalizedModel: BatteryPackType;
  isWithoutPlate?: boolean;
}

export const AdminLineDataPopulator: React.FC<AdminLineDataPopulatorProps> = ({
  existingPacks,
  warehouseLines,
  onAddNewLine,
  onSaveLinePacks,
  onClose,
}) => {
  const { currentUser } = useAuth();

  // Mode Tab: 'STEPPER' (Rack-by-Rack Save & Next) vs 'EXCEL_SHEET' (Full Sheet Matrix)
  const [activeEntryMode, setActiveEntryMode] = useState<'STEPPER' | 'EXCEL_SHEET'>('STEPPER');

  // Selected Line
  const [selectedLine, setSelectedLine] = useState<string>(warehouseLines[0] || 'A-01');

  // Dynamic New Line Creator State
  const [isCreatingLine, setIsCreatingLine] = useState(false);
  const [newLineName, setNewLineName] = useState('');

  // Current active rack number (1 to 160) for Stepper Mode
  const [activeRackNumber, setActiveRackNumber] = useState<number>(1);

  // 4 Slots for currently active rack (Level 1, 2, 3, 4)
  const [rackSlots, setRackSlots] = useState<RackSlotInput[]>([
    { slot: 1, packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', isWithoutPlate: false },
    { slot: 2, packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', isWithoutPlate: false },
    { slot: 3, packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', isWithoutPlate: false },
    { slot: 4, packNumber: '', modelInput: 'AIO', normalizedModel: 'Kanger1.0_AIO', isWithoutPlate: false },
  ]);

  // Bulk Paste Text for Excel Sheet Matrix Mode
  const [matrixText, setMatrixText] = useState('');
  const [showMatrixPaste, setShowMatrixPaste] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Input refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Load existing packs for active rack into slot inputs
  useEffect(() => {
    const existing = existingRackCounts[activeRackNumber]?.packs || [];
    const newSlots: RackSlotInput[] = [1, 2, 3, 4].map((slotNum) => {
      const foundPack = existing.find((p) => p.rackSlot === slotNum);
      if (foundPack) {
        return {
          slot: slotNum,
          packNumber: foundPack.packNumber,
          modelInput: foundPack.packType,
          normalizedModel: foundPack.packType,
          isWithoutPlate: foundPack.isWithoutPlate,
        };
      }
      return {
        slot: slotNum,
        packNumber: '',
        modelInput: 'AIO',
        normalizedModel: 'Kanger1.0_AIO',
        isWithoutPlate: false,
      };
    });
    setRackSlots(newSlots);
  }, [activeRackNumber, selectedLine, existingRackCounts]);

  // Handle slot change with auto-derivation
  const handleSlotChange = (slotIndex: number, field: 'packNumber' | 'modelInput', value: string) => {
    setRackSlots((prev) => {
      const next = [...prev];
      if (field === 'packNumber') {
        const cleanVal = value.trim();
        next[slotIndex].packNumber = cleanVal;
        if (cleanVal && cleanVal !== '0') {
          next[slotIndex].normalizedModel = deriveModelFromShorthand(cleanVal, next[slotIndex].modelInput);
        }
      } else if (field === 'modelInput') {
        next[slotIndex].modelInput = value;
        next[slotIndex].normalizedModel = deriveModelFromShorthand(next[slotIndex].packNumber, value);
      }
      return next;
    });
  };

  // Keyboard navigation handler for inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextIdx = currentIndex + 1;
      if (nextIdx < inputRefs.current.length && inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx]?.focus();
      } else if (e.key === 'Enter') {
        handleSaveAndNextRack();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = currentIndex - 1;
      if (prevIdx >= 0 && inputRefs.current[prevIdx]) {
        inputRefs.current[prevIdx]?.focus();
      }
    }
  };

  // Add a new custom warehouse line
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
    if (onAddNewLine) {
      onAddNewLine(formatted);
    }
    setSelectedLine(formatted);
    setNewLineName('');
    setIsCreatingLine(false);
    setNotification({ message: 'Created New Line ' + formatted + ' successfully!', type: 'success' });
  };

  // SAVE & NEXT RACK ACTION (Core Sequential Flow)
  const handleSaveAndNextRack = () => {
    // Exclude '0' and empty string (0 represents empty rack)
    const validSlotEntries = rackSlots.filter(
      (s) => s.packNumber.trim().length > 0 && s.packNumber.trim() !== '0'
    );

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

    // Create BatteryPack items
    const newPacks: BatteryPack[] = validSlotEntries.map((slotItem, idx) => {
      const locStr = selectedLine + ', R-' + String(activeRackNumber).padStart(2, '0') + ', L-0' + slotItem.slot;
      return {
        id: 'pack-line-' + Date.now() + '-' + activeRackNumber + '-' + slotItem.slot + '-' + idx,
        packNumber: slotItem.packNumber.trim(),
        packType: slotItem.normalizedModel,
        status: 'IN_STORAGE',
        locationArea: 'Warehouse Storage',
        currentLocation: locStr,
        lineId: selectedLine,
        rackNumber: activeRackNumber,
        rackSlot: slotItem.slot,
        sourceType: 'LINE_POPULATE', // Direct Line Stock (Excluded from Inward Register, included in Total Stock)
        isWithoutPlate: slotItem.packNumber.toUpperCase().startsWith('NP-'),
        inwardDate: nowIso,
        documentNo: 'LINE-LOAD-' + selectedLine,
        dealershipName: 'Varale B300 Line Stock',
        receivedState: 'Maharashtra',
        transportName: 'Direct Line Allocation',
        hasInwardStamp: true,
        inwardBy: operatorName,
        inwardApprovedBy: operatorName,
        inwardApprovedAt: nowIso,
        movementHistory: [
          {
            id: 'mov-' + Date.now() + '-' + idx,
            timestamp: nowIso,
            fromLocation: 'Initial Line Stocking',
            toLocation: locStr,
            movedBy: operatorName,
            reason: 'Sequential Rack Allocation (Line ' + selectedLine + ', Rack ' + activeRackNumber + ')',
          },
        ],
      };
    });

    onSaveLinePacks(newPacks);
    setNotification({
      message: 'Saved ' + newPacks.length + ' pack(s) into Rack ' + activeRackNumber + ' (Line ' + selectedLine + ')! Moving to next rack...',
      type: 'success',
    });

    // Advance to next rack (e.g. Rack 1 -> Rack 2 -> Rack 3)
    if (activeRackNumber < RACKS_PER_LINE) {
      setActiveRackNumber((prev) => prev + 1);
    }
  };

  // MULTI-PASTE MATRIX PARSER (Matching user sheet chunking by 4 with 0 empty rack support)
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
      const parts = lineText.split(/[\t,;]+/).map((s) => s.trim());
      const rawCode = parts[0] || '';
      const modelStr = parts[1] || 'AIO';

      // If code is '0' or empty -> keep slot empty without creating pack
      if (rawCode && rawCode !== '0') {
        const cleanNum = rawCode.replace(/[^0-9A-Za-z_-]/g, '');
        const normModel = deriveModelFromShorthand(cleanNum, modelStr);
        const locStr = selectedLine + ', R-' + String(currentRackIndex).padStart(2, '0') + ', L-0' + slotInRack;

        newPacks.push({
          id: 'pack-matrix-' + Date.now() + '-' + currentRackIndex + '-' + slotInRack + '-' + idx,
          packNumber: cleanNum,
          packType: normModel,
          status: 'IN_STORAGE',
          locationArea: 'Warehouse Storage',
          currentLocation: locStr,
          lineId: selectedLine,
          rackNumber: currentRackIndex,
          rackSlot: slotInRack,
          sourceType: 'LINE_POPULATE',
          isWithoutPlate: cleanNum.toUpperCase().startsWith('NP-'),
          inwardDate: nowIso,
          documentNo: 'MATRIX-LOAD-' + selectedLine,
          dealershipName: 'Varale B300 Line Stock',
          receivedState: 'Maharashtra',
          transportName: 'Direct Line Matrix Allocation',
          hasInwardStamp: true,
          inwardBy: operatorName,
          inwardApprovedBy: operatorName,
          inwardApprovedAt: nowIso,
          movementHistory: [
            {
              id: 'mov-mat-' + Date.now() + '-' + idx,
              timestamp: nowIso,
              fromLocation: 'Matrix Batch Stock',
              toLocation: locStr,
              movedBy: operatorName,
              reason: 'Excel Batch Line Stock (Line ' + selectedLine + ', Rack ' + currentRackIndex + ', Slot ' + slotInRack + ')',
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
        message: 'Successfully populated ' + newPacks.length + ' packs across ' + Math.ceil(newPacks.length / 4) + ' racks into Line ' + selectedLine + '!',
        type: 'success',
      });
      setMatrixText('');
      setShowMatrixPaste(false);
    }
  };

  const isCurrentRackFull = (existingRackCounts[activeRackNumber]?.count || 0) >= MAX_PACKS_PER_RACK;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn max-w-5xl mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Table className="w-3.5 h-3.5 text-purple-700" /> Line & Rack Data Management
            </span>
            <span className="text-slate-500 font-mono-code font-medium">Auto-Ais Compliant • Max 4 Packs / Rack</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            Sequential Rack Loader & Line Stock Matrix
          </h2>
          <p className="text-slate-500 text-xs">
            Enter box codes per rack (4 slots max), use '0' for empty rack slots, or paste full Excel matrix.
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

      {/* Notification Banner */}
      {notification && (
        <div className={'p-3.5 rounded-xl border flex items-center justify-between gap-3 animate-fadeIn ' +
          (notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900')}>
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Line Selector & Dynamic "+ Create New Line" Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="md:col-span-5 space-y-1.5">
          <label className="block font-bold text-slate-800">
            Select Warehouse Line ({warehouseLines.length} Total Lines):
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedLine}
              onChange={(e) => {
                setSelectedLine(e.target.value);
                setActiveRackNumber(1);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {warehouseLines.map((l) => (
                <option key={l} value={l}>
                  Line {l}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsCreatingLine(!isCreatingLine)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Create a new custom warehouse line"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ New Line</span>
            </button>
          </div>
        </div>

        {/* Dynamic New Line Form Popup */}
        {isCreatingLine && (
          <div className="md:col-span-7 bg-purple-50 border border-purple-200 p-3 rounded-lg space-y-2 animate-fadeIn">
            <label className="block font-bold text-purple-950">
              Enter New Warehouse Line Name (e.g. Line C-01, Line B300-X):
            </label>
            <form onSubmit={handleCreateNewLine} className="flex gap-2">
              <input
                type="text"
                value={newLineName}
                onChange={(e) => setNewLineName(e.target.value)}
                placeholder="Enter new line name..."
                className="flex-1 bg-white border border-purple-300 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-900"
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
                className="px-2 py-1.5 bg-white border border-purple-200 text-purple-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Mode Switcher */}
        {!isCreatingLine && (
          <div className="md:col-span-7 flex justify-end">
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveEntryMode('STEPPER')}
                className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ' +
                  (activeEntryMode === 'STEPPER'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900')}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Rack-by-Rack (Save & Next)
              </button>
              <button
                type="button"
                onClick={() => setActiveEntryMode('EXCEL_SHEET')}
                className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ' +
                  (activeEntryMode === 'EXCEL_SHEET'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900')}
              >
                <Table className="w-3.5 h-3.5" /> Full Sheet Matrix Mode
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODE 1: SEQUENTIAL RACK-BY-RACK STEPPER */}
      {activeEntryMode === 'STEPPER' && (
        <div className="space-y-5">
          {/* Direct Rack Jump Navigation Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  Active Rack: <strong className="text-purple-700 text-base font-mono-code font-extrabold">Rack {activeRackNumber}</strong> of {RACKS_PER_LINE}
                </span>
                <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold border ' +
                  (isCurrentRackFull ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200')}>
                  {existingRackCounts[activeRackNumber]?.count || 0} / 4 Slots Filled
                </span>
              </div>

              {/* Quick Jump Input */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">Direct Jump to Rack:</span>
                <input
                  type="number"
                  min={1}
                  max={RACKS_PER_LINE}
                  value={activeRackNumber}
                  onChange={(e) => setActiveRackNumber(Math.max(1, Math.min(RACKS_PER_LINE, Number(e.target.value))))}
                  className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900 text-center"
                />
              </div>
            </div>

            {/* Quick Rack Buttons Carousel */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((rNum) => {
                const isSelected = activeRackNumber === rNum;
                const fillCount = existingRackCounts[rNum]?.count || 0;
                const isFull = fillCount >= MAX_PACKS_PER_RACK;

                return (
                  <button
                    key={rNum}
                    type="button"
                    onClick={() => setActiveRackNumber(rNum)}
                    className={'px-3 py-1.5 rounded-lg font-mono-code font-bold text-xs transition cursor-pointer flex-shrink-0 flex items-center gap-1 ' +
                      (isSelected
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isFull
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : fillCount > 0
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100')}
                  >
                    <span>R-{rNum}</span>
                    {fillCount > 0 && (
                      <span className={'px-1 py-0.2 rounded text-[9px] ' + (isSelected ? 'bg-white text-purple-900' : 'bg-slate-200 text-slate-800')}>
                        {fillCount}/4
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Physical Slots Form for Current Active Rack */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                Physical Slot Levels for Line {selectedLine} • Rack {activeRackNumber} (Max 4 Packs)
              </h3>
              <span className="text-slate-500 font-medium">
                {isCurrentRackFull ? '🔒 Rack Full (4/4)' : (4 - (existingRackCounts[activeRackNumber]?.count || 0)) + ' Slots Available'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rackSlots.map((slotItem, idx) => {
                const modelInfo = BATTERY_MODELS[slotItem.normalizedModel];

                return (
                  <div
                    key={slotItem.slot}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs hover:border-purple-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono-code flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-extrabold flex items-center justify-center text-[10px]">
                          {slotItem.slot}
                        </span>
                        <span>Level L-0{slotItem.slot} (Slot {slotItem.slot})</span>
                      </span>

                      <span className={'px-2 py-0.5 rounded text-[10px] font-bold border ' + (modelInfo?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {slotItem.normalizedModel}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                          Box Code / Serial (Enter '0' for Empty Slot)
                        </label>
                        <input
                          ref={(el) => (inputRefs.current[idx * 2] = el)}
                          type="text"
                          value={slotItem.packNumber}
                          onKeyDown={(e) => handleKeyDown(e, idx * 2)}
                          onChange={(e) => handleSlotChange(idx, 'packNumber', e.target.value)}
                          placeholder="e.g. 7428, 2741, 16640, or '0' for empty..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                          Item Shorthand (AIO, CKD, Gen3, FBU, K2, K3, Tamor, Limber...)
                        </label>
                        <input
                          ref={(el) => (inputRefs.current[idx * 2 + 1] = el)}
                          type="text"
                          value={slotItem.modelInput}
                          onKeyDown={(e) => handleKeyDown(e, idx * 2 + 1)}
                          onChange={(e) => handleSlotChange(idx, 'modelInput', e.target.value)}
                          placeholder="AIO, CKD, Gen3, FBU, K2, Limber..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepper Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={activeRackNumber <= 1}
                onClick={() => setActiveRackNumber((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-white border border-slate-300 disabled:opacity-40 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Rack</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndNextRack}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Next Rack (Rack {activeRackNumber + 1}) ➡️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: FULL-LINE EXCEL SHEET MATRIX */}
      {activeEntryMode === 'EXCEL_SHEET' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Batch Excel Matrix Populator (Line {selectedLine})
                </h3>
                <p className="text-slate-500 text-xs">
                  Paste entire columns from your Excel table (Box Code [TAB] Item Name). Enter '0' for empty slots. The system will automatically chunk 4 packs per rack sequentially into Line {selectedLine}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMatrixPaste(!showMatrixPaste)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{showMatrixPaste ? 'Close Matrix Box' : 'Paste from Excel Sheet'}</span>
              </button>
            </div>

            {showMatrixPaste && (
              <div className="p-4 bg-white border border-purple-200 rounded-xl space-y-2 animate-fadeIn">
                <label className="block font-bold text-purple-950">
                  Paste Excel Rows (Box Code [TAB] Item Name / Model):
                </label>
                <textarea
                  value={matrixText}
                  onChange={(e) => setMatrixText(e.target.value)}
                  placeholder="7428	AIO&#10;2741	AIO&#10;16640	Gen3&#10;1491	CKD&#10;0	(empty)&#10;1737	AIO&#10;5562	K2..."
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 font-mono-code text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMatrixPaste(false)}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyMatrixPaste}
                    className="px-5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
                  >
                    Populate 4-by-4 into Racks
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
