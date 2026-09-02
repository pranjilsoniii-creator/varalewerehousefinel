import React from 'react';
import {
  X,
  MapPin,
  Truck,
  ArrowLeftRight,
  Printer,
  Calendar,
  Box,
  CheckCircle2,
  Clock,
  ExternalLink,
  Tag,
  Layers,
  Flag,
  FileCheck,
  Building,
  User,
} from 'lucide-react';
import { BatteryPack } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

interface PackDetailsModalProps {
  pack: BatteryPack | null;
  onClose: () => void;
  onSelectForMove: (pack: BatteryPack) => void;
  onAddToDispatch: (pack: BatteryPack) => void;
  onNavigateToLine: (lineId: string) => void;
}

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({
  pack,
  onClose,
  onAddToDispatch,
  onNavigateToLine,
}) => {
  if (!pack) return null;

  const model = BATTERY_MODELS[pack.packType];
  const isDispatched = pack.status === 'DISPATCHED';
  const isPending = pack.status === 'PENDING_APPROVAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold"
              style={{
                backgroundColor: `${model?.color || '#2563eb'}15`,
                color: model?.color || '#2563eb',
                borderColor: `${model?.color || '#2563eb'}30`,
              }}
            >
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-mono-code font-bold text-slate-900">
                  Pack #{pack.packNumber}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {pack.packType}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {model?.name || pack.packType} • Status:{' '}
                {isDispatched ? (
                  <span className="text-rose-600 font-bold">DISPATCHED (Red Flag)</span>
                ) : isPending ? (
                  <span className="text-amber-600 font-bold">PENDING APPROVAL</span>
                ) : (
                  <span className="text-blue-700 font-bold">INWARD AREA (IN STOCK)</span>
                )}
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
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Status & Location Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Current Warehouse / Dispatch State
            </span>
            {isDispatched ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-semibold space-y-1">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <Flag className="w-4 h-4 text-rose-600 fill-rose-600" /> DISPATCHED FROM PLANT
                </div>
                <p className="text-xs text-rose-800 font-normal">
                  Delivered To: <strong className="font-semibold">{pack.dispatchToAddress || 'Customer Destination'}</strong>
                </p>
                {pack.dispatchedBy && (
                  <p className="text-[11px] text-rose-700">
                    Dispatched By: <strong className="font-semibold">{pack.dispatchedBy}</strong> on {pack.dispatchedAt ? new Date(pack.dispatchedAt).toLocaleString('en-IN') : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 font-semibold flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-950 block">Current Location: Inward Area</span>
                  <span className="text-[11px] text-blue-700 font-normal">Stored at Tata AutoComp Systems Limited - Varale</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded font-bold text-xs border border-emerald-300">
                  Ready for Dispatch
                </span>
              </div>
            )}
          </div>

          {/* Logistics Inward Pedigree */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-500" /> Inward Origin & Verification Details
            </span>
            <div className="space-y-1 text-slate-700 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Document / Invoice No:</span>
                <span className="font-mono-code font-bold text-blue-700">{pack.documentNo || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Dealership / Source:</span>
                <span className="font-semibold text-slate-900">{pack.dealershipName || 'Tata Motors Dealership'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Received State:</span>
                <span>{pack.receivedState || 'Maharashtra'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Transporter:</span>
                <span className="font-semibold text-slate-900">{pack.transportName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Tata Inward Stamp:</span>
                <span className="font-bold">
                  {pack.hasInwardStamp ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Official Seal Verified
                    </span>
                  ) : (
                    <span className="text-slate-500">No Stamp</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Inwarded By:</span>
                <span className="font-medium text-slate-900">{pack.inwardBy || 'Inward Operator'}</span>
              </div>
              {pack.inwardApprovedBy && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Approved By:</span>
                  <span className="font-medium text-emerald-700">{pack.inwardApprovedBy}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Inward Date:</span>
                <span className="font-mono-code">{pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>
          </div>

          {/* Movement Audit History Trail */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Lifecycle Audit Trail ({pack.movementHistory?.length || 0} events)
            </span>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {pack.movementHistory && pack.movementHistory.length > 0 ? (
                pack.movementHistory.map((mov) => (
                  <div
                    key={mov.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900 font-mono-code">{mov.fromLocation} ➔ {mov.toLocation}</span>
                      <span className="text-slate-500 text-[10px]">{new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      Reason: {mov.reason} • By: {mov.movedBy}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">No movement events recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold border border-slate-200 text-xs cursor-pointer"
          >
            Close
          </button>

          {!isDispatched && !isPending && (
            <button
              onClick={() => {
                onClose();
                onAddToDispatch(pack);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Send to Dispatch Cart 🚀</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
