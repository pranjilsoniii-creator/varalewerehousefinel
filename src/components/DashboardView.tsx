import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Search,
  Filter,
  Package,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  RefreshCw,
  Box,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { BatteryPack, DispatchLot, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, getProductNameAndType } from '../data/batteryCatalog';
import * as XLSX from 'xlsx';

interface DashboardViewProps {
  packs: BatteryPack[];
  dispatchLots: DispatchLot[];
  inwardShipments: InwardShipmentRecord[];
  onOpenPackDetails?: (pack: BatteryPack) => void;
  onNavigateToTab?: (tab: string) => void;
}

type DateFilterType = 'TODAY' | 'YESTERDAY' | '7_DAYS' | '30_DAYS' | 'SPECIFIC_DATE' | 'CUSTOM' | 'ALL_TIME';

export function formatIndianDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  } catch (e) {
    return dateStr;
  }
}

export function formatOnlyDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  packs = [],
  dispatchLots = [],
  inwardShipments = [],
  onOpenPackDetails,
  onNavigateToTab,
}) => {
  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('TODAY');
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active subview in the data tables section
  const [activeTableTab, setActiveTableTab] = useState<'INWARD' | 'DISPATCH' | 'MOVEMENT_MATRIX'>('MOVEMENT_MATRIX');
  const [searchQuery, setSearchQuery] = useState('');

  // Today & Yesterday Strings
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Filter Helper Function for dates
  const isDateInFilter = (timestampStr?: string) => {
    if (!timestampStr) return false;
    const itemDate = new Date(timestampStr);
    if (isNaN(itemDate.getTime())) return false;
    const itemDateStr = itemDate.toISOString().slice(0, 10);

    if (dateFilter === 'ALL_TIME') return true;

    if (dateFilter === 'TODAY') {
      return itemDateStr === todayStr;
    }

    if (dateFilter === 'YESTERDAY') {
      return itemDateStr === yesterdayStr;
    }

    if (dateFilter === 'SPECIFIC_DATE') {
      return itemDateStr === specificDate;
    }

    if (dateFilter === '7_DAYS') {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= cutoff;
    }

    if (dateFilter === '30_DAYS') {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= cutoff;
    }

    if (dateFilter === 'CUSTOM') {
      if (customStartDate && customEndDate) {
        return itemDateStr >= customStartDate && itemDateStr <= customEndDate;
      }
      if (customStartDate) return itemDateStr >= customStartDate;
      if (customEndDate) return itemDateStr <= customEndDate;
      return true;
    }

    return true;
  };

  // 1. STRICT Inward isolation: Exclude direct dispatch and line populate
  const validInwardPacks = useMemo(() => {
    return packs.filter((p) => {
      if (p.sourceType === 'LINE_POPULATE' || p.sourceType === 'DIRECT_DISPATCH') return false;
      if (p.documentNo === 'DIRECT-DISPATCH') return false;
      if (p.dealershipName === 'Direct Plant Dispatch') return false;
      return true;
    });
  }, [packs]);

  // Inward Packs in selected Date Filter window
  const inwardPacksInPeriod = useMemo(() => {
    return validInwardPacks.filter((p) => isDateInFilter(p.inwardDate || p.scannedAt));
  }, [validInwardPacks, dateFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // Inward Shipments (Delivery Challans) in selected Date Filter window
  const inwardShipmentsInPeriod = useMemo(() => {
    return inwardShipments.filter((s) => isDateInFilter(s.timestamp));
  }, [inwardShipments, dateFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // 2. Dispatched Packs in selected Date Filter window
  const allDispatchedPacks = useMemo(() => {
    return packs.filter((p) => p.status === 'DISPATCHED');
  }, [packs]);

  const dispatchedPacksInPeriod = useMemo(() => {
    return allDispatchedPacks.filter((p) => isDateInFilter(p.dispatchedAt));
  }, [allDispatchedPacks, dateFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // Dispatch Lots in selected Date Filter window
  const dispatchLotsInPeriod = useMemo(() => {
    return dispatchLots.filter((lot) => isDateInFilter(lot.timestamp));
  }, [dispatchLots, dateFilter, specificDate, customStartDate, customEndDate, todayStr, yesterdayStr]);

  // 3. Current Live Available Warehouse Stock (NOT Dispatched)
  const availableStockPacks = useMemo(() => {
    return packs.filter((p) => p.status === 'IN_STORAGE' || p.status === 'INWARD_AREA');
  }, [packs]);

  // 4. Model-wise Movement Aggregation Matrix
  const modelMovementMatrix = useMemo(() => {
    const matrixMap = new Map<
      string,
      {
        productName: string;
        productType: string;
        fullBadgeName: string;
        inwardCount: number;
        dispatchCount: number;
        liveStockCount: number;
        netMovement: number;
      }
    >();

    // Initialize all canonical types
    ALL_PACK_TYPES.forEach((type) => {
      const info = getProductNameAndType(type);
      const key = `${info.productName}__${info.productType}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          productName: info.productName,
          productType: info.productType,
          fullBadgeName: info.fullBadgeName,
          inwardCount: 0,
          dispatchCount: 0,
          liveStockCount: 0,
          netMovement: 0,
        });
      }
    });

    // Tally Inwards in period
    inwardPacksInPeriod.forEach((p) => {
      const info = getProductNameAndType(p.packType);
      const key = `${info.productName}__${info.productType}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          productName: info.productName,
          productType: info.productType,
          fullBadgeName: info.fullBadgeName,
          inwardCount: 0,
          dispatchCount: 0,
          liveStockCount: 0,
          netMovement: 0,
        });
      }
      const item = matrixMap.get(key)!;
      item.inwardCount += 1;
    });

    // Tally Dispatches in period
    dispatchedPacksInPeriod.forEach((p) => {
      const info = getProductNameAndType(p.packType);
      const key = `${info.productName}__${info.productType}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          productName: info.productName,
          productType: info.productType,
          fullBadgeName: info.fullBadgeName,
          inwardCount: 0,
          dispatchCount: 0,
          liveStockCount: 0,
          netMovement: 0,
        });
      }
      const item = matrixMap.get(key)!;
      item.dispatchCount += 1;
    });

    // Tally Live Warehouse Stock
    availableStockPacks.forEach((p) => {
      const info = getProductNameAndType(p.packType);
      const key = `${info.productName}__${info.productType}`;
      if (!matrixMap.has(key)) {
        matrixMap.set(key, {
          productName: info.productName,
          productType: info.productType,
          fullBadgeName: info.fullBadgeName,
          inwardCount: 0,
          dispatchCount: 0,
          liveStockCount: 0,
          netMovement: 0,
        });
      }
      const item = matrixMap.get(key)!;
      item.liveStockCount += 1;
    });

    // Calculate Net Movement
    const rows = Array.from(matrixMap.values()).map((row) => ({
      ...row,
      netMovement: row.inwardCount - row.dispatchCount,
    }));

    // Sort: items with activity first
    return rows.sort((a, b) => {
      const totalA = a.inwardCount + a.dispatchCount + a.liveStockCount;
      const totalB = b.inwardCount + b.dispatchCount + b.liveStockCount;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return a.productName.localeCompare(b.productName);
    });
  }, [inwardPacksInPeriod, dispatchedPacksInPeriod, availableStockPacks]);

  // Filtered Inward Packs for table view
  const filteredInwardTablePacks = useMemo(() => {
    if (!searchQuery.trim()) return inwardPacksInPeriod;
    const q = searchQuery.toLowerCase().trim();
    return inwardPacksInPeriod.filter((p) => {
      const info = getProductNameAndType(p.packType);
      return (
        p.packNumber.toLowerCase().includes(q) ||
        info.productName.toLowerCase().includes(q) ||
        info.productType.toLowerCase().includes(q) ||
        (p.documentNo && p.documentNo.toLowerCase().includes(q)) ||
        (p.dealershipName && p.dealershipName.toLowerCase().includes(q)) ||
        (p.receivedState && p.receivedState.toLowerCase().includes(q)) ||
        (p.transportName && p.transportName.toLowerCase().includes(q))
      );
    });
  }, [inwardPacksInPeriod, searchQuery]);

  // Filtered Dispatch Packs for table view
  const filteredDispatchTablePacks = useMemo(() => {
    if (!searchQuery.trim()) return dispatchedPacksInPeriod;
    const q = searchQuery.toLowerCase().trim();
    return dispatchedPacksInPeriod.filter((p) => {
      const info = getProductNameAndType(p.packType);
      return (
        p.packNumber.toLowerCase().includes(q) ||
        info.productName.toLowerCase().includes(q) ||
        info.productType.toLowerCase().includes(q) ||
        (p.dispatchDocNo && p.dispatchDocNo.toLowerCase().includes(q)) ||
        (p.dispatchLrNo && p.dispatchLrNo.toLowerCase().includes(q)) ||
        (p.dispatchToCustomer && p.dispatchToCustomer.toLowerCase().includes(q)) ||
        (p.dispatchVehicleNo && p.dispatchVehicleNo.toLowerCase().includes(q)) ||
        (p.dispatchTransporter && p.dispatchTransporter.toLowerCase().includes(q))
      );
    });
  }, [dispatchedPacksInPeriod, searchQuery]);

  // Excel Export Handler: Inward Register in Period
  const handleExportInwardExcel = () => {
    const data = filteredInwardTablePacks.map((p, idx) => {
      const info = getProductNameAndType(p.packType);
      return {
        'Sr No': idx + 1,
        'Inward Date & Time': formatIndianDate(p.inwardDate || p.scannedAt),
        'Pack Serial Number': p.packNumber,
        'Product Name': info.productName,
        'Product Type': info.productType,
        'DC Challan No': p.documentNo || '—',
        'Dealership / Source Supplier': p.dealershipName || '—',
        'Received State & City': p.receivedState || '—',
        'Transporter Carrier': p.transportName || '—',
        'Inwarded By': p.inwardBy || '—',
        'Approved By': p.inwardApprovedBy || '—',
        'Current Warehouse Status': p.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inward Movement');
    XLSX.writeFile(wb, `Tata_Inward_Movement_${dateFilter}_${todayStr}.xlsx`);
  };

  // Excel Export Handler: Dispatch Register in Period
  const handleExportDispatchExcel = () => {
    const data = filteredDispatchTablePacks.map((p, idx) => {
      const info = getProductNameAndType(p.packType);
      return {
        'Sr No': idx + 1,
        'Dispatch Date & Time': formatIndianDate(p.dispatchedAt),
        'Pack Serial Number': p.packNumber,
        'Product Name': info.productName,
        'Product Type': info.productType,
        'Gate Pass / Challan No': p.dispatchDocNo || '—',
        'LR / Bilty No': p.dispatchLrNo || '—',
        'Destination Consignee / EV Plant': p.dispatchToCustomer || '—',
        'Destination Address': p.dispatchToAddress || '—',
        'Vehicle Number': p.dispatchVehicleNo || '—',
        'Transport Carrier': p.dispatchTransporter || '—',
        'Dispatched Status': 'DISPATCHED',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Movement');
    XLSX.writeFile(wb, `Tata_Dispatch_Movement_${dateFilter}_${todayStr}.xlsx`);
  };

  // Excel Export Handler: Movement Matrix Summary
  const handleExportMatrixExcel = () => {
    const data = modelMovementMatrix.map((row, idx) => ({
      'Sr No': idx + 1,
      'Product Name': row.productName,
      'Product Type': row.productType,
      'Full Model Badge': row.fullBadgeName,
      'Inwarded (Selected Period)': row.inwardCount,
      'Dispatched (Selected Period)': row.dispatchCount,
      'Net Movement (+/-)': row.netMovement,
      'Live Plant Stock (Available)': row.liveStockCount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movement Matrix');
    XLSX.writeFile(wb, `Tata_Movement_Matrix_${dateFilter}_${todayStr}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Filter & Date Selection Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display">
                  Plant Executive Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase font-mono-code">
                  Varale B300
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Live Inward, Dispatch & Warehouse Inventory Movement Matrix
              </p>
            </div>
          </div>

          {/* Date Filter Quick Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('YESTERDAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === 'YESTERDAY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('7_DAYS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === '7_DAYS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('30_DAYS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === '30_DAYS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter('SPECIFIC_DATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === 'SPECIFIC_DATE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Specific Date
            </button>
            <button
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Custom Range
            </button>
            <button
              onClick={() => setDateFilter('ALL_TIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateFilter === 'ALL_TIME'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Extended Date Pickers when Specific or Custom is selected */}
        {dateFilter === 'SPECIFIC_DATE' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 animate-fadeIn">
            <Calendar className="w-4 h-4 text-blue-600" />
            <label className="text-xs font-bold text-slate-700">Select Date for Audit:</label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <span className="text-[11px] text-slate-500">
              Showing all movements recorded on <strong className="text-slate-800">{formatOnlyDate(specificDate)}</strong>
            </span>
          </div>
        )}

        {dateFilter === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 animate-fadeIn">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Metrics Summary Bar (5 Executive Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Inwarded in Period */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              Inward in Period
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-code">
              {inwardPacksInPeriod.length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Across {inwardShipmentsInPeriod.length} DC Challan(s)
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-emerald-700 font-bold">Inward Area Active</span>
            <span className="font-mono-code font-bold text-slate-700">
              {validInwardPacks.length} total
            </span>
          </div>
        </div>

        {/* Card 2: Dispatched in Period */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
              Dispatched in Period
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-code">
              {dispatchedPacksInPeriod.length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Across {dispatchLotsInPeriod.length} Gate Pass Lot(s)
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-blue-700 font-bold">Total Dispatched</span>
            <span className="font-mono-code font-bold text-slate-700">
              {allDispatchedPacks.length} total
            </span>
          </div>
        </div>

        {/* Card 3: Live Plant Available Stock */}
        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">
              Live Plant Stock
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-950 font-mono-code">
              {availableStockPacks.length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Inward Area + Warehouse Storage
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-purple-700 font-bold">Storage Racks</span>
            <span className="font-mono-code font-bold text-slate-700">
              {packs.filter((p) => p.status === 'IN_STORAGE').length} packs
            </span>
          </div>
        </div>

        {/* Card 4: Total Inward DC Challans */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Inward DC Challans
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-code">
              {inwardShipmentsInPeriod.length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Received Shipments in Window
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-bold">All-Time DC Count</span>
            <span className="font-mono-code font-bold text-slate-700">
              {inwardShipments.length}
            </span>
          </div>
        </div>

        {/* Card 5: Total Outward Gate Pass Lots */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Dispatch Lots (GP)
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-code">
              {dispatchLotsInPeriod.length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Outward Lots in Window
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-bold">All-Time GP Lots</span>
            <span className="font-mono-code font-bold text-slate-700">
              {dispatchLots.length}
            </span>
          </div>
        </div>
      </div>

      {/* Model-Wise Quick Counters Grid (Inward vs Dispatch in Period) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inward Breakdown by Model */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Inward Models Breakdown</h2>
                <p className="text-[11px] text-slate-500 font-medium">Packs received in selected period</p>
              </div>
            </div>
            <span className="text-xs font-mono-code font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {inwardPacksInPeriod.length} Packs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {modelMovementMatrix.map((row) => (
              <div
                key={row.fullBadgeName}
                className={`p-2.5 rounded-xl border transition ${
                  row.inwardCount > 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                    : 'bg-slate-50/50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-bold truncate text-slate-800">{row.productName}</div>
                <div className="text-[10px] font-extrabold text-slate-500 font-mono-code uppercase">{row.productType}</div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Inwarded:</span>
                  <span
                    className={`text-base font-black font-mono-code ${
                      row.inwardCount > 0 ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {row.inwardCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dispatch Breakdown by Model */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Dispatch Models Breakdown</h2>
                <p className="text-[11px] text-slate-500 font-medium">Packs dispatched in selected period</p>
              </div>
            </div>
            <span className="text-xs font-mono-code font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {dispatchedPacksInPeriod.length} Packs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {modelMovementMatrix.map((row) => (
              <div
                key={row.fullBadgeName}
                className={`p-2.5 rounded-xl border transition ${
                  row.dispatchCount > 0
                    ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                    : 'bg-slate-50/50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-bold truncate text-slate-800">{row.productName}</div>
                <div className="text-[10px] font-extrabold text-slate-500 font-mono-code uppercase">{row.productType}</div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Dispatched:</span>
                  <span
                    className={`text-base font-black font-mono-code ${
                      row.dispatchCount > 0 ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {row.dispatchCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Movement Ledger & Detailed Inspection Tables */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Navigation Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTableTab('MOVEMENT_MATRIX')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTableTab === 'MOVEMENT_MATRIX'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Model Movement Matrix</span>
            </button>
            <button
              onClick={() => setActiveTableTab('INWARD')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTableTab === 'INWARD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Inward Packs in Period ({inwardPacksInPeriod.length})</span>
            </button>
            <button
              onClick={() => setActiveTableTab('DISPATCH')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTableTab === 'DISPATCH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Dispatched Packs in Period ({dispatchedPacksInPeriod.length})</span>
            </button>
          </div>

          {/* Search and Export Actions */}
          <div className="flex items-center gap-2">
            {activeTableTab !== 'MOVEMENT_MATRIX' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter serial, DC, model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
                />
              </div>
            )}

            {activeTableTab === 'MOVEMENT_MATRIX' && (
              <button
                onClick={handleExportMatrixExcel}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Matrix Excel</span>
              </button>
            )}

            {activeTableTab === 'INWARD' && (
              <button
                onClick={handleExportInwardExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Inward Excel</span>
              </button>
            )}

            {activeTableTab === 'DISPATCH' && (
              <button
                onClick={handleExportDispatchExcel}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Dispatch Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Movement Matrix Table */}
        {activeTableTab === 'MOVEMENT_MATRIX' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-mono-code">
                  <th className="py-3 px-4">Sr No</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Product Type</th>
                  <th className="py-3 px-4 text-center">Inward (Period)</th>
                  <th className="py-3 px-4 text-center">Dispatched (Period)</th>
                  <th className="py-3 px-4 text-center">Net Movement (+/-)</th>
                  <th className="py-3 px-4 text-center">Live Plant Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {modelMovementMatrix.map((row, idx) => (
                  <tr key={row.fullBadgeName} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono-code text-slate-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.productName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold font-mono-code">
                        {row.productType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono-code ${
                          row.inwardCount > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.inwardCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono-code ${
                          row.dispatchCount > 0
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.dispatchCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono-code ${
                          row.netMovement > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.netMovement < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.netMovement > 0 ? `+${row.netMovement}` : row.netMovement}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 rounded-lg text-xs font-black font-mono-code bg-purple-50 text-purple-900 border border-purple-200">
                        {row.liveStockCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-extrabold text-xs text-slate-900 border-t-2 border-slate-300 font-mono-code">
                  <td className="py-3 px-4" colSpan={3}>
                    TOTAL PLANT AGGREGATE
                  </td>
                  <td className="py-3 px-4 text-center text-emerald-800 text-sm">
                    {inwardPacksInPeriod.length}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-800 text-sm">
                    {dispatchedPacksInPeriod.length}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-900 text-sm">
                    {inwardPacksInPeriod.length - dispatchedPacksInPeriod.length > 0
                      ? `+${inwardPacksInPeriod.length - dispatchedPacksInPeriod.length}`
                      : inwardPacksInPeriod.length - dispatchedPacksInPeriod.length}
                  </td>
                  <td className="py-3 px-4 text-center text-purple-900 text-sm">
                    {availableStockPacks.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 2: Inward Packs in Selected Period */}
        {activeTableTab === 'INWARD' && (
          <div className="overflow-x-auto">
            {filteredInwardTablePacks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No inward packs found for selected period & search filter</p>
                <p className="text-[11px] text-slate-400">Change date range or clear search query</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-mono-code">
                    <th className="py-3 px-4">Sr No</th>
                    <th className="py-3 px-4">Inward Date & Time</th>
                    <th className="py-3 px-4">Pack Serial Number</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Product Type</th>
                    <th className="py-3 px-4">DC Challan No</th>
                    <th className="py-3 px-4">Dealership / Source</th>
                    <th className="py-3 px-4">Received State</th>
                    <th className="py-3 px-4">Transporter</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredInwardTablePacks.map((p, idx) => {
                    const info = getProductNameAndType(p.packType);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onOpenPackDetails && onOpenPackDetails(p)}
                        className="hover:bg-blue-50/40 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono-code text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono-code text-slate-700 text-[11px]">
                          {formatIndianDate(p.inwardDate || p.scannedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono-code font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {p.packNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{info.productName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold font-mono-code">
                            {info.productType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-code font-bold text-slate-800">
                          {p.documentNo || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{p.dealershipName || '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{p.receivedState || '—'}</td>
                        <td className="py-3 px-4 text-slate-600">{p.transportName || '—'}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono-code ${
                              p.status === 'IN_STORAGE'
                                ? 'bg-purple-100 text-purple-800'
                                : p.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 3: Dispatched Packs in Selected Period */}
        {activeTableTab === 'DISPATCH' && (
          <div className="overflow-x-auto">
            {filteredDispatchTablePacks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Truck className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No dispatched packs found for selected period & search filter</p>
                <p className="text-[11px] text-slate-400">Change date range or clear search query</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-mono-code">
                    <th className="py-3 px-4">Sr No</th>
                    <th className="py-3 px-4">Dispatch Date & Time</th>
                    <th className="py-3 px-4">Pack Serial Number</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Product Type</th>
                    <th className="py-3 px-4">Gate Pass / Doc No</th>
                    <th className="py-3 px-4">LR Number</th>
                    <th className="py-3 px-4">Consignee / EV Plant</th>
                    <th className="py-3 px-4">Vehicle Number</th>
                    <th className="py-3 px-4">Transporter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDispatchTablePacks.map((p, idx) => {
                    const info = getProductNameAndType(p.packType);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onOpenPackDetails && onOpenPackDetails(p)}
                        className="hover:bg-blue-50/40 transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono-code text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono-code text-slate-700 text-[11px]">
                          {formatIndianDate(p.dispatchedAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono-code font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {p.packNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{info.productName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold font-mono-code">
                            {info.productType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono-code font-bold text-slate-800">
                          {p.dispatchDocNo || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono-code font-bold text-slate-700">
                          {p.dispatchLrNo || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-bold">
                          {p.dispatchToCustomer || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono-code font-bold text-slate-800">
                          {p.dispatchVehicleNo || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.dispatchTransporter || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
