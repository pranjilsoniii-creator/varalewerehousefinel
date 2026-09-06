import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  Calendar,
  Truck,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, DispatchLot } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, COMMON_TRANSPORTERS, getProductNameAndType } from '../data/batteryCatalog';
import * as XLSX from 'xlsx';

interface OutwardDispatchRegisterProps {
  packs: BatteryPack[];
  dispatchLots: DispatchLot[];
  onEditPack?: (updatedPack: BatteryPack) => void;
}

export function formatPackDisplayName(packType: string): string {
  const info = getProductNameAndType(packType);
  return info.productType;
}

export function formatIndianDate(dateStr?: string): string {
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

export const OutwardDispatchRegister: React.FC<OutwardDispatchRegisterProps> = ({
  packs,
  dispatchLots,
  onEditPack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'SPECIFIC_DATE' | 'CUSTOM'>('ALL');
  const [specificDate, setSpecificDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Edit Pack Modal State
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

  // Map of lots for fast lookup
  const lotMap = useMemo(() => {
    const map = new Map<string, DispatchLot>();
    dispatchLots.forEach((lot) => map.set(lot.id, lot));
    return map;
  }, [dispatchLots]);

  // All Dispatched Packs
  const dispatchedPacks = useMemo(() => {
    return packs.filter((p) => p.status === 'DISPATCHED');
  }, [packs]);

  // Filtered Dispatched Packs
  const filteredDispatches = useMemo(() => {
    const now = new Date();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;

    return dispatchedPacks.filter((p) => {
      const lot = p.dispatchLotId ? lotMap.get(p.dispatchLotId) : undefined;
      const docNo = p.dispatchDocNo || lot?.transportDocNo || lot?.lotNumber || '—';
      const lrNo = p.dispatchLrNo || lot?.lrNumber || '—';
      const transportName = p.dispatchTransporter || lot?.transportName || 'Sahyadri Enterprises';
      const vehicleNo = p.dispatchVehicleNo || lot?.vehicleNumber || '—';
      const destination = p.dispatchToCustomer || lot?.consigneeName || 'TATA AUTOCOMP SYSTEMS LTD - Chakan';

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPack = p.packNumber.toLowerCase().includes(q);
        const matchDoc = docNo.toLowerCase().includes(q);
        const matchLr = lrNo.toLowerCase().includes(q);
        const matchTrans = transportName.toLowerCase().includes(q);
        const matchVeh = vehicleNo.toLowerCase().includes(q);
        const matchDest = destination.toLowerCase().includes(q);
        const matchType = p.packType.toLowerCase().includes(q);
        if (!matchPack && !matchDoc && !matchLr && !matchTrans && !matchVeh && !matchDest && !matchType) {
          return false;
        }
      }

      // Date Filter
      const dispDate = p.dispatchedAt || lot?.timestamp;
      if (dateFilter === 'TODAY') {
        if (!dispDate || dispDate.slice(0, 10) !== todayStr) return false;
      } else if (dateFilter === '7_DAYS') {
        if (!dispDate) return false;
        const time = new Date(dispDate).getTime();
        if (now.getTime() - time > ms7Days) return false;
      } else if (dateFilter === '30_DAYS') {
        if (!dispDate) return false;
        const time = new Date(dispDate).getTime();
        if (now.getTime() - time > ms30Days) return false;
      } else if (dateFilter === 'SPECIFIC_DATE') {
        if (!dispDate) return false;
        if (specificDate && dispDate.slice(0, 10) !== specificDate) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (!dispDate) return false;
        const datePart = dispDate.slice(0, 10);
        if (customStartDate && datePart < customStartDate) return false;
        if (customEndDate && datePart > customEndDate) return false;
      }

      return true;
    });
  }, [dispatchedPacks, lotMap, searchQuery, dateFilter, specificDate, customStartDate, customEndDate, todayStr]);

  // Open Edit Modal
  const handleOpenEditModal = (pack: BatteryPack) => {
    const lot = pack.dispatchLotId ? lotMap.get(pack.dispatchLotId) : undefined;
    const rawDispDate = pack.dispatchedAt || lot?.timestamp || new Date().toISOString();
    const dateFormatted = rawDispDate.slice(0, 10);

    setEditingPack(pack);
    setEditForm({
      packNumber: pack.packNumber,
      packType: pack.packType,
      dispatchDate: dateFormatted,
      dispatchDocNo: pack.dispatchDocNo || lot?.transportDocNo || lot?.lotNumber || '',
      dispatchLrNo: pack.dispatchLrNo || lot?.lrNumber || '',
      dispatchTransporter: pack.dispatchTransporter || lot?.transportName || COMMON_TRANSPORTERS[0],
      dispatchVehicleNo: pack.dispatchVehicleNo || lot?.vehicleNumber || '',
      dispatchToCustomer: pack.dispatchToCustomer || lot?.consigneeName || '',
      dispatchToAddress: pack.dispatchToAddress || lot?.consigneeAddress || '',
      notes: pack.notes || lot?.notes || '',
    });
  };

  // Save Edit Pack
  const handleSaveEditPack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPack || !onEditPack) return;

    const finalDispIso = editForm.dispatchDate
      ? new Date(editForm.dispatchDate + 'T12:00:00.000Z').toISOString()
      : editingPack.dispatchedAt || new Date().toISOString();

    const updated: BatteryPack = {
      ...editingPack,
      packNumber: editForm.packNumber.trim(),
      packType: editForm.packType,
      dispatchedAt: finalDispIso,
      dispatchDocNo: editForm.dispatchDocNo.trim(),
      dispatchLrNo: editForm.dispatchLrNo.trim(),
      dispatchTransporter: editForm.dispatchTransporter.trim(),
      dispatchVehicleNo: editForm.dispatchVehicleNo.trim(),
      dispatchToCustomer: editForm.dispatchToCustomer.trim(),
      dispatchToAddress: editForm.dispatchToAddress.trim(),
      notes: editForm.notes.trim(),
      currentLocation: `Dispatched to ${editForm.dispatchToCustomer.trim() || 'EV Plant'}`,
    };

    onEditPack(updated);
    setEditingPack(null);
  };

  // Export to Excel matching exact column layout
  const handleExportExcel = () => {
    const rows = filteredDispatches.map((p, index) => {
      const lot = p.dispatchLotId ? lotMap.get(p.dispatchLotId) : undefined;
      const { productName, productType } = getProductNameAndType(p.packType);
      return {
        'Sr. No': index + 1,
        'Pack Number': p.packNumber,
        'Product Name': productName,
        'Product Type': productType,
        'Dispatch Date': formatIndianDate(p.dispatchedAt || lot?.timestamp),
        'Document Number': p.dispatchDocNo || lot?.transportDocNo || lot?.lotNumber || 'DCVRL/26-27-0001',
        'LR Number': p.dispatchLrNo || lot?.lrNumber || '32997',
        'Transporter Name': p.dispatchTransporter || lot?.transportName || 'Sahyadri Enterprises',
        'Vehicle Number': p.dispatchVehicleNo || lot?.vehicleNumber || 'MH14MH3845',
        'Destination (Company - City/State)': p.dispatchToCustomer || lot?.consigneeName || 'TATA AUTOCOMP SYSTEMS LTD - Chakan',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispatch List');

    // Auto-width columns
    const colWidths = [
      { wch: 8 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
      { wch: 16 },
      { wch: 38 },
    ];
    worksheet['!cols'] = colWidths;

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Tata_AutoComp_Dispatch_List_${dateTag}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Top Action & Summary Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold uppercase tracking-wider">
                Outward Dispatch Ledger
              </span>
              <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp (Varale B300)</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-display">
              Vehicle Dispatch Register & Pack Traceability
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact dispatch manifest showing Document Numbers, LR Numbers, Transporters, Vehicles, and Destinations.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Dispatch Sheet (.xlsx)</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs pt-3 border-t border-slate-100">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pack #, Doc #, LR #, Vehicle #, Transporter, or Destination..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-7 flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                dateFilter === '7_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('30_DAYS')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                dateFilter === '30_DAYS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('SPECIFIC_DATE')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                dateFilter === 'SPECIFIC_DATE'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Select Date</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                dateFilter === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Range
            </button>
          </div>
        </div>

        {/* Specific Date Filter Selector */}
        {dateFilter === 'SPECIFIC_DATE' && (
          <div className="flex items-center gap-2 animate-fadeIn text-xs pt-2 bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
            <span className="font-bold text-blue-900 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Filter by Specific Dispatch Date:
            </span>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="bg-white border border-blue-300 rounded px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            />
            {specificDate && (
              <button
                type="button"
                onClick={() => setDateFilter('ALL')}
                className="text-xs text-blue-700 hover:text-blue-900 font-bold underline ml-2 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* Custom Range Filter */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 animate-fadeIn text-xs pt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700">Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900"
            />
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setDateFilter('ALL');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 font-bold underline ml-2 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Style Table Matching User's Screenshot */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-amber-300/40 border-b border-amber-300 flex items-center justify-between text-xs font-bold text-slate-900">
          <span>Outward Dispatch Sheet ({filteredDispatches.length} Dispatched Packs Logged)</span>
          <span className="font-mono-code text-[11px] text-slate-700">Format: DCVRL Manifest</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-amber-200/60 border-b border-amber-300 text-[11px] font-extrabold text-slate-900 whitespace-nowrap">
                <th className="p-2.5 border-r border-amber-300/70 text-center w-12">Sr. No</th>
                <th className="p-2.5 border-r border-amber-300/70">Pack Number</th>
                <th className="p-2.5 border-r border-amber-300/70">Product Name</th>
                <th className="p-2.5 border-r border-amber-300/70">Product Type</th>
                <th className="p-2.5 border-r border-amber-300/70">Dispatch Date</th>
                <th className="p-2.5 border-r border-amber-300/70">Document Number</th>
                <th className="p-2.5 border-r border-amber-300/70">LR Number</th>
                <th className="p-2.5 border-r border-amber-300/70">Transporter Name</th>
                <th className="p-2.5 border-r border-amber-300/70">Vehicle Number</th>
                <th className="p-2.5 border-r border-amber-300/70">Destination (Company - City/State)</th>
                <th className="p-2.5 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDispatches.map((pack, index) => {
                const lot = pack.dispatchLotId ? lotMap.get(pack.dispatchLotId) : undefined;
                const { productName, productType } = getProductNameAndType(pack.packType);
                const docNo = pack.dispatchDocNo || lot?.transportDocNo || lot?.lotNumber || 'DCVRL/26-27-0001';
                const lrNo = pack.dispatchLrNo || lot?.lrNumber || '32997';
                const transportName = pack.dispatchTransporter || lot?.transportName || 'Sahyadri Enterprises';
                const vehicleNo = pack.dispatchVehicleNo || lot?.vehicleNumber || 'MH14MH3845';
                const destination = pack.dispatchToCustomer || lot?.consigneeName || 'TATA AUTOCOMP SYSTEMS LTD - Chakan';
                const dispDateStr = formatIndianDate(pack.dispatchedAt || lot?.timestamp);

                return (
                  <tr key={pack.id} className="hover:bg-amber-50/40 transition font-sans">
                    <td className="p-2.5 border-r border-slate-100 font-mono-code text-center text-slate-600 font-bold">
                      {index + 1}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono-code font-extrabold text-slate-900 text-sm">
                      <div>#{pack.packNumber}</div>
                      {pack.isDifferentSerial && pack.challanPackNumber && (
                        <div className="text-[9px] text-purple-700 font-bold font-mono-code">
                          (Challan: #{pack.challanPackNumber})
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-900 whitespace-nowrap">
                      {productName}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-800 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px]">
                        {productType}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono-code text-slate-700">
                      {dispDateStr}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono-code font-bold text-blue-700">
                      {docNo}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono-code text-slate-800">
                      {lrNo}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-800 font-medium">
                      {transportName}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-mono-code font-bold text-slate-900">
                      {vehicleNo}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-800 font-medium">
                      {destination}
                    </td>
                    <td className="p-2.5 text-right">
                      {onEditPack && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(pack)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded transition cursor-pointer"
                          title="Edit Dispatch Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    No dispatched packs matching this filter. Once a lot is approved in Dispatch Staging, all packs will appear here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dispatched Pack Modal */}
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
                  <label className="block font-bold text-slate-700 mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={editForm.dispatchTransporter}
                    onChange={(e) => setEditForm({ ...editForm, dispatchTransporter: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Truck No.</label>
                  <input
                    type="text"
                    value={editForm.dispatchVehicleNo}
                    onChange={(e) => setEditForm({ ...editForm, dispatchVehicleNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destination Customer / Plant <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.dispatchToCustomer}
                    onChange={(e) => setEditForm({ ...editForm, dispatchToCustomer: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Destination Address</label>
                  <textarea
                    value={editForm.dispatchToAddress}
                    onChange={(e) => setEditForm({ ...editForm, dispatchToAddress: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Remarks / Notes</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPack(null)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes & Sync</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
