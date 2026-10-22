import React, { useState, useMemo, useDeferredValue } from 'react';
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
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { BatteryPack, BatteryPackType } from '../types';
import {
  ALL_PACK_TYPES,
  getAllBatteryModelOptions,
  BATTERY_MODELS,
  INITIAL_SAVED_ADDRESSES,
  getProductNameAndType,
  normalizeModelFamily,
  formatPackDisplayName,
  formatIndianDate,
  filterPacksStrictSearch,
  sanitizeSearchQuery,
} from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';
import { exportInwardRegisterPacksToExcel } from '../utils/excelExport';

interface InwardRegisterViewProps {
  packs: BatteryPack[];
  onApproveInwardPack: (packId: string) => void;
  onOpenPackDetails: (pack: BatteryPack) => void;
  onAllocatePackToRack?: (pack: BatteryPack) => void;
  onDeletePack?: (packId: string) => void;
  onEditPack?: (updatedPack: BatteryPack) => void;
  onBatchEditPacks?: (updatedPacks: BatteryPack[]) => void;
}

export const InwardRegisterView: React.FC<InwardRegisterViewProps> = ({
  packs,
  onApproveInwardPack,
  onOpenPackDetails,
  onAllocatePackToRack,
  onDeletePack,
  onEditPack,
  onBatchEditPacks,
}) => {
  const { currentUser, isSuperAdmin, isManager, isSupervisor, isEmployee } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'INWARD_AREA' | 'IN_STORAGE' | 'DISPATCHED' | 'PENDING_APPROVAL'>('ALL');
  
  // Date Range Filter: 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Lifecycle Cycle Filter: 'ALL' | 'FIRST_TIME' | 'RE_INWARD'
  const [lifecycleFilter, setLifecycleFilter] = useState<'ALL' | 'FIRST_TIME' | 'RE_INWARD'>('ALL');

  // Pack selected for full Lifecycle Journey & First Inward Modal inspection
  const [selectedLifecyclePack, setSelectedLifecyclePack] = useState<BatteryPack | null>(null);

  // Multi-Select Pack IDs for Batch Actions
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = useState(false);
  const [bulkNewReceivedDate, setBulkNewReceivedDate] = useState('');

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
  const [editInwardDate, setEditInwardDate] = useState('');
  const [editDocumentNo, setEditDocumentNo] = useState('');
  const [editDealership, setEditDealership] = useState('');
  const [editReceivedState, setEditReceivedState] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editIsDifferentSerial, setEditIsDifferentSerial] = useState(false);
  const [editChallanPackNumber, setEditChallanPackNumber] = useState('');
  const [editMismatchReason, setEditMismatchReason] = useState('');
  const [applyDateToEntireChallan, setApplyDateToEntireChallan] = useState(true);

  // 100% PERMANENT INWARD DOCK LEDGER PRESERVATION:
  // All packs received through Inward Dock are permanently preserved here,
  // including current stock, dispatched packs, AND all historical cycles from lifecycleHistory!
  const inwardOnlyPacks = useMemo(() => {
    const list: BatteryPack[] = [];
    const seenKeys = new Set<string>();

    // 1. Current packs
    packs.forEach((p) => {
      // Exclude direct populate dummy lines
      if (p.sourceType === 'LINE_POPULATE') return;
      if (p.sourceType === 'DIRECT_DISPATCH' && !p.inwardDate && (!p.documentNo || p.documentNo === 'DIRECT-DISPATCH')) return;
      if (p.documentNo === 'DIRECT-DISPATCH' && !p.inwardDate) return;
      if (p.dealershipName === 'Direct Plant Dispatch' && !p.inwardDate) return;
      if (p.documentNo?.startsWith('MATRIX-LOAD-') || p.documentNo?.startsWith('LINE-LOAD-')) return;

      // Retain all packs that have Inward receipts, document numbers, or inward dock history
      if (Boolean(p.documentNo || p.inwardDate || p.dealershipName || p.sourceType === 'INWARD')) {
        list.push(p);
        const key = `${p.packNumber.trim().toLowerCase()}_${(p.documentNo || '').trim().toLowerCase()}_${(p.inwardDate || '').slice(0, 10)}`;
        seenKeys.add(key);
      }

      // 2. Also extract and restore any past completed cycles from lifecycleHistory (so past inward records like 12/10 are NEVER lost!)
      if (p.lifecycleHistory && Array.isArray(p.lifecycleHistory) && p.lifecycleHistory.length > 0) {
        p.lifecycleHistory.forEach((cycle) => {
          const cycleKey = `${p.packNumber.trim().toLowerCase()}_${(cycle.documentNo || '').trim().toLowerCase()}_${(cycle.inwardDate || '').slice(0, 10)}`;
          if (!seenKeys.has(cycleKey)) {
            seenKeys.add(cycleKey);
            list.push({
              ...p,
              id: `${p.id}-cycle-${cycle.cycleNumber}`,
              packNumber: p.packNumber,
              packType: p.packType,
              status: 'DISPATCHED', // Past completed cycle was dispatched
              locationArea: 'Dispatched to EV Plant',
              currentLocation: `Dispatched to ${cycle.dispatchToCustomer || 'Customer'}`,
              inwardDate: cycle.inwardDate || p.inwardDate,
              documentNo: cycle.documentNo || '—',
              dealershipName: cycle.dealershipName || p.dealershipName || '—',
              receivedState: cycle.receivedState || p.receivedState,
              transportName: cycle.transportName || p.transportName,
              inwardBy: cycle.inwardBy || p.inwardBy || 'Staff',
              remark: cycle.remark || p.remark,
              hasInwardStamp: cycle.hasInwardStamp ?? p.hasInwardStamp,
              isWithoutPlate: Boolean(cycle.isWithoutPlate),
              isDifferentSerial: Boolean(cycle.isDifferentSerial),
              challanPackNumber: cycle.challanPackNumber,
              mismatchReason: cycle.mismatchReason,
              dispatchedAt: cycle.dispatchedAt,
              dispatchedBy: cycle.dispatchedBy,
              dispatchLotId: cycle.dispatchLotId,
              dispatchDocNo: cycle.dispatchDocNo,
              dispatchLrNo: cycle.dispatchLrNo,
              dispatchVehicleNo: cycle.dispatchVehicleNo,
              dispatchTransporter: cycle.dispatchTransporter,
              dispatchToCustomer: cycle.dispatchToCustomer,
              dispatchToAddress: cycle.dispatchToAddress,
              lifecycleCount: cycle.cycleNumber,
              notes: `[Historical Cycle #${cycle.cycleNumber}] ${p.notes || ''}`.trim(),
            });
          }
        });
      }
    });

    // Sort newest inward date first so re-inwards appear on top and past cycles directly below
    return list.sort((a, b) => {
      const timeA = new Date(a.inwardDate || 0).getTime();
      const timeB = new Date(b.inwardDate || 0).getTime();
      return timeB - timeA;
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
    let reInwardCount = 0;

    inwardOnlyPacks.forEach((p) => {
      if (p.status === 'DISPATCHED') {
        dispatchedCount += 1;
      } else {
        inWarehouseCount += 1;
      }
      if (p.status === 'PENDING_APPROVAL') pendingCount += 1;
      if (p.isDifferentSerial) diffCount += 1;
      if ((p.lifecycleCount && p.lifecycleCount > 1) || (p.lifecycleHistory && p.lifecycleHistory.length > 0) || p.id.includes('-cycle-')) {
        reInwardCount += 1;
      }
      if (p.packType.startsWith('Kanger1.0')) k1Count += 1;
      else if (p.packType.startsWith('Kanger2.0')) k2Count += 1;
      else if (p.packType.startsWith('Limber')) limberCount += 1;
    });

    return {
      total: inwardOnlyPacks.length,
      inWarehouse: inWarehouseCount,
      dispatched: dispatchedCount,
      reInward: reInwardCount,
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

    // 1. Strict Search across pack number and other fields (exact pack number match prioritized)
    const searchedList = deferredSearchQuery.trim()
      ? filterPacksStrictSearch(inwardOnlyPacks, deferredSearchQuery)
      : inwardOnlyPacks;

    return searchedList.filter((p) => {

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

      // 5. Lifecycle Filter
      if (lifecycleFilter === 'FIRST_TIME') {
        const isMultiCycle = (p.lifecycleCount && p.lifecycleCount > 1) || (p.lifecycleHistory && p.lifecycleHistory.length > 0) || p.id.includes('-cycle-');
        if (isMultiCycle) return false;
      } else if (lifecycleFilter === 'RE_INWARD') {
        const isMultiCycle = (p.lifecycleCount && p.lifecycleCount > 1) || (p.lifecycleHistory && p.lifecycleHistory.length > 0) || p.id.includes('-cycle-');
        if (!isMultiCycle) return false;
      }

      return true;
    });
  }, [inwardOnlyPacks, deferredSearchQuery, modelFilter, statusFilter, dateFilter, lifecycleFilter, customStartDate, customEndDate, todayStr]);

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

  // Find all packs that share the same Challan / Document number
  const matchingChallanPacks = useMemo(() => {
    if (!editingPack || !editDocumentNo.trim()) return [];
    const doc = editDocumentNo.trim().toLowerCase();
    return packs.filter((p) => p.documentNo && p.documentNo.trim().toLowerCase() === doc);
  }, [editingPack, editDocumentNo, packs]);

  // Helper to extract complete chronologically-ordered lifecycle cycles for a pack
  const getCompletePackCycles = (targetPack: BatteryPack) => {
    const cleanNum = targetPack.packNumber.trim().toLowerCase();
    const targetModelFamily = normalizeModelFamily(targetPack.packType);

    type MergedCycle = {
      cycleNumber: number;
      inwardDate?: string;
      documentNo?: string;
      dealershipName?: string;
      receivedState?: string;
      transportName?: string;
      inwardBy?: string;
      remark?: string;
      hasInwardStamp?: boolean;
      isWithoutPlate?: boolean;
      isDifferentSerial?: boolean;
      challanPackNumber?: string;
      mismatchReason?: string;
      dispatchedAt?: string;
      dispatchedBy?: string;
      dispatchLotId?: string;
      dispatchDocNo?: string;
      dispatchLrNo?: string;
      dispatchVehicleNo?: string;
      dispatchTransporter?: string;
      dispatchToCustomer?: string;
      dispatchToAddress?: string;
      status?: string;
      currentLocation?: string;
      lineId?: string;
      rackNumber?: number;
      rackSlot?: number;
    };

    const cyclesMap = new Map<string, MergedCycle>();

    // 1. Gather historical cycles stored inside targetPack
    if (targetPack.lifecycleHistory && Array.isArray(targetPack.lifecycleHistory)) {
      targetPack.lifecycleHistory.forEach((c) => {
        const key = `${(c.documentNo || '').trim().toLowerCase()}_${(c.inwardDate || '').slice(0, 10)}`;
        cyclesMap.set(key, {
          cycleNumber: c.cycleNumber,
          inwardDate: c.inwardDate,
          documentNo: c.documentNo,
          dealershipName: c.dealershipName,
          receivedState: c.receivedState,
          transportName: c.transportName,
          inwardBy: c.inwardBy,
          remark: c.remark,
          hasInwardStamp: c.hasInwardStamp,
          isWithoutPlate: c.isWithoutPlate,
          isDifferentSerial: c.isDifferentSerial,
          challanPackNumber: c.challanPackNumber,
          mismatchReason: c.mismatchReason,
          dispatchedAt: c.dispatchedAt,
          dispatchedBy: c.dispatchedBy,
          dispatchLotId: c.dispatchLotId,
          dispatchDocNo: c.dispatchDocNo,
          dispatchLrNo: c.dispatchLrNo,
          dispatchVehicleNo: c.dispatchVehicleNo,
          dispatchTransporter: c.dispatchTransporter,
          dispatchToCustomer: c.dispatchToCustomer,
          dispatchToAddress: c.dispatchToAddress,
          status: 'DISPATCHED',
          currentLocation: `Dispatched to ${c.dispatchToCustomer || 'Customer'}`,
          lineId: c.lineId,
          rackNumber: c.rackNumber,
          rackSlot: c.rackSlot,
        });
      });
    }

    // 2. Scan all packs in warehouse matching pack number and model family
    packs.forEach((p) => {
      if (p.packNumber.trim().toLowerCase() !== cleanNum) return;
      if (normalizeModelFamily(p.packType) !== targetModelFamily) return;

      // Also gather this pack's lifecycleHistory if any
      if (p.lifecycleHistory && Array.isArray(p.lifecycleHistory)) {
        p.lifecycleHistory.forEach((c) => {
          const key = `${(c.documentNo || '').trim().toLowerCase()}_${(c.inwardDate || '').slice(0, 10)}`;
          if (!cyclesMap.has(key)) {
            cyclesMap.set(key, {
              cycleNumber: c.cycleNumber,
              inwardDate: c.inwardDate,
              documentNo: c.documentNo,
              dealershipName: c.dealershipName,
              receivedState: c.receivedState,
              transportName: c.transportName,
              inwardBy: c.inwardBy,
              remark: c.remark,
              hasInwardStamp: c.hasInwardStamp,
              isWithoutPlate: c.isWithoutPlate,
              isDifferentSerial: c.isDifferentSerial,
              challanPackNumber: c.challanPackNumber,
              mismatchReason: c.mismatchReason,
              dispatchedAt: c.dispatchedAt,
              dispatchedBy: c.dispatchedBy,
              dispatchLotId: c.dispatchLotId,
              dispatchDocNo: c.dispatchDocNo,
              dispatchLrNo: c.dispatchLrNo,
              dispatchVehicleNo: c.dispatchVehicleNo,
              dispatchTransporter: c.dispatchTransporter,
              dispatchToCustomer: c.dispatchToCustomer,
              dispatchToAddress: c.dispatchToAddress,
              status: 'DISPATCHED',
              currentLocation: `Dispatched to ${c.dispatchToCustomer || 'Customer'}`,
              lineId: c.lineId,
              rackNumber: c.rackNumber,
              rackSlot: c.rackSlot,
            });
          }
        });
      }

      // Add the pack record itself
      const selfKey = `${(p.documentNo || '').trim().toLowerCase()}_${(p.inwardDate || '').slice(0, 10)}`;
      if (!cyclesMap.has(selfKey)) {
        cyclesMap.set(selfKey, {
          cycleNumber: p.lifecycleCount || 1,
          inwardDate: p.inwardDate,
          documentNo: p.documentNo,
          dealershipName: p.dealershipName,
          receivedState: p.receivedState,
          transportName: p.transportName,
          inwardBy: p.inwardBy,
          remark: p.remark,
          hasInwardStamp: p.hasInwardStamp,
          isWithoutPlate: p.isWithoutPlate,
          isDifferentSerial: p.isDifferentSerial,
          challanPackNumber: p.challanPackNumber,
          mismatchReason: p.mismatchReason,
          dispatchedAt: p.dispatchedAt,
          dispatchedBy: p.dispatchedBy,
          dispatchLotId: p.dispatchLotId,
          dispatchDocNo: p.dispatchDocNo,
          dispatchLrNo: p.dispatchLrNo,
          dispatchVehicleNo: p.dispatchVehicleNo,
          dispatchTransporter: p.dispatchTransporter,
          dispatchToCustomer: p.dispatchToCustomer,
          dispatchToAddress: p.dispatchToAddress,
          status: p.status,
          currentLocation: p.currentLocation,
          lineId: p.lineId,
          rackNumber: p.rackNumber,
          rackSlot: p.rackSlot,
        });
      }
    });

    // Sort chronologically (oldest inward date first)
    const sorted = Array.from(cyclesMap.values()).sort((a, b) => {
      const tA = new Date(a.inwardDate || 0).getTime();
      const tB = new Date(b.inwardDate || 0).getTime();
      return tA - tB;
    });

    // Re-number cycles cleanly 1..N
    return sorted.map((cycle, idx) => ({
      ...cycle,
      cycleNumber: idx + 1,
    }));
  };

  // Multi-Select Handlers
  const toggleSelectPack = (packId: string) => {
    setSelectedPackIds((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) next.delete(packId);
      else next.add(packId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (selectedPackIds.size === filteredPacks.length && filteredPacks.length > 0) {
      setSelectedPackIds(new Set());
    } else {
      setSelectedPackIds(new Set(filteredPacks.map((p) => p.id)));
    }
  };

  const handleApplyBulkDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkNewReceivedDate) {
      alert('Please select a valid Received Date.');
      return;
    }
    const selectedPacks = packs.filter((p) => selectedPackIds.has(p.id));
    if (selectedPacks.length === 0) return;

    const timeStr = `${new Date().toTimeString().slice(0, 8)}.000Z`;
    const newDateIso = `${bulkNewReceivedDate}T${timeStr}`;

    const updatedPacks: BatteryPack[] = selectedPacks.map((p) => ({
      ...p,
      inwardDate: newDateIso,
    }));

    if (onBatchEditPacks) {
      onBatchEditPacks(updatedPacks);
    } else if (onEditPack) {
      updatedPacks.forEach((p) => onEditPack(p));
    }

    setIsBulkDateModalOpen(false);
    setSelectedPackIds(new Set());
    alert(`⚡ Successfully updated Received Date to ${bulkNewReceivedDate} for ${updatedPacks.length} selected pack(s)!`);
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
    const rawDate = pack.inwardDate || pack.scannedAt || new Date().toISOString();
    const formattedDate = getLocalDateStr(rawDate) || new Date().toISOString().slice(0, 10);
    setEditInwardDate(formattedDate);
    setEditDocumentNo(pack.documentNo || '');
    setEditDealership(pack.dealershipName || '');
    setEditReceivedState(pack.receivedState || '');
    setEditRemark(pack.remark || '');
    setEditIsDifferentSerial(Boolean(pack.isDifferentSerial));
    setEditChallanPackNumber(pack.challanPackNumber || '');
    setEditMismatchReason(pack.mismatchReason || '');
    setApplyDateToEntireChallan(true); // Default to true as user requested
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

    // Compose new inward date ISO string
    let newDateIso = editInwardDate;
    if (editInwardDate) {
      const existingTime = editingPack.inwardDate && editingPack.inwardDate.includes('T')
        ? editingPack.inwardDate.split('T')[1]
        : `${new Date().toTimeString().slice(0, 8)}.000Z`;
      newDateIso = `${editInwardDate}T${existingTime}`;
    }

    const updated: BatteryPack = {
      ...editingPack,
      packNumber: editPackNumber.trim(),
      packType: editPackType,
      inwardDate: newDateIso || editingPack.inwardDate,
      documentNo: editDocumentNo.trim(),
      dealershipName: editDealership.trim(),
      receivedState: editReceivedState.trim(),
      remark: editRemark.trim(),
      isDifferentSerial: editIsDifferentSerial,
      challanPackNumber: editIsDifferentSerial ? editChallanPackNumber.trim() : undefined,
      mismatchReason: editIsDifferentSerial ? editMismatchReason.trim() : undefined,
    };

    if (applyDateToEntireChallan && matchingChallanPacks.length > 1) {
      // Update ALL packs in this document/challan
      const allUpdatedPacks: BatteryPack[] = matchingChallanPacks.map((p) => {
        if (p.id === updated.id) return updated;
        return {
          ...p,
          inwardDate: newDateIso || p.inwardDate,
          documentNo: editDocumentNo.trim() || p.documentNo,
          dealershipName: editDealership.trim() || p.dealershipName,
          receivedState: editReceivedState.trim() || p.receivedState,
        };
      });

      if (onBatchEditPacks) {
        onBatchEditPacks(allUpdatedPacks);
      } else if (onEditPack) {
        allUpdatedPacks.forEach((p) => onEditPack(p));
      }
    } else {
      if (onEditPack) {
        onEditPack(updated);
      }
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 text-xs">
        <div className="bg-white border-2 border-blue-300 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-blue-900 font-bold uppercase tracking-wider text-[10px]">Total Inwarded</p>
          <p className="text-2xl font-black font-mono-code text-blue-800">{inwardSeriesSummary.total}</p>
          <p className="text-[10px] text-slate-400 font-medium">100% Inward Ledger</p>
        </div>

        <div className="bg-white border border-emerald-300 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">In Warehouse</p>
          <p className="text-2xl font-black font-mono-code text-emerald-700">{inwardSeriesSummary.inWarehouse}</p>
          <p className="text-[10px] text-emerald-600 font-medium">Available in Stock</p>
        </div>

        <div className="bg-white border border-blue-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-blue-600 font-bold uppercase tracking-wider text-[10px]">Dispatched</p>
          <p className="text-2xl font-black font-mono-code text-blue-600">{inwardSeriesSummary.dispatched}</p>
          <p className="text-[10px] text-blue-500 font-medium">Outward to Plants</p>
        </div>

        <div
          onClick={() => setLifecycleFilter(prev => prev === 'RE_INWARD' ? 'ALL' : 'RE_INWARD')}
          className={`bg-white border p-3 rounded-xl shadow-2xs space-y-1 cursor-pointer transition ${lifecycleFilter === 'RE_INWARD' ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/40' : 'border-indigo-200 hover:border-indigo-400'}`}
          title="Click to toggle filter for Re-Inwards / Multi-cycle packs"
        >
          <p className="text-indigo-700 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 text-indigo-600" /> Re-Inwards
          </p>
          <p className="text-2xl font-black font-mono-code text-indigo-800">{inwardSeriesSummary.reInward}</p>
          <p className="text-[10px] text-indigo-600 font-medium">Multi-Cycle Packs</p>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Kanger 1.0 Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-slate-800">{inwardSeriesSummary.k1}</p>
          <p className="text-[10px] text-slate-400">AIO / Gen3 / CKD / FBU</p>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-purple-600 font-bold uppercase tracking-wider text-[10px]">Kanger 2.0 Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-purple-700">{inwardSeriesSummary.k2}</p>
          <p className="text-[10px] text-slate-400">Kanger 2.0</p>
        </div>

        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Limber Series</p>
          <p className="text-2xl font-extrabold font-mono-code text-emerald-700">{inwardSeriesSummary.limber}</p>
          <p className="text-[10px] text-slate-400">Limber Series</p>
        </div>

        <div className="bg-white border border-amber-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-amber-600 font-bold uppercase tracking-wider text-[10px]">Pending Approval</p>
          <p className="text-2xl font-extrabold font-mono-code text-amber-600">{inwardSeriesSummary.pending}</p>
          <p className="text-[10px] text-slate-400">Supervisor Check</p>
        </div>

        <div className="bg-white border border-purple-200 p-3 rounded-xl shadow-2xs space-y-1">
          <p className="text-purple-700 font-bold uppercase tracking-wider text-[10px]">Diff / Mismatch</p>
          <p className="text-2xl font-extrabold font-mono-code text-purple-700">{inwardSeriesSummary.diff}</p>
          <p className="text-[10px] text-slate-400">Challan Mismatches</p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        {/* Row 1: Search & Model & Status & Lifecycle Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Pack #, Doc #, Dealership, or Model..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Battery Models</option>
              {getAllBatteryModelOptions().map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
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

          <div className="sm:col-span-2">
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value as any)}
              className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold text-indigo-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Cycles</option>
              <option value="FIRST_TIME">Cycle #1 (Initial)</option>
              <option value="RE_INWARD">Cycle #2+ (Re-Inwards)</option>
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
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Inward Ledger Records ({filteredPacks.length} Packs)
            </h3>
            {selectedPackIds.size > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                {selectedPackIds.size} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedPackIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkNewReceivedDate(todayStr);
                  setIsBulkDateModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs animate-fadeIn"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Change Received Date ({selectedPackIds.size})</span>
              </button>
            )}

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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredPacks.length > 0 && selectedPackIds.size === filteredPacks.length}
                    onChange={toggleSelectAllVisible}
                    className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                    title="Select / Deselect all visible packs"
                  />
                </th>
                <th className="p-3">#</th>
                <th className="p-3">Pack Number</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Product Type</th>
                <th className="p-3">Remark</th>
                <th className="p-3">Doc / Challan No</th>
                <th className="p-3">Dealership / Source</th>
                <th className="p-3">State / City</th>
                <th className="p-3">Received Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPacks.map((pack, index) => {
                const model = BATTERY_MODELS[pack.packType];
                const { productName, productType } = getProductNameAndType(pack.packType);
                const isPending = pack.status === 'PENDING_APPROVAL';
                const isSelected = selectedPackIds.has(pack.id);
                const isMultiCycle = (pack.lifecycleCount && pack.lifecycleCount > 1) || Boolean(pack.lifecycleHistory && pack.lifecycleHistory.length > 0) || pack.id.includes('-cycle-');
                const firstCycle = (pack.lifecycleHistory && pack.lifecycleHistory.length > 0) ? pack.lifecycleHistory[0] : null;
                const displayCycleNum = pack.lifecycleCount || (pack.lifecycleHistory ? pack.lifecycleHistory.length + 1 : 1);

                return (
                  <tr key={pack.id} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectPack(pack.id)}
                        className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono-code text-slate-400">{index + 1}</td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onOpenPackDetails(pack)}
                            className="font-mono-code font-extrabold text-slate-900 text-sm hover:text-blue-600 transition text-left cursor-pointer"
                            title="Click to view full pack details & Janamkundli"
                          >
                            #{pack.packNumber}
                          </button>
                          {isMultiCycle && (
                            <button
                              type="button"
                              onClick={() => setSelectedLifecyclePack(pack)}
                              className="px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 text-[9px] font-extrabold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="Click to view complete journey & 1st inward details"
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-blue-600" />
                              CYCLE #{displayCycleNum}
                            </button>
                          )}
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
                        {/* Clickable First Inward Link */}
                        {isMultiCycle && firstCycle && firstCycle.inwardDate && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedLifecyclePack(pack)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer text-left"
                              title="Click to inspect 1st inward arrival origin and documents"
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">
                                1st Inward: {formatIndianDate(firstCycle.inwardDate)} ({firstCycle.dealershipName || 'Origin'})
                              </span>
                            </button>
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
                      <div className="space-y-1">
                        {pack.status === 'DISPATCHED' && (
                          <div
                            className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block max-w-[180px] truncate"
                            title={`Dispatched to ${pack.dispatchToCustomer || 'Customer'}${pack.dispatchDocNo ? ` (Doc #${pack.dispatchDocNo})` : ''}`}
                          >
                            🚚 Dispatched: {pack.dispatchToCustomer || 'Plant'}
                          </div>
                        )}
                        {pack.remark ? (
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 max-w-[150px] truncate" title={pack.remark}>
                              {pack.remark}
                            </span>
                          </div>
                        ) : (
                          pack.status !== 'DISPATCHED' && <span className="text-slate-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono-code text-slate-900 font-bold">{pack.documentNo || '—'}</td>
                    <td className="p-3 font-medium text-slate-800 max-w-[180px] truncate">{pack.dealershipName || '—'}</td>
                    <td className="p-3 text-slate-600">{pack.receivedState || 'Maharashtra'}</td>
                    <td className="p-3 font-mono-code font-bold text-slate-800">
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

                        {isMultiCycle && (
                          <button
                            type="button"
                            onClick={() => setSelectedLifecyclePack(pack)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 rounded hover:bg-indigo-50 transition cursor-pointer"
                            title="View Multi-Cycle Inward & Dispatch Journey"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(pack)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Inward Entry & Received Date"
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

      {/* Floating Bottom Selection Bar */}
      {selectedPackIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-fadeIn text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-bold">
              {selectedPackIds.size} pack(s) selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() => {
              setBulkNewReceivedDate(todayStr);
              setIsBulkDateModalOpen(true);
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Change Received Date</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPackIds(new Set())}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bulk Change Received Date Modal */}
      {isBulkDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-display">Batch Change Received Date</h3>
                  <p className="text-[11px] text-slate-500">Updating {selectedPackIds.size} selected packs</p>
                </div>
              </div>
              <button onClick={() => setIsBulkDateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkDate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> New Received / Inward Date
                </label>
                <input
                  type="date"
                  value={bulkNewReceivedDate}
                  onChange={(e) => setBulkNewReceivedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none text-sm"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px]">
                ⚡ <strong>Instant Multi-Pack Update</strong>: Selected {selectedPackIds.size} packs ki inward received date turant update hokar Supabase Cloud mein sync ho jayegi.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkDateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update {selectedPackIds.size} Packs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inward Pack Modal */}
      {editingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">Edit Inward Pack #{editingPack.packNumber}</h3>
                <p className="text-[11px] text-slate-500">Modify serial number, received date, challan, or dealership</p>
              </div>
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

              {/* Received Date Input */}
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                <div>
                  <label className="block font-bold text-blue-950 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Received / Inward Date
                  </label>
                  <input
                    type="date"
                    value={editInwardDate}
                    onChange={(e) => setEditInwardDate(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded-lg p-2 font-mono-code font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                {/* Auto Invoice / Challan Batch Sync Option */}
                {matchingChallanPacks.length > 1 && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-1 animate-fadeIn">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-950 text-xs">
                      <input
                        type="checkbox"
                        checked={applyDateToEntireChallan}
                        onChange={(e) => setApplyDateToEntireChallan(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <span>
                        Apply new Received Date & Details to ALL {matchingChallanPacks.length} packs in Challan #{editDocumentNo}
                      </span>
                    </label>
                    <p className="text-[11px] text-blue-700 pl-6 leading-relaxed">
                      ⚡ Invoice SB / Challan #{editDocumentNo} ke sabhi {matchingChallanPacks.length} battery packs ki inward date ek saath update ho jayegi.
                    </p>
                  </div>
                )}
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
                  {getAllBatteryModelOptions().map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
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

      {/* Pack Lifecycle Journey & First Inward History Modal */}
      {selectedLifecyclePack && (() => {
        const targetCycles = getCompletePackCycles(selectedLifecyclePack);
        const firstCycle = targetCycles.length > 0 ? targetCycles[0] : null;
        const { productName, productType } = getProductNameAndType(selectedLifecyclePack.packType);
        const model = BATTERY_MODELS[selectedLifecyclePack.packType];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-mono-code font-black text-slate-900">
                        Pack #{selectedLifecyclePack.packNumber}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-extrabold">
                        {targetCycles.length} Cycle{targetCycles.length > 1 ? 's' : ''} Recorded
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {productType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {productName} • Comprehensive Inward Origin & Dispatch History
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLifecyclePack(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* 1. Origin / First Inward Milestone Banner */}
                {firstCycle && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-600" /> First Ever Inward Origin (Cycle #1)
                      </span>
                      <span className="text-[10px] font-mono-code font-bold text-blue-800 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                        First Arrived: {formatIndianDate(firstCycle.inwardDate)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-slate-700">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Original Dealership / Supplier</span>
                        <span className="font-bold text-slate-900 text-xs">{firstCycle.dealershipName || '—'}</span>
                        <span className="text-[10px] text-slate-500 block">{firstCycle.receivedState || 'Maharashtra'}</span>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Original Document / Challan</span>
                        <span className="font-mono-code font-bold text-blue-800 text-xs">#{firstCycle.documentNo || '—'}</span>
                        <span className="text-[10px] text-slate-500 block">Inwarded by: {firstCycle.inwardBy || 'Staff'}</span>
                      </div>
                    </div>

                    {firstCycle.remark && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200 p-2 rounded-lg">
                        <strong>First Inward Remark:</strong> {firstCycle.remark}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Current Warehouse Live State */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Current Physical Warehouse State
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${selectedLifecyclePack.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' : selectedLifecyclePack.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {selectedLifecyclePack.status === 'DISPATCHED' ? 'DISPATCHED OUTWARD' : selectedLifecyclePack.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : 'IN WAREHOUSE STOCK'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-800 pt-0.5">
                    <span>
                      Location: <strong>{selectedLifecyclePack.status === 'DISPATCHED' ? `Dispatched to ${selectedLifecyclePack.dispatchToCustomer || 'Plant'}` : (selectedLifecyclePack.currentLocation || 'Inward Area')}</strong>
                    </span>
                    <span className="font-mono-code text-[11px] text-slate-500">
                      Active Cycle: #{selectedLifecyclePack.lifecycleCount || (targetCycles.length > 0 ? targetCycles.length : 1)}
                    </span>
                  </div>
                </div>

                {/* 3. Chronological Step-by-Step Cycle Journey */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Complete Journey Log ({targetCycles.length} Inward Event{targetCycles.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {targetCycles.map((cycle, cIdx) => (
                      <div
                        key={cIdx}
                        className={`p-3.5 rounded-xl border space-y-2 transition ${cIdx === targetCycles.length - 1 ? 'border-indigo-300 bg-indigo-50/20 shadow-2xs' : 'border-slate-200 bg-slate-50/60'}`}
                      >
                        {/* Cycle Title Bar */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono-code font-bold text-[10px]">
                              CYCLE #{cycle.cycleNumber}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {cIdx === 0 ? 'Initial Inward Arrival' : `Re-Inward Arrival #${cycle.cycleNumber}`}
                            </span>
                          </div>
                          <span className="font-mono-code text-[11px] font-bold text-slate-600">
                            {formatIndianDate(cycle.inwardDate)}
                          </span>
                        </div>

                        {/* Inward Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Inward Challan / Document</span>
                            <span className="font-mono-code font-bold text-blue-700">#{cycle.documentNo || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Source Supplier / Dealership</span>
                            <span className="font-semibold text-slate-900">{cycle.dealershipName || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Received State</span>
                            <span>{cycle.receivedState || 'Maharashtra'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9.5px] uppercase font-bold">Inward Operator</span>
                            <span className="font-medium text-slate-800">{cycle.inwardBy || 'Staff'}</span>
                          </div>
                        </div>

                        {/* Condition & Remarks */}
                        {cycle.remark && (
                          <div className="text-[10.5px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                            <strong>Note / Remark:</strong> {cycle.remark}
                          </div>
                        )}

                        {cycle.isDifferentSerial && cycle.challanPackNumber && (
                          <div className="text-[10.5px] text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md font-mono-code">
                            ⚠️ Challan Document Serial: #{cycle.challanPackNumber} {cycle.mismatchReason ? `(${cycle.mismatchReason})` : ''}
                          </div>
                        )}

                        {/* Dispatch Outcome (if this cycle had a dispatch) */}
                        {cycle.dispatchedAt ? (
                          <div className="mt-1 pt-2 border-t border-slate-200/80 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-blue-950 font-bold">
                              <span className="flex items-center gap-1.5 text-blue-800">
                                <Truck className="w-3.5 h-3.5 text-blue-600" /> Dispatched to {cycle.dispatchToCustomer || 'Customer Plant'}
                              </span>
                              <span className="font-mono-code text-[10px] text-blue-600">
                                {formatIndianDate(cycle.dispatchedAt)}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                              {cycle.dispatchDocNo && <span>Gate Pass / Doc: <strong>#{cycle.dispatchDocNo}</strong></span>}
                              {cycle.dispatchVehicleNo && <span>Vehicle: <strong>{cycle.dispatchVehicleNo}</strong></span>}
                              {cycle.dispatchLrNo && <span>LR #: <strong>{cycle.dispatchLrNo}</strong></span>}
                              {cycle.dispatchedBy && <span>By: <strong>{cycle.dispatchedBy}</strong></span>}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Currently Active in Warehouse Inventory</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedLifecyclePack(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200 cursor-pointer text-xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = selectedLifecyclePack;
                    setSelectedLifecyclePack(null);
                    onOpenPackDetails(p);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Janamkundli 📜</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
