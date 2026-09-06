import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { DailyStockRecord, DailyStockRow } from '../types';
import { STANDARD_DAILY_PACK_NAMES, createDefaultDailyStockRows } from '../data/seedWarehouse';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

// Minimum allowed operational start date: 01/09/2026
export const MIN_STOCK_DATE = '2026-09-01';

interface DailyStockMaintenanceViewProps {
  dailyStockRecords: DailyStockRecord[];
  onSaveDailyStockRecord: (record: DailyStockRecord) => void;
  onDeleteDailyStockRecord?: (recordId: string) => void;
}

interface EditableStockRow {
  sr: number;
  packName: string;
  openingStock: number | string;
  receiveQty: number | string;
  totalAvailable: number;
  dispatchQty: number | string;
  closingStock: number;
  maintainedBy: string;
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
  const isAdminOrManager = Boolean(isSuperAdmin || isManager || isSupervisor);

  // Selected date state (defaults to today YYYY-MM-DD, minimum 2026-09-01)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return today >= MIN_STOCK_DATE ? today : MIN_STOCK_DATE;
  });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Live timer tick for 30-minute grace window calculation
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 20000); // tick every 20s
    return () => clearInterval(timer);
  }, []);

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

  // 30-Minute Grace Window Calculations
  const recordSavedTime = useMemo(() => {
    if (!currentRecord) return null;
    const timeStr = currentRecord.updatedAt || currentRecord.createdAt;
    const parsed = new Date(timeStr).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }, [currentRecord]);

  const minutesElapsed = useMemo(() => {
    if (!recordSavedTime) return 0;
    return (nowTimestamp - recordSavedTime) / (1000 * 60);
  }, [recordSavedTime, nowTimestamp]);

  const isWithin30MinWindow = minutesElapsed <= 30;
  const minutesLeft = Math.max(0, Math.ceil(30 - minutesElapsed));

  // Permissions: Who can edit this sheet?
  const canUserEdit = useMemo(() => {
    // 1. Managers, Super Admin, and Supervisors can ALWAYS edit at any time
    if (isAdminOrManager) return true;

    // 2. If no record has been created yet, employee can create & fill it
    if (!currentRecord) return true;

    // 3. If locked by admin, employee cannot edit
    if (currentRecord.isLocked) return false;

    // 4. Employee has exactly 30 minutes after saving to make corrections
    return isWithin30MinWindow;
  }, [isAdminOrManager, currentRecord, isWithin30MinWindow]);

  // If user lost edit permission while editing, auto-exit edit mode
  useEffect(() => {
    if (!canUserEdit && isEditing) {
      setIsEditing(false);
    }
  }, [canUserEdit, isEditing]);

  // Find nearest previous record before selectedDate to carry forward closing stock
  const previousRecord = useMemo(() => {
    const olderRecords = dailyStockRecords
      .filter((r) => r.date < selectedDate && r.date >= MIN_STOCK_DATE)
      .sort((a, b) => b.date.localeCompare(a.date));
    return olderRecords[0] || null;
  }, [dailyStockRecords, selectedDate]);

  // Working state for the table rows
  const [editRows, setEditRows] = useState<EditableStockRow[]>([]);

  // Sync editRows when selectedDate or currentRecord changes
  useEffect(() => {
    const existingRows = currentRecord?.rows || [];
    const prevClosingRows = previousRecord?.rows;

    // ALWAYS ensure all 10 standard items (Sr. 1 to 10) are present in the table!
    const all10Rows: EditableStockRow[] = STANDARD_DAILY_PACK_NAMES.map((packName, idx) => {
      const match = existingRows.find(
        (r: any) => r.packName.trim().toLowerCase() === packName.trim().toLowerCase()
      );

      if (match) {
        const op = Number(match.openingStock) || 0;
        const rc = Number(match.receiveQty) || 0;
        const dp = Number(match.dispatchQty) || 0;
        return {
          sr: idx + 1,
          packName: packName,
          openingStock: match.openingStock,
          receiveQty: match.receiveQty,
          totalAvailable: match.totalAvailable ?? (op + rc),
          dispatchQty: match.dispatchQty,
          closingStock: match.closingStock ?? (op + rc - dp),
          maintainedBy: match.maintainedBy || currentRecord?.createdByName || currentOperatorName,
        };
      }

      // If not in current record, carry forward previous closing stock (or 0)
      const prevMatch = prevClosingRows?.find(
        (r: any) => r.packName.trim().toLowerCase() === packName.trim().toLowerCase()
      );
      const prevClosing = prevMatch ? Number(prevMatch.closingStock) || 0 : 0;

      return {
        sr: idx + 1,
        packName: packName,
        openingStock: prevClosing,
        receiveQty: 0,
        totalAvailable: prevClosing,
        dispatchQty: 0,
        closingStock: prevClosing,
        maintainedBy: currentOperatorName,
      };
    });

    setEditRows(all10Rows);

    if (currentRecord) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
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
        // Strip non-numeric characters but allow empty string during active typing
        const cleaned = value.replace(/[^0-9]/g, '');
        if (field === 'openingStock') row.openingStock = cleaned;
        if (field === 'receiveQty') row.receiveQty = cleaned;
        if (field === 'dispatchQty') row.dispatchQty = cleaned;

        const op = Number(row.openingStock) || 0;
        const rc = Number(row.receiveQty) || 0;
        const dp = Number(row.dispatchQty) || 0;

        // Auto calculate Total Available & Closing Stock
        row.totalAvailable = op + rc;
        row.closingStock = op + rc - dp;
      }

      updated[index] = row;
      return updated;
    });
  };

  // Format cell on blur (if left blank, cleanly reverts to 0 or formatted number)
  const handleCellBlur = (index: number, field: 'openingStock' | 'receiveQty' | 'dispatchQty') => {
    setEditRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      if (row[field] === '' || row[field] === undefined) {
        row[field] = 0;
      } else {
        row[field] = Number(row[field]) || 0;
      }
      updated[index] = row;
      return updated;
    });
  };

  // Excel-like Keyboard Navigation (Enter, Arrow Down, Arrow Up, Arrow Right, Arrow Left)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'Enter') {
      e.preventDefault();
      // Enter moves to the cell directly below
      if (rowIdx < editRows.length - 1) {
        nextRow = rowIdx + 1;
      } else if (colIdx < 3) {
        // Move to top of next column if on last row
        nextRow = 0;
        nextCol = colIdx + 1;
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(rowIdx + 1, editRows.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(rowIdx - 1, 0);
    } else if (e.key === 'ArrowRight') {
      const isAtEnd =
        e.currentTarget.selectionEnd === e.currentTarget.value.length ||
        (e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === e.currentTarget.value.length);
      if (isAtEnd && colIdx < 3) {
        e.preventDefault();
        nextCol = colIdx + 1;
      }
    } else if (e.key === 'ArrowLeft') {
      const isAtStart =
        e.currentTarget.selectionStart === 0 ||
        (e.currentTarget.selectionStart === 0 &&
          e.currentTarget.selectionEnd === e.currentTarget.value.length);
      if (isAtStart && colIdx > 0) {
        e.preventDefault();
        nextCol = colIdx - 1;
      }
    }

    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const nextEl = document.querySelector(
        `[data-grid-cell="${nextRow}-${nextCol}"]`
      ) as HTMLInputElement | null;
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
      }
    }
  };

  // Live Daily Summary Totals (EXCLUDES MODULE AS PER PLANT POLICY)
  const summaryTotals = useMemo(() => {
    let totalOpening = 0;
    let totalReceived = 0;
    let totalDispatch = 0;
    let totalClosing = 0;

    editRows.forEach((r) => {
      // EXCLUDE MODULE FROM DAILY TOTALS AS INSTRUCTED BY USER
      if (r.packName.trim().toLowerCase() === 'module') return;

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

  // Handler: Export exact formatted Excel matching the photo (Module excluded from summary)
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
        Number(r.openingStock) || 0,
        Number(r.receiveQty) || 0,
        r.totalAvailable,
        Number(r.dispatchQty) || 0,
        r.closingStock,
        r.maintainedBy || currentOperatorName,
      ]);
    });

    wsData.push([]); // blank

    // Daily Summary Box (Module Excluded)
    wsData.push(['DAILY SUMMARY (Excludes Module)', '']);
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

  // Quick Date Jump Handlers (Minimum 2026-09-01)
  const handleJumpDate = (offsetDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offsetDays);
    const newDateStr = current.toISOString().slice(0, 10);
    if (newDateStr >= MIN_STOCK_DATE) {
      setSelectedDate(newDateStr);
    }
  };

  const isPrevDisabled = selectedDate <= MIN_STOCK_DATE;

  // Filter historical records: only 01/09/2026 onwards
  const filteredHistoricalRecords = dailyStockRecords
    .filter((r) => r.date >= MIN_STOCK_DATE)
    .sort((a, b) => b.date.localeCompare(a.date));

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
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono-code">
                  From: 01/09/2026
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
                disabled={isPrevDisabled}
                onClick={() => handleJumpDate(-1)}
                className={`p-1.5 rounded-lg text-slate-600 transition ${
                  isPrevDisabled
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-200 cursor-pointer'
                }`}
                title={isPrevDisabled ? 'Minimum date is 01/09/2026' : 'Previous Day'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  min={MIN_STOCK_DATE}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value >= MIN_STOCK_DATE) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono-code font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setSelectedDate(today >= MIN_STOCK_DATE ? today : MIN_STOCK_DATE);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedDate === (new Date().toISOString().slice(0, 10) >= MIN_STOCK_DATE ? new Date().toISOString().slice(0, 10) : MIN_STOCK_DATE)
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

        {/* Status Bar & Role Policy Badges */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {currentRecord ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Record Saved for {formatDisplayDate(selectedDate)} (Maintained by: {currentRecord.createdByName})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                No Saved Record for {formatDisplayDate(selectedDate)} (Editing New Sheet)
              </span>
            )}

            {/* Lock / Grace Window Indicator */}
            {currentRecord?.isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold text-[10px]">
                <Lock className="w-3 h-3 text-amber-400" /> Locked by Admin
              </span>
            ) : currentRecord && !isAdminOrManager && isWithin30MinWindow ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px] animate-pulse">
                <Timer className="w-3.5 h-3.5 text-blue-600" />
                Employee Grace Window: {minutesLeft} min left to edit typos
              </span>
            ) : currentRecord && !isAdminOrManager && !isWithin30MinWindow ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px]">
                <Lock className="w-3 h-3 text-slate-500" /> 30-Min Window Expired (Manager/Admin Only)
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Manager/Super Admin Lock Toggle */}
            {isAdminOrManager && currentRecord && (
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                {currentRecord.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{currentRecord.isLocked ? 'Unlock Sheet' : 'Lock Sheet'}</span>
              </button>
            )}

            {/* Edit Sheet Button (Controlled by 30-Min / Role Rule) */}
            {!isEditing && currentRecord && canUserEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Sheet</span>
              </button>
            )}

            {!isEditing && currentRecord && !canUserEdit && (
              <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200 flex items-center gap-1 cursor-not-allowed">
                <Lock className="w-3 h-3" />
                <span>Locked for Employee</span>
              </div>
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

        {/* Keyboard Navigation Tip Banner */}
        {isEditing && (
          <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-600">
            <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Excel Navigation Active:</strong> Use <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Enter</kbd> or <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">↓</kbd> to move down, <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">↑</kbd> to move up, <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">←</kbd> <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">→</kbd> to move between columns. Clicking or focusing any cell automatically selects the number for instant replacement.
            </span>
          </div>
        )}

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
              {editRows.map((row, idx) => {
                const isModuleRow = row.packName.trim().toLowerCase() === 'module';

                return (
                  <tr
                    key={row.packName}
                    className={`hover:bg-slate-50 transition ${
                      isModuleRow ? 'bg-amber-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {/* Sr */}
                    <td className="py-2.5 px-3 text-center font-mono-code font-bold text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>

                    {/* Pack Name */}
                    <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{row.packName}</span>
                        {isModuleRow && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-mono-code">
                            Not in Summary
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Opening Stock (Column 0) */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          data-grid-cell={`${idx}-0`}
                          value={row.openingStock}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={() => handleCellBlur(idx, 'openingStock')}
                          onChange={(e) => handleCellChange(idx, 'openingStock', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                          className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span className="font-mono-code font-bold text-slate-800">
                          {row.openingStock}
                        </span>
                      )}
                    </td>

                    {/* Receive Qty (Column 1) */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          data-grid-cell={`${idx}-1`}
                          value={row.receiveQty}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={() => handleCellBlur(idx, 'receiveQty')}
                          onChange={(e) => handleCellChange(idx, 'receiveQty', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                          className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-emerald-50 border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-xs text-emerald-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span
                          className={`font-mono-code font-extrabold ${
                            Number(row.receiveQty) > 0 ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-600'
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

                    {/* Dispatch Qty (Column 2) */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          data-grid-cell={`${idx}-2`}
                          value={row.dispatchQty}
                          onFocus={(e) => e.currentTarget.select()}
                          onBlur={() => handleCellBlur(idx, 'dispatchQty')}
                          onChange={(e) => handleCellChange(idx, 'dispatchQty', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                          className="w-24 text-right font-mono-code font-bold px-2 py-1 bg-blue-50 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs text-blue-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span
                          className={`font-mono-code font-extrabold ${
                            Number(row.dispatchQty) > 0 ? 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded' : 'text-slate-600'
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

                    {/* Maintained By (Column 3) */}
                    <td className="py-2.5 px-4 text-slate-700">
                      {isEditing ? (
                        <input
                          type="text"
                          data-grid-cell={`${idx}-3`}
                          value={row.maintainedBy}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => handleCellChange(idx, 'maintainedBy', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 3)}
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
                );
              })}
            </tbody>
          </table>
        </div>

        {/* DAILY SUMMARY Box (Yellow / Green matching photo - MODULE EXCLUDED) */}
        <div className="p-5 bg-slate-50 border-t border-slate-200">
          <div className="max-w-md bg-white border-2 border-emerald-700 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-emerald-700 text-white font-black text-xs px-4 py-2 uppercase tracking-wider font-mono-code flex items-center justify-between">
              <span>DAILY SUMMARY</span>
              <span className="text-[10px] font-medium text-emerald-100 normal-case">
                (Battery Packs Only • Module Excluded)
              </span>
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

      {/* Historical Stock Records Index Drawer (From 01/09/2026 Onwards) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Historical Stock Sheets Log ({filteredHistoricalRecords.length} Saved Dates from 01/09/2026)
            </h3>
          </div>
        </div>

        {filteredHistoricalRecords.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 font-medium">
            No historical records saved from 01/09/2026 onwards yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
            {filteredHistoricalRecords.map((rec) => (
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
        )}
      </div>
    </div>
  );
};
