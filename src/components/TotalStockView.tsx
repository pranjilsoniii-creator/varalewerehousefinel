import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Box,
  CheckCircle2,
  AlertCircle,
  Clock,
  Truck,
  ArrowRight,
  Sparkles,
  Building,
  Flag,
  FileCheck,
  ShieldCheck,
  Eye,
  RefreshCw,
  Hash,
  MapPin,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';

interface TotalStockViewProps {
  packs: BatteryPack[];
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
}

export const TotalStockView: React.FC<TotalStockViewProps> = ({
  packs,
  onOpenPackDetails,
  onSendToDispatch,
}) => {
  // Search Mode Tab: 'MODE_1' (All Products) vs 'MODE_2' (Specific Product)
  const [activeSearchTab, setActiveSearchTab] = useState<'MODE_1' | 'MODE_2'>('MODE_1');

  // Search Mode 1: Search by Pack Number across all product models
  const [search1PackNumber, setSearch1PackNumber] = useState('');
  const [hasExecutedSearch1, setHasExecutedSearch1] = useState(false);

  // Search Mode 2: Search by Pack Number + Product Name dropdown
  const [search2PackNumber, setSearch2PackNumber] = useState('');
  const [search2ProductName, setSearch2ProductName] = useState<BatteryPackType>('Kanger1.0_AIO');
  const [hasExecutedSearch2, setHasExecutedSearch2] = useState(false);

  // Category filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Total Available Stock (Excluding Dispatched)
  const availableStockPacks = useMemo(() => {
    return packs.filter((p) => p.status !== 'DISPATCHED');
  }, [packs]);

  const dispatchedPacksCount = useMemo(() => {
    return packs.filter((p) => p.status === 'DISPATCHED').length;
  }, [packs]);

  // Model-wise count breakdown
  const modelCounts = useMemo(() => {
    const counts: Record<string, { available: number; dispatched: number; total: number }> = {};
    ALL_PACK_TYPES.forEach((t) => {
      counts[t] = { available: 0, dispatched: 0, total: 0 };
    });

    packs.forEach((p) => {
      if (!counts[p.packType]) {
        counts[p.packType] = { available: 0, dispatched: 0, total: 0 };
      }
      counts[p.packType].total += 1;
      if (p.status === 'DISPATCHED') {
        counts[p.packType].dispatched += 1;
      } else {
        counts[p.packType].available += 1;
      }
    });

    return counts;
  }, [packs]);

  // Unified Kanger 1.0 Consolidated Total
  const kanger1Unified = useMemo(() => {
    const aio = modelCounts['Kanger1.0_AIO'] || { available: 0, dispatched: 0, total: 0 };
    const gen3 = modelCounts['Kanger1.0_Gen3'] || { available: 0, dispatched: 0, total: 0 };
    const ckd = modelCounts['Kanger1.0_CKD'] || { available: 0, dispatched: 0, total: 0 };
    const fbu = modelCounts['Kanger1.0_FBU'] || { available: 0, dispatched: 0, total: 0 };

    return {
      available: aio.available + gen3.available + ckd.available + fbu.available,
      dispatched: aio.dispatched + gen3.dispatched + ckd.dispatched + fbu.dispatched,
      total: aio.total + gen3.total + ckd.total + fbu.total,
      breakdown: {
        AIO: aio.available,
        Gen3: gen3.available,
        CKD: ckd.available,
        FBU: fbu.available,
      },
    };
  }, [modelCounts]);

  // Other distinct models (excluding the 4 Kanger 1.0 sub-variants)
  const distinctOtherModels: BatteryPackType[] = [
    'Kanger2.0',
    'Kanger3.0',
    'Tamor_ELR',
    'Nova_LRP',
    'Challenger_LR',
    'Challenger_MR',
    'Limber_Ais',
    'Limber_Non_Ais',
  ];

  // SEARCH 1: Exact Match by Pack Number (across ALL 12 products)
  const search1Results = useMemo(() => {
    if (!search1PackNumber.trim()) return [];
    const target = search1PackNumber.trim().toLowerCase();
    return packs.filter((p) => p.packNumber.trim().toLowerCase() === target);
  }, [packs, search1PackNumber]);

  // SEARCH 2: Exact Match by Pack Number + Product Name
  const search2Results = useMemo(() => {
    if (!search2PackNumber.trim()) return [];
    const target = search2PackNumber.trim().toLowerCase();
    return packs.filter(
      (p) =>
        p.packNumber.trim().toLowerCase() === target &&
        p.packType === search2ProductName
    );
  }, [packs, search2PackNumber, search2ProductName]);

  const handleExecuteSearch1 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasExecutedSearch1(true);
  };

  const handleExecuteSearch2 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasExecutedSearch2(true);
  };

  const handleResetSearch1 = () => {
    setSearch1PackNumber('');
    setHasExecutedSearch1(false);
  };

  const handleResetSearch2 = () => {
    setSearch2PackNumber('');
    setHasExecutedSearch2(false);
  };

  // Stock inventory table items
  const displayInventoryList = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') {
      return packs;
    }
    if (selectedCategoryFilter === 'KANGER_1_ALL') {
      return packs.filter((p) => p.packType.startsWith('Kanger1.0'));
    }
    return packs.filter((p) => p.packType === selectedCategoryFilter);
  }, [packs, selectedCategoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Executive Stock View
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Varale (B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Total Stock Dashboard & Dual Exact Search
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time counts for all official battery models, unified Kanger 1.0 series, and direct exact serial tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total In Stock</span>
            <span className="text-xl font-mono-code font-extrabold text-white">{availableStockPacks.length} Units</span>
          </div>
        </div>
      </div>

      {/* Product Summary Cards Grid (Unified Kanger 1.0 + Distinct Models) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Overview Card */}
        <div
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={'p-3.5 rounded-xl border transition cursor-pointer shadow-2xs flex flex-col justify-between ' +
            (selectedCategoryFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300')}
        >
          <div className="flex items-center justify-between">
            <span className={'text-xs font-bold uppercase tracking-wider ' + (selectedCategoryFilter === 'ALL' ? 'text-blue-100' : 'text-slate-500')}>
              All Models
            </span>
            <Box className="w-4 h-4 opacity-80" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-mono-code font-extrabold">{availableStockPacks.length}</div>
            <div className={'text-[10px] font-medium mt-0.5 ' + (selectedCategoryFilter === 'ALL' ? 'text-blue-100' : 'text-slate-400')}>
              {dispatchedPacksCount} Dispatched
            </div>
          </div>
        </div>

        {/* Unified Kanger 1.0 Card (AIO, CKD, FBU, Gen3) */}
        <div
          onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === 'KANGER_1_ALL' ? 'ALL' : 'KANGER_1_ALL')}
          className={'p-3.5 rounded-xl border transition cursor-pointer shadow-2xs flex flex-col justify-between ' +
            (selectedCategoryFilter === 'KANGER_1_ALL'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-500 shadow-md'
              : 'bg-white border-slate-200 hover:border-blue-400')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" />
              <span className={'text-xs font-bold truncate ' + (selectedCategoryFilter === 'KANGER_1_ALL' ? 'text-white' : 'text-slate-900')}>
                Kanger 1.0 (All 4 Types)
              </span>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-xl font-mono-code font-bold">
              {kanger1Unified.available} <span className="text-xs font-normal text-slate-400">In Stock</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono-code mt-1 flex flex-wrap gap-1">
              <span>AIO:{kanger1Unified.breakdown.AIO}</span>
              <span>Gen3:{kanger1Unified.breakdown.Gen3}</span>
              <span>CKD:{kanger1Unified.breakdown.CKD}</span>
              <span>FBU:{kanger1Unified.breakdown.FBU}</span>
            </div>
          </div>
        </div>

        {/* Distinct Models Cards */}
        {distinctOtherModels.map((typeKey) => {
          const model = BATTERY_MODELS[typeKey];
          const isSelected = selectedCategoryFilter === typeKey;
          const stat = modelCounts[typeKey] || { available: 0, dispatched: 0, total: 0 };

          return (
            <div
              key={typeKey}
              onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : typeKey)}
              className={'p-3.5 rounded-xl border transition cursor-pointer shadow-2xs flex flex-col justify-between ' +
                (isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500'
                  : 'bg-white border-slate-200 hover:border-blue-400')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: model?.color || '#2563eb' }}
                  />
                  <span className={'text-xs font-bold truncate ' + (isSelected ? 'text-white' : 'text-slate-900')}>
                    {typeKey}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <div className="text-xl font-mono-code font-bold">
                  {stat.available} <span className="text-xs font-normal text-slate-400">In Stock</span>
                </div>
                <div className={'text-[10px] font-medium mt-0.5 ' + (isSelected ? 'text-slate-300' : 'text-slate-500')}>
                  {stat.dispatched > 0 ? (stat.dispatched + ' Dispatched') : '0 Dispatched'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dual Exact Search Engine Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
              <Search className="w-5 h-5 text-orange-500" />
              Direct Exact Search System (Strict Match Verification)
            </h3>
            <p className="text-xs text-slate-500">
              Find exact numeric pack number across all models or lookup a specific pack + model combination.
            </p>
          </div>

          {/* Search Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                setActiveSearchTab('MODE_1');
                setHasExecutedSearch1(false);
              }}
              className={'px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ' +
                (activeSearchTab === 'MODE_1'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              <Hash className="w-3.5 h-3.5" /> Option 1: Pack No. Across All Products
            </button>
            <button
              onClick={() => {
                setActiveSearchTab('MODE_2');
                setHasExecutedSearch2(false);
              }}
              className={'px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ' +
                (activeSearchTab === 'MODE_2'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              <Box className="w-3.5 h-3.5" /> Option 2: Pack No. + Product Name
            </button>
          </div>
        </div>

        {/* SEARCH OPTION 1: Search by Pack Number Across All Models */}
        {activeSearchTab === 'MODE_1' && (
          <div className="space-y-4">
            <form onSubmit={handleExecuteSearch1} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search1PackNumber}
                  onChange={(e) => {
                    setSearch1PackNumber(e.target.value);
                    setHasExecutedSearch1(false);
                  }}
                  placeholder="Enter numeric pack number..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Pack</span>
                </button>
                {search1PackNumber && (
                  <button
                    type="button"
                    onClick={handleResetSearch1}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Results Display for Mode 1 */}
            {hasExecutedSearch1 && (
              <div className="space-y-3 pt-2">
                {search1Results.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">No Result Found</p>
                    <p className="text-xs text-slate-500">
                      Pack #{search1PackNumber} is not recorded in the database under any product model.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Found {search1Results.length} exact match item(s) for Pack #{search1PackNumber}:</span>
                      <span className="text-slate-500 text-[11px]">Exact match verification</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {search1Results.map((pack) => {
                        const isDispatched = pack.status === 'DISPATCHED';
                        const model = BATTERY_MODELS[pack.packType];

                        return (
                          <div
                            key={pack.id}
                            className={'p-4 rounded-xl border transition shadow-xs flex flex-col justify-between gap-3 ' +
                              (isDispatched
                                ? 'bg-rose-50/40 border-rose-200'
                                : 'bg-white border-slate-200 hover:border-blue-500')}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono-code font-extrabold text-base text-slate-900">
                                  #{pack.packNumber}
                                </span>
                                <span className={'px-2 py-0.5 rounded text-[10px] font-bold border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                  {pack.packType}
                                </span>
                              </div>

                              {/* Origin & Inward Details Section */}
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                                  Inward Origin & Verification Details:
                                </span>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Document / Challan No:</span>
                                  <span className="font-mono-code font-bold text-blue-700">{pack.documentNo || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Inward Date:</span>
                                  <span className="font-mono-code">{pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Dealership / Source:</span>
                                  <span className="font-semibold text-slate-900">{pack.dealershipName || 'Tata Plant'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Received State:</span>
                                  <span>{pack.receivedState || 'Maharashtra'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Transporter:</span>
                                  <span className="font-medium">{pack.transportName || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Tata Inward Stamp:</span>
                                  <span>
                                    {pack.hasInwardStamp ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified OK
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 font-semibold">No Stamp</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Inwarded By:</span>
                                  <span className="font-medium text-slate-800">{pack.inwardBy || 'Staff'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Current Storage Location:</span>
                                  <span className="font-bold text-blue-800 font-mono-code flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                    {pack.currentLocation || pack.locationArea || 'Inward Area'}
                                  </span>
                                </div>
                              </div>

                              {/* Status Display */}
                              <div className="flex justify-between text-xs px-1">
                                <span className="text-slate-500 font-semibold">Lifecycle Status:</span>
                                <span>
                                  {isDispatched ? (
                                    <span className="text-rose-600 flex items-center gap-1 font-bold">
                                      <Flag className="w-3.5 h-3.5 fill-rose-600" /> Dispatched
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available in Plant
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                              {!isDispatched && (
                                <button
                                  type="button"
                                  onClick={() => onSendToDispatch(pack)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Dispatch Pack</span>
                                  <span>🚀</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenPackDetails(pack)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                              >
                                View Pedigree
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SEARCH OPTION 2: Search by Pack Number + Product Name */}
        {activeSearchTab === 'MODE_2' && (
          <div className="space-y-4">
            <form onSubmit={handleExecuteSearch2} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={search2PackNumber}
                  onChange={(e) => {
                    setSearch2PackNumber(e.target.value);
                    setHasExecutedSearch2(false);
                  }}
                  placeholder="Enter numeric pack number..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={search2ProductName}
                  onChange={(e) => {
                    setSearch2ProductName(e.target.value as BatteryPackType);
                    setHasExecutedSearch2(false);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                >
                  {ALL_PACK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
                {search2PackNumber && (
                  <button
                    type="button"
                    onClick={handleResetSearch2}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {/* Results Display for Mode 2 */}
            {hasExecutedSearch2 && (
              <div className="space-y-3 pt-2">
                {search2Results.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-1">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">No Result Found</p>
                    <p className="text-xs text-slate-500">
                      Pack #{search2PackNumber} with Product Model <strong className="text-slate-700">{search2ProductName}</strong> was not found in the database.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Exact Match Found for #{search2PackNumber} ({search2ProductName}):</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {search2Results.map((pack) => {
                        const isDispatched = pack.status === 'DISPATCHED';
                        const model = BATTERY_MODELS[pack.packType];

                        return (
                          <div
                            key={pack.id}
                            className={'p-4 rounded-xl border transition shadow-xs flex flex-col justify-between gap-3 ' +
                              (isDispatched
                                ? 'bg-rose-50/40 border-rose-200'
                                : 'bg-white border-slate-200 hover:border-blue-500')}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="font-mono-code font-extrabold text-base text-slate-900">
                                  #{pack.packNumber}
                                </span>
                                <span className={'px-2 py-0.5 rounded text-[10px] font-bold border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                  {pack.packType}
                                </span>
                              </div>

                              {/* Inward Origin Details */}
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                                  Inward Origin & Verification Details:
                                </span>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Document / Challan No:</span>
                                  <span className="font-mono-code font-bold text-blue-700">{pack.documentNo || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Inward Date:</span>
                                  <span className="font-mono-code">{pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Dealership / Source:</span>
                                  <span className="font-semibold text-slate-900">{pack.dealershipName || 'Tata Plant'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Received State:</span>
                                  <span>{pack.receivedState || 'Maharashtra'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Transporter:</span>
                                  <span>{pack.transportName || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Tata Inward Stamp:</span>
                                  <span>
                                    {pack.hasInwardStamp ? (
                                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified OK
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">No Stamp</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Current Storage Location:</span>
                                  <span className="font-bold text-blue-800 font-mono-code flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                    {pack.currentLocation || pack.locationArea || 'Inward Area'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between text-xs px-1">
                                <span className="text-slate-500 font-semibold">Lifecycle Status:</span>
                                <span>
                                  {isDispatched ? (
                                    <span className="text-rose-600 flex items-center gap-1 font-bold">
                                      <Flag className="w-3.5 h-3.5 fill-rose-600" /> Dispatched
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available in Plant
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                              {!isDispatched && (
                                <button
                                  type="button"
                                  onClick={() => onSendToDispatch(pack)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Dispatch Pack</span>
                                  <span>🚀</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenPackDetails(pack)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                              >
                                View Pedigree
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Stock Inventory List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {selectedCategoryFilter === 'ALL' ? 'All Stock Inventory' : selectedCategoryFilter === 'KANGER_1_ALL' ? 'Kanger 1.0 (All 4 Types) Stock List' : (selectedCategoryFilter + ' Stock List')} ({displayInventoryList.length} Packs)
            </h3>
          </div>
          {selectedCategoryFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
            >
              Show All Models
            </button>
          )}
        </div>

        {displayInventoryList.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No packs found in stock for this category. Inward new units to view them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-3">#</th>
                  <th className="p-3">Pack Number</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Current Location</th>
                  <th className="p-3">Doc / Invoice No</th>
                  <th className="p-3">Inward Date</th>
                  <th className="p-3">Dealership</th>
                  <th className="p-3">Tata Stamp</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayInventoryList.map((pack, index) => {
                  const isDispatched = pack.status === 'DISPATCHED';
                  const model = BATTERY_MODELS[pack.packType];

                  return (
                    <tr
                      key={pack.id}
                      onDoubleClick={() => onOpenPackDetails(pack)}
                      className={'hover:bg-slate-50/80 transition cursor-pointer ' +
                        (isDispatched ? 'bg-rose-50/20' : '')}
                    >
                      <td className="p-3 font-mono-code text-slate-400">{index + 1}</td>
                      <td className="p-3 font-mono-code font-extrabold text-slate-900 text-sm">
                        #{pack.packNumber}
                      </td>
                      <td className="p-3">
                        <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                          {pack.packType}
                        </span>
                      </td>
                      <td className="p-3 font-mono-code font-bold text-slate-800">
                        {pack.currentLocation || pack.locationArea || 'Inward Area'}
                      </td>
                      <td className="p-3 font-mono-code font-bold text-blue-700">{pack.documentNo || '—'}</td>
                      <td className="p-3 font-mono-code text-slate-600">
                        {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-slate-800 max-w-xs truncate">{pack.dealershipName || 'Tata Hub'}</td>
                      <td className="p-3">
                        {pack.hasInwardStamp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            No Stamp
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isDispatched ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                            <Flag className="w-3 h-3 text-rose-600 fill-rose-600" /> Dispatched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isDispatched && (
                            <button
                              type="button"
                              onClick={() => onSendToDispatch(pack)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Send to Dispatch Cart"
                            >
                              <span>Dispatch</span>
                              <span>🚀</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenPackDetails(pack)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="View Full Pedigree"
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
