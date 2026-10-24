import React, { useState, useMemo } from 'react';
import {
  Search,
  Battery,
  MapPin,
  Calendar,
  Layers,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { BatteryPack, ShiftChatPackShare } from '../types';
import { formatIndianDate } from '../data/batteryCatalog';

interface SharePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  packs: BatteryPack[];
  recipientName?: string;
  onSharePack: (packShare: ShiftChatPackShare) => void;
}

export const SharePackModal: React.FC<SharePackModalProps> = ({
  isOpen,
  onClose,
  packs,
  recipientName,
  onSharePack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<BatteryPack | null>(null);

  const filteredPacks = useMemo(() => {
    if (!searchQuery.trim()) {
      return packs.slice(0, 8);
    }
    const q = searchQuery.toLowerCase().trim();
    return packs
      .filter(
        (p) =>
          p.packNumber.toLowerCase().includes(q) ||
          (p.serialNumber && p.serialNumber.toLowerCase().includes(q)) ||
          p.packType.toLowerCase().includes(q) ||
          (p.line && p.line.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [packs, searchQuery]);

  if (!isOpen) return null;

  const handleConfirmShare = () => {
    if (!selectedPack) return;

    const packShare: ShiftChatPackShare = {
      packNumber: selectedPack.packNumber,
      serialNumber: selectedPack.serialNumber,
      packType: selectedPack.packType,
      status: selectedPack.status,
      line: selectedPack.line,
      rack: selectedPack.rack,
      location: selectedPack.location || (selectedPack.line ? `${selectedPack.line} / ${selectedPack.rack || 'R1'}` : undefined),
      voltage: selectedPack.voltage,
      soc: selectedPack.soc,
      soh: selectedPack.soh,
      inwardDate: selectedPack.inwardDate,
      sourceType: selectedPack.sourceType,
      supplierName: selectedPack.supplierName,
      documentNo: selectedPack.documentNo,
      remark: selectedPack.remark,
    };

    onSharePack(packShare);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Battery className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Share Battery Pack Details
              </h3>
              <p className="text-[11px] text-slate-500 font-mono-code">
                {recipientName ? `Sending directly to @${recipientName}` : 'Share to current chat'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pack No, Serial, Model, or Line..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 font-mono-code font-bold transition"
              autoFocus
            />
          </div>
        </div>

        {/* Pack List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filteredPacks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching warehouse packs found for "{searchQuery}".
            </div>
          ) : (
            filteredPacks.map((pack) => {
              const isSelected = selectedPack?.id === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code font-extrabold text-xs text-slate-900">
                        {pack.packNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {pack.packType}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          pack.status === 'IN_STORAGE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : pack.status === 'DISPATCHED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {pack.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono-code">
                      {pack.line && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {pack.line} {pack.rack ? `/ ${pack.rack}` : ''}
                        </span>
                      )}
                      {pack.inwardDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {pack.inwardDate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] font-mono-code text-slate-500">
            {selectedPack ? (
              <span>Selected: <strong className="text-slate-800">{selectedPack.packNumber}</strong></span>
            ) : (
              <span>Select a pack to share</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedPack}
              onClick={handleConfirmShare}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                selectedPack
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Pack Card</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
