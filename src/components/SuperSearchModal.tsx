import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  Layers,
  MapPin,
  Calendar,
  Building,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Box,
  RefreshCw,
} from 'lucide-react';
import { BatteryPack, DispatchLot } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import { formatIndianDate, formatPackDisplayName } from './OutwardDispatchRegister';

interface SuperSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  packs: BatteryPack[];
  dispatchLots: DispatchLot[];
  initialPack?: BatteryPack | null;
  initialQuery?: string;
}

export const SuperSearchModal: React.FC<SuperSearchModalProps> = ({
  isOpen,
  onClose,
  packs,
  dispatchLots,
  initialPack,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedPack, setSelectedPack] = useState<BatteryPack | null>(initialPack || null);

  // Sync with initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialPack) {
        setSelectedPack(initialPack);
        setSearchQuery(initialPack.packNumber);
      } else if (initialQuery) {
        setSearchQuery(initialQuery);
        setSelectedPack(null);
      } else {
        setSearchQuery('');
        setSelectedPack(null);
      }
    }
  }, [isOpen, initialPack, initialQuery]);

  const lotMap = useMemo(() => {
    const map = new Map<string, DispatchLot>();
    dispatchLots.forEach((l) => map.set(l.id, l));
    return map;
  }, [dispatchLots]);

  // Clean sanitized query
  const cleanQ = useMemo(() => {
    return searchQuery.trim().toLowerCase().replace(/^#+/, '');
  }, [searchQuery]);

  // Search matching packs
  const matchingPacks = useMemo(() => {
    if (!cleanQ) return [];
    return packs.filter((p) => {
      const matchPack = p.packNumber.toLowerCase().includes(cleanQ);
      const matchDoc = p.documentNo?.toLowerCase().includes(cleanQ);
      const matchDispDoc = p.dispatchDocNo?.toLowerCase().includes(cleanQ);
      const matchLr = p.dispatchLrNo?.toLowerCase().includes(cleanQ);
      const matchModel = p.packType.toLowerCase().includes(cleanQ);
      const matchDealership = p.dealershipName?.toLowerCase().includes(cleanQ);
      const matchTransport = p.transportName?.toLowerCase().includes(cleanQ);
      const matchLocation = p.currentLocation?.toLowerCase().includes(cleanQ) || p.lineId?.toLowerCase().includes(cleanQ);
      const matchChallan = p.challanPackNumber?.toLowerCase().includes(cleanQ);
      return matchPack || matchDoc || matchDispDoc || matchLr || matchModel || matchDealership || matchTransport || matchLocation || matchChallan;
    });
  }, [packs, cleanQ]);

  // Exact matching pack
  const exactMatch = useMemo(() => {
    if (!cleanQ) return null;
    return packs.find((p) => p.packNumber.toLowerCase() === cleanQ);
  }, [packs, cleanQ]);

  // Recent/Active packs for quick 1-click selection when search is empty
  const quickPacks = useMemo(() => {
    return packs.slice(0, 16);
  }, [packs]);

  if (!isOpen) return null;

  const pack = selectedPack || exactMatch || (matchingPacks.length === 1 ? matchingPacks[0] : null);
  const model = pack ? BATTERY_MODELS[pack.packType] : null;
  const lot = pack?.dispatchLotId ? lotMap.get(pack.dispatchLotId) : null;

  const isDockInward = Boolean(
    pack &&
    pack.sourceType !== 'LINE_POPULATE' &&
    pack.sourceType !== 'DIRECT_DISPATCH' &&
    !pack.documentNo?.startsWith('MATRIX-LOAD-') &&
    !pack.documentNo?.startsWith('LINE-LOAD-') &&
    !(pack.documentNo?.startsWith('LINE-') && pack.documentNo?.includes('SLOT')) &&
    pack.documentNo !== 'DIRECT-DISPATCH' &&
    pack.documentNo !== 'Line Direct Stock' &&
    pack.documentNo !== 'DIRECT-LINE-STOCK' &&
    pack.documentNo?.trim() &&
    pack.dealershipName &&
    pack.dealershipName !== 'Varale B300 Line Stock' &&
    pack.dealershipName !== 'Direct Line Setup'
  );

  // Complete unified chronological activity timeline with zero data loss
  const fullTimeline = useMemo(() => {
    if (!pack) return [];
    const list: {
      id: string;
      timestamp: string;
      fromLocation: string;
      toLocation: string;
      movedBy: string;
      reason: string;
      type: 'INWARD' | 'STORAGE' | 'DISPATCH' | 'RE_INWARD' | 'RECONCILED' | 'OTHER';
    }[] = [];

    // Add recorded movement history
    if (pack.movementHistory && pack.movementHistory.length > 0) {
      pack.movementHistory.forEach((mov, idx) => {
        const rLower = (mov.reason || '').toLowerCase();
        let evType: 'INWARD' | 'STORAGE' | 'DISPATCH' | 'RE_INWARD' | 'RECONCILED' | 'OTHER' = 'OTHER';
        if (rLower.includes('reconcil')) evType = 'RECONCILED';
        else if (rLower.includes('re-inward') || rLower.includes('return')) evType = 'RE_INWARD';
        else if (rLower.includes('dispatch') || (mov.toLocation || '').toLowerCase().includes('dispatched')) evType = 'DISPATCH';
        else if (rLower.includes('inward')) evType = 'INWARD';
        else if (rLower.includes('storage') || rLower.includes('line') || rLower.includes('rack')) evType = 'STORAGE';

        const cleanReason = (mov.reason || '')
          .replace(/30-Day/gi, '60-Day')
          .replace(/30 Day/gi, '60 Day')
          .replace(/30 days/gi, '60 days');

        list.push({
          id: mov.id || `mov-${idx}`,
          timestamp: mov.timestamp,
          fromLocation: (mov.fromLocation || '').replace(/\\\$\\rightarrow\\\$/g, '➔').replace(/\$\\rightarrow\$/g, '➔'),
          toLocation: mov.toLocation || '',
          movedBy: mov.movedBy || 'Staff',
          reason: cleanReason,
          type: evType,
        });
      });
    }

    // Check if pack is currently dispatched but no dispatch movement was in movementHistory
    const hasCurrentDispatch = list.some((m) => m.type === 'DISPATCH' || m.toLocation.toLowerCase().includes('dispatched'));
    if (pack.status === 'DISPATCHED' && pack.dispatchedAt && !hasCurrentDispatch) {
      list.push({
        id: `mov-cur-disp-${pack.id}`,
        timestamp: pack.dispatchedAt,
        fromLocation: pack.lineId ? `Line ${pack.lineId}` : 'Warehouse Storage',
        toLocation: `Dispatched to ${pack.dispatchToCustomer || 'TATA AUTOCOMP'}`,
        movedBy: pack.dispatchedBy || 'Dispatch Lead',
        reason: `Outward Dispatch (Doc #${pack.dispatchDocNo || '—'} | Vehicle #${pack.dispatchVehicleNo || '—'})`,
        type: 'DISPATCH',
      });
    }

    // Sort chronologically (oldest first)
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  }, [pack]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-8 text-xs text-slate-800"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                  Universal Super Search & Pack Janamkundli
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Live Passport
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Full Lifecycle: Receiving Dock ➔ Physical Line & Rack ➔ Outward Dispatch Manifest.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedPack(null);
            }}
            placeholder="Search by Pack Number (e.g. 5284, 101), Document No, LR No, Vehicle, or Line..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedPack(null);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5 rounded transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Matching Chips if multiple found */}
        {matchingPacks.length > 1 && !selectedPack && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn text-xs">
            <p className="text-[11px] font-bold text-slate-600">
              Found {matchingPacks.length} matching packs. Select one to view Janamkundli:
            </p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {matchingPacks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(p)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-mono-code font-bold text-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>#{p.packNumber}</span>
                  <span className="text-[10px] text-blue-600">({formatPackDisplayName(p.packType)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAILED JANAMKUNDLI LIFECYCLE VIEW */}
        {pack ? (
          <div className="space-y-4 animate-fadeIn text-xs">
            {/* Pack Title Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-mono-code font-extrabold text-lg text-blue-300">
                  #{pack.packNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      Tata {formatPackDisplayName(pack.packType)} Battery Pack
                    </span>
                    {pack.isWithoutPlate && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-extrabold text-[9px]">
                        NO-PLATE
                      </span>
                    )}
                    {pack.isDifferentSerial && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-300 text-purple-950 font-extrabold text-[9px]">
                        DIFF-NO
                      </span>
                    )}
                    {((pack.lifecycleCount && pack.lifecycleCount > 1) || (pack.lifecycleHistory && pack.lifecycleHistory.length > 0)) && (
                      <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-extrabold text-[9px] flex items-center gap-1 shadow-xs">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                        CYCLE #{pack.lifecycleCount || (pack.lifecycleHistory ? pack.lifecycleHistory.length + 1 : 1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-200 font-mono-code mt-0.5">
                    Model: {pack.packType} • Source: {isDockInward ? 'Dock Inward Delivery Challan' : 'Direct Line Matrix Stock'}
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    pack.status === 'DISPATCHED'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                      : pack.status === 'IN_STORAGE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                  }`}
                >
                  {pack.status === 'DISPATCHED' ? 'Dispatched to EV Plant' : pack.status === 'IN_STORAGE' ? 'Stored in Rack' : 'In Inward Dock'}
                </span>
              </div>
            </div>

            {/* 3-Column Lifecycle Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: Origin & Inward Dock Receipt */}
              {isDockInward ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>1. Origin & Inward</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Dock Inward
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <p>
                      <span className="text-slate-500">Document No:</span>{' '}
                      <span className="font-mono-code font-bold text-slate-900">{pack.documentNo || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Received Date:</span>{' '}
                      <span className="font-mono-code text-slate-800">{formatIndianDate(pack.inwardDate)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Dealership:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.dealershipName || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Location/State:</span>{' '}
                      <span className="text-slate-800">{pack.receivedState || 'Maharashtra'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Transporter:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.transportName || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Inwarded By:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.inwardBy || 'Staff'}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>1. Origin / Inward Status</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Line Matrix Stock
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-lg text-amber-950 text-[10.5px]">
                      <p className="font-bold flex items-center gap-1 text-amber-900">
                        <span>⚡ Pre-existing Line Inventory</span>
                      </p>
                      <p className="text-slate-600 mt-0.5 leading-snug">
                        No Inward Dock record. This pack was added directly into Line Matrix as existing warehouse stock.
                      </p>
                    </div>
                    <p className="pt-0.5">
                      <span className="text-slate-500">Inward Status:</span>{' '}
                      <span className="font-semibold text-slate-600 italic">Not Inwarded (Line Direct)</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Setup Line:</span>{' '}
                      <span className="font-mono-code font-bold text-blue-700">Line {pack.lineId || 'Warehouse'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Configured By:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.inwardBy || 'Warehouse Admin'}</span>
                    </p>
                    {pack.remark && (
                      <p>
                        <span className="text-slate-500">Remark / Condition:</span>{' '}
                        <span className="font-semibold text-amber-800 font-mono-code">{pack.remark}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Box 2: Physical Storage Coordinates */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>2. Warehouse Coordinates</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <p>
                    <span className="text-slate-500">Warehouse Line:</span>{' '}
                    <span className="font-mono-code font-bold text-blue-700">{pack.lineId ? `Line ${pack.lineId}` : 'Inward Area'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Rack Number:</span>{' '}
                    <span className="font-mono-code font-bold text-slate-900">{pack.rackNumber ? `Rack R-${pack.rackNumber}` : '—'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Rack Slot Level:</span>{' '}
                    <span className="font-mono-code font-bold text-slate-900">{pack.rackSlot ? `Level ${pack.rackSlot}` : '—'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Current Area:</span>{' '}
                    <span className="font-medium text-slate-900">{pack.currentLocation || pack.locationArea || 'Storage'}</span>
                  </p>
                </div>
              </div>

              {/* Box 3: Outward Dispatch Manifest */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <span>3. Outward Manifest</span>
                </div>
                {pack.status === 'DISPATCHED' ? (
                  <div className="space-y-1 text-[11px]">
                    <p>
                      <span className="text-slate-500">Dispatch Date:</span>{' '}
                      <span className="font-mono-code font-bold text-emerald-700">{formatIndianDate(pack.dispatchedAt || lot?.timestamp)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Document No:</span>{' '}
                      <span className="font-mono-code font-bold text-blue-700">{pack.dispatchDocNo || lot?.transportDocNo || lot?.lotNumber || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">LR Number:</span>{' '}
                      <span className="font-mono-code text-slate-900">{pack.dispatchLrNo || lot?.lrNumber || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Vehicle No:</span>{' '}
                      <span className="font-mono-code font-bold text-slate-900">{pack.dispatchVehicleNo || lot?.vehicleNumber || '—'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Transporter:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.dispatchTransporter || lot?.transportName || 'Sahyadri Enterprises'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Destination:</span>{' '}
                      <span className="font-medium text-slate-900">{pack.dispatchToCustomer || lot?.consigneeName || 'TATA AUTOCOMP - Chakan'}</span>
                    </p>
                  </div>
                ) : (pack.lastDispatchedAt || (pack.lifecycleHistory && pack.lifecycleHistory.length > 0)) ? (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                      <span className="font-bold block text-emerald-950">📦 Re-Inwarded in Warehouse</span>
                      <span className="text-[10px] text-emerald-800">
                        Current cycle active in storage. Previously dispatched in Cycle #{pack.lifecycleHistory?.length || 1}.
                      </span>
                    </div>
                    <p>
                      <span className="text-slate-500">Last Dispatched:</span>{' '}
                      <span className="font-mono-code font-bold text-slate-900">
                        {formatIndianDate(pack.lastDispatchedAt || pack.lifecycleHistory?.[pack.lifecycleHistory.length - 1]?.dispatchedAt)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Last Consignee:</span>{' '}
                      <span className="font-medium text-slate-900">
                        {pack.lastDispatchCustomer || pack.lifecycleHistory?.[pack.lifecycleHistory.length - 1]?.dispatchToCustomer || 'TATA AUTOCOMP'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Last Doc No:</span>{' '}
                      <span className="font-mono-code font-bold text-blue-700">
                        {pack.lastDispatchDocNo || pack.lifecycleHistory?.[pack.lifecycleHistory.length - 1]?.dispatchDocNo || '—'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Pack is currently in warehouse (Not yet dispatched).
                  </div>
                )}
              </div>
            </div>

            {/* Complete Multi-Cycle Janamkundli Journey (Preserved Inward & Dispatch Cycles) */}
            {pack.lifecycleHistory && pack.lifecycleHistory.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-display">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                    Complete Multi-Cycle Janamkundli Journey ({pack.lifecycleHistory.length + 1} Total Lifecycle Cycles)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Zero Data Loss
                  </span>
                </div>

                <div className="space-y-3">
                  {pack.lifecycleHistory.map((cycle, cIdx) => (
                    <div key={cIdx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="font-bold text-blue-700 flex items-center gap-1">
                          <span>📜</span> Cycle #{cycle.cycleNumber || cIdx + 1} (Completed Past Cycle)
                        </span>
                        <span className="text-[10px] font-mono-code text-slate-500">
                          {formatIndianDate(cycle.inwardDate)} ➔ {formatIndianDate(cycle.dispatchedAt)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">📥 Inward Received</span>
                          <p><span className="text-slate-500">Date:</span> <strong className="font-mono-code text-slate-900">{formatIndianDate(cycle.inwardDate)}</strong></p>
                          <p><span className="text-slate-500">Doc No:</span> <strong className="font-mono-code text-blue-700">{cycle.documentNo || '—'}</strong></p>
                          <p><span className="text-slate-500">Origin / Dealer:</span> <span className="text-slate-800">{cycle.dealershipName || '—'}</span></p>
                          <p><span className="text-slate-500">Inwarded By:</span> <strong className="text-slate-900">{cycle.inwardBy || 'Staff'}</strong></p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">🚚 Outward Dispatched</span>
                          <p><span className="text-slate-500">Date:</span> <strong className="font-mono-code text-emerald-700">{formatIndianDate(cycle.dispatchedAt)}</strong></p>
                          <p><span className="text-slate-500">Dispatch Doc:</span> <strong className="font-mono-code text-blue-700">{cycle.dispatchDocNo || '—'}</strong></p>
                          <p><span className="text-slate-500">Consignee:</span> <span className="text-slate-800">{cycle.dispatchToCustomer || 'TATA AUTOCOMP'}</span></p>
                          <p><span className="text-slate-500">Vehicle / Transporter:</span> <span className="text-slate-800">{cycle.dispatchVehicleNo || '—'} ({cycle.dispatchTransporter || '—'})</span></p>
                          <p><span className="text-slate-500">Dispatched By:</span> <strong className="text-slate-900">{cycle.dispatchedBy || 'Dispatch Lead'}</strong></p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Current Active Cycle Card */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5 text-xs">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <span>✨</span> Current Cycle #{pack.lifecycleCount || pack.lifecycleHistory.length + 1} ({pack.status === 'DISPATCHED' ? 'Dispatched' : 'Active in Warehouse'})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        {pack.status === 'DISPATCHED' ? 'Dispatched' : 'Active in Warehouse'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">📥 Inward Received</span>
                        <p><span className="text-slate-500">Date:</span> <strong className="font-mono-code text-slate-900">{formatIndianDate(pack.inwardDate)}</strong></p>
                        <p><span className="text-slate-500">Doc No:</span> <strong className="font-mono-code text-blue-700">{pack.documentNo || '—'}</strong></p>
                        <p><span className="text-slate-500">Source:</span> <span className="text-slate-800">{pack.dealershipName || '—'}</span></p>
                        <p><span className="text-slate-500">Inwarded By:</span> <strong className="text-slate-900">{pack.inwardBy || 'Staff'}</strong></p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          {pack.status === 'DISPATCHED' ? '🚚 Outward Dispatched' : '📍 Current Coordinates'}
                        </span>
                        {pack.status === 'DISPATCHED' ? (
                          <>
                            <p><span className="text-slate-500">Date:</span> <strong className="font-mono-code text-emerald-700">{formatIndianDate(pack.dispatchedAt)}</strong></p>
                            <p><span className="text-slate-500">Dispatch Doc:</span> <strong className="font-mono-code text-blue-700">{pack.dispatchDocNo || '—'}</strong></p>
                            <p><span className="text-slate-500">Destination:</span> <span className="text-slate-800">{pack.dispatchToCustomer || '—'}</span></p>
                            <p><span className="text-slate-500">Vehicle:</span> <span className="text-slate-800">{pack.dispatchVehicleNo || '—'}</span></p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-slate-500">Location:</span> <strong className="text-slate-900">{pack.currentLocation || 'Inward Area'}</strong></p>
                            <p><span className="text-slate-500">Line:</span> <strong className="font-mono-code text-blue-700">{pack.lineId ? `Line ${pack.lineId}` : 'Dock / Staging'}</strong></p>
                            <p><span className="text-slate-500">Status:</span> <span className="text-emerald-700 font-bold">Ready in Warehouse</span></p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Movement History Chronological Timeline */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-display">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Chronological Activity & Movement History ({fullTimeline.length} events)
                </h4>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Full Audit Passport
                </span>
              </div>

              <div className="space-y-2 border-l-2 border-blue-200 pl-4 ml-1 text-xs">
                {fullTimeline.length > 0 ? (
                  fullTimeline.map((mov, idx) => (
                    <div key={mov.id || idx} className="relative pb-2">
                      <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-white ${
                        mov.type === 'DISPATCH' ? 'bg-orange-500' :
                        mov.type === 'RE_INWARD' ? 'bg-purple-600' :
                        mov.type === 'STORAGE' ? 'bg-emerald-600' :
                        mov.type === 'RECONCILED' ? 'bg-amber-500' :
                        'bg-blue-600'
                      }`}></div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>
                            {mov.type === 'DISPATCH' ? '🚚' :
                             mov.type === 'RE_INWARD' ? '🔄' :
                             mov.type === 'STORAGE' ? '📦' :
                             mov.type === 'RECONCILED' ? '⚡' :
                             '📥'}
                          </span>
                          <span>{mov.reason || 'Movement Recorded'}</span>
                        </span>
                        <span className="font-mono-code text-slate-400">{formatIndianDate(mov.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {mov.fromLocation} ➔ {mov.toLocation} (By: <strong className="text-slate-800">{mov.movedBy || 'Staff'}</strong>)
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-500">
                    {isDockInward
                      ? `Initial dock registration under Document #${pack.documentNo || 'Inward'}.`
                      : `Initial line allocation in Line ${pack.lineId || 'Storage'}.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : cleanQ ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl space-y-2">
            <p>No battery pack found matching "{searchQuery}".</p>
            <p className="text-[11px] text-slate-400">Please check the pack serial number or document number.</p>
          </div>
        ) : (
          /* QUICK SELECT FROM RECENT INVENTORY */
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-blue-600" /> Quick Select Pack to View Janamkundli:
              </span>
              <span className="text-[11px] text-slate-400 font-mono-code">{packs.length} total packs</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {quickPacks.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPack(p)}
                  className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition cursor-pointer shadow-2xs group"
                >
                  <div className="font-mono-code font-bold text-slate-900 group-hover:text-blue-700 text-xs">
                    #{p.packNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {formatPackDisplayName(p.packType)} • {p.lineId ? `Line ${p.lineId}` : 'Dock'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer with Close Button */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">Tata AutoComp Systems Limited</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Close Janamkundli
          </button>
        </div>
      </div>
    </div>
  );
};
