import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Download,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ArrowRight,
} from 'lucide-react';
import { DailyStockRecord, DailyStockRow } from '../types';
import { STANDARD_DAILY_PACK_NAMES, createDefaultDailyStockRows } from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

interface DailyStockMaintenanceViewProps {
  dailyStockRecords: DailyStockRecord[];
  onSaveDailyStockRecord: (record: DailyStockRecord) => void;
  onDeleteDailyStockRecord?: (recordId: string) => void;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

export const DailyStockMaintenanceView: React.FC<DailyStockMaintenanceViewProps> = ({
  dailyStockRecords = [],
  onSaveDailyStockRecord,
  onDeleteDailyStockRecord,
}) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor } = useAuth();

  // Selected date state (defaults to today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active user name for Maintained By field
  const currentOperatorName = useMemo(() => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.username) return currentUser.username;
    return 'Jitendra Soni';
  }, [currentUser]);

  // Current record for the selected date
  const currentRecord = useMemo(() => {
    return dailyStockRecords.find((r) => r.date === selectedDate);
  }, [dailyStockRecords, selectedDate]);

  // Find nearest previous record before selectedDate to carry forward closing stock
  const previousRecord = useMemo(() => {
    const olderRecords = dailyStockRecords
      .filter((r) => r.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    return olderRecords[0] || null;
  }, [dailyStockRecords, selectedDate]);

  // Working state for the table rows
  const [editRows, setEditRows] = useState<DailyStockRow[]>([]);

  // Sync editRows when selectedDate or currentRecord changes
  useEffect(() => {
    if (currentRecord) {
      setEditRows(JSON.parse(JSON.stringify(currentRecord.rows)));
      setIsEditing(false);
    } else {
      // Initialize new rows with opening stock from previous record
      const prevClosingRows = previousRecord?.rows;
      const initialRows = createDefaultDailyStockRows(currentOperatorName, prevClosingRows);
      setEditRows(initialRows);
      setIsEditing(true); // default to edit mode if no record exists yet
    }
  }, [selectedDate, currentRecord, previousRecord, currentOperatorName]);

  // Handle cell change with auto-calculation of Total Available and Closing Stock
  const handleCellChange = (
    index: number,
    field: 'openingStock' | 'receiveQty' | 'dispatchQty' | 'maintainedBy' | 'packName',
    value: string
  ) => {
    setEditRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'maintainedBy') {
        row.maintainedBy = value;
      } else if (field === 'packName') {
        row.packName = value;
      } else {
        const numVal = Math.max(0, parseInt(value, 10) || 0);
        if (field === 'openingStock') row.openingStock = numVal;
        if (field === 'receiveQty') row.receiveQty = numVal;
        if (field === 'dispatchQty') row.dispatchQty = numVal;

        // Auto calculate Total Available & Closing Stock
        row.totalAvailable = (row.openingStock || 0) + (row.receiveQty || 0);
        row.closingStock = (row.totalAvailable || 0) - (row.dispatchQty || 0);
      }

      updated[index] = row;
      return updated;
    });
  };

  // Live Daily Summary Totals
  const summaryTotals = useMemo(() => {
    let totalOpening = 0;
    let totalReceived = 0;
    let totalDispatch = 0;
    let totalClosing = 0;

    editRows.forEach((r) => {
      totalOpening += Number(r.openingStock) || 0;
      totalReceived += Number(r.receiveQty) || 0;
      totalDispatch += Number(r.dispatchQty) || 0;
      totalClosing += Number(r.closingStock) || 0;
    });

    return {
      totalOpening,
      totalReceived,
      totalDispatch,
      totalClosing,
    };
  }, [editRows]);

  // Handler: Save and Exit
  const handleSave = () => {
    const recordId = currentRecord?.id || `stock-${selectedDate}`;
    const newRecord: DailyStockRecord = {
      id: recordId,
      date: selectedDate,
      displayDate: formatDisplayDate(selectedDate),
      rows: editRows.map((r, idx) => ({
        sr: idx + 1,
        packName: r.packName,
        openingStock: Number(r.openingStock) || 0,
        receiveQty: Number(r.receiveQty) || 0,
        totalAvailable: (Number(r.openingStock) || 0) + (Number(r.receiveQty) || 0),
        dispatchQty: Number(r.dispatchQty) || 0,
        closingStock: (Number(r.openingStock) || 0) + (Number(r.receiveQty) || 0) - (Number(r.dispatchQty) || 0),
        maintainedBy: r.maintainedBy || currentOperatorName,
      })),
      totalOpeningStock: summaryTotals.totalOpening,
      totalReceivedToday: summaryTotals.totalReceived,
      totalDispatchToday: summaryTotals.totalDispatch,
      totalClosingStock: summaryTotals.totalClosing,
      createdAt: currentRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByName: currentRecord?.createdByName || currentOperatorName,
      createdByUsername: currentRecord?.createdByUsername || currentUser?.username || 'operator',
      isLocked: currentRecord?.isLocked || false,
    };

    onSaveDailyStockRecord(newRecord);
    setIsEditing(false);
    setSaveSuccessMsg(`Daily Stock Maintenance Record for ${formatDisplayDate(selectedDate)} saved successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Handler: Lock/Unlock Record (Manager/Super Admin)
  const handleToggleLock = () => {
    if (!currentRecord) return;
    const updated: DailyStockRecord = {
      ...currentRecord,
      isLocked: !currentRecord.isLocked,
      updatedAt: new Date().toISOString(),
    };
    onSaveDailyStockRecord(updated);
  };

  // Handler: Export exact formatted Excel matching the photo
  const handleExportExcel = () => {
    const dateFormatted = formatDisplayDate(selectedDate);
    const filename = `Daily_Stock_Maintance_${selectedDate}.xlsx`;

    // 1. Build Header & Table Rows
    const wsData: any[][] = [];

    // Title Row
    wsData.push(['Daily Stock Maintance', '', '', '', `Date - ${dateFormatted}`]);
    wsData.push([]); // blank

    // Table Header
    wsData.push([
      'Sr',
      'Pack Name',
      'Opening Stock',
      'Receive Qty',
      'Total Availble',
      'Dispatch Qty',
      'Closing Stock',
      'Maintance By',
    ]);

    // Table Body
    editRows.forEach((r, idx) => {
      wsData.push([
        idx + 1,
        r.packName,
        r.openingStock,
        r.receiveQty,
        r.totalAvailable,
        r.dispatchQty,
        r.closingStock,
        r.maintainedBy || currentOperatorName,
      ]);
    });

    wsData.push([]); // blank

    // Daily Summary Box
    wsData.push(['DAILY SUMMARY', '']);
    wsData.push(['Total Opening Stock', summaryTotals.totalOpening]);
    wsData.push(['Total Received Today', summaryTotals.totalReceived]);
    wsData.push(['Total Dispatch Today', summaryTotals.totalDispatch]);
    wsData.push(['Total Closing Stock', summaryTotals.totalClosing]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set Column Widths
    ws['!cols'] = [
      { wch: 6 },  // Sr
      { wch: 18 }, // Pack Name
      { wch: 16 }, // Opening Stock
      { wch: 14 }, // Receive Qty
      { wch: 16 }, // Total Availble
      { wch: 14 }, // Dispatch Qty
      { wch: 16 }, // Closing Stock
      { wch: 20 }, // Maintance By
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dateFormatted.replace(/\//g, '-'));
    XLSX.writeFile(wb, filename);
  };

  // Quick Date Jump Handlers
  const handleJumpDate = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 font-display">
                  Daily Stock Maintenance
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase font-mono-code">
                  Manual Register
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Tata AutoComp Systems Limited - Varale Plant • Daily Battery Pack & Module Inventory
              </p>
            </div>
          </div>

          {/* Date Picker & Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleJumpDate(-1)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleJumpDate(1)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedDate === new Date().toISOString().slice(0, 10)
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {currentRecord ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Record Saved for {formatDisplayDate(selectedDate)} (Maintained by: {currentRecord.createdByName})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                No Saved Record for {formatDisplayDate(selectedDate)}
              </span>
            )}

            {currentRecord?.isLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold text-[10px]">
                <Lock className="w-3 h-3" /> Locked by Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(isSuperAdmin || isManager) && currentRecord && (
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                {currentRecord.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{currentRecord.isLocked ? 'Unlock Sheet' : 'Lock Sheet'}</span>
              </button>
            )}

            {!isEditing && currentRecord && !currentRecord.isLocked && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Sheet</span>
              </button>
            )}

            {isEditing && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Exit</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Excel-style Sheet Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Green Excel Header matching photo */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wide uppercase font-display">
              Daily Stock Maintance
            </span>
          </div>
          <div className="text-sm font-mono-code font-bold bg-emerald-900/80 px-3 py-1 rounded-lg border border-emerald-700">
            Date - {formatDisplayDate(selectedDate)}
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-700 text-white text-xs font-extrabold font-mono-code tracking-wider border-b border-emerald-800">
                <th className="py-3 px-3 w-12 text-center border-r border-emerald-600">Sr</th>
                <th className="py-3 px-4 border-r border-emerald-600">Pack Name</th>
                <th className="py-3 px-4 text-right border-r border-emerald-600">Opening Stock</th>
                <th className="py-3 px-4 text-right border-r border-emerald-600">Receive Qty</th>
                <th className="py-3 px-4 text-right border-r border-emerald-600 bg-emerald-800">Total Availble</th>
                <th className="py-3 px-4 text-right border-r border-emerald-600">Dispatch Qty</th>
                <th className="py-3 px-4 text-right border-r border-emerald-600 bg-emerald-800">Closing Stock</th>
                <th className="py-3 px-4">Maintance By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {editRows.map((row, idx) => (
                <tr
                  key={row.packName}
                  className={`hover:bg-slate-50 transition ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {/* Sr */}
                  <td className="py-2.5 px-3 text-center font-mono-code font-bold text-slate-500 border-r border-slate-200">
                    {idx + 1}
                  </td>

                  {/* Pack Name */}
                  <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                    {row.packName}
                  </td>

                  {/* Opening Stock */}
                  <td className="py-2.5 px-4 text-right border-r border-slate-200">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.openingStock}
                        onChange={(e) => handleCellChange(idx, 'openingStock', e.target.value)}
                        className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs"
                      />
                    ) : (
                      <span className="font-mono-code font-bold text-slate-800">
                        {row.openingStock}
                      </span>
                    )}
                  </td>

                  {/* Receive Qty */}
                  <td className="py-2.5 px-4 text-right border-r border-slate-200">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.receiveQty}
                        onChange={(e) => handleCellChange(idx, 'receiveQty', e.target.value)}
                        className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-emerald-50 border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs text-emerald-900"
                      />
                    ) : (
                      <span
                        className={`font-mono-code font-extrabold ${
                          row.receiveQty > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-600'
                        }`}
                      >
                        {row.receiveQty}
                      </span>
                    )}
                  </td>

                  {/* Total Available (Formula: Opening + Receive) */}
                  <td className="py-2.5 px-4 text-right font-mono-code font-extrabold text-slate-900 bg-emerald-50/30 border-r border-slate-200">
                    {row.totalAvailable}
                  </td>

                  {/* Dispatch Qty */}
                  <td className="py-2.5 px-4 text-right border-r border-slate-200">
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={row.dispatchQty}
                        onChange={(e) => handleCellChange(idx, 'dispatchQty', e.target.value)}
                        className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-blue-50 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs text-blue-900"
                      />
                    ) : (
                      <span
                        className={`font-mono-code font-extrabold ${
                          row.dispatchQty > 0 ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : 'text-slate-600'
                        }`}
                      >
                        {row.dispatchQty}
                      </span>
                    )}
                  </td>

                  {/* Closing Stock (Formula: Available - Dispatch) */}
                  <td className="py-2.5 px-4 text-right font-mono-code font-black text-slate-900 bg-emerald-50/40 border-r border-slate-200 text-sm">
                    {row.closingStock}
                  </td>

                  {/* Maintained By */}
                  <td className="py-2.5 px-4 text-slate-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.maintainedBy}
                        onChange={(e) => handleCellChange(idx, 'maintainedBy', e.target.value)}
                        placeholder="Operator Name..."
                        className="w-36 text-xs px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">
                        {row.maintainedBy || currentOperatorName}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DAILY SUMMARY Box (Yellow / Green matching photo) */}
        <div className="p-5 bg-slate-50 border-t border-slate-200">
          <div className="max-w-md bg-white border-2 border-emerald-700 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-emerald-700 text-white font-black text-xs px-4 py-2 uppercase tracking-wider font-mono-code">
              DAILY SUMMARY
            </div>
            <div className="divide-y divide-slate-200 text-xs font-mono-code">
              <div className="flex items-center justify-between p-2.5 bg-amber-200 text-slate-900 font-bold border-b border-amber-300">
                <span>Total Opening Stock</span>
                <span className="text-sm font-black">{summaryTotals.totalOpening}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-200 text-slate-900 font-bold border-b border-amber-300">
                <span>Total Received Today</span>
                <span className="text-sm font-black text-emerald-800">+{summaryTotals.totalReceived}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-amber-200 text-slate-900 font-bold border-b border-amber-300">
                <span>Total Dispatch Today</span>
                <span className="text-sm font-black text-blue-800">-{summaryTotals.totalDispatch}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-emerald-100 text-emerald-950 font-black border-t-2 border-emerald-600">
                <span>Total Closing Stock</span>
                <span className="text-base font-black text-emerald-900">{summaryTotals.totalClosing}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Stock Records Index Drawer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Historical Stock Sheets Log ({dailyStockRecords.length} Saved Dates)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          {dailyStockRecords
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setSelectedDate(rec.date)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                  rec.date === selectedDate
                    ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                    : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div>
                  <div className="font-mono-code font-bold text-xs text-slate-900">
                    {formatDisplayDate(rec.date)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Closing: <strong className="text-emerald-700 font-mono-code">{rec.totalClosingStock}</strong> • By: {rec.createdByName}
                  </div>
                </div>
                <ArrowRight className={`w-3.5 h-3.5 ${rec.date === selectedDate ? 'text-emerald-600' : 'text-slate-400'}`} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
