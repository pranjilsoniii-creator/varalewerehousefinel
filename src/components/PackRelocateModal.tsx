import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeftRight,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Box,
} from 'lucide-react';
import { BatteryPack, MovementLog } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

interface PackRelocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePack: BatteryPack | null;
  allPacks: BatteryPack[];
  warehouseLines: string[];
  onExecuteMove: (
    sourcePackId: string,
    targetLocation: { lineId: string; rackNumber: number; rackSlot: number },
    swapPackId?: string,
    reason?: string
  ) => void;
}

export const PackRelocateModal: React.FC<PackRelocateModalProps> = ({
  isOpen,
  onClose,
  sourcePack,
  allPacks,
  warehouseLines,
  onExecuteMove,
}) => {
  if (!isOpen || !sourcePack) return null;

  // Target Location State
  const [targetLine, setTargetLine] = useState<string>(
    sourcePack.lineId.startsWith('DISPATCH') ? 'A-1' : sourcePack.lineId
  );
  const [targetRack, setTargetRack] = useState<number>(
    sourcePack.rackNumber > 0 ? (sourcePack.rackNumber < 160 ? sourcePack.rackNumber + 1 : 1) : 1
  );
  const [targetSlot, setTargetSlot] = useState<number>(sourcePack.rackSlot || 1);
  const [operatorName, setOperatorName] = useState('Forklift Operator R. Sharma');
  const [moveReason, setMoveReason] = useState('Line Reorganization & Batch Grouping');
  const [isSwapConfirmed, setIsSwapConfirmed] = useState<boolean>(true);

  // Check if target slot is occupied by an existing pack
  const targetOccupantPack = useMemo(() => {
    return (
      allPacks.find(
        (p) =>
          p.id !== sourcePack.id &&
          p.status === 'IN_STORAGE' &&
          p.lineId === targetLine &&
          p.rackNumber === targetRack &&
          p.rackSlot === targetSlot
      ) || null
    );
  }, [allPacks, sourcePack.id, targetLine, targetRack, targetSlot]);

  // Is source pack currently in storage or dispatch area?
  const sourceLocationStr =
    sourcePack.status === 'IN_STORAGE'
      ? `Line ${sourcePack.lineId}, Rack R-${sourcePack.rackNumber}, Slot ${sourcePack.rackSlot}`
      : 'Dispatch Staging Area Bay';

  const targetLocationStr = `Line ${targetLine}, Rack R-${targetRack}, Slot ${targetSlot}`;

  const handleApprove = () => {
    if (targetOccupantPack && !isSwapConfirmed) {
      alert('Target slot is occupied. Please select an empty slot or approve Swap.');
      return;
    }

    onExecuteMove(
      sourcePack.id,
      {
        lineId: targetLine,
        rackNumber: targetRack,
        rackSlot: targetSlot,
      },
      targetOccupantPack ? targetOccupantPack.id : undefined,
      moveReason
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Relocate & Swap Battery Pack</h3>
              <p className="text-xs text-slate-500">
                Move #{sourcePack.packNumber} to new warehouse line, rack, or slot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Visual Movement Path (From -> To) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Source Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Source Location (From)
                </span>
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">
                  {sourcePack.packType}
                </span>
              </div>
              <div className="font-mono-code font-bold text-slate-900 text-base truncate">
                #{sourcePack.packNumber}
              </div>
              <div className="text-xs font-bold text-blue-700 bg-white px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2 shadow-2xs">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{sourceLocationStr}</span>
              </div>
            </div>

            {/* Target Destination Box */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Target Location (To)
                </span>
                <span className="text-xs font-bold text-blue-600">New Coordinate</span>
              </div>
              <div className="font-mono-code font-bold text-blue-900 text-base">
                Line {targetLine} • R-{targetRack}
              </div>
              <div className="text-xs font-bold text-blue-800 bg-white px-3 py-2 rounded-lg border border-blue-200 flex items-center gap-2 shadow-2xs">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>{targetLocationStr}</span>
              </div>
            </div>
          </div>

          {/* Target Location Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Choose New Storage Location
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Line Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Line (50-100)</label>
                <select
                  value={targetLine}
                  onChange={(e) => setTargetLine(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                >
                  {warehouseLines.map((line) => (
                    <option key={line} value={line}>
                      Line {line}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rack Number (1 to 160) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rack No. (1-160)</label>
                <input
                  type="number"
                  min={1}
                  max={160}
                  value={targetRack}
                  onChange={(e) => setTargetRack(Math.max(1, Math.min(160, parseInt(e.target.value) || 1)))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono-code font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Stack Slot Level (1 to 4) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stack Level (1-4)</label>
                <select
                  value={targetSlot}
                  onChange={(e) => setTargetSlot(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>Slot 1 (Base Ground)</option>
                  <option value={2}>Slot 2 (Lower Mid)</option>
                  <option value={3}>Slot 3 (Upper Mid)</option>
                  <option value={4}>Slot 4 (Top Tier)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Occupancy Status & Swap Confirmation Logic */}
          {targetOccupantPack ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-slideDown">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Target Slot is Already Occupied by Another Pack!
                  </h4>
                  <p className="text-xs text-amber-800">
                    Location <span className="font-mono-code font-bold underline">{targetLocationStr}</span> currently holds{' '}
                    <span className="font-mono-code font-extrabold text-slate-900">#{targetOccupantPack.packNumber}</span> ({targetOccupantPack.packType}).
                  </p>
                </div>
              </div>

              {/* Swap Yes/No Option */}
              <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Do you want to SWAP packs between these two slots?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSwapConfirmed(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSwapConfirmed
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      YES (Swap)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSwapConfirmed(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !isSwapConfirmed
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      NO (Pick Other)
                    </button>
                  </div>
                </div>

                {isSwapConfirmed ? (
                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      Automatic 2-Way Swap Plan:
                    </div>
                    <p className="text-[11px] text-slate-700">
                      1. <span className="text-blue-700 font-bold">#{sourcePack.packNumber}</span> moves to <span className="underline">{targetLocationStr}</span>
                    </p>
                    <p className="text-[11px] text-slate-700">
                      2. <span className="text-amber-700 font-bold">#{targetOccupantPack.packNumber}</span> moves to <span className="underline">{sourceLocationStr}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 italic">
                    Please select a different Line/Rack/Slot above that is empty.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-emerald-950">Target Slot is Completely Empty!</span>
                <p className="text-emerald-800">
                  Pack #{sourcePack.packNumber} will be relocated directly without disturbing any other battery.
                </p>
              </div>
            </div>
          )}

          {/* Reason & Operator Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Movement Reason</label>
              <input
                type="text"
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                placeholder="e.g. Batch grouping, Dispatch staging"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operator Name</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Operator name"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="confirm-relocate-btn"
            onClick={handleApprove}
            disabled={targetOccupantPack !== null && !isSwapConfirmed}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
              targetOccupantPack !== null && !isSwapConfirmed
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Update Warehouse Locations</span>
          </button>
        </div>
      </div>
    </div>
  );
};
