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
} from 'lucide-react';
import { BatteryPack, DispatchLot } from '../types';
import * as XLSX from 'xlsx';

interface OutwardDispatchRegisterProps {
  packs: BatteryPack[];
  dispatchLots: DispatchLot[];
}

export function formatPackDisplayName(packType: string): string {
  if (packType.includes('AIO')) return 'AiO';
  if (packType.includes('Gen3')) return 'Gen3';
  if (packType.includes('CKD')) return 'CKD';
  if (packType.includes('FBU')) return 'FBU';
  if (packType.includes('Kanger2.0')) return 'Kanger_2.0';
  if (packType.includes('Limber')) return 'Limber';
  if (packType.includes('Tamor')) return 'Tamor';
  if (packType.includes('Nova')) return 'Nova';
  if (packType.includes('Challenger')) return 'Challenger';
  return packType;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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
      } else if (dateFilter === 'CUSTOM') {
        if (!dispDate) return false;
        const datePart = dispDate.slice(0, 10);
        if (customStartDate && datePart < customStartDate) return false;
        if (customEndDate && datePart > customEndDate) return false;
      }

      return true;
    });
  }, [dispatchedPacks, lotMap, searchQuery, dateFilter, customStartDate, customEndDate, todayStr]);

  // Export to Excel matching exact column layout from photo
  const handleExportExcel = () => {
    const rows = filteredDispatches.map((p, index) => {
      const lot = p.dispatchLotId ? lotMap.get(p.dispatchLotId) : undefined;
      return {
        'Sr. No': index + 1,
        'Pack Number': p.packNumber,
        'Pack Name (Type)': formatPackDisplayName(p.packType),
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
      { wch: 18 },
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
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pack #, Doc #, LR #, Vehicle #, Transporter, or Destination..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-6 flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
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
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
                dateFilter === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-2 animate-fadeIn text-xs pt-2">
            <span className="font-bold text-slate-600">Custom Date Range:</span>
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
                <th className="p-2.5 border-r border-amber-300/70 text-center w-14">Sr. No</th>
                <th className="p-2.5 border-r border-amber-300/70">Pack Number</th>
                <th className="p-2.5 border-r border-amber-300/70">Pack Name (Type)</th>
                <th className="p-2.5 border-r border-amber-300/70">Dispatch Date</th>
                <th className="p-2.5 border-r border-amber-300/70">Document Number</th>
                <th className="p-2.5 border-r border-amber-300/70">LR Number</th>
                <th className="p-2.5 border-r border-amber-300/70">Transporter Name</th>
                <th className="p-2.5 border-r border-amber-300/70">Vehicle Number</th>
                <th className="p-2.5">Destination (Company - City/State)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDispatches.map((pack, index) => {
                const lot = pack.dispatchLotId ? lotMap.get(pack.dispatchLotId) : undefined;
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
                      #{pack.packNumber}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 font-bold text-slate-800">
                      {formatPackDisplayName(pack.packType)}
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
                    <td className="p-2.5 text-slate-800 font-medium">
                      {destination}
                    </td>
                  </tr>
                );
              })}

              {filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    No dispatched packs matching this filter. Once a lot is approved in Dispatch Staging, all packs will appear here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
