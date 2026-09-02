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
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';
import { WAREHOUSE_LINES } from '../data/seedWarehouse';
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
}

type DateRangeOption = 'ALL' | '7_DAYS' | '30_DAYS' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';

export const InwardRegisterView: React.FC<InwardRegisterViewProps> = ({
  packs,
  onApproveInwardPack,
  onApproveMultipleInwardPacks,
  onSendToDispatch,
  onSendMultipleToDispatch,
  onOpenPackDetails,
  onMovePackToLocation,
  onMoveMultiplePacksToLocation,
}) => {
  const { isSupervisor, isManager, isSuperAdmin, currentUser } = useAuth();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INWARD_AREA' | 'IN_STORAGE' | 'DISPATCHED' | 'PENDING_APPROVAL'>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');

  // Date Range Controls (Preset + Applied filter)
  const [selectedDatePreset, setSelectedDatePreset] = useState<DateRangeOption>('ALL');
  const [appliedDatePreset, setAppliedDatePreset] = useState<DateRangeOption>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedCustomStart, setAppliedCustomStart] = useState('');
  const [appliedCustomEnd, setAppliedCustomEnd] = useState('');

  // Persistent Multi-Selection by pack ID
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());

  // Location Allocation Modal (Move from Inward Area to Line A-01...B-25, R-01...R-160, L-01...L-04)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [targetPacksForMove, setTargetPacksForMove] = useState<BatteryPack[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>(WAREHOUSE_LINES[0]);
  const [selectedRack, setSelectedRack] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  // Supervisor Approval Inspection Modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  // Apply Date Filter button handler
  const handleApplyDateFilter = () => {
    setAppliedDatePreset(selectedDatePreset);
    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
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

    return packs.filter((pack) => {
      // 1. Search Query (Pack Number, Doc No, Dealership, Transporter)
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

      // 4. Date Range Filter (Applied preset)
      if (appliedDatePreset !== 'ALL' && pack.inwardDate) {
        const packTime = new Date(pack.inwardDate).getTime();
        if (isNaN(packTime)) return true;

        if (appliedDatePreset === '7_DAYS') {
          const days7 = 7 * 86400000;
          if (now - packTime > days7) return false;
        } else if (appliedDatePreset === '30_DAYS') {
          const days30 = 30 * 86400000;
          if (now - packTime > days30) return false;
        } else if (appliedDatePreset === '3_MONTHS') {
          const days90 = 90 * 86400000;
          if (now - packTime > days90) return false;
        } else if (appliedDatePreset === '6_MONTHS') {
          const days180 = 180 * 86400000;
          if (now - packTime > days180) return false;
        } else if (appliedDatePreset === '1_YEAR') {
          const days365 = 365 * 86400000;
          if (now - packTime > days365) return false;
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
  }, [packs, searchQuery, statusFilter, modelFilter, appliedDatePreset, appliedCustomStart, appliedCustomEnd]);

  // Pending approval packs list
  const pendingPacks = useMemo(() => {
    return packs.filter((p) => p.status === 'PENDING_APPROVAL');
  }, [packs]);

  // Multi-select toggle
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

  const handleSelectAllVisible = () => {
    const next = new Set(selectedPackIds);
    filteredPacks.forEach((p) => next.add(p.id));
    setSelectedPackIds(next);
  };

  const handleClearSelection = () => {
    setSelectedPackIds(new Set());
  };

  // Trigger Move to Line Modal
  const handleOpenMoveModal = (packsToMove: BatteryPack[]) => {
    setTargetPacksForMove(packsToMove);
    setIsLocationModalOpen(true);
  };

  const handleExecuteLocationMove = () => {
    if (targetPacksForMove.length === 0) return;
    const loc = {
      lineId: selectedLine,
      rackNumber: Number(selectedRack),
      rackSlot: Number(selectedSlot),
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
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Inward Log & Warehouse Stock Register
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Chronological date-wise record of all inward shipments, current locations, and dispatch statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="INWARD_AREA">Inward Area (Available)</option>
              <option value="IN_STORAGE">In Storage (Line & Rack)</option>
              <option value="DISPATCHED">Dispatched (Red Flag)</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
            </select>
          </div>

          {/* Model Filter */}
          <div className="sm:col-span-3">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Product Models (12)</option>
              {Object.keys(BATTERY_MODELS).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={selectedDatePreset}
              onChange={(e) => setSelectedDatePreset(e.target.value as DateRangeOption)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
              <option value="3_MONTHS">Last 3 Months</option>
              <option value="6_MONTHS">Last 6 Months</option>
              <option value="1_YEAR">Last 1 Year</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Date Filter Action Controls (Apply & Reset) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            {selectedDatePreset === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleApplyDateFilter}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filter</span>
            </button>

            {(appliedDatePreset !== 'ALL' || statusFilter !== 'ALL' || modelFilter !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  handleResetDateFilter();
                  setStatusFilter('ALL');
                  setModelFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 font-bold">{filteredPacks.length}</strong> of {packs.length} records
          </div>
        </div>
      </div>

      {/* Sticky Batch Action Bar (When rows selected) */}
      {selectedPackIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="font-bold text-orange-400 font-mono-code">{selectedPackIds.size} Packs Selected</span>
            <button
              onClick={handleClearSelection}
              className="text-slate-400 hover:text-white underline"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const selectedPacksList = packs.filter((p) => selectedPackIds.has(p.id));
                handleOpenMoveModal(selectedPacksList);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Move to Line / Rack</span>
            </button>

            <button
              onClick={() => {
                const pickIds = Array.from(selectedPackIds);
                onSendMultipleToDispatch(pickIds);
                setSelectedPackIds(new Set());
              }}
              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Dispatch Selected ({selectedPackIds.size})</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Excel-like Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllVisible}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Select All Visible ({filteredPacks.length})
            </button>
          </div>
        </div>

        {filteredPacks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No records found</p>
            <p className="text-xs text-slate-500">Inward new battery units to populate the register.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredPacks.length > 0 && filteredPacks.every((p) => selectedPackIds.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllVisible();
                        } else {
                          handleClearSelection();
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3">#</th>
                  <th className="p-3">Pack Number</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Current Location</th>
                  <th className="p-3">Doc / Challan No</th>
                  <th className="p-3">Inward Date</th>
                  <th className="p-3">Dealership / Source</th>
                  <th className="p-3">Transporter</th>
                  <th className="p-3">Tata Stamp</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPacks.map((pack, index) => {
                  const isDispatched = pack.status === 'DISPATCHED';
                  const isPending = pack.status === 'PENDING_APPROVAL';
                  const model = BATTERY_MODELS[pack.packType];
                  const isSelected = selectedPackIds.has(pack.id);

                  return (
                    <tr
                      key={pack.id}
                      className={'hover:bg-slate-50/80 transition ' +
                        (isDispatched ? 'bg-rose-50/30' : isSelected ? 'bg-blue-50/40' : '')}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPack(pack.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-mono-code text-slate-400">{index + 1}</td>
                      <td className="p-3 font-mono-code font-extrabold text-slate-900 text-sm">
                        #{pack.packNumber}
                      </td>
                      <td className="p-3">
                        <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                          {pack.packType}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold font-mono-code text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span>{pack.currentLocation || pack.locationArea || 'Inward Area'}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono-code font-bold text-blue-700">
                        {pack.documentNo || '—'}
                      </td>
                      <td className="p-3 font-mono-code text-slate-600 whitespace-nowrap">
                        {pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-slate-800 max-w-xs truncate">{pack.dealershipName || 'Tata Hub'}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{pack.transportName || '—'}</td>
                      <td className="p-3">
                        {pack.hasInwardStamp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
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
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Move to Line/Rack Action */}
                          {!isDispatched && !isPending && (
                            <button
                              type="button"
                              onClick={() => handleOpenMoveModal([pack])}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Assign/Move to Line & Rack"
                            >
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>Set Line</span>
                            </button>
                          )}

                          {/* Quick Dispatch 🚀 */}
                          {!isDispatched && !isPending && (
                            <button
                              type="button"
                              onClick={() => onSendToDispatch(pack)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="Send to Dispatch Staging"
                            >
                              <span>Dispatch</span>
                              <span>🚀</span>
                            </button>
                          )}

                          {/* Supervisor 1-Click Approve */}
                          {isPending && (isSupervisor || isManager || isSuperAdmin) && (
                            <button
                              type="button"
                              onClick={() => onApproveInwardPack(pack.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenPackDetails(pack)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                            title="View Full Details"
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

      {/* Modal 1: Move / Assign to Line & Rack */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900">
                  Assign Storage Location ({targetPacksForMove.length} Packs)
                </h3>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                Moving <strong>{targetPacksForMove.length} pack(s)</strong> from Inward Area to physical warehouse racks.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Warehouse Line (Line A-01 to A-25, B-01 to B-25)
                </label>
                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-900"
                >
                  {WAREHOUSE_LINES.map((l) => (
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
                  <label className="block font-bold text-slate-700 mb-1">Level / Slot (L-01 to L-04)</label>
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

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                New Current Location: <strong className="text-blue-700 font-mono-code">{selectedLine}, R-{String(selectedRack).padStart(2, '0')}, L-{String(selectedSlot).padStart(2, '0')}</strong>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold"
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

      {/* Modal 2: Supervisor Approval Inspection Table */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Supervisor Inward Review & Approval</h3>
                  <p className="text-[11px] text-slate-500">
                    Review incoming pack numbers and origin details submitted by employees before authorizing storage.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApprovalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="p-3">#</th>
                      <th className="p-3">Pack Number</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Doc No</th>
                      <th className="p-3">Dealership</th>
                      <th className="p-3">Transporter</th>
                      <th className="p-3">Submitted By</th>
                      <th className="p-3">Tata Stamp</th>
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
                        <td className="p-3">{pack.transportName}</td>
                        <td className="p-3 font-medium text-slate-700">{pack.inwardBy}</td>
                        <td className="p-3">
                          {pack.hasInwardStamp ? (
                            <span className="text-emerald-700 font-bold">VERIFIED OK</span>
                          ) : (
                            <span className="text-slate-500">No Stamp</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onApproveInwardPack(pack.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold"
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

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Total {pendingPacks.length} pending pack(s)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onApproveMultipleInwardPacks(pendingPacks.map((p) => p.id));
                    setIsApprovalModalOpen(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Approve All ({pendingPacks.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
