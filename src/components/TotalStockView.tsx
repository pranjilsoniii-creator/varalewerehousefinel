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
  Trash2,
  Tag,
  Filter,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';

interface TotalStockViewProps {
  packs: BatteryPack[];
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
  onDeletePack?: (packId: string) => void;
}

export const TotalStockView: React.FC<TotalStockViewProps> = ({
  packs,
  onOpenPackDetails,
  onSendToDispatch,
  onDeletePack,
}) => {
  const { isSuperAdmin, isManager } = useAuth();

  // Search Mode Tab: 'MODE_1' (All Products) vs 'MODE_2' (Specific Product)
  const [activeSearchTab, setActiveSearchTab] = useState<'MODE_1' | 'MODE_2'>('MODE_1');

  // Search Mode 1: Search by Pack Number / Threshold across all product models
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

  // Grouped Series Summary
  const kanger1Unified = useMemo(() => {
    const k1Keys: BatteryPackType[] = [
      'Kanger1.0_AIO',
      'Kanger1.0_AIO_Ais',
      'Kanger1.0_Gen3',
      'Kanger1.0_Gen3_Ais',
      'Kanger1.0_CKD',
      'Kanger1.0_CKD_Ais',
      'Kanger1.0_FBU',
      'Kanger1.0_FBU_Ais',
    ];
    let available = 0;
    let dispatched = 0;
    let total = 0;
    k1Keys.forEach((k) => {
      const c = modelCounts[k] || { available: 0, dispatched: 0, total: 0 };
      available += c.available;
      dispatched += c.dispatched;
      total += c.total;
    });
    return { available, dispatched, total };
  }, [modelCounts]);

  const kanger2Unified = useMemo(() => {
    const k2Keys: BatteryPackType[] = ['Kanger2.0', 'Kanger2.0_Ais'];
    let available = 0;
    let dispatched = 0;
    let total = 0;
    k2Keys.forEach((k) => {
      const c = modelCounts[k] || { available: 0, dispatched: 0, total: 0 };
      available += c.available;
      dispatched += c.dispatched;
      total += c.total;
    });
    return { available, dispatched, total };
  }, [modelCounts]);

  // Search 1 Results (With Threshold Support e.g. ">= 30000", "30000+", or numeric match)
  const search1Results = useMemo(() => {
    if (!hasExecutedSearch1 || !search1PackNumber.trim()) return [];
    const query = search1PackNumber.trim().toLowerCase();

    // Check if query is a threshold operator like ">= 30000" or "30000+"
    let minThreshold: number | null = null;
    let maxThreshold: number | null = null;

    if (query.startsWith('>=') || query.startsWith('>')) {
      const numPart = parseInt(query.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numPart)) minThreshold = numPart;
    } else if (query.endsWith('+')) {
      const numPart = parseInt(query.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numPart)) minThreshold = numPart;
    } else if (query.startsWith('<=') || query.startsWith('<')) {
      const numPart = parseInt(query.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numPart)) maxThreshold = numPart;
    }

    return packs.filter((p) => {
      const cleanSerial = p.packNumber.replace(/[^0-9]/g, '');
      const serialNum = parseInt(cleanSerial, 10);

      if (minThreshold !== null && !isNaN(serialNum)) {
        return serialNum >= minThreshold;
      }
      if (maxThreshold !== null && !isNaN(serialNum)) {
        return serialNum <= maxThreshold;
      }

      const matchesPack = p.packNumber.toLowerCase().includes(query);
      const matchesDoc = p.documentNo?.toLowerCase().includes(query);
      const matchesType = p.packType.toLowerCase().includes(query);
      const matchesLine = p.lineId?.toLowerCase().includes(query);
      return matchesPack || matchesDoc || matchesType || matchesLine;
    });
  }, [packs, hasExecutedSearch1, search1PackNumber]);

  // Search 2 Results (Pack Number + Specific Product Name)
  const search2Results = useMemo(() => {
    if (!hasExecutedSearch2) return [];
    return packs.filter((p) => {
      if (p.packType !== search2ProductName) return false;
      if (search2PackNumber.trim()) {
        return p.packNumber.toLowerCase().includes(search2PackNumber.trim().toLowerCase());
      }
      return true;
    });
  }, [packs, hasExecutedSearch2, search2PackNumber, search2ProductName]);

  const handleExecuteSearch1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search1PackNumber.trim()) return;
    setHasExecutedSearch1(true);
  };

  const handleExecuteSearch2 = (e: React.FormEvent) => {
    e.preventDefault();
    setHasExecutedSearch2(true);
  };

  const handleDeletePackPrompt = (pack: BatteryPack) => {
    if (!isSuperAdmin && !isManager) {
      alert('Permission Denied: Only Super Admin and Manager can delete packs.');
      return;
    }
    if (confirm('Permanently delete Pack #' + pack.packNumber + ' from the warehouse inventory and database?')) {
      if (onDeletePack) onDeletePack(pack.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Box className="w-3.5 h-3.5 text-emerald-700" /> Plant Total Stock
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Master Battery Inventory & Stock Locator
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete plant visibility across Inward Dock, Storage Lines (A-01 to B-25), and Outward Dispatches.
          </p>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-28">
            <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Available Stock</p>
            <p className="text-2xl font-extrabold text-emerald-950 font-mono-code mt-0.5">
              {availableStockPacks.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-28">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Dispatched</p>
            <p className="text-2xl font-extrabold text-slate-800 font-mono-code mt-0.5">
              {dispatchedPacksCount}
            </p>
          </div>
        </div>
      </div>

      {/* Unified Executive Series Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kanger 1.0 Unified Card */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
              Kanger 1.0 Series
            </span>
            <span className="text-xs font-mono-code text-blue-200 font-bold">4 Models + AIS (&gt;=30000)</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code tracking-tight">{kanger1Unified.available}</p>
            <p className="text-xs text-blue-200 mt-0.5">Packs Available in Warehouse</p>
          </div>
          <div className="pt-2 border-t border-white/10 grid grid-cols-4 gap-1 text-[10px] text-blue-100 font-mono-code">
            <div>AIO: {modelCounts['Kanger1.0_AIO']?.available || 0}</div>
            <div>Gen3: {modelCounts['Kanger1.0_Gen3']?.available || 0}</div>
            <div>CKD: {modelCounts['Kanger1.0_CKD']?.available || 0}</div>
            <div>FBU: {modelCounts['Kanger1.0_FBU']?.available || 0}</div>
          </div>
        </div>

        {/* Kanger 2.0 Unified Card */}
        <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-violet-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
              Kanger 2.0 Series
            </span>
            <span className="text-xs font-mono-code text-purple-200 font-bold">4-Digit & 5-Digit AIS</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code tracking-tight">{kanger2Unified.available}</p>
            <p className="text-xs text-purple-200 mt-0.5">Packs Available in Warehouse</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-purple-200 font-mono-code">
            <span>Standard (4 Digits): {modelCounts['Kanger2.0']?.available || 0}</span>
            <span>AIS (5 Digits): {modelCounts['Kanger2.0_Ais']?.available || 0}</span>
          </div>
        </div>

        {/* Limber Unified Card */}
        <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
              Limber Series
            </span>
            <span className="text-xs font-mono-code text-emerald-200 font-bold">AIS & Non-AIS</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code tracking-tight">
              {(modelCounts['Limber_Ais']?.available || 0) + (modelCounts['Limber_Non_Ais']?.available || 0)}
            </p>
            <p className="text-xs text-emerald-200 mt-0.5">Packs Available in Warehouse</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-emerald-200 font-mono-code">
            <span>Non-AIS (4 Digits): {modelCounts['Limber_Non_Ais']?.available || 0}</span>
            <span>AIS (5 Digits): {modelCounts['Limber_Ais']?.available || 0}</span>
          </div>
        </div>

        {/* Tamor & Other Models Card */}
        <div className="bg-gradient-to-br from-amber-900 via-orange-800 to-amber-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/10 px-2.5 py-0.5 rounded-full">
              Tamor / Nova / Other
            </span>
            <span className="text-xs font-mono-code text-amber-200 font-bold">Special Models</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code tracking-tight">
              {(modelCounts['Tamor_ELR']?.available || 0) + (modelCounts['Nova_LRP']?.available || 0) + (modelCounts['Challenger_LR']?.available || 0)}
            </p>
            <p className="text-xs text-amber-200 mt-0.5">Packs Available in Warehouse</p>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-amber-200 font-mono-code">
            <span>Tamor: {modelCounts['Tamor_ELR']?.available || 0}</span>
            <span>Nova: {modelCounts['Nova_LRP']?.available || 0}</span>
            <span>Chal: {modelCounts['Challenger_LR']?.available || 0}</span>
          </div>
        </div>
      </div>

      {/* Dual Search System Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm font-display">Targeted Battery Search & Stock Locator</h3>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveSearchTab('MODE_1')}
              className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' +
                (activeSearchTab === 'MODE_1'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              Search Mode 1 (Serial / Threshold)
            </button>
            <button
              type="button"
              onClick={() => setActiveSearchTab('MODE_2')}
              className={'px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ' +
                (activeSearchTab === 'MODE_2'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900')}
            >
              Search Mode 2 (Serial + Product Name)
            </button>
          </div>
        </div>

        {/* SEARCH MODE 1 FORM */}
        {activeSearchTab === 'MODE_1' && (
          <form onSubmit={handleExecuteSearch1} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search1PackNumber}
                  onChange={(e) => setSearch1PackNumber(e.target.value)}
                  placeholder="Enter pack serial (e.g. 7428) or threshold query (e.g. '>= 30000', '30000+')..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Search Inventory</span>
              </button>

              {hasExecutedSearch1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch1PackNumber('');
                    setHasExecutedSearch1(false);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {hasExecutedSearch1 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between">
                <span>Found {search1Results.length} matching pack(s) in warehouse.</span>
              </div>
            )}
          </form>
        )}

        {/* SEARCH MODE 2 FORM */}
        {activeSearchTab === 'MODE_2' && (
          <form onSubmit={handleExecuteSearch2} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search2PackNumber}
                  onChange={(e) => setSearch2PackNumber(e.target.value)}
                  placeholder="Enter pack serial (optional)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={search2ProductName}
                  onChange={(e) => setSearch2ProductName(e.target.value as BatteryPackType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  {ALL_PACK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                {hasExecutedSearch2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch2PackNumber('');
                      setHasExecutedSearch2(false);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Results Table (When search is active) or Full Inventory Master View */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            {hasExecutedSearch1
              ? 'Search 1 Results (' + search1Results.length + ' Packs)'
              : hasExecutedSearch2
              ? 'Search 2 Results (' + search2Results.length + ' Packs)'
              : 'Warehouse Master Inventory (' + availableStockPacks.length + ' Available Packs)'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-3">#</th>
                <th className="p-3">Pack Number</th>
                <th className="p-3">Product Model</th>
                <th className="p-3">Current Location</th>
                <th className="p-3">Document No</th>
                <th className="p-3">Inward Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {((hasExecutedSearch1 ? search1Results : hasExecutedSearch2 ? search2Results : availableStockPacks).slice(0, 100)).map((pack, index) => {
                const model = BATTERY_MODELS[pack.packType];
                const isDispatched = pack.status === 'DISPATCHED';

                return (
                  <tr key={pack.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono-code text-slate-400">{index + 1}</td>
                    <td className="p-3 font-mono-code font-extrabold text-slate-900 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span>#{pack.packNumber}</span>
                        {pack.isWithoutPlate && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold">
                            NO-PLATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {pack.packType}
                      </span>
                    </td>
                    <td className="p-3 font-mono-code font-bold text-indigo-700">
                      {pack.currentLocation || pack.locationArea || 'Inward Area'}
                    </td>
                    <td className="p-3 font-mono-code text-blue-700 font-bold">{pack.documentNo || '—'}</td>
                    <td className="p-3 font-mono-code text-slate-600">
                      {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-3">
                      {isDispatched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Dispatched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isDispatched && (
                          <button
                            type="button"
                            onClick={() => onSendToDispatch(pack)}
                            className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded text-[11px] font-bold cursor-pointer"
                          >
                            Dispatch
                          </button>
                        )}
                        {(isSuperAdmin || isManager) && (
                          <button
                            type="button"
                            onClick={() => handleDeletePackPrompt(pack)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete pack"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenPackDetails(pack)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
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
      </div>
    </div>
  );
};
