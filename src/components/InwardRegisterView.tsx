import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Download,
  Layers,
  Flag,
  UserCheck,
  Eye,
  RefreshCw,
  MapPin,
  X,
  Edit,
  Trash2,
  Save,
  Tag,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, COMMON_TRANSPORTERS, deriveModelFromShorthand } from '../data/batteryCatalog';
import { getStoredWarehouseLines, MAX_PACKS_PER_RACK, RACKS_PER_LINE, SLOTS_PER_RACK } from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface InwardRegisterViewProps {
  packs: BatteryPack[];
  onApproveInwardPack: (packId: string) => void;
  onApproveMultipleInwardPacks: (packIds: string[]) => void;
  onSendToDispatch: (pack: BatteryPack) => void;
  onSendMultipleToDispatch: (packIds: string[]) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
  onMovePackToLocation?: (packId: string, location: { lineId: string; rackNumber: number; rackSlot: number }) => void;
  onMoveMultiplePacksToLocation?: (packIds: string[], location: { lineId: string; rackNumber: number; rackSlot: number }) => void;
  onEditPack?: (updatedPack: BatteryPack) => void;
  onDeletePack?: (packId: string) => void;
}

type DateRangeOption = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';

export const InwardRegisterView: React.FC<InwardRegisterViewProps> = ({
  packs,
  onApproveInwardPack,
  onApproveMultipleInwardPacks,
  onSendToDispatch,
  onSendMultipleToDispatch,
  onOpenPackDetails,
  onMovePackToLocation,
  onMoveMultiplePacksToLocation,
  onEditPack,
  onDeletePack,
}) => {
  const { isSupervisor, isManager, isSuperAdmin, currentUser } = useAuth();

  // ONLY Inward dock packs should appear here (Filter out Line Matrix populated stock)
  const inwardOnlyPacks = useMemo(() => {
    return packs.filter((p) => p.sourceType !== 'LINE_POPULATE');
  }, [packs]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INWARD_AREA' | 'IN_STORAGE' | 'DISPATCHED' | 'PENDING_APPROVAL'>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');

  // Date Range Controls
  const [selectedDatePreset, setSelectedDatePreset] = useState<DateRangeOption>('ALL');
  const [appliedDatePreset, setAppliedDatePreset] = useState<DateRangeOption>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  // Persistent Multi-Selection by pack ID
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());

  // Location Allocation Modal
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [targetPacksForMove, setTargetPacksForMove] = useState<BatteryPack[]>([]);
  const warehouseLinesList = getStoredWarehouseLines();
  const [selectedLine, setSelectedLine] = useState<string>(warehouseLinesList[0] || 'A-01');
  const [selectedRack, setSelectedRack] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  // Supervisor Approval Inspection Modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Edit Pack Modal State
  const [editingPack, setEditingPack] = useState<BatteryPack | null>(null);
  const [editPackNumber, setEditPackNumber] = useState('');
  const [editPackType, setEditPackType] = useState<BatteryPackType>('Kanger1.0_AIO');
  const [editDocumentNo, setEditDocumentNo] = useState('');
  const [editDealership, setEditDealership] = useState('');
  const [editReceivedState, setEditReceivedState] = useState('');
  const [editTransportName, setEditTransportName] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editHasStamp, setEditHasStamp] = useState(true);

  // Apply Date Filter button handler
  const handleApplyDateFilter = () => {
    setAppliedDatePreset(selectedDatePreset);
    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
  };

  // Quick Today Filter Handler
  const handleQuickTodayFilter = () => {
    setSelectedDatePreset('TODAY');
    setAppliedDatePreset('TODAY');
    setAppliedCustomStart('');
    setAppliedCustomEnd('');
  };

  // Reset Date Filter handler
  const handleResetDateFilter = () => {
    setSelectedDatePreset('ALL');
    setAppliedDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedCustomStart('');
    setAppliedCustomEnd('');
  };

  // Filtered packs list
  const filteredPacks = useMemo(() => {
    const now = new Date().getTime();
    const todayStr = new Date().toISOString().slice(0, 10);

    return inwardOnlyPacks.filter((pack) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPack = pack.packNumber.toLowerCase().includes(q);
        const matchesDoc = pack.documentNo?.toLowerCase().includes(q);
        const matchesDealership = pack.dealershipName?.toLowerCase().includes(q);
        const matchesTransporter = pack.transportName?.toLowerCase().includes(q);
        if (!matchesPack && !matchesDoc && !matchesDealership && !matchesTransporter) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (pack.status !== statusFilter) return false;
      }

      // 3. Model Filter
      if (modelFilter !== 'ALL') {
        if (pack.packType !== modelFilter) return false;
      }

      // 4. Date Range Filter
      if (appliedDatePreset !== 'ALL' && pack.inwardDate) {
        const packDateStr = pack.inwardDate.slice(0, 10);
        const packTime = new Date(pack.inwardDate).getTime();
        if (isNaN(packTime)) return true;

        if (appliedDatePreset === 'TODAY') {
          if (packDateStr !== todayStr) return false;
        } else if (appliedDatePreset === '7_DAYS') {
          if (now - packTime > 7 * 86400000) return false;
        } else if (appliedDatePreset === '30_DAYS') {
          if (now - packTime > 30 * 86400000) return false;
        } else if (appliedDatePreset === '3_MONTHS') {
          if (now - packTime > 90 * 86400000) return false;
        } else if (appliedDatePreset === '6_MONTHS') {
          if (now - packTime > 180 * 86400000) return false;
        } else if (appliedDatePreset === '1_YEAR') {
          if (now - packTime > 365 * 86400000) return false;
        } else if (appliedDatePreset === 'CUSTOM') {
          if (appliedCustomStart) {
            const start = new Date(appliedCustomStart).getTime();
            if (packTime < start) return false;
          }
          if (appliedCustomEnd) {
            const end = new Date(appliedCustomEnd).getTime() + 86400000;
            if (packTime > end) return false;
          }
        }
      }

      return true;
    });
  }, [inwardOnlyPacks, searchQuery, statusFilter, modelFilter, appliedDatePreset, appliedCustomStart, appliedCustomEnd]);

  // Pending approval packs list
  const pendingPacks = useMemo(() => {
    return inwardOnlyPacks.filter((p) => p.status === 'PENDING_APPROVAL');
  }, [inwardOnlyPacks]);

  // Today inward count
  const todayInwardCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return inwardOnlyPacks.filter((p) => p.inwardDate && p.inwardDate.slice(0, 10) === todayStr).length;
  }, [inwardOnlyPacks]);

  // Toggle Single Selection
  const toggleSelectPack = (packId: string) => {
    setSelectedPackIds((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (selectedPackIds.size === filteredPacks.length && filteredPacks.length > 0) {
      setSelectedPackIds(new Set());
    } else {
      setSelectedPackIds(new Set(filteredPacks.map((p) => p.id)));
    }
  };

  // Move Modal opener
  const handleOpenLocationModal = (pack: BatteryPack) => {
    setTargetPacksForMove([pack]);
    if (pack.lineId) setSelectedLine(pack.lineId);
    if (pack.rackNumber) setSelectedRack(pack.rackNumber);
    if (pack.rackSlot) setSelectedSlot(pack.rackSlot);
    setIsLocationModalOpen(true);
  };

  const handleOpenBatchLocationModal = () => {
    const selectedList = packs.filter((p) => selectedPackIds.has(p.id));
    if (selectedList.length === 0) return;
    setTargetPacksForMove(selectedList);
    setIsLocationModalOpen(true);
  };

  const handleExecuteLocationMove = () => {
    if (targetPacksForMove.length === 0) return;

    // Validate Rack Capacity (Max 4 packs per rack)
    const existingInTargetRack = packs.filter(
      (p) => p.status !== 'DISPATCHED' && p.lineId === selectedLine && p.rackNumber === selectedRack
    );
    if (existingInTargetRack.length + targetPacksForMove.length > MAX_PACKS_PER_RACK) {
      alert(
        'Capacity Warning: Rack ' +
          selectedRack +
          ' in Line ' +
          selectedLine +
          ' currently has ' +
          existingInTargetRack.length +
          ' pack(s). Adding ' +
          targetPacksForMove.length +
          ' more would exceed maximum capacity of 4 packs per rack.'
      );
      return;
    }

    const loc = {
      lineId: selectedLine,
      rackNumber: selectedRack,
      rackSlot: selectedSlot,
    };

    if (onMoveMultiplePacksToLocation) {
      onMoveMultiplePacksToLocation(
        targetPacksForMove.map((p) => p.id),
        loc
      );
    } else if (onMovePackToLocation) {
      targetPacksForMove.forEach((p) => onMovePackToLocation(p.id, loc));
    }

    setIsLocationModalOpen(false);
    setTargetPacksForMove([]);
  };

  // Check if current user can edit a specific pack
  const canEditPack = (pack: BatteryPack) => {
    if (isSuperAdmin || isManager || isSupervisor) return true;
    // Employee can edit ONLY if status is PENDING_APPROVAL and was inwarded by them
    if (pack.status === 'PENDING_APPROVAL') {
      return (
        !pack.inwardBy ||
        pack.inwardBy === currentUser?.name ||
        pack.inwardBy === currentUser?.username ||
        pack.inwardBy === 'Staff Operator'
      );
    }
    return false;
  };

  // Open Edit Modal
  const handleOpenEditModal = (pack: BatteryPack) => {
    if (!canEditPack(pack)) {
      alert('Approved packs can only be edited by Supervisor, Manager, or Super Admin.');
      return;
    }
    setEditingPack(pack);
    setEditPackNumber(pack.packNumber);
    setEditPackType(pack.packType);
    setEditDocumentNo(pack.documentNo || '');
    setEditDealership(pack.dealershipName || '');
    setEditReceivedState(pack.receivedState || '');
    setEditTransportName(pack.transportName || '');
    setEditRemark(pack.remark || '');
    setEditHasStamp(pack.hasInwardStamp);
  };

  // Save Edit Pack
  const handleSaveEditPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPack) return;

    const cleanNum = editPackNumber.trim();
    if (!cleanNum) {
      alert('Pack Number cannot be empty.');
      return;
    }

    const derivedModel = deriveModelFromShorthand(cleanNum, editPackType);

    const updated: BatteryPack = {
      ...editingPack,
      packNumber: cleanNum,
      packType: derivedModel,
      documentNo: editDocumentNo.trim(),
      dealershipName: editDealership.trim(),
      receivedState: editReceivedState.trim(),
      transportName: editTransportName.trim(),
      remark: editRemark.trim(),
      hasInwardStamp: editHasStamp,
    };

    if (onEditPack) {
      onEditPack(updated);
    }
    setEditingPack(null);
  };

  // Delete / Remove Pack Handler (Strictly Super Admin & Manager)
  const handleDeletePackPrompt = (pack: BatteryPack) => {
    if (!isSuperAdmin && !isManager) {
      alert('Permission Denied: Only Super Admin and Manager are authorized to delete packs.');
      return;
    }

    if (
      confirm(
        'Are you sure you want to permanently delete Pack #' +
          pack.packNumber +
          ' (Doc #' +
          (pack.documentNo || 'N/A') +
          ') from the warehouse system and Supabase database?'
      )
    ) {
      if (onDeletePack) {
        onDeletePack(pack.id);
      }
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredPacks.map((p, idx) => ({
      'Sr No': idx + 1,
      'Pack Number': p.packNumber,
      'Product Name': p.packType,
      'Status': p.status,
      'Current Location': p.currentLocation || p.locationArea || 'Inward Area',
      'Document No': p.documentNo || '',
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleDateString('en-IN') : '',
      'Dealership Name': p.dealershipName || '',
      'Received State': p.receivedState || '',
      'Transporter': p.transportName || '',
      'Tata Inward Stamp': p.hasInwardStamp ? 'YES' : 'NO',
      'Missing Plate': p.isWithoutPlate ? 'YES' : 'NO',
      'Inward By': p.inwardBy || '',
      'Approved By': p.inwardApprovedBy || '',
      'Dispatched By': p.dispatchedBy || '',
      'Dispatched To': p.dispatchToAddress || '',
      'Vehicle No': p.dispatchVehicleNo || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inward_Register');
    XLSX.writeFile(wb, 'Tata_Inward_Register_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Inward Register
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Inward Log & Receiving Register
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Strict record of all inward dock shipments, approval workflows, locations, and dispatch statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Today Count Badge */}
          <button
            onClick={handleQuickTodayFilter}
            className={'px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ' +
              (appliedDatePreset === 'TODAY' ? 'bg-orange-600 text-white' : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200')}
          >
            <span>📅 Today: {todayInwardCount} Inwarded</span>
          </button>

          {pendingPacks.length > 0 && (isSupervisor || isManager || isSuperAdmin) && (
            <button
              onClick={() => setIsApprovalModalOpen(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Review Pending ({pendingPacks.length})</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Pack Serial, Doc No, Dealership..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Lifecycle Statuses</option>
              <option value="INWARD_AREA">In Inward Area</option>
              <option value="IN_STORAGE">In Line Storage Racks</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          {/* Model Filter */}
          <div className="sm:col-span-3">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Battery Models</option>
              {ALL_PACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Reset All */}
          <div className="sm:col-span-2 flex items-center justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setModelFilter('ALL');
                handleResetDateFilter();
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Date Filter Bar with Today Shortcut */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Date Range:</span>
            {(
              [
                { id: 'ALL', label: 'All Dates' },
                { id: 'TODAY', label: '📅 Today' },
                { id: '7_DAYS', label: 'Last 7 Days' },
                { id: '30_DAYS', label: 'Last 30 Days' },
                { id: '3_MONTHS', label: '3 Months' },
                { id: '1_YEAR', label: '1 Year' },
                { id: 'CUSTOM', label: 'Custom Date' },
              ] as { id: DateRangeOption; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedDatePreset(opt.id);
                  if (opt.id !== 'CUSTOM') {
                    setAppliedDatePreset(opt.id);
                  }
                }}
                className={'px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ' +
                  (selectedDatePreset === opt.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700')}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedDatePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <button
                onClick={handleApplyDateFilter}
                className="px-3 py-1 bg-blue-600 text-white rounded font-bold text-xs"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedPackIds.size > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <span>Selected {selectedPackIds.size} pack(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBatchLocationModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Allocate to Line Racks</span>
            </button>
            <button
              onClick={() => onSendMultipleToDispatch(Array.from(selectedPackIds))}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Send to Dispatch Cart</span>
            </button>
          </div>
        </div>
      )}

      {/* Inward Register Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedPackIds.size === filteredPacks.length && filteredPacks.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                </th>
                <th className="p-3">#</th>
                <th className="p-3">Pack Number</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Current Location</th>
                <th className="p-3">Document No</th>
                <th className="p-3">Inward Date</th>
                <th className="p-3">Dealership / Source</th>
                <th className="p-3">Inwarded By</th>
                <th className="p-3">Tata Stamp</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPacks.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    No inward shipments found matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredPacks.map((pack, index) => {
                  const isDispatched = pack.status === 'DISPATCHED';
                  const isSelected = selectedPackIds.has(pack.id);
                  const model = BATTERY_MODELS[pack.packType];
                  const userCanEdit = canEditPack(pack);
                  const userCanDelete = isSuperAdmin || isManager;

                  return (
                    <tr
                      key={pack.id}
                      className={'hover:bg-slate-50/80 transition ' +
                        (isSelected ? 'bg-blue-50/40 ' : '') +
                        (isDispatched ? 'bg-rose-50/20' : '')}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPack(pack.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded"
                        />
                      </td>
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
                      <td className="p-3 font-mono-code font-bold text-slate-800">
                        {pack.currentLocation || pack.locationArea || 'Inward Area'}
                      </td>
                      <td className="p-3 font-mono-code font-bold text-blue-700">{pack.documentNo || '—'}</td>
                      <td className="p-3 font-mono-code text-slate-600">
                        {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-slate-800 max-w-xs truncate">{pack.dealershipName || '—'}</td>
                      <td className="p-3 text-slate-700 font-medium">{pack.inwardBy || 'Staff'}</td>
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
                        ) : pack.status === 'PENDING_APPROVAL' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Allocate Location Button */}
                          {!isDispatched && (
                            <button
                              type="button"
                              onClick={() => handleOpenLocationModal(pack)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="Set Line & Rack Location"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Pack Button */}
                          {userCanEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(pack)}
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Edit Inward Information"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Pack Button (Super Admin / Manager ONLY) */}
                          {userCanDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeletePackPrompt(pack)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete / Remove Pack from Warehouse System"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Details */}
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Inward Pack Modal */}
      {editingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Inward Pack #{editingPack.packNumber}</h3>
                <p className="text-slate-500 text-[11px]">Correct serial number, model, or document details.</p>
              </div>
              <button onClick={() => setEditingPack(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPack} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pack Serial Number</label>
                <input
                  type="text"
                  value={editPackNumber}
                  onChange={(e) => setEditPackNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono-code font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Model</label>
                <select
                  value={editPackType}
                  onChange={(e) => setEditPackType(e.target.value as BatteryPackType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900"
                >
                  {ALL_PACK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Document / Challan No</label>
                  <input
                    type="text"
                    value={editDocumentNo}
                    onChange={(e) => setEditDocumentNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono-code"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dealership / Source</label>
                  <input
                    type="text"
                    value={editDealership}
                    onChange={(e) => setEditDealership(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Received State</label>
                  <input
                    type="text"
                    value={editReceivedState}
                    onChange={(e) => setEditReceivedState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transporter</label>
                  <input
                    type="text"
                    value={editTransportName}
                    onChange={(e) => setEditTransportName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 font-bold text-emerald-800 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editHasStamp}
                    onChange={(e) => setEditHasStamp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Tata Inward Stamp Verified OK</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Move to Line Allocation */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Allocate Storage Line & Rack</h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
              Allocating <strong>{targetPacksForMove.length} pack(s)</strong> to physical warehouse rack.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Warehouse Line</label>
                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900"
                >
                  {warehouseLinesList.map((l) => (
                    <option key={l} value={l}>
                      Line {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rack Number (R-01 to R-160)</label>
                  <input
                    type="number"
                    min={1}
                    max={160}
                    value={selectedRack}
                    onChange={(e) => setSelectedRack(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900 font-mono-code"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Level / Slot (1-4)</label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900"
                  >
                    <option value={1}>Level L-01 (Base)</option>
                    <option value={2}>Level L-02 (Mid 1)</option>
                    <option value={3}>Level L-03 (Mid 2)</option>
                    <option value={4}>Level L-04 (Top)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteLocationMove}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Confirm Placement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Supervisor Approval Table */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-slate-900 text-sm">Supervisor Inward Review ({pendingPacks.length} Pending)</h3>
              </div>
              <button onClick={() => setIsApprovalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="p-3">#</th>
                      <th className="p-3">Pack Number</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Doc No</th>
                      <th className="p-3">Dealership</th>
                      <th className="p-3">Submitted By</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingPacks.map((pack, idx) => (
                      <tr key={pack.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono-code font-bold text-slate-900">#{pack.packNumber}</td>
                        <td className="p-3 font-bold">{pack.packType}</td>
                        <td className="p-3 font-mono-code text-blue-700">{pack.documentNo}</td>
                        <td className="p-3">{pack.dealershipName}</td>
                        <td className="p-3 font-medium text-slate-700">{pack.inwardBy}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onApproveInwardPack(pack.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
