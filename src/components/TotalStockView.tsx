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
  Eye,
  Trash2,
  Tag,
  Calendar,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Table,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, DispatchLot } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';
import { OutwardDispatchRegister } from './OutwardDispatchRegister';

interface TotalStockViewProps {
  packs: BatteryPack[];
  dispatchLots?: DispatchLot[];
  onOpenPackDetails: (pack: BatteryPack) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
  onDeletePack?: (packId: string) => void;
  onEditPack?: (updatedPack: BatteryPack) => void;
}

export const TotalStockView: React.FC<TotalStockViewProps> = ({
  packs,
  dispatchLots = [],
  onOpenPackDetails,
  onSendToDispatch,
  onDeletePack,
  onEditPack,
}) => {
  const { isSuperAdmin, isManager } = useAuth();

  // Search Mode Tab: 'MODE_1' | 'MODE_2' | 'DISPATCH_SHEET'
  const [activeSearchTab, setActiveSearchTab] = useState<'MODE_1' | 'MODE_2' | 'DISPATCH_SHEET'>('MODE_1');

  // Search Mode 1: Search by Pack Number / Threshold across all product models
  const [search1PackNumber, setSearch1PackNumber] = useState('');
  const [hasExecutedSearch1, setHasExecutedSearch1] = useState(false);

  // Search Mode 2: Search by Pack Number + Product Name dropdown
  const [search2PackNumber, setSearch2PackNumber] = useState('');
  const [search2ProductName, setSearch2ProductName] = useState<BatteryPackType>('Kanger1.0_AIO');
  const [hasExecutedSearch2, setHasExecutedSearch2] = useState(false);

  // Today Date String
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // 1. Total Battery (Total active battery packs in plant)
  const totalBatteryCount = useMemo(() => {
    return packs.filter((p) => p.status !== 'DISPATCHED').length;
  }, [packs]);

  // 2. Today's Inward (Batteries inwarded today via dock receiving)
  const todayInwardCount = useMemo(() => {
    return packs.filter(
      (p) => p.sourceType !== 'LINE_POPULATE' && p.inwardDate && p.inwardDate.slice(0, 10) === todayStr
    ).length;
  }, [packs, todayStr]);

  // 3. Today's Outward (Batteries dispatched today)
  const todayOutwardCount = useMemo(() => {
    return packs.filter(
      (p) => p.status === 'DISPATCHED' && p.dispatchedAt && p.dispatchedAt.slice(0, 10) === todayStr
    ).length;
  }, [packs, todayStr]);

  // 4. Ready for Dispatch (Batteries staged in dispatch area)
  const readyForDispatchCount = useMemo(() => {
    return packs.filter((p) => p.status === 'IN_DISPATCH_AREA').length;
  }, [packs]);

  // Available in storage (excluding dispatched)
  const availableStockPacks = useMemo(() => {
    return packs.filter((p) => p.status !== 'DISPATCHED');
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

  // Unified Kanger 1.0 Series
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

  // Unified Kanger 2.0 Series
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

  // Unified Limber Series (Ais + Non-Ais Counted as 1)
  const limberUnified = useMemo(() => {
    const limberKeys: BatteryPackType[] = ['Limber_Ais', 'Limber_Non_Ais'];
    let available = 0;
    let dispatched = 0;
    let total = 0;
    limberKeys.forEach((k) => {
      const c = modelCounts[k] || { available: 0, dispatched: 0, total: 0 };
      available += c.available;
      dispatched += c.dispatched;
      total += c.total;
    });
    return { available, dispatched, total };
  }, [modelCounts]);

  // Search 1 Results (With Threshold Support)
  const search1Results = useMemo(() => {
    if (!hasExecutedSearch1 || !search1PackNumber.trim()) return [];
    const query = search1PackNumber.trim().toLowerCase();

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

  // Search 2 Results
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
    if (confirm(`Permanently delete Pack #${pack.packNumber} from warehouse inventory and database?`)) {
      if (onDeletePack) onDeletePack(pack.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              Total Stock
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Master Battery Inventory & Stock Locator
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete plant visibility across Inward Dock, Storage Lines, and Dispatch Area.
          </p>
        </div>
      </div>

      {/* EXACT 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Battery */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Battery</span>
            <Box className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold font-mono-code text-slate-900">
            {totalBatteryCount}
          </div>
          <p className="text-xs text-slate-500">
            Total active packs stored in warehouse
          </p>
        </div>

        {/* Card 2: Today's Inward */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Today's Inward</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold font-mono-code text-emerald-700">
            {todayInwardCount}
          </div>
          <p className="text-xs text-slate-500">
            Packs received into dock today
          </p>
        </div>

        {/* Card 3: Today's Outward */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-orange-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Today's Outward</span>
            <ArrowUpRight className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-3xl font-extrabold font-mono-code text-orange-700">
            {todayOutwardCount}
          </div>
          <p className="text-xs text-slate-500">
            Packs dispatched to EV plants today
          </p>
        </div>

        {/* Card 4: Ready for Dispatch */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-purple-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Ready for Dispatch</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold font-mono-code text-purple-700">
            {readyForDispatchCount}
          </div>
          <p className="text-xs text-slate-500">
            Packs staged in dispatch staging cart
          </p>
        </div>
      </div>

      {/* Complete Plant Location Distribution Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 font-display">Plant Inventory Distribution:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono-code font-bold">
          <div className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>In Storage Lines: {packs.filter((p) => p.status === 'IN_STORAGE').length}</span>
          </div>
          <div className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>In Inward Dock: {packs.filter((p) => p.status === 'INWARD_AREA').length}</span>
          </div>
          <div className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span>Staged in Dispatch: {packs.filter((p) => p.status === 'IN_DISPATCH_AREA').length}</span>
          </div>
          <div className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Dispatched: {packs.filter((p) => p.status === 'DISPATCHED').length}</span>
          </div>
        </div>
      </div>

      {/* Unified Executive Series Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kanger 1.0 Unified Card (AIO, Gen3, CKD, FBU) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Kanger 1.0 Series
            </span>
            <span className="text-[11px] font-mono-code text-slate-500">AIO / Gen3 / CKD / FBU</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code text-slate-900">{kanger1Unified.available}</p>
            <p className="text-xs text-slate-500 mt-0.5">Available in Plant</p>
          </div>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1 text-[10px] text-slate-600 font-mono-code">
            <div>AIO: {(modelCounts['Kanger1.0_AIO']?.available || 0) + (modelCounts['Kanger1.0_AIO_Ais']?.available || 0)}</div>
            <div>Gen3: {(modelCounts['Kanger1.0_Gen3']?.available || 0) + (modelCounts['Kanger1.0_Gen3_Ais']?.available || 0)}</div>
            <div>CKD: {(modelCounts['Kanger1.0_CKD']?.available || 0) + (modelCounts['Kanger1.0_CKD_Ais']?.available || 0)}</div>
            <div>FBU: {(modelCounts['Kanger1.0_FBU']?.available || 0) + (modelCounts['Kanger1.0_FBU_Ais']?.available || 0)}</div>
          </div>
        </div>

        {/* Kanger 2.0 Unified Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Kanger 2.0 Series
            </span>
            <span className="text-[11px] font-mono-code text-slate-500">Kanger 2.0 Model</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code text-slate-900">{kanger2Unified.available}</p>
            <p className="text-xs text-slate-500 mt-0.5">Available in Plant</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-mono-code">
            <span>Total Kanger 2.0: {kanger2Unified.available}</span>
            <span>Dispatched: {kanger2Unified.dispatched}</span>
          </div>
        </div>

        {/* Limber Unified Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Limber Series
            </span>
            <span className="text-[11px] font-mono-code text-slate-500">Limber Standard Model</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code text-slate-900">{limberUnified.available}</p>
            <p className="text-xs text-slate-500 mt-0.5">Available in Plant</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-mono-code">
            <span>Total Limber: {limberUnified.available}</span>
            <span>Dispatched: {limberUnified.dispatched}</span>
          </div>
        </div>

        {/* Tamor & Other Models Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3 hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Other Series
            </span>
            <span className="text-[11px] font-mono-code text-slate-500">Tamor & Nova</span>
          </div>
          <div>
            <p className="text-3xl font-extrabold font-mono-code text-slate-900">
              {(modelCounts['Tamor_ELR']?.available || 0) + (modelCounts['Nova_LRP']?.available || 0) + (modelCounts['Challenger_LR']?.available || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Available in Plant</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600 font-mono-code">
            <span>Tamor: {modelCounts['Tamor_ELR']?.available || 0}</span>
            <span>Nova: {modelCounts['Nova_LRP']?.available || 0}</span>
          </div>
        </div>
      </div>

      {/* Dual Search & Outward Sheet Tab Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm font-display">Targeted Battery Search & Stock Locator</h3>
          </div>

          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveSearchTab('MODE_1')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activeSearchTab === 'MODE_1'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode 1 (Search by Serial)
            </button>
            <button
              type="button"
              onClick={() => setActiveSearchTab('MODE_2')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                activeSearchTab === 'MODE_2'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode 2 (Serial + Product)
            </button>
            <button
              type="button"
              onClick={() => setActiveSearchTab('DISPATCH_SHEET')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                activeSearchTab === 'DISPATCH_SHEET'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Outward Dispatch Sheet ({packs.filter((p) => p.status === 'DISPATCHED').length})</span>
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
                  placeholder="Enter pack serial number (e.g. 7428, 2191)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
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
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {hasExecutedSearch1 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-bold flex items-center justify-between">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={search2ProductName}
                  onChange={(e) => setSearch2ProductName(e.target.value as BatteryPackType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
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
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
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

      {/* DISPATCH SHEET VIEW OR MASTER INVENTORY TABLE */}
      {activeSearchTab === 'DISPATCH_SHEET' ? (
        <OutwardDispatchRegister packs={packs} dispatchLots={dispatchLots} onEditPack={onEditPack} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {hasExecutedSearch1
                ? `Search 1 Results (${search1Results.length} Packs)`
                : hasExecutedSearch2
                ? `Search 2 Results (${search2Results.length} Packs)`
                : `Warehouse Master Inventory (${availableStockPacks.length} Available Packs)`}
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
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-code font-extrabold text-slate-900 text-sm">
                              #{pack.packNumber}
                            </span>
                            {pack.isWithoutPlate && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold">
                                NO-PLATE
                              </span>
                            )}
                            {pack.isDifferentSerial && (
                              <span
                                className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-300 text-[9px] font-bold"
                                title={`Challan Doc Serial: #${pack.challanPackNumber || '—'}${pack.mismatchReason ? ` (${pack.mismatchReason})` : ''}`}
                              >
                                ⚠️ DIFF-NO
                              </span>
                            )}
                          </div>
                          {pack.isDifferentSerial && pack.challanPackNumber && (
                            <div className="text-[10px] text-purple-700 font-medium font-mono-code">
                              Challan: #{pack.challanPackNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {pack.packType}
                        </span>
                      </td>
                      <td className="p-3 font-mono-code font-bold text-blue-700">
                        {pack.currentLocation || pack.locationArea || 'Inward Area'}
                      </td>
                      <td className="p-3 font-mono-code text-slate-700 font-bold">{pack.documentNo || '—'}</td>
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
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold cursor-pointer"
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
      )}
    </div>
  );
};
