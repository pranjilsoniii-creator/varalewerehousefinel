import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Building,
  Layers,
  Calendar,
  Eye,
  Trash2,
  Edit3,
  X,
  Save,
  Tag,
  Filter,
  Download,
  Truck,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, INITIAL_SAVED_ADDRESSES, getProductNameAndType } from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';
import { exportInwardRegisterPacksToExcel } from '../utils/excelExport';

interface InwardRegisterViewProps {
  packs: BatteryPack[];
  onApproveInwardPack: (packId: string) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
  onAllocatePackToRack?: (pack: BatteryPack) => void;
  onDeletePack?: (packId: string) => void;
  onEditPack?: (updatedPack: BatteryPack) => void;
}

export const InwardRegisterView: React.FC<InwardRegisterViewProps> = ({
  packs,
  onApproveInwardPack,
  onOpenPackDetails,
  onAllocatePackToRack,
  onDeletePack,
  onEditPack,
}) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor, isEmployee } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INWARD_AREA' | 'IN_STORAGE' | 'DISPATCHED' | 'PENDING_APPROVAL'>('ALL');
  
  // Date Range Filter: 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Helper for consistent local YYYY-MM-DD string
  const getLocalDateStr = (d?: string | Date) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return typeof d === 'string' ? d.slice(0, 10) : '';
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Editing Modal State
  const [editingPack, setEditingPack] = useState<BatteryPack | null>(null);
  const [editPackNumber, setEditPackNumber] = useState('');
  const [editPackType, setEditPackType] = useState<BatteryPackType>('Kanger1.0_AIO');
  const [editDocumentNo, setEditDocumentNo] = useState('');
  const [editDealership, setEditDealership] = useState('');
  const [editReceivedState, setEditReceivedState] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editIsDifferentSerial, setEditIsDifferentSerial] = useState(false);
  const [editChallanPackNumber, setEditChallanPackNumber] = useState('');
  const [editMismatchReason, setEditMismatchReason] = useState('');

  // 100% PERMANENT INWARD DOCK LEDGER PRESERVATION:
  // All packs received through Inward Dock are permanently preserved here,
  // even after subsequent allocation to storage lines or outward dispatch to EV plants.
  const inwardOnlyPacks = useMemo(() => {
    return packs.filter((p) => {
      // Exclude direct populate dummy lines
      if (p.sourceType === 'LINE_POPULATE') return false;
      if (p.sourceType === 'DIRECT_DISPATCH' && !p.inwardDate && (!p.documentNo || p.documentNo === 'DIRECT-DISPATCH')) return false;
      if (p.documentNo === 'DIRECT-DISPATCH' && !p.inwardDate) return false;
      if (p.dealershipName === 'Direct Plant Dispatch' && !p.inwardDate) return false;
      if (p.documentNo?.startsWith('MATRIX-LOAD-') || p.documentNo?.startsWith('LINE-LOAD-')) return false;

      // Retain all packs that have Inward receipts, document numbers, or inward dock history
      return Boolean(p.documentNo || p.inwardDate || p.dealershipName || p.sourceType === 'INWARD');
    });
  }, [packs]);

  // Count of total pending packs in warehouse waiting for supervisor approval
  const totalPendingInwardsCount = useMemo(() => {
    return packs.filter((p) => p.status === 'PENDING_APPROVAL' && p.sourceType !== 'LINE_POPULATE').length;
  }, [packs]);

  // Today Date String (Local timezone aware)
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);

  // Series Breakdown & Stock Status for Inward Packs
  const inwardSeriesSummary = useMemo(() => {
    let k1Count = 0;
    let k2Count = 0;
    let limberCount = 0;
    let pendingCount = 0;
    let diffCount = 0;
    let inWarehouseCount = 0;
    let dispatchedCount = 0;

    inwardOnlyPacks.forEach((p) => {
      if (p.status === 'DISPATCHED') {
        dispatchedCount += 1;
      } else {
        inWarehouseCount += 1;
      }
      if (p.status === 'PENDING_APPROVAL') pendingCount += 1;
      if (p.isDifferentSerial) diffCount += 1;
      if (p.packType.startsWith('Kanger1.0')) k1Count += 1;
      else if (p.packType.startsWith('Kanger2.0')) k2Count += 1;
      else if (p.packType.startsWith('Limber')) limberCount += 1;
    });

    return {
      total: inwardOnlyPacks.length,
      inWarehouse: inWarehouseCount,
      dispatched: dispatchedCount,
      k1: k1Count,
      k2: k2Count,
      limber: limberCount,
      pending: pendingCount,
      diff: diffCount,
    };
  }, [inwardOnlyPacks]);

  // Filtered Packs
  const filteredPacks = useMemo(() => {
    const now = new Date();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;

    return inwardOnlyPacks.filter((p) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPack = p.packNumber.toLowerCase().includes(q);
        const matchesChallan = p.challanPackNumber?.toLowerCase().includes(q);
        const matchesDoc = p.documentNo?.toLowerCase().includes(q);
        const matchesDealer = p.dealershipName?.toLowerCase().includes(q);
        const matchesModel = p.packType.toLowerCase().includes(q);
        const matchesReason = p.mismatchReason?.toLowerCase().includes(q);
        const matchesCustomer = p.dispatchToCustomer?.toLowerCase().includes(q);
        if (!matchesPack && !matchesChallan && !matchesDoc && !matchesDealer && !matchesModel && !matchesReason && !matchesCustomer) return false;
      }

      // 2. Model Filter
      if (modelFilter !== 'ALL' && p.packType !== modelFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DISPATCHED' && p.status !== 'DISPATCHED') return false;
        if (statusFilter === 'PENDING_APPROVAL' && p.status !== 'PENDING_APPROVAL') return false;
        if (statusFilter === 'INWARD_AREA' && p.status !== 'INWARD_AREA') return false;
        if (statusFilter === 'IN_STORAGE' && p.status !== 'IN_STORAGE') return false;
      }

      // 4. Date Range Filter
      const packDateStr = getLocalDateStr(p.inwardDate || p.scannedAt);
      if (dateFilter === 'TODAY') {
        if (!packDateStr || packDateStr !== todayStr) return false;
      } else if (dateFilter === '7_DAYS') {
        if (!p.inwardDate) return false;
        const packTime = new Date(p.inwardDate).getTime();
        if (now.getTime() - packTime > ms7Days) return false;
      } else if (dateFilter === '30_DAYS') {
        if (!p.inwardDate) return false;
        const packTime = new Date(p.inwardDate).getTime();
        if (now.getTime() - packTime > ms30Days) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (!packDateStr) return false;
        if (customStartDate && packDateStr < customStartDate) return false;
        if (customEndDate && packDateStr > customEndDate) return false;
      }

      return true;
    });
  }, [inwardOnlyPacks, searchQuery, modelFilter, statusFilter, dateFilter, customStartDate, customEndDate, todayStr]);

  // Dynamic Dealership Info Map for Auto-Filling State & City
  const { dealershipSuggestions, dealershipInfoMap } = useMemo(() => {
    const dealerSet = new Set<string>();
    const dealerMap: Record<string, { name: string; state: string }> = {};

    INITIAL_SAVED_ADDRESSES.forEach((addr) => {
      if (addr.title) {
        dealerSet.add(addr.title);
        dealerMap[addr.title.toLowerCase()] = {
          name: addr.title,
          state: addr.state || 'Maharashtra',
        };
      }
    });

    packs.forEach((p) => {
      if (p.dealershipName && p.dealershipName.trim()) {
        const dName = p.dealershipName.trim();
        dealerSet.add(dName);
        if (!dealerMap[dName.toLowerCase()]) {
          dealerMap[dName.toLowerCase()] = {
            name: dName,
            state: p.receivedState || 'Maharashtra',
          };
        }
      }
    });

    return {
      dealershipSuggestions: Array.from(dealerSet).filter(Boolean),
      dealershipInfoMap: dealerMap,
    };
  }, [packs]);

  // Handle Export Visible Filtered Packs to Excel
  const handleExportExcel = () => {
    if (filteredPacks.length === 0) {
      alert('No inward packs match the current filter to export.');
      return;
    }
    const filterTag = dateFilter === 'ALL' ? 'All_Time' : dateFilter === 'TODAY' ? 'Today' : dateFilter === '7_DAYS' ? 'Last7Days' : dateFilter === '30_DAYS' ? 'Last30Days' : 'CustomRange';
    exportInwardRegisterPacksToExcel(
      filteredPacks,
      `Tata_Inward_Register_${filterTag}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Handle Edit Click
  const handleStartEdit = (pack: BatteryPack) => {
    const isApproved = pack.status !== 'PENDING_APPROVAL';
    if (isEmployee && isApproved) {
      alert('Permission Denied: Employee cannot edit an approved inward entry. Please contact your Supervisor or Manager.');
      return;
    }

    setEditingPack(pack);
    setEditPackNumber(pack.packNumber);
    setEditPackType(pack.packType);
    setEditDocumentNo(pack.documentNo || '');
    setEditDealership(pack.dealershipName || '');
    setEditReceivedState(pack.receivedState || '');
    setEditRemark(pack.remark || '');
    setEditIsDifferentSerial(Boolean(pack.isDifferentSerial));
    setEditChallanPackNumber(pack.challanPackNumber || '');
    setEditMismatchReason(pack.mismatchReason || '');
  };

  const handleEditDealershipChange = (val: string) => {
    setEditDealership(val);
    if (!val || !val.trim()) return;
    const match = dealershipInfoMap[val.trim().toLowerCase()];
    if (match && match.state) {
      setEditReceivedState(match.state);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPack) return;

    if (!editPackNumber.trim()) {
      alert('Pack number cannot be empty.');
      return;
    }

    const updated: BatteryPack = {
      ...editingPack,
      packNumber: editPackNumber.trim(),
      packType: editPackType,
      documentNo: editDocumentNo.trim(),
      dealershipName: editDealership.trim(),
      receivedState: editReceivedState.trim(),
      remark: editRemark.trim(),
      isDifferentSerial: editIsDifferentSerial,
      challanPackNumber: editIsDifferentSerial ? editChallanPackNumber.trim() : undefined,
      mismatchReason: editIsDifferentSerial ? editMismatchReason.trim() : undefined,
    };

    if (onEditPack) {
      onEditPack(updated);
    }
    setEditingPack(null);
  };

  const handleDeletePrompt = (pack: BatteryPack) => {
    if (!isSuperAdmin && !isManager) {
      alert('Permission Denied: Only Super Admin and Manager can delete inward records.');
      return;
    }

    if (confirm(`Permanently delete Inward Pack #${pack.packNumber} (Doc #${pack.documentNo}) from warehouse database?`)) {
      if (onDeletePack) {
        onDeletePack(pack.id);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              Inward Register
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Inward Shipment Register & Dock Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Strict inward dock delivery challans ledger with complete traceability (Preserves all inward receipts).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-code font-bold text-slate-800">
            Total Inwarded: <span className="text-blue-700 font-extrabold">{inwardSeriesSummary.total}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-mono-code font-bold text-emerald-800">
            In Warehouse: <span className="text-emerald-700 font-extrabold">{inwardSeriesSummary.inWarehouse}</span>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono-code font-bold text-blue-800">
            Dispatched: <span className="text-blue-700 font-extrabold">{inwardSeriesSummary.dispatched}</span>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ml-1"
            title="Export currently visible filtered records to Excel spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel ({filteredPacks.length})</span>
          </button>
        </div>
      </div>

      {/* Supervisor Approval Action Hub Banner */}
      {(isSupervisor || isSuperAdmin) && inwardSeriesSummary.pending > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Supervisor Inward Verification & Approval Queue
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                <strong>{inwardSeriesSummary.pending}</strong> battery pack(s) submitted by dock operators awaiting supervisor verification. Once approved, these packs will be visible in Suresh Chavan's manager dashboard and inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const pendingPacks = filteredPacks.filter((p) => p.status === 'PENDING_APPROVAL');
                pendingPacks.forEach((p) => onApproveInwardPack(p.id));
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve All Visible ({inwardSeriesSummary.pending})</span>
            </button>
          </div>
        </div>
      )}

      {/* Manager Information Card */}
      {isManager && totalPendingInwardsCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3 text-xs text-blue-900 animate-fadeIn">
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
            ℹ️
          </div>
          <div>
            <p className="font-bold text-blue-950">Manager Quality Guard Active:</p>
            <p className="text-blue-800">
              There are currently <strong>{totalPendingInwardsCount}</strong> inward pack(s) in the verification queue undergoing supervisor check by Vikas Kumar Bharti / Nitin Pawar. Once verified by the supervisor, they will reflect immediately in your live inventory.
            </p>
          </div>
        </div>
      )}

      {/* Inward Series KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
        <div className="bg-white border-2 border-blue-300 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-blue-900 font-bold uppercase tracking-wider text-[10px]">Total Inwarded</p>
          <p className="text-2xl font-black font-mono-code text-blue-800">{inwardSeriesSummary.total}</p>
          <p className="text-[10px] text-slate-400 font-medium">100% Inward Ledger</p>
        </div>

        <div className="bg-white border border-emerald-300 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">In Warehouse</p>
          <p className="text-2xl font-black font-mono-code text-emerald-700">{inwardSeriesSummary.inWarehouse}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Available in Stock</p>
        </div>

        <div className="bg-white border border-blue-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">Dispatched</p>
          <p className="text-2xl font-black font-mono-code text-blue-600">{inwardSeriesSummary.dispatched}</p>
          <p className="text-[10px] text-blue-500 font-medium">Outward to Plants</p>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Kanger 1.0 Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-slate-800">{inwardSeriesSummary.k1}</p>
          <p className="text-[10px] text-slate-400">AIO / Gen3 / CKD / FBU</p>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-purple-600 font-bold uppercase tracking-wider text-[10px]">Kanger 2.0 Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-purple-700">{inwardSeriesSummary.k2}</p>
          <p className="text-[10px] text-slate-400">Kanger 2.0</p>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Limber Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-emerald-700">{inwardSeriesSummary.limber}</p>
          <p className="text-[10px] text-slate-400">Limber Series</p>
        </div>

        <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-amber-600 font-bold uppercase tracking-wider text-[10px]">Pending Approval</p>
          <p className="text-2xl font-extrabold font-mono-code text-amber-600">{inwardSeriesSummary.pending}</p>
          <p className="text-[10px] text-slate-400">Supervisor Check</p>
        </div>

        <div className="bg-white border border-purple-200 p-3.5 rounded-xl shadow-2xs space-y-1">
          <p className="text-purple-700 font-bold uppercase tracking-wider text-[10px]">Diff / Mismatch</p>
          <p className="text-2xl font-extrabold font-mono-code text-purple-700">{inwardSeriesSummary.diff}</p>
          <p className="text-[10px] text-slate-400">Challan Mismatches</p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        {/* Row 1: Search & Model & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pack #, Doc #, Dealership, or Model..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Battery Models</option>
              {ALL_PACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses (In Stock & Dispatched)</option>
              <option value="INWARD_AREA">In Inward Dock</option>
              <option value="IN_STORAGE">Allocated to Lines / Storage</option>
              <option value="DISPATCHED">Dispatched Outward</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>
        </div>

        {/* Row 2: Comprehensive Date Filters */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date Filter:
            </span>
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                dateFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                dateFilter === 'TODAY'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('7_DAYS')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                dateFilter === '7_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('30_DAYS')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                dateFilter === '30_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                dateFilter === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 animate-fadeIn">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Inward Ledger Records ({filteredPacks.length} Packs)
          </h3>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download visible filtered packs as Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel ({filteredPacks.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-3">#</th>
                <th className="p-3">Pack Number</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Product Type</th>
                <th className="p-3">Remark</th>
                <th className="p-3">Doc / Challan No</th>
                <th className="p-3">Dealership / Source</th>
                <th className="p-3">State / City</th>
                <th className="p-3">Inward Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPacks.map((pack, index) => {
                const model = BATTERY_MODELS[pack.packType];
                const { productName, productType } = getProductNameAndType(pack.packType);
                const isPending = pack.status === 'PENDING_APPROVAL';

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
                              className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-300 text-[9px] font-bold flex items-center gap-0.5"
                              title={`Challan Doc Pack Number: #${pack.challanPackNumber || '—'}${pack.mismatchReason ? ` (${pack.mismatchReason})` : ''}`}
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
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {productName}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {productType}
                      </span>
                    </td>
                    <td className="p-3">
                      {pack.remark ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 max-w-[150px] truncate" title={pack.remark}>
                          {pack.remark}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono-code text-slate-900 font-bold">{pack.documentNo || '—'}</td>
                    <td className="p-3 font-medium text-slate-800 max-w-[180px] truncate">{pack.dealershipName || '—'}</td>
                    <td className="p-3 text-slate-600">{pack.receivedState || 'Maharashtra'}</td>
                    <td className="p-3 font-mono-code text-slate-600">
                      {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="p-3">
                      {pack.status === 'DISPATCHED' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                            <Truck className="w-3 h-3 text-blue-600" /> Dispatched
                          </span>
                          {pack.dispatchToCustomer && (
                            <div className="text-[10px] text-slate-600 font-medium truncate max-w-[140px]" title={pack.dispatchToCustomer}>
                              To: {pack.dispatchToCustomer}
                            </div>
                          )}
                          {pack.dispatchedAt && (
                            <div className="text-[10px] text-slate-400 font-mono-code">
                              {new Date(pack.dispatchedAt).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Approval
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {pack.status === 'IN_STORAGE' ? `Line ${pack.lineId || 1} (R-${pack.rackNumber || 1})` : (pack.locationArea || 'Inward Area')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPending && (isSupervisor || isManager || isSuperAdmin) && (
                          <button
                            type="button"
                            onClick={() => onApproveInwardPack(pack.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(pack)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Inward Entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {(isSuperAdmin || isManager) && (
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt(pack)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Inward Pack"
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

      {/* Edit Inward Pack Modal */}
      {editingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base font-display">Edit Inward Pack #{editingPack.packNumber}</h3>
              <button onClick={() => setEditingPack(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Pack Number</label>
                <input
                  type="text"
                  value={editPackNumber}
                  onChange={(e) => setEditPackNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono-code font-bold text-slate-900"
                  required
                />
              </div>

              {/* Discrepancy Toggle & Inputs */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900 text-xs">
                  <input
                    type="checkbox"
                    checked={editIsDifferentSerial}
                    onChange={(e) => setEditIsDifferentSerial(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Challan Mismatch / Different Pack Number?</span>
                </label>

                {editIsDifferentSerial && (
                  <div className="space-y-2 pt-1 animate-fadeIn">
                    <div>
                      <label className="block font-bold text-purple-900 mb-1">Challan / Invoice Pack Number #</label>
                      <input
                        type="text"
                        value={editChallanPackNumber}
                        onChange={(e) => setEditChallanPackNumber(e.target.value)}
                        placeholder="Enter challan document serial number..."
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 font-mono-code font-bold text-purple-900 focus:outline-none focus:border-purple-600"
                        required={editIsDifferentSerial}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-purple-900 mb-1">Mismatch Note / Reason</label>
                      <input
                        type="text"
                        value={editMismatchReason}
                        onChange={(e) => setEditMismatchReason(e.target.value)}
                        placeholder="Reason for pack number difference..."
                        className="w-full bg-white border border-purple-200 rounded-lg p-2 text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Model</label>
                <select
                  value={editPackType}
                  onChange={(e) => setEditPackType(e.target.value as BatteryPackType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                >
                  {ALL_PACK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document / Challan No.</label>
                <input
                  type="text"
                  value={editDocumentNo}
                  onChange={(e) => setEditDocumentNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono-code font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <datalist id="edit-dealership-suggestions">
                  {dealershipSuggestions.map((d, i) => (
                    <option key={i} value={d} />
                  ))}
                </datalist>
                <label className="block font-bold text-slate-700 mb-1">Dealership / Source Supplier</label>
                <input
                  type="text"
                  list="edit-dealership-suggestions"
                  value={editDealership}
                  onChange={(e) => handleEditDealershipChange(e.target.value)}
                  placeholder="Type or select dealership..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Received State / City</label>
                <input
                  type="text"
                  value={editReceivedState}
                  onChange={(e) => setEditReceivedState(e.target.value)}
                  placeholder="State / City (e.g. Pune, Maharashtra)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remark Notes</label>
                <input
                  type="text"
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
