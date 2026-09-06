import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Layers,
  Truck,
  TrendingUp,
  Box,
  CheckCircle2,
  Table,
  Calendar,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Building,
  Activity,
  Filter,
  Search,
  Printer,
  ChevronRight,
  Pencil,
  MapPin,
  Tag,
  ShieldCheck,
  User,
  History,
  X,
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
}) => {
  // Main view mode: Analytics Dashboard vs Outward Dispatch Register
  const [activeMainTab, setActiveMainTab] = useState<'ANALYTICS_DASHBOARD' | 'DISPATCH_LEDGER'>('ANALYTICS_DASHBOARD');

  // Sub-tab inside Analytics Dashboard for detailed inspection
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'OVERVIEW' | 'INWARD_PACKS' | 'DISPATCHED_PACKS' | 'TIMELINE'>('OVERVIEW');

  // Time Window Filter State
  const [timeFilter, setTimeFilter] = useState<TimeWindowFilter>('TODAY');
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Instant Pack Traceability Search Query
  const [tracePackQuery, setTracePackQuery] = useState('');
  const [selectedPackForAudit, setSelectedPackForAudit] = useState<BatteryPack | null>(null);

  // Edit Pack Modal State (for quick edits directly from Analytics tables)
  const [editingPack, setEditingPack] = useState<BatteryPack | null>(null);
  const [editForm, setEditForm] = useState<{
    packNumber: string;
    packType: BatteryPackType;
    dispatchDate: string;
    dispatchDocNo: string;
    dispatchLrNo: string;
    dispatchTransporter: string;
    dispatchVehicleNo: string;
    dispatchToCustomer: string;
    dispatchToAddress: string;
    notes: string;
  }>({
    packNumber: '',
    packType: 'Kanger1.0_AIO',
    dispatchDate: '',
    dispatchDocNo: '',
    dispatchLrNo: '',
    dispatchTransporter: '',
    dispatchVehicleNo: '',
    dispatchToCustomer: '',
    dispatchToAddress: '',
    notes: '',
  });

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
    { typeKey: 'Kanger1.0_AIO', displayName: 'Kanger 1.0 AIO', matchKeys: ['Kanger1.0_AIO', 'Kanger1.0_AIO_Ais'] },
    { typeKey: 'Kanger1.0_Gen3', displayName: 'Kanger 1.0 Gen3', matchKeys: ['Kanger1.0_Gen3', 'Kanger1.0_Gen3_Ais'] },
    { typeKey: 'Kanger1.0_CKD', displayName: 'Kanger 1.0 CKD', matchKeys: ['Kanger1.0_CKD', 'Kanger1.0_CKD_Ais'] },
    { typeKey: 'Kanger1.0_FBU', displayName: 'Kanger 1.0 FBU', matchKeys: ['Kanger1.0_FBU', 'Kanger1.0_FBU_Ais'] },
    { typeKey: 'Kanger2.0', displayName: 'Kanger 2.0', matchKeys: ['Kanger2.0', 'Kanger2.0_Ais'] },
    { typeKey: 'Kanger3.0', displayName: 'Kanger 3.0', matchKeys: ['Kanger3.0'] },
    { typeKey: 'Limber_Ais', displayName: 'Limber_Ais', matchKeys: ['Limber_Ais', 'Limber_Non_Ais'] },
    { typeKey: 'Tamor_ELR', displayName: 'Tamor ELR', matchKeys: ['Tamor_ELR'] },
    { typeKey: 'Nova_LRP', displayName: 'Nova LRP', matchKeys: ['Nova_LRP'] },
    { typeKey: 'Challenger_LR', displayName: 'Challenger LR', matchKeys: ['Challenger_LR'] },
    { typeKey: 'Challenger_MR', displayName: 'Challenger MR', matchKeys: ['Challenger_MR'] },
  ];

  // Model-wise Activity in Selected Window (Inward vs Dispatched vs In Stock)
  const modelActivityStats = useMemo(() => {
    return STANDARD_ANALYTICS_MODELS.map((item) => {
      const inwardCount = periodInwardPacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const dispatchCount = periodDispatchedPacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const inStockCount = activeStoragePacks.filter((p) => item.matchKeys.includes(p.packType)).length;
      const model = BATTERY_MODELS[item.typeKey];

      return {
        type: item.displayName,
        typeKey: item.typeKey,
        inwardCount,
        dispatchCount,
        inStockCount,
        netChange: inwardCount - dispatchCount,
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

  // Search Results for Instant Traceability Audit
  const traceSearchResults = useMemo(() => {
    if (!tracePackQuery.trim()) return [];
    const q = tracePackQuery.toLowerCase().trim();
    return packs.filter((p) =>
      p.packNumber.toLowerCase().includes(q) ||
      p.documentNo?.toLowerCase().includes(q) ||
      p.dispatchDocNo?.toLowerCase().includes(q) ||
      p.dispatchLrNo?.toLowerCase().includes(q) ||
      p.dispatchToCustomer?.toLowerCase().includes(q) ||
      p.dealershipName?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [packs, tracePackQuery]);

  // Time Filter Label
  const timeFilterTitle = useMemo(() => {
    if (timeFilter === 'TODAY') return "Today's Activity (" + todayStr + ")";
    if (timeFilter === 'YESTERDAY') return "Yesterday's Activity (" + yesterdayStr + ")";
    if (timeFilter === 'THIS_WEEK') return "Last 7 Days Operations";
    if (timeFilter === 'THIS_MONTH') return "Last 30 Days Operations";
    if (timeFilter === 'SPECIFIC_DATE') return `Activity on Date: ${specificDate}`;
    if (timeFilter === 'CUSTOM_RANGE') return `Activity Period: ${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
    return "All-Time Warehouse History";
  }, [timeFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // Open Edit Modal for a Dispatched Pack
  const handleOpenEdit = (pack: BatteryPack) => {
    setEditingPack(pack);
    setEditForm({
      packNumber: pack.packNumber,
      packType: pack.packType,
      dispatchDate: pack.dispatchedAt ? pack.dispatchedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      dispatchDocNo: pack.dispatchDocNo || '',
      dispatchLrNo: pack.dispatchLrNo || '',
      dispatchTransporter: pack.dispatchTransporter || pack.transportName || 'Maitri Transport',
      dispatchVehicleNo: pack.dispatchVehicleNo || '',
      dispatchToCustomer: pack.dispatchToCustomer || '',
      dispatchToAddress: pack.dispatchToAddress || '',
      notes: pack.notes || '',
    });
  };

  const handleSaveEditPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPack || !onEditPack) return;

    const finalIso = editForm.dispatchDate
      ? new Date(editForm.dispatchDate + 'T12:00:00.000Z').toISOString()
      : editingPack.dispatchedAt || new Date().toISOString();

    const updated: BatteryPack = {
      ...editingPack,
      packNumber: editForm.packNumber.trim(),
      packType: editForm.packType,
      dispatchedAt: finalIso,
      dispatchDocNo: editForm.dispatchDocNo.trim(),
      dispatchLrNo: editForm.dispatchLrNo.trim(),
      dispatchTransporter: editForm.dispatchTransporter.trim(),
      dispatchVehicleNo: editForm.dispatchVehicleNo.trim(),
      dispatchToCustomer: editForm.dispatchToCustomer.trim(),
      dispatchToAddress: editForm.dispatchToAddress.trim(),
      notes: editForm.notes.trim(),
    };

    onEditPack(updated);
    setEditingPack(null);
  };

  // Trigger Print for Daily Meeting
  const handlePrintDailyReport = () => {
    window.print();
  };

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
              <span className="text-xs text-slate-500 font-medium font-mono-code">Tata AutoComp Systems (Varale B300 Plant)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Daily Operations Report & Analytics Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live date-wise tracking of Inward Receipts, Outward Dispatches, Model Matrices, and Pack-by-Pack Traceability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDailyReport}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
              title="Print Daily Meeting Summary"
            >
              <Printer className="w-3.5 h-3.5" /> Print Meeting Report
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveMainTab('ANALYTICS_DASHBOARD')}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === 'ANALYTICS_DASHBOARD'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Meeting Dashboard
              </button>
              <button
                onClick={() => setActiveMainTab('DISPATCH_LEDGER')}
                className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMainTab === 'DISPATCH_LEDGER'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Dispatch Sheet ({allDispatchedPacks.length})
              </button>
            </div>
          </div>
        </div>

        {/* Global Time-Slice Date Toolbar */}
        {activeMainTab === 'ANALYTICS_DASHBOARD' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Date Focus:
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
                  <span>Choose Specific Date</span>
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
                <span className="font-bold text-blue-900">Select Date:</span>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900 focus:outline-none"
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
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-mono-code font-bold text-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: DASHBOARD & MEETING REPORT */}
      {activeMainTab === 'ANALYTICS_DASHBOARD' && (
        <div className="space-y-6">
          {/* Quick Pack Traceability / Where-is-Pack Audit Bar */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-white font-display">
                  <Search className="w-4 h-4 text-blue-400" />
                  Instant Battery Pack Audit & Where-is-Pack Locator
                </h3>
                <p className="text-xs text-slate-300">
                  Search any pack number (e.g. 1863, 2195, 13148) to see if it is in warehouse storage or dispatched, with full history.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={tracePackQuery}
                  onChange={(e) => setTracePackQuery(e.target.value)}
                  placeholder="Enter physical pack serial #..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-mono-code font-bold text-white placeholder:text-slate-400 focus:bg-white focus:text-slate-900 focus:outline-none transition"
                />
                {tracePackQuery && (
                  <button
                    onClick={() => { setTracePackQuery(''); setSelectedPackForAudit(null); }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Trace Search Results Dropdown / Cards */}
            {tracePackQuery.trim() && (
              <div className="bg-white text-slate-900 rounded-xl p-4 shadow-xl border border-slate-200 animate-fadeIn space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Search Results ({traceSearchResults.length} match{traceSearchResults.length === 1 ? '' : 'es'}):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-code">Select a pack to inspect full history</span>
                </div>

                {traceSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-rose-600 font-bold bg-rose-50 rounded-lg">
                    No battery pack found matching serial "#{tracePackQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {traceSearchResults.map((pack) => (
                      <div
                        key={pack.id}
                        onClick={() => setSelectedPackForAudit(pack)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 text-xs ${
                          selectedPackForAudit?.id === pack.id
                            ? 'bg-blue-50/80 border-blue-500 shadow-2xs'
                            : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-code font-bold text-sm text-slate-900">
                              #{pack.packNumber}
                            </span>
                            <span className="px-2 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">
                              {pack.packType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Location: <strong>{pack.currentLocation || pack.locationArea || 'Warehouse'}</strong>
                          </p>
                        </div>

                        <div>
                          {pack.status === 'DISPATCHED' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <Truck className="w-3 h-3" /> DISPATCHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center gap-1">
                              <Box className="w-3 h-3" /> IN STORAGE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detailed Audit Card for Selected Pack */}
            {selectedPackForAudit && (
              <div className="bg-slate-900/90 border border-blue-400/40 rounded-xl p-4 text-xs space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono-code text-blue-400">
                      Audit Card: Pack #{selectedPackForAudit.packNumber} ({selectedPackForAudit.packType})
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedPackForAudit.status === 'DISPATCHED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {selectedPackForAudit.status === 'DISPATCHED' ? 'DISPATCHED TO EV PLANT' : 'ACTIVE IN WAREHOUSE STORAGE'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPackForAudit(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono-code text-[11px]">
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">Inward Receiving</span>
                    <strong className="text-white">{selectedPackForAudit.inwardDate ? new Date(selectedPackForAudit.inwardDate).toLocaleDateString('en-IN') : 'Direct Matrix'}</strong>
                    <div className="text-slate-300 text-[10px] truncate">Doc: {selectedPackForAudit.documentNo || '—'}</div>
                    <div className="text-slate-400 text-[9px] truncate">From: {selectedPackForAudit.dealershipName || '—'}</div>
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">Current Storage Coords</span>
                    <strong className="text-blue-300">
                      {selectedPackForAudit.lineId ? `Line ${selectedPackForAudit.lineId} • Rack ${selectedPackForAudit.rackNumber || '—'}` : (selectedPackForAudit.locationArea || 'Inward Area')}
                    </strong>
                    <div className="text-slate-300 text-[10px]">Slot: {selectedPackForAudit.rackSlot || '—'}</div>
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">Dispatch Status</span>
                    {selectedPackForAudit.status === 'DISPATCHED' ? (
                      <div>
                        <strong className="text-emerald-300">
                          {selectedPackForAudit.dispatchedAt ? new Date(selectedPackForAudit.dispatchedAt).toLocaleDateString('en-IN') : 'Dispatched'}
                        </strong>
                        <div className="text-slate-300 text-[10px] truncate">Document No: {selectedPackForAudit.dispatchDocNo || '—'}</div>
                        <div className="text-slate-400 text-[9px] truncate">Veh: {selectedPackForAudit.dispatchVehicleNo || '—'} • LR: {selectedPackForAudit.dispatchLrNo || '—'}</div>
                      </div>
                    ) : (
                      <strong className="text-amber-300">Not Dispatched Yet</strong>
                    )}
                  </div>

                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-slate-400 text-[10px] block">Consignee Destination</span>
                    <strong className="text-white truncate block">{selectedPackForAudit.dispatchToCustomer || selectedPackForAudit.currentLocation || 'Plant Stock'}</strong>
                    <div className="text-slate-400 text-[9px] truncate">{selectedPackForAudit.dispatchToAddress || 'In Varale Warehouse'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Meeting Summary Focus Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/70 border border-blue-200 px-5 py-3 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-700" />
              <span className="font-bold text-blue-950 text-sm">
                Executive Meeting Focus: <span className="text-blue-700">{timeFilterTitle}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono-code font-bold">
              <span className="text-blue-800">
                Inwarded: <span className="text-blue-900 bg-blue-100 px-2 py-0.5 rounded">{periodInwardPacks.length}</span>
              </span>
              <span className="text-emerald-800">
                Dispatched: <span className="text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">{periodDispatchedPacks.length}</span>
              </span>
              <span className="text-slate-700">
                Net Delta: <span className={`px-2 py-0.5 rounded ${
                  periodInwardPacks.length >= periodDispatchedPacks.length ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {periodInwardPacks.length >= periodDispatchedPacks.length ? '+' : ''}{periodInwardPacks.length - periodDispatchedPacks.length}
                </span>
              </span>
            </div>
          </div>

          {/* Dynamic Period KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Inward Activity Card */}
            <div
              onClick={() => {
                setAnalyticsSubTab('INWARD_PACKS');
                setTimeout(() => {
                  document.getElementById('analytics-inspection-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-xl shadow-2xs space-y-2 cursor-pointer transition"
            >
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Inward Operations</span>
                <ArrowDownLeft className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-blue-700">
                {periodInwardPacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Packs</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{periodInwardShipments.length} Challan Documents</span>
                <span className="text-blue-600 font-bold hover:underline flex items-center gap-0.5 text-[11px]">
                  View List <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Outward Dispatch Card */}
            <div
              onClick={() => {
                setAnalyticsSubTab('DISPATCHED_PACKS');
                setTimeout(() => {
                  document.getElementById('analytics-inspection-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="bg-white border border-slate-200 hover:border-emerald-400 p-5 rounded-xl shadow-2xs space-y-2 cursor-pointer transition"
            >
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <span>Outward Dispatches</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-emerald-700">
                {periodDispatchedPacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Packs</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{periodDispatchLots.length} Dispatch Lots</span>
                <span className="text-emerald-600 font-bold hover:underline flex items-center gap-0.5 text-[11px]">
                  View List <ChevronRight className="w-3 h-3" />
                </span>
              </div>
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
                <span>Live Plant Inventory</span>
                <Box className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono-code text-indigo-700">
                {activeStoragePacks.length.toLocaleString()} <span className="text-xs text-slate-500 font-sans">Units</span>
              </div>
              <p className="text-xs text-slate-500">
                {utilizationPercent}% Capacity ({warehouseLines.length} Lines Active)
              </p>
            </div>
          </div>

          {/* Model Activity Matrix (Inward vs Dispatched Breakdown) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Model-Wise Movement Matrix ({timeFilterTitle})
                </h3>
                <p className="text-xs text-slate-500">
                  Exact model numbers for K1, K2, Limber, and other series for meeting reporting.
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
                  <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block" /> In Storage
                </span>
              </div>
            </div>

            {/* Model Breakdown Grid */}
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
                    <div className="bg-blue-50/80 p-1.5 rounded border border-blue-200/70 text-blue-900">
                      <span className="text-[9px] text-blue-600 uppercase font-bold block">Inward</span>
                      <strong className="text-xs font-extrabold">{item.inwardCount}</strong>
                    </div>
                    <div className="bg-emerald-50/80 p-1.5 rounded border border-emerald-200/70 text-emerald-900">
                      <span className="text-[9px] text-emerald-600 uppercase font-bold block">Dispatched</span>
                      <strong className="text-xs font-extrabold">{item.dispatchCount}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Tabs: Inwarded Packs vs Dispatched Packs vs Timeline */}
          <div id="analytics-inspection-section" className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden scroll-mt-20">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('OVERVIEW')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    analyticsSubTab === 'OVERVIEW'
                      ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Operations Feed ({activityTimeline.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('INWARD_PACKS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    analyticsSubTab === 'INWARD_PACKS'
                      ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" /> Inwarded Packs List ({periodInwardPacks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsSubTab('DISPATCHED_PACKS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    analyticsSubTab === 'DISPATCHED_PACKS'
                      ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Dispatched Packs List ({periodDispatchedPacks.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono-code font-bold">
                Filtered: {timeFilterTitle}
              </span>
            </div>

            <div className="p-5">
              {/* SUB-VIEW A: TIMELINE STREAM */}
              {analyticsSubTab === 'OVERVIEW' && (
                <div className="space-y-3">
                  {activityTimeline.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No operational movements recorded for {timeFilterTitle}.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
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
                                Lead: <strong>{ev.actor}</strong>
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
              )}

              {/* SUB-VIEW B: INWARDED PACKS LIST TABLE */}
              {analyticsSubTab === 'INWARD_PACKS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-bold text-slate-900">
                      Battery Packs Inwarded on {timeFilterTitle} ({periodInwardPacks.length} Packs)
                    </h4>
                    <span className="text-slate-500 text-[11px]">Ready for daily executive meeting review</span>
                  </div>

                  {periodInwardPacks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No packs inwarded in this time frame.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-3 w-12">#</th>
                            <th className="p-3">Pack Number</th>
                            <th className="p-3">Model</th>
                            <th className="p-3">Challan Doc #</th>
                            <th className="p-3">Dealership / Supplier</th>
                            <th className="p-3">Received State/City</th>
                            <th className="p-3">Current Location</th>
                            <th className="p-3">Inward Date</th>
                            <th className="p-3">Inward Lead</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono-code">
                          {periodInwardPacks.map((pack, idx) => (
                            <tr key={pack.id} className="hover:bg-blue-50/40">
                              <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-bold text-blue-700">#{pack.packNumber}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                                  {pack.packType}
                                </span>
                              </td>
                              <td className="p-3 text-slate-800 font-bold">{pack.documentNo || '—'}</td>
                              <td className="p-3 text-slate-700 font-sans">{pack.dealershipName || '—'}</td>
                              <td className="p-3 text-slate-600 font-sans">{pack.receivedState || 'Maharashtra'}</td>
                              <td className="p-3 text-slate-700 font-sans">
                                {pack.status === 'DISPATCHED' ? (
                                  <span className="text-emerald-700 font-bold">Dispatched</span>
                                ) : (
                                  <span className="text-blue-700 font-bold">{pack.currentLocation || 'Inward Area'}</span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="p-3 text-slate-600 font-sans">{pack.inwardBy || 'Staff'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW C: DISPATCHED PACKS LIST TABLE */}
              {analyticsSubTab === 'DISPATCHED_PACKS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-bold text-slate-900">
                      Battery Packs Dispatched on {timeFilterTitle} ({periodDispatchedPacks.length} Packs)
                    </h4>
                    <span className="text-slate-500 text-[11px]">Real-time pack-wise outward dispatch records</span>
                  </div>

                  {periodDispatchedPacks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                      No packs dispatched in this time frame.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-3 w-12">#</th>
                            <th className="p-3">Pack Number</th>
                            <th className="p-3">Model</th>
                            <th className="p-3">Document Number</th>
                            <th className="p-3">LR / Bilty #</th>
                            <th className="p-3">Vehicle #</th>
                            <th className="p-3">Transporter</th>
                            <th className="p-3">Customer Destination</th>
                            <th className="p-3">Dispatch Date</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono-code">
                          {periodDispatchedPacks.map((pack, idx) => (
                            <tr key={pack.id} className="hover:bg-emerald-50/40">
                              <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-3 font-bold text-emerald-700">#{pack.packNumber}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  {pack.packType}
                                </span>
                              </td>
                              <td className="p-3 text-slate-800 font-bold">{pack.dispatchDocNo || '—'}</td>
                              <td className="p-3 text-slate-700">{pack.dispatchLrNo || '—'}</td>
                              <td className="p-3 text-slate-800 font-bold">{pack.dispatchVehicleNo || '—'}</td>
                              <td className="p-3 text-slate-700 font-sans">{pack.dispatchTransporter || '—'}</td>
                              <td className="p-3 text-slate-800 font-sans font-medium">{pack.dispatchToCustomer || 'EV Plant'}</td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {pack.dispatchedAt ? new Date(pack.dispatchedAt).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="p-3 text-right">
                                {onEditPack && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(pack)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                                    title="Edit Dispatched Record"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OUTWARD DISPATCH REGISTER */}
      {activeMainTab === 'DISPATCH_LEDGER' && (
        <OutwardDispatchRegister packs={packs} dispatchLots={dispatchLots} onEditPack={onEditPack} />
      )}

      {/* Edit Dispatched Pack Modal (Accessible across Analytics) */}
      {editingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit Dispatched Pack Details (#{editingPack.packNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPack(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPack} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pack Serial Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.packNumber}
                    onChange={(e) => setEditForm({ ...editForm, packNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Product Model <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editForm.packType}
                    onChange={(e) => setEditForm({ ...editForm, packType: e.target.value as BatteryPackType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    {ALL_PACK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dispatch Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editForm.dispatchDate}
                    onChange={(e) => setEditForm({ ...editForm, dispatchDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Document Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.dispatchDocNo}
                    onChange={(e) => setEditForm({ ...editForm, dispatchDocNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">LR / Bilty No.</label>
                  <input
                    type="text"
                    value={editForm.dispatchLrNo}
                    onChange={(e) => setEditForm({ ...editForm, dispatchLrNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={editForm.dispatchVehicleNo}
                    onChange={(e) => setEditForm({ ...editForm, dispatchVehicleNo: e.target.value })}
                    placeholder="e.g. MH-14-GH-8291"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transporter</label>
                  <input
                    type="text"
                    value={editForm.dispatchTransporter}
                    onChange={(e) => setEditForm({ ...editForm, dispatchTransporter: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consignee Customer</label>
                  <input
                    type="text"
                    value={editForm.dispatchToCustomer}
                    onChange={(e) => setEditForm({ ...editForm, dispatchToCustomer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={editForm.dispatchToAddress}
                    onChange={(e) => setEditForm({ ...editForm, dispatchToAddress: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save & Sync Cloud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


