import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Box,
  Layers,
  ArrowLeftRight,
  Truck,
  Calendar,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';

interface PackLocatorSearchProps {
  packs: BatteryPack[];
  onSelectPackForMove: (pack: BatteryPack) => void;
  onAddPackToDispatch: (pack: BatteryPack) => void;
  onNavigateToLine: (lineId: string) => void;
}

export const PackLocatorSearch: React.FC<PackLocatorSearchProps> = ({
  packs,
  onSelectPackForMove,
  onAddPackToDispatch,
  onNavigateToLine,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('IN_STORAGE');
  const [activeLocatedPack, setActiveLocatedPack] = useState<BatteryPack | null>(null);

  // Filter packs based on query & model
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packs.filter((p) => {
      // Model match
      const modelMatch = selectedModel === 'ALL' || p.packType === selectedModel;
      // Status match
      const statusMatch = statusFilter === 'ALL' || p.status === statusFilter;
      // Query match (pack number, lr, document, line, vehicle)
      const queryMatch =
        !q ||
        p.packNumber.toLowerCase().includes(q) ||
        p.lineId.toLowerCase().includes(q) ||
        `r-${p.rackNumber}`.toLowerCase().includes(q) ||
        p.lrNumber.toLowerCase().includes(q) ||
        p.transportDocNo.toLowerCase().includes(q) ||
        p.vehicleNumber.toLowerCase().includes(q);

      return modelMatch && statusMatch && queryMatch;
    });
  }, [packs, searchQuery, selectedModel, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      setActiveLocatedPack(searchResults[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Search Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Search className="w-3.5 h-3.5 text-blue-600" /> Instant Battery Locator
            </span>
            <span className="text-xs text-slate-500 font-medium">Search out of {packs.length.toLocaleString()} total units</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Find Exact Line & Rack Location
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Enter any battery pack number or model to pinpoint its exact physical position in warehouse racks.
          </p>
        </div>

        {/* Search & Filter Form */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          {/* Pack Number Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Pack Number (e.g. TATA-TK1G-26-894102 or partial serial)..."
              className="w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-slate-900 font-mono-code font-bold text-sm focus:outline-none shadow-2xs transition"
            />
          </div>

          {/* Model Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-3 text-slate-800 text-sm font-semibold focus:outline-none"
            >
              <option value="ALL">All Tata Battery Models</option>
              {ALL_PACK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-3 text-slate-800 text-sm font-semibold focus:outline-none"
            >
              <option value="IN_STORAGE">In Storage Racks</option>
              <option value="IN_DISPATCH_AREA">In Dispatch Staging</option>
              <option value="DISPATCHED">Dispatched Records</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </form>

        {/* Quick model chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 no-scrollbar text-xs">
          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">Quick Filters:</span>
          {['Kanger1.0_Gen3', 'Nova_LRP', 'Limber_AIS', 'kanger2.0', 'Challenger_LR'].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedModel(selectedModel === m ? 'ALL' : m)}
              className={`px-2.5 py-1 rounded-md font-mono-code text-[11px] transition cursor-pointer flex-shrink-0 border ${
                selectedModel === m
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Results List (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800">
              Search Results ({searchResults.length} {searchResults.length === 1 ? 'pack' : 'packs'} found)
            </h3>
            <span className="text-xs text-slate-500">Click any pack to view location coordinates</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No battery packs found matching your query</p>
              <p className="text-xs text-slate-500">
                Try searching for a different serial prefix or reset the model filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedModel('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-200"
              >
                Clear Search Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {searchResults.map((pack) => {
                const model = BATTERY_MODELS[pack.packType];
                const isSelected = activeLocatedPack?.id === pack.id;

                return (
                  <div
                    key={pack.id}
                    onClick={() => setActiveLocatedPack(pack)}
                    className={`bg-white border rounded-xl p-3.5 transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border flex-shrink-0"
                        style={{
                          backgroundColor: `${model?.color}15`,
                          color: model?.color,
                          borderColor: `${model?.color}30`,
                        }}
                      >
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code font-bold text-slate-900 text-sm">
                            {pack.packNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {pack.packType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {pack.voltage} • {pack.capacityAh} • Batch: {pack.batchNumber || 'Standard'}
                        </p>
                      </div>
                    </div>

                    {/* Location Badge */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {pack.status === 'IN_STORAGE' ? (
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</div>
                          <div className="text-xs font-mono-code font-bold text-blue-700">
                            Line {pack.lineId} • R-{pack.rackNumber} • L{pack.rackSlot}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {pack.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Location Popup / Visual Pinpoint Card (Right 5 cols) */}
        <div className="lg:col-span-5">
          {activeLocatedPack ? (
            <div className="sticky top-24 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-md space-y-5 animate-scaleUp">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" /> Battery Pack Located
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold">Active in System</span>
                  </div>
                  <h3 className="text-lg font-mono-code font-extrabold text-slate-900">
                    {activeLocatedPack.packNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {BATTERY_MODELS[activeLocatedPack.packType]?.name || activeLocatedPack.packType}
                  </p>
                </div>
                <button
                  onClick={() => setActiveLocatedPack(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Exact Spatial Location Highlight Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-xs">
                <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-400" /> Physical Warehouse Coordinates
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg">
                    <span className="block text-[10px] text-slate-400 font-medium">Line</span>
                    <span className="font-mono-code font-extrabold text-lg text-white">
                      {activeLocatedPack.lineId}
                    </span>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg">
                    <span className="block text-[10px] text-slate-400 font-medium">Rack</span>
                    <span className="font-mono-code font-extrabold text-lg text-orange-300">
                      R-{activeLocatedPack.rackNumber}
                    </span>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg">
                    <span className="block text-[10px] text-slate-400 font-medium">Stack Level</span>
                    <span className="font-mono-code font-extrabold text-lg text-blue-300">
                      Level {activeLocatedPack.rackSlot}
                    </span>
                  </div>
                </div>

                {/* Visual Stack Diagram */}
                <div className="pt-2">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5">
                    Rack R-{activeLocatedPack.rackNumber} Vertical Elevation (4 Tiers):
                  </div>
                  <div className="space-y-1">
                    {[4, 3, 2, 1].map((level) => {
                      const isThisSlot = activeLocatedPack.rackSlot === level;
                      return (
                        <div
                          key={level}
                          className={`p-2 rounded-lg text-xs font-mono-code flex items-center justify-between border ${
                            isThisSlot
                              ? 'bg-orange-500/20 border-orange-400 text-orange-200 font-bold shadow-xs'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span>Slot {level} {level === 4 ? '(Top)' : level === 1 ? '(Base)' : ''}</span>
                          {isThisSlot ? (
                            <span className="flex items-center gap-1 text-orange-300 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                              THIS PACK HERE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">Other / Free</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Logistics & Inward History */}
              <div className="space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Logistics & Transport Record
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transporter:</span>
                    <span className="font-semibold text-slate-900">{activeLocatedPack.transportName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">LR / Bilty No:</span>
                    <span className="font-mono-code font-bold text-slate-800">{activeLocatedPack.lrNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inward Date:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(activeLocatedPack.inwardDate).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle No:</span>
                    <span className="font-mono-code font-medium text-slate-800">{activeLocatedPack.vehicleNumber}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onSelectPackForMove(activeLocatedPack)}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-slate-600" />
                    <span>Move / Relocate</span>
                  </button>

                  <button
                    onClick={() => onAddPackToDispatch(activeLocatedPack)}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Add to Dispatch</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigateToLine(activeLocatedPack.lineId)}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Line {activeLocatedPack.lineId} in Warehouse Map</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-xs">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Select any battery pack on the left</p>
              <p className="text-xs text-slate-500">
                The exact Line, Rack, Stack Tier, and Logistics pedigree will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
