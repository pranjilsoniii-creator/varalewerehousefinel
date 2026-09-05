import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { BatteryPack, DispatchLot } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import { formatIndianDate, formatPackDisplayName } from './OutwardDispatchRegister';

interface SuperSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  packs: BatteryPack[];
  dispatchLots: DispatchLot[];
}

export const SuperSearchModal: React.FC<SuperSearchModalProps> = ({
  isOpen,
  onClose,
  packs,
  dispatchLots,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<BatteryPack | null>(null);

  const lotMap = useMemo(() => {
    const map = new Map<string, DispatchLot>();
    dispatchLots.forEach((l) => map.set(l.id, l));
    return map;
  }, [dispatchLots]);

  // Search matching packs
  const matchingPacks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return packs.filter((p) => {
      const matchPack = p.packNumber.toLowerCase().includes(q);
      const matchDoc = p.documentNo?.toLowerCase().includes(q);
      const matchDispDoc = p.dispatchDocNo?.toLowerCase().includes(q);
      const matchLr = p.dispatchLrNo?.toLowerCase().includes(q);
      const matchModel = p.packType.toLowerCase().includes(q);
      return matchPack || matchDoc || matchDispDoc || matchLr || matchModel;
    });
  }, [packs, searchQuery]);

  if (!isOpen) return null;

  const pack = selectedPack || (matchingPacks.length === 1 ? matchingPacks[0] : null);
  const model = pack ? BATTERY_MODELS[pack.packType] : null;
  const lot = pack?.dispatchLotId ? lotMap.get(pack.dispatchLotId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Universal Super Search & Pack Janamkundli
              </h2>
              <p className="text-xs text-slate-500">
                Track full lifecycle: Receiving Dock $\rightarrow$ Storage Rack $\rightarrow$ Outward Dispatch Manifest.
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
            placeholder="Enter any Pack Number (e.g. 30250, 7428, NP-1002) or Document / LR No..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
            autoFocus
          />
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
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-mono-code font-extrabold text-lg text-blue-300">
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
                  </div>
                  <p className="text-[11px] text-blue-200 font-mono-code">
                    Model: {pack.packType} • Source: {pack.sourceType === 'LINE_POPULATE' ? 'Direct Line Matrix' : 'Inward Delivery Challan'}
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
                  {pack.status === 'DISPATCHED' ? 'Dispatched to EV Plant' : pack.status === 'IN_STORAGE' ? 'Stored in Rack' : 'In Inward Area'}
                </span>
              </div>
            </div>

            {/* 3-Column Lifecycle Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Box 1: Origin & Inward Dock Receipt */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>1. Origin & Inward</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <p>
                    <span className="text-slate-500">Document No:</span>{' '}
                    <span className="font-mono-code font-bold text-slate-900">{pack.documentNo || 'Line Direct Stock'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Received Date:</span>{' '}
                    <span className="font-mono-code text-slate-800">{formatIndianDate(pack.inwardDate)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Dealership:</span>{' '}
                    <span className="font-medium text-slate-900">{pack.dealershipName || 'Direct Line Setup'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Location/State:</span>{' '}
                    <span className="text-slate-800">{pack.receivedState || 'Maharashtra'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Inwarded By:</span>{' '}
                    <span className="font-medium text-slate-900">{pack.inwardBy || 'Staff'}</span>
                  </p>
                </div>
              </div>

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
                    <span className="font-medium text-slate-900">{pack.currentLocation || pack.locationArea}</span>
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
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Pack is currently in warehouse (Not yet dispatched).
                  </div>
                )}
              </div>
            </div>

            {/* Movement History Chronological Timeline */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 font-display">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Chronological Activity & Movement History
              </h4>

              <div className="space-y-2 border-l-2 border-blue-200 pl-4 ml-1 text-xs">
                {pack.movementHistory && pack.movementHistory.length > 0 ? (
                  pack.movementHistory.map((mov, idx) => (
                    <div key={mov.id || idx} className="relative pb-2">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white"></div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">{mov.reason || 'Movement Recorded'}</span>
                        <span className="font-mono-code text-slate-400">{formatIndianDate(mov.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {mov.fromLocation} $\rightarrow$ {mov.toLocation} (By: {mov.movedBy})
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Initial registration recorded under Document #{pack.documentNo || 'Direct Stock'}.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          searchQuery.trim() && matchingPacks.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
              No battery pack found matching "{searchQuery}". Please check the pack serial number.
            </div>
          )
        )}

        {/* Modal Footer with Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
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
