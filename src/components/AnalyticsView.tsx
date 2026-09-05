import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  Truck,
  TrendingUp,
  Box,
  CheckCircle2,
  RefreshCw,
  Table,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Building,
  Activity,
  Filter,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, DispatchLot, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS } from '../data/batteryCatalog';
import { OutwardDispatchRegister } from './OutwardDispatchRegister';

interface AnalyticsViewProps {
  packs?: BatteryPack[];
  dispatchLots?: DispatchLot[];
  inwardShipments?: InwardShipmentRecord[];
  warehouseLines?: string[];
  onEditPack?: (updatedPack: BatteryPack) => void;
  onResetToDemoData?: () => void;
}

type TimeWindowFilter = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'SPECIFIC_DATE' | 'CUSTOM_RANGE' | 'ALL_TIME';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  packs = [],
  dispatchLots = [],
  inwardShipments = [],
  warehouseLines = [],
  onEditPack,
  onResetToDemoData,
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS_DASHBOARD' | 'DISPATCH_LEDGER'>('ANALYTICS_DASHBOARD');

  // Time Window Filter State
  const [timeFilter, setTimeFilter] = useState<TimeWindowFilter>('TODAY');
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Helper: check if a date string falls inside the chosen time window
  const isDateInSelectedWindow = useMemo(() => {
    const now = new Date();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;

    return (isoDateStr?: string) => {
      if (!isoDateStr) return false;
      const datePart = isoDateStr.slice(0, 10);

      if (timeFilter === 'ALL_TIME') return true;
      if (timeFilter === 'TODAY') return datePart === todayStr;
      if (timeFilter === 'YESTERDAY') return datePart === yesterdayStr;
      if (timeFilter === 'SPECIFIC_DATE') return specificDate ? datePart === specificDate : true;

      const time = new Date(isoDateStr).getTime();
      if (isNaN(time)) return false;

      if (timeFilter === 'THIS_WEEK') {
        return now.getTime() - time <= ms7Days;
      }
      if (timeFilter === 'THIS_MONTH') {
        return now.getTime() - time <= ms30Days;
      }
      if (timeFilter === 'CUSTOM_RANGE') {
        if (customStartDate && datePart < customStartDate) return false;
        if (customEndDate && datePart > customEndDate) return false;
        return true;
      }
      return true;
    };
  }, [timeFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // Filtered Activities for Selected Time Window
  const periodInwardPacks = useMemo(() => {
    return packs.filter((p) => isDateInSelectedWindow(p.inwardDate));
  }, [packs, isDateInSelectedWindow]);

  const periodDispatchedPacks = useMemo(() => {
    return packs.filter((p) => p.status === 'DISPATCHED' && isDateInSelectedWindow(p.dispatchedAt));
  }, [packs, isDateInSelectedWindow]);

  const periodInwardShipments = useMemo(() => {
    return inwardShipments.filter((s) => isDateInSelectedWindow(s.timestamp));
  }, [inwardShipments, isDateInSelectedWindow]);

  const periodDispatchLots = useMemo(() => {
    return dispatchLots.filter((l) => isDateInSelectedWindow(l.timestamp));
  }, [dispatchLots, isDateInSelectedWindow]);

  const periodDiscrepancyPacks = useMemo(() => {
    return periodInwardPacks.filter((p) => p.isDifferentSerial);
  }, [periodInwardPacks]);

  // Overall Stock Stats (Current Live Warehouse State)
  const activeStoragePacks = useMemo(() => packs.filter((p) => p.status === 'IN_STORAGE' || p.status === 'INWARD_AREA'), [packs]);
  const allDispatchedPacks = useMemo(() => packs.filter((p) => p.status === 'DISPATCHED'), [packs]);

  const totalLineCapacity = warehouseLines.length * 160;
  const utilizationPercent = totalLineCapacity > 0
    ? Math.round((activeStoragePacks.length / totalLineCapacity) * 100)
    : 0;

  // Unified standard models list for analytics
  const STANDARD_ANALYTICS_MODELS: { typeKey: BatteryPackType; displayName: string; matchKeys: BatteryPackType[] }[] = [
    { typeKey: 'Kanger1.0_AIO', displayName: 'Kanger1.0_AIO', matchKeys: ['Kanger1.0_AIO', 'Kanger1.0_AIO_Ais'] },
    { typeKey: 'Kanger1.0_Gen3', displayName: 'Kanger1.0_Gen3', matchKeys: ['Kanger1.0_Gen3', 'Kanger1.0_Gen3_Ais'] },
    { typeKey: 'Kanger1.0_CKD', displayName: 'Kanger1.0_CKD', matchKeys: ['Kanger1.0_CKD', 'Kanger1.0_CKD_Ais'] },
    { typeKey: 'Kanger1.0_FBU', displayName: 'Kanger1.0_FBU', matchKeys: ['Kanger1.0_FBU', 'Kanger1.0_FBU_Ais'] },
    { typeKey: 'Kanger2.0', displayName: 'Kanger2.0', matchKeys: ['Kanger2.0', 'Kanger2.0_Ais'] },
    { typeKey: 'Kanger3.0', displayName: 'Kanger3.0', matchKeys: ['Kanger3.0'] },
    { typeKey: 'Limber_Non_Ais', displayName: 'Limber', matchKeys: ['Limber_Non_Ais', 'Limber_Ais'] },
    { typeKey: 'Tamor_ELR', displayName: 'Tamor_ELR', matchKeys: ['Tamor_ELR'] },
    { typeKey: 'Nova_LRP', displayName: 'Nova_LRP', matchKeys: ['Nova_LRP'] },
    { typeKey: 'Challenger_LR', displayName: 'Challenger_LR', matchKeys: ['Challenger_LR'] },
    { typeKey: 'Challenger_MR', displayName: 'Challenger_MR', matchKeys: ['Challenger_MR'] },
  ];

  // Model-wise Activity in Selected Window (Inward vs Dispatched)
  const modelActivityStats = useMemo(() => {
    return STANDARD_ANALYTICS_MODELS.map((item) => {
      const inwardCount = periodInwardPacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const dispatchCount = periodDispatchedPacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const inStockCount = activeStoragePacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const model = BATTERY_MODELS[item.typeKey];

      return {
        type: item.displayName,
        inwardCount,
        dispatchCount,
        inStockCount,
        color: model?.color || '#2563eb',
      };
    });
  }, [periodInwardPacks, periodDispatchedPacks, activeStoragePacks]);

  // Combined Chronological Activity Feed in Selected Window
  const activityTimeline = useMemo(() => {
    const events: {
      id: string;
      timestamp: string;
      type: 'INWARD' | 'DISPATCH' | 'DISCREPANCY';
      title: string;
      description: string;
      count: number;
      actor: string;
    }[] = [];

    // Inward Shipments
    periodInwardShipments.forEach((s) => {
      events.push({
        id: s.id,
        timestamp: s.timestamp,
        type: 'INWARD',
        title: `Inward Receipt (Doc #${s.documentNo})`,
        description: `Source: ${s.dealershipName} • ${s.receivedState || 'Plant'} • Transporter: ${s.transportName}`,
        count: s.packCount,
        actor: s.inwardBy || 'Receiving Dock Lead',
      });
    });

    // Dispatch Lots
    periodDispatchLots.forEach((l) => {
      events.push({
        id: l.id,
        timestamp: l.timestamp,
        type: 'DISPATCH',
        title: `Outward Dispatch (Lot #${l.lotNumber})`,
        description: `Consignee: ${l.consigneeName} • Vehicle: ${l.vehicleNumber} • LR: ${l.lrNumber}`,
        count: l.packCount,
        actor: l.dispatchedBy || 'Dispatch Supervisor',
      });
    });

    // Discrepancies
    periodDiscrepancyPacks.forEach((p) => {
      events.push({
        id: `disc-${p.id}`,
        timestamp: p.inwardDate || new Date().toISOString(),
        type: 'DISCREPANCY',
        title: `⚠️ Serial Discrepancy (Pack #${p.packNumber})`,
        description: `Challan Doc Serial: #${p.challanPackNumber || '—'} ${p.mismatchReason ? `(${p.mismatchReason})` : ''} • Doc #${p.documentNo}`,
        count: 1,
        actor: p.inwardBy || 'Staff Auditor',
      });
    });

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return events;
  }, [periodInwardShipments, periodDispatchLots, periodDiscrepancyPacks]);

  // Time Filter Label
  const timeFilterTitle = useMemo(() => {
    if (timeFilter === 'TODAY') return "Today's Activity";
    if (timeFilter === 'YESTERDAY') return "Yesterday's Activity";
    if (timeFilter === 'THIS_WEEK') return "Last 7 Days Activity";
    if (timeFilter === 'THIS_MONTH') return "Last 30 Days Activity";
    if (timeFilter === 'SPECIFIC_DATE') return `Activity on ${specificDate}`;
    if (timeFilter === 'CUSTOM_RANGE') return `Activity from ${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    return "All-Time Lifetime Activity";
  }, [timeFilter, specificDate, customStartDate, customEndDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Warehouse Operations & Telemetry
              </span>
              <span className="text-xs text-slate-500 font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Warehouse Analytics & Real-Time Activity Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live tracking of Inward Receipts, Outward Dispatches, Serial Discrepancies, and Rack Capacity.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('ANALYTICS_DASHBOARD')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ANALYTICS_DASHBOARD'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('DISPATCH_LEDGER')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DISPATCH_LEDGER'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Dispatch Sheet ({allDispatchedPacks.length})
            </button>
          </div>
        </div>

        {/* Global Time-Slice Date Toolbar */}
        {activeTab === 'ANALYTICS_DASHBOARD' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Time Slicing:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTimeFilter('TODAY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'TODAY'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('YESTERDAY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'YESTERDAY'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('THIS_WEEK')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'THIS_WEEK'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('THIS_MONTH')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'THIS_MONTH'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('SPECIFIC_DATE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                    timeFilter === 'SPECIFIC_DATE'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>Specific Date</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('CUSTOM_RANGE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'CUSTOM_RANGE'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Date Range
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('ALL_TIME')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    timeFilter === 'ALL_TIME'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Sub-selectors for Specific Date & Custom Range */}
            {timeFilter === 'SPECIFIC_DATE' && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 animate-fadeIn">
                <span className="font-bold text-blue-900">Choose Date:</span>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900"
                />
              </div>
            )}

            {timeFilter === 'CUSTOM_RANGE' && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 animate-fadeIn">
                <span className="font-bold text-slate-700">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900"
                />
                <span className="text-slate-400 font-bold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: DASHBOARD & ACTIVITY ENGINE */}
      {activeTab === 'ANALYTICS_DASHBOARD' && (
        <div className="space-y-6">
          {/* Header Banner with Active Time Filter Label */}
          <div className="flex items-center justify-between bg-blue-50/50 border border-blue-200/80 px-4 py-2.5 rounded-xl text-xs">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Telemetry Focus: <strong>{timeFilterTitle}</strong></span>
            </span>
            <span className="text-[11px] font-mono-code text-blue-800">
              Net Change: <strong className={periodInwardPacks.length >= periodDispatchedPacks.length ? 'text-emerald-700' : 'text-rose-700'}>
                {periodInwardPacks.length >= periodDispatchedPacks.length ? '+' : ''}{periodInwardPacks.length - periodDispatchedPacks.length} Packs
              </strong>
            </span>
          </div>

          {/* Dynamic Period KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inward Activity Card */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-blue-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Inward Operations</span>
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-blue-700">
                {periodInwardPacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Packs</span>
              </div>
              <p className="text-xs text-slate-500">
                Across {periodInwardShipments.length} Challan Documents
              </p>
            </div>

            {/* Outward Dispatch Card */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Outward Dispatches</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-emerald-700">
                {periodDispatchedPacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Packs</span>
              </div>
              <p className="text-xs text-slate-500">
                Organized into {periodDispatchLots.length} Gate Pass Lots
              </p>
            </div>

            {/* Discrepancies / Diff-No Card */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-purple-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Serial Discrepancies</span>
                <AlertCircle className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-purple-700">
                {periodDiscrepancyPacks.length} <span className="text-xs text-slate-500 font-sans">Flags</span>
              </div>
              <p className="text-xs text-slate-500">
                Physical serial ≠ Challan document serial
              </p>
            </div>

            {/* Live Plant In-Stock & Utilization */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs space-y-2 hover:border-indigo-300 transition">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Current Plant Stock</span>
                <Box className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-indigo-700">
                {activeStoragePacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Units</span>
              </div>
              <p className="text-xs text-slate-500">
                {utilizationPercent}% Plant Capacity ({warehouseLines.length} Lines)
              </p>
            </div>
          </div>

          {/* Model Activity Matrix (Inward vs Dispatched in Selected Window) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Model-Wise Activity Matrix ({timeFilterTitle})
                </h3>
                <p className="text-xs text-slate-500">
                  Direct comparison of inward incoming vs outward dispatch volumes by battery series.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Inwarded
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Dispatched
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" /> In Stock
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {modelActivityStats.map((item) => (
                <div
                  key={item.type}
                  className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{item.type}</span>
                    </div>
                    <span className="font-mono-code font-bold text-xs text-slate-900">
                      Stock: {item.inStockCount}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px] font-mono-code">
                    <div className="bg-blue-50/70 p-1.5 rounded border border-blue-200/60 text-blue-900">
                      <span className="text-[9px] text-blue-600 uppercase font-bold block">Inward</span>
                      <strong className="text-xs font-extrabold">{item.inwardCount}</strong>
                    </div>
                    <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-200/60 text-emerald-900">
                      <span className="text-[9px] text-emerald-600 uppercase font-bold block">Dispatched</span>
                      <strong className="text-xs font-extrabold">{item.dispatchCount}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Activity Timeline Feed for the Selected Window */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Chronological Operations Stream ({activityTimeline.length} Events in {timeFilterTitle})
                </h3>
                <p className="text-xs text-slate-500">
                  Complete audit trail of inward receiving, gate pass dispatches, and discrepancy alerts.
                </p>
              </div>
            </div>

            {activityTimeline.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No activity recorded for the selected time period ({timeFilterTitle}).
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {activityTimeline.map((ev) => (
                  <div key={ev.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        ev.type === 'INWARD'
                          ? 'bg-blue-100 text-blue-700'
                          : ev.type === 'DISPATCH'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {ev.type === 'INWARD' && <ArrowDownLeft className="w-4 h-4" />}
                        {ev.type === 'DISPATCH' && <Truck className="w-4 h-4" />}
                        {ev.type === 'DISCREPANCY' && <AlertCircle className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{ev.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono-code bg-slate-100 text-slate-700">
                            {ev.count} {ev.count === 1 ? 'Pack' : 'Packs'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{ev.description}</p>
                        <span className="text-[10px] text-slate-400 font-mono-code">
                          Action By: <strong>{ev.actor}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono-code text-[11px] text-slate-500">
                      <div>{new Date(ev.timestamp).toLocaleDateString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400">{new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Lines Capacity Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Warehouse Line Occupancy Heatmap (Racks 1 to 40 per Line)
              </h3>
              <span className="text-xs text-slate-500 font-mono-code">Total capacity: 160 packs per line (4 packs/rack)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
              {warehouseLines.slice(0, 30).map((line) => {
                const count = activeStoragePacks.filter((p) => p.lineId === line).length;
                const percent = Math.round((count / 160) * 100);

                return (
                  <div
                    key={line}
                    className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center space-y-1 hover:border-blue-400 transition"
                  >
                    <div className="text-xs font-mono-code font-bold text-slate-800">Line {line}</div>
                    <div className="text-xs font-mono-code font-bold text-blue-700">{count} packs</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono-code">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OUTWARD DISPATCH REGISTER */}
      {activeTab === 'DISPATCH_LEDGER' && (
        <OutwardDispatchRegister packs={packs} dispatchLots={dispatchLots} onEditPack={onEditPack} />
      )}
    </div>
  );
};

