import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  ShieldCheck,
  Calendar,
  Layers,
  Printer,
  ChevronDown,
  ChevronUp,
  Bookmark,
  MapPin,
  X,
  Filter,
  Zap,
  Copy,
  Sparkles,
  ArrowRight,
  Clock,
  Box,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, DispatchLot, SavedAddress } from '../types';
import {
  ALL_PACK_TYPES,
  BATTERY_MODELS,
  COMMON_TRANSPORTERS,
  DEFAULT_PLANT_LOCATION,
  DEFAULT_SAVED_ADDRESSES,
  parseBoxCodeAndModel,
} from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';

interface DispatchCartProps {
  stagedPacks: BatteryPack[];
  availableStoragePacks: BatteryPack[];
  onRemoveFromCart: (packId: string) => void;
  onAddMultipleToCart: (packIds: string[]) => void;
  onApproveDispatchLot: (lot: DispatchLot, dispatchedPackIds: string[]) => void;
  onGenerateInvoiceForLot?: (lot: DispatchLot) => void;
}

export const DispatchCart: React.FC<DispatchCartProps> = ({
  stagedPacks,
  availableStoragePacks,
  onRemoveFromCart,
  onAddMultipleToCart,
  onApproveDispatchLot,
  onGenerateInvoiceForLot,
}) => {
  const { currentUser, isSupervisor, isManager, isSuperAdmin, canDirectApprove } = useAuth();

  // Active Dispatch Flow Mode: 'FAST_DIRECT_DISPATCH' vs 'STAGED_CART'
  const [activeDispatchTab, setActiveDispatchTab] = useState<'FAST_DIRECT_DISPATCH' | 'STAGED_CART'>('FAST_DIRECT_DISPATCH');

  // Fast Direct Dispatch State
  const [directPasteText, setDirectPasteText] = useState('');
  const [directQuickModel, setDirectQuickModel] = useState<BatteryPackType>('Kanger1.0_CKD');
  const [directQuickQty, setDirectQuickQty] = useState<number>(20);
  const [directQuickStartSerial, setDirectQuickStartSerial] = useState<string>('');

  // Staged Series Breakdown
  const stagedSeriesSummary = useMemo(() => {
    let k1Count = 0;
    let k2Count = 0;
    let limberCount = 0;

    stagedPacks.forEach((p) => {
      if (p.packType.startsWith('Kanger1.0')) k1Count += 1;
      else if (p.packType.startsWith('Kanger2.0')) k2Count += 1;
      else if (p.packType.startsWith('Limber')) limberCount += 1;
    });

    return {
      total: stagedPacks.length,
      k1: k1Count,
      k2: k2Count,
      limber: limberCount,
    };
  }, [stagedPacks]);

  // Selection inside cart
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());

  // Stock picker search & selection
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockPickerSelectedIds, setStockPickerSelectedIds] = useState<Set<string>>(new Set());

  // Address Directory State (Saved in LocalStorage)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    const saved = localStorage.getItem('tata_wms_saved_addresses_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (a: any) =>
              !a.id?.startsWith('addr-') &&
              !a.title?.includes('Dharwad') &&
              !a.title?.includes('Sanand') &&
              !a.title?.includes('Jamshedpur') &&
              !a.title?.includes('Bhosari')
          );
        }
      } catch (e) {
        console.error('Failed to parse saved addresses', e);
      }
    }
    return [];
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveCurrentAddressToBook, setSaveCurrentAddressToBook] = useState(false);
  const [newAddressTitle, setNewAddressTitle] = useState('');

  // Dispatch Date (defaults to today's date YYYY-MM-DD)
  const [dispatchDate, setDispatchDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Form Fields - Start Completely Blank as requested by warehouse operators
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [consigneeState, setConsigneeState] = useState('');

  const [transportName, setTransportName] = useState(COMMON_TRANSPORTERS[0]);
  const [customTransport, setCustomTransport] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [transportDocNo, setTransportDocNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamic suggestions derived strictly from saved addresses and historical dispatches
  const dynamicCustomerSuggestions = useMemo(() => {
    const list = new Set<string>();
    savedAddresses.forEach((a) => {
      if (a.title) list.add(a.title);
    });
    availableStoragePacks.forEach((p) => {
      if (p.dispatchToCustomer) list.add(p.dispatchToCustomer);
    });
    return Array.from(list);
  }, [savedAddresses, availableStoragePacks]);

  // UI Modals & Inspection
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [successLot, setSuccessLot] = useState<DispatchLot | null>(null);
  const [inspectedLotPacks, setInspectedLotPacks] = useState<BatteryPack[] | null>(null);

  // Sync saved addresses
  useEffect(() => {
    localStorage.setItem('tata_wms_saved_addresses_v3', JSON.stringify(savedAddresses));
  }, [savedAddresses]);

  // Handle Preset Address Selection
  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (!addrId) return;
    const addr = savedAddresses.find((a) => a.id === addrId);
    if (addr) {
      setConsigneeName(addr.title);
      setConsigneeAddress(addr.address);
      if (addr.gstin) setConsigneeGstin(addr.gstin);
      if (addr.state) setConsigneeState(addr.state);
    }
  };

  // Select all staged packs by default when stagedPacks changes
  useEffect(() => {
    if (stagedPacks.length > 0) {
      setSelectedPackIds(new Set(stagedPacks.map((p) => p.id)));
    }
  }, [stagedPacks.length]);

  // Filter available stock for quick adding into cart
  const filteredAvailableStock = useMemo(() => {
    if (!stockSearchQuery.trim()) return availableStoragePacks.slice(0, 30);
    const q = stockSearchQuery.toLowerCase().trim();
    return availableStoragePacks.filter(
      (p) =>
        p.packNumber.toLowerCase().includes(q) ||
        p.packType.toLowerCase().includes(q) ||
        p.documentNo?.toLowerCase().includes(q)
    );
  }, [availableStoragePacks, stockSearchQuery]);

  // Selected packs for current staged dispatch lot
  const selectedPacksList = useMemo(() => {
    return stagedPacks.filter((p) => selectedPackIds.has(p.id));
  }, [stagedPacks, selectedPackIds]);

  // Toggle pack selection in Cart
  const toggleCartPackSelection = (id: string) => {
    setSelectedPackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Stock picker toggle
  const toggleStockPickerSelection = (id: string) => {
    setStockPickerSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelectedFromStock = () => {
    if (stockPickerSelectedIds.size === 0) return;
    onAddMultipleToCart(Array.from(stockPickerSelectedIds));
    setStockPickerSelectedIds(new Set());
    setStockSearchQuery('');
  };

  // Quick Preset Adders (12, 16, 21, 24, 30 packs)
  const handleQuickAddCount = (count: number) => {
    const pick = availableStoragePacks.slice(0, count).map((p) => p.id);
    if (pick.length > 0) {
      onAddMultipleToCart(pick);
    }
  };

  // ==========================================
  // FAST DIRECT DISPATCH PARSER & QUANTITY BUILDER
  // ==========================================

  // Parsed Direct Dispatched Packs (supports 2191FBU, 2513CKD, 7417AIO, 11242K2, 11111LIMBER, 1001, etc.)
  const parsedDirectPacks = useMemo(() => {
    if (!directPasteText.trim()) return [];
    const tokens = directPasteText
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '0');

    return tokens.map((token, index) => {
      const parsed = parseBoxCodeAndModel(token, 'AIO');
      const packNum = parsed.cleanPackNumber || token;
      return {
        id: `direct-disp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        packNumber: packNum,
        packType: parsed.derivedModel,
        isWithoutPlate: parsed.isWithoutPlate,
        rawInput: token,
      };
    });
  }, [directPasteText]);

  // Model breakdown for parsed direct packs
  const directPacksModelSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    parsedDirectPacks.forEach((p) => {
      counts[p.packType] = (counts[p.packType] || 0) + 1;
    });
    return counts;
  }, [parsedDirectPacks]);

  // Helper to generate quick quantity batch
  const handleAddQuickModelBatch = () => {
    if (directQuickQty <= 0) return;
    const startNum = parseInt(directQuickStartSerial.replace(/[^0-9]/g, ''), 10) || Math.floor(1000 + Math.random() * 8000);
    const generatedTokens: string[] = [];
    for (let i = 0; i < directQuickQty; i++) {
      const num = startNum + i;
      let suffix = 'AIO';
      if (directQuickModel.includes('CKD')) suffix = 'CKD';
      else if (directQuickModel.includes('FBU')) suffix = 'FBU';
      else if (directQuickModel.includes('Gen3')) suffix = 'GEN3';
      else if (directQuickModel.includes('Kanger2')) suffix = 'K2';
      else if (directQuickModel.includes('Limber')) suffix = 'LIMBER';
      generatedTokens.push(`${num}${suffix}`);
    }
    const newText = directPasteText.trim()
      ? `${directPasteText.trim()}\n${generatedTokens.join('\n')}`
      : generatedTokens.join('\n');
    setDirectPasteText(newText);
  };

  // Submit Fast Direct Dispatch (30-Day Inward Auto Reconciliation Active)
  const handleAuthorizeDirectFastDispatch = () => {
    if (parsedDirectPacks.length === 0) {
      alert('Please enter or paste at least 1 battery pack code to dispatch.');
      return;
    }
    if (!consigneeAddress.trim()) {
      alert('Please provide the full consignee delivery address (100+ words).');
      return;
    }

    // Save address if checked
    if (saveCurrentAddressToBook && consigneeName.trim() && consigneeAddress.trim()) {
      const newAddr: SavedAddress = {
        id: 'addr-' + Date.now(),
        title: newAddressTitle.trim() || consigneeName.trim(),
        address: consigneeAddress.trim(),
        gstin: consigneeGstin.trim(),
        state: consigneeState.trim(),
        createdAt: new Date().toISOString(),
      };
      setSavedAddresses((prev) => [...prev, newAddr]);
      setSaveCurrentAddressToBook(false);
      setNewAddressTitle('');
    }

    const finalDispatchIso = dispatchDate
      ? new Date(dispatchDate + 'T' + new Date().toTimeString().slice(0, 8) + '.000Z').toISOString()
      : new Date().toISOString();
    const lotNo = 'LOT-' + (dispatchDate ? dispatchDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')) + '-' + Math.floor(100 + Math.random() * 900);
    const finalTransport = transportName === 'Other' ? (customTransport || 'Other') : transportName;
    const operatorName = currentUser?.name || currentUser?.username || 'Dispatch Lead';
    const autoApproved = canDirectApprove;
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const directPacksToCreate: BatteryPack[] = parsedDirectPacks.map((dp, idx) => {
      const existing = availableStoragePacks.find((p) => p.packNumber === dp.packNumber);
      if (existing) {
        return {
          ...existing,
          status: 'DISPATCHED' as const,
          dispatchedAt: finalDispatchIso,
          dispatchedBy: operatorName,
          dispatchLotId: 'lot-' + Date.now(),
          dispatchDocNo: transportDocNo.trim() || ('GP-' + Date.now().toString().slice(-4)),
          dispatchLrNo: lrNumber.trim() || ('LR-' + Math.floor(10000 + Math.random() * 90000)),
          dispatchVehicleNo: vehicleNumber.trim() || 'MH-14-GH-8291',
          dispatchTransporter: finalTransport,
          dispatchToCustomer: consigneeName.trim(),
          dispatchToAddress: consigneeAddress.trim(),
        };
      }
      return {
        id: `pack-direct-${Date.now()}-${idx}`,
        packNumber: dp.packNumber,
        packType: dp.packType,
        status: 'DISPATCHED' as const,
        sourceType: 'DIRECT_DISPATCH' as const,
        locationArea: 'Dispatched to EV Plant',
        currentLocation: `Dispatched to ${consigneeName.trim()}`,
        inwardDate: '',
        documentNo: 'DIRECT-DISPATCH',
        dealershipName: 'Direct Plant Dispatch',
        receivedState: consigneeState || 'Maharashtra',
        transportName: finalTransport,
        hasInwardStamp: false,
        inwardBy: operatorName,
        isWithoutPlate: dp.isWithoutPlate,
        pendingInwardReconciliation: true,
        reconciliationValidUntil: validUntil,
        dispatchedAt: finalDispatchIso,
        dispatchedBy: operatorName,
        dispatchLotId: 'lot-' + Date.now(),
        dispatchDocNo: transportDocNo.trim() || ('GP-' + Date.now().toString().slice(-4)),
        dispatchLrNo: lrNumber.trim() || ('LR-' + Math.floor(10000 + Math.random() * 90000)),
        dispatchVehicleNo: vehicleNumber.trim() || 'MH-14-GH-8291',
        dispatchTransporter: finalTransport,
        dispatchToCustomer: consigneeName.trim(),
        dispatchToAddress: consigneeAddress.trim(),
        notes: 'High-Load Direct Dispatch (30-Day Auto-Reconciliation Window Active)',
        movementHistory: [
          {
            id: `mov-${Date.now()}-${idx}`,
            timestamp: finalDispatchIso,
            fromLocation: 'Direct Plant Dispatch Bay',
            toLocation: `Dispatched to ${consigneeName.trim()}`,
            movedBy: operatorName,
            reason: 'Fast Direct Bulk Outward Dispatch (30-Day Inward Window)',
          },
        ],
      };
    });

    const newLot: DispatchLot = {
      id: 'lot-' + Date.now(),
      lotNumber: lotNo,
      timestamp: finalDispatchIso,
      status: autoApproved ? 'DISPATCHED' : 'PENDING_APPROVAL',
      fromPlant: DEFAULT_PLANT_LOCATION.name + ', ' + DEFAULT_PLANT_LOCATION.address,
      consigneeName: consigneeName.trim(),
      consigneeAddress: consigneeAddress.trim(),
      consigneeGstin: consigneeGstin.trim(),
      vehicleNumber: vehicleNumber.trim() || 'MH-14-GH-8291',
      driverName: driverName.trim(),
      driverMobile: driverMobile.trim(),
      transportName: finalTransport,
      lrNumber: lrNumber.trim() || ('LR-' + Math.floor(10000 + Math.random() * 90000)),
      transportDocNo: transportDocNo.trim() || ('GP-' + Date.now().toString().slice(-4)),
      packs: directPacksToCreate,
      packCount: directPacksToCreate.length,
      dispatchedBy: operatorName,
      approvedBy: autoApproved ? operatorName : 'Pending Supervisor Approval',
      approvedAt: autoApproved ? finalDispatchIso : undefined,
      notes: (notes.trim() ? `${notes.trim()} • ` : '') + '⚡ Direct Fast Dispatch (30-Day Auto-Reconciliation Window Active)',
    };

    onApproveDispatchLot(newLot, directPacksToCreate.map((p) => p.id));
    setDirectPasteText('');
    setSuccessLot(newLot);
  };

  // Submit Staged Cart Dispatch Authorization
  const handleAuthorizeStagedDispatch = () => {
    if (selectedPackIds.size === 0) {
      alert('Please select at least 1 staged battery pack for dispatch.');
      return;
    }
    if (!consigneeAddress.trim()) {
      alert('Please provide the full consignee delivery address (100+ words).');
      return;
    }

    if (saveCurrentAddressToBook && consigneeName.trim() && consigneeAddress.trim()) {
      const newAddr: SavedAddress = {
        id: 'addr-' + Date.now(),
        title: newAddressTitle.trim() || consigneeName.trim(),
        address: consigneeAddress.trim(),
        gstin: consigneeGstin.trim(),
        state: consigneeState.trim(),
        createdAt: new Date().toISOString(),
      };
      setSavedAddresses((prev) => [...prev, newAddr]);
      setSaveCurrentAddressToBook(false);
      setNewAddressTitle('');
    }

    const finalDispatchIso = dispatchDate
      ? new Date(dispatchDate + 'T' + new Date().toTimeString().slice(0, 8) + '.000Z').toISOString()
      : new Date().toISOString();
    const lotNo = 'LOT-' + (dispatchDate ? dispatchDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')) + '-' + Math.floor(100 + Math.random() * 900);
    const finalTransport = transportName === 'Other' ? (customTransport || 'Other') : transportName;
    const operatorName = currentUser?.name || currentUser?.username || 'Dispatch Lead';
    const autoApproved = canDirectApprove;

    const newLot: DispatchLot = {
      id: 'lot-' + Date.now(),
      lotNumber: lotNo,
      timestamp: finalDispatchIso,
      status: autoApproved ? 'DISPATCHED' : 'PENDING_APPROVAL',
      fromPlant: DEFAULT_PLANT_LOCATION.name + ', ' + DEFAULT_PLANT_LOCATION.address,
      consigneeName: consigneeName.trim(),
      consigneeAddress: consigneeAddress.trim(),
      consigneeGstin: consigneeGstin.trim(),
      vehicleNumber: vehicleNumber.trim() || 'MH-14-GH-8291',
      driverName: driverName.trim(),
      driverMobile: driverMobile.trim(),
      transportName: finalTransport,
      lrNumber: lrNumber.trim() || ('LR-' + Math.floor(10000 + Math.random() * 90000)),
      transportDocNo: transportDocNo.trim() || ('GP-' + Date.now().toString().slice(-4)),
      packs: selectedPacksList,
      packCount: selectedPacksList.length,
      dispatchedBy: operatorName,
      approvedBy: autoApproved ? operatorName : 'Pending Supervisor Approval',
      approvedAt: autoApproved ? finalDispatchIso : undefined,
      notes: notes.trim(),
    };

    onApproveDispatchLot(newLot, Array.from(selectedPackIds));
    setIsPreviewOpen(false);
    setSuccessLot(newLot);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Outward Dispatch Center
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Plant: Varale / Chakan B300</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Outward Dispatch Staging & Fast Manifest System
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dispatch battery packs immediately with vehicle logistics and 30-day automatic inward reconciliation.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveDispatchTab('FAST_DIRECT_DISPATCH')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeDispatchTab === 'FAST_DIRECT_DISPATCH'
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
            <span>Fast Direct Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDispatchTab('STAGED_CART')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeDispatchTab === 'STAGED_CART'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Staged Cart ({stagedPacks.length})</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successLot && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 animate-fadeIn text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">
                Lot #{successLot.lotNumber} ({successLot.packCount} Packs) Successfully {successLot.status === 'DISPATCHED' ? 'Dispatched' : 'Submitted for Approval'}!
              </p>
              <p className="text-emerald-700 text-[11px]">
                Consignee: <strong>{successLot.consigneeName}</strong> • Vehicle: <strong>{successLot.vehicleNumber}</strong> • LR: <strong>{successLot.lrNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onGenerateInvoiceForLot && (
              <button
                onClick={() => onGenerateInvoiceForLot(successLot)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Generate GST Tax Invoice</span>
              </button>
            )}
            <button
              onClick={() => setSuccessLot(null)}
              className="px-2.5 py-1.5 text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FLOW 1: FAST DIRECT BULK DISPATCH (NO PRE-STOCK NEEDED) */}
      {/* ==================================================== */}
      {activeDispatchTab === 'FAST_DIRECT_DISPATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Direct Batch Entry & Quantity Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Direct Entry Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                    <Copy className="w-4 h-4 text-amber-600" />
                    Enter / Paste Battery Pack Numbers ({parsedDirectPacks.length} Packs Parsed)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste box codes from Excel, or type shorthands (e.g. <code className="text-blue-700 font-bold">2191FBU, 2513CKD, 7417AIO, 11242K2, 11111LIMBER</code>).
                  </p>
                </div>
                {parsedDirectPacks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDirectPasteText('')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Textarea for fast pasting */}
              <textarea
                value={directPasteText}
                onChange={(e) => setDirectPasteText(e.target.value)}
                rows={5}
                placeholder="Paste battery pack numbers here (e.g. 2191FBU, 2513CKD, 7417AIO, 11242K2, 11111LIMBER, 1001, 1002)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />

              {/* Model Breakdown Chips of Parsed Packs */}
              {parsedDirectPacks.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Auto-Detected Model Breakdown:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(directPacksModelSummary).map(([m, count]) => {
                      const model = BATTERY_MODELS[m as BatteryPackType];
                      return (
                        <span
                          key={m}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                            model?.badgeBg || 'bg-white text-slate-800 border-slate-200'
                          }`}
                        >
                          <span>{m}</span>
                          <span className="bg-white/80 px-1.5 py-0.2 rounded font-mono-code text-slate-900">
                            {count}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fast Model + Quantity Quick Builder */}
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Or Quick-Generate by Product Model & Quantity:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={directQuickModel}
                      onChange={(e) => setDirectQuickModel(e.target.value as BatteryPackType)}
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      {ALL_PACK_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={directQuickQty}
                      onChange={(e) => setDirectQuickQty(parseInt(e.target.value, 10) || 1)}
                      placeholder="Qty (e.g. 24)"
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 font-mono-code"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleAddQuickModelBatch}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add {directQuickQty} Packs</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Parsed List Table */}
            {parsedDirectPacks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Direct Outward Manifest ({parsedDirectPacks.length} Units Ready)</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Pack Number</th>
                        <th className="p-2.5">Derived Product Model</th>
                        <th className="p-2.5">Source Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedDirectPacks.map((dp, idx) => {
                        const model = BATTERY_MODELS[dp.packType];
                        return (
                          <tr key={dp.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono-code text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-mono-code font-bold text-slate-900">
                              #{dp.packNumber}
                              {dp.isWithoutPlate && (
                                <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  NP
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${model?.badgeBg || 'bg-slate-100'}`}>
                                {dp.packType}
                              </span>
                            </td>
                            <td className="p-2.5 text-[11px] text-amber-700 font-bold font-mono-code">
                              Direct Fast Outward
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Outward Destination & Vehicle Form (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                Outward Consignee & Vehicle Dispatch
              </h3>

              {/* Datalist for dynamic customer suggestions from saved data */}
              <datalist id="dispatch-saved-customers">
                {dynamicCustomerSuggestions.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>

              {/* Saved Address Selector Dropdown (if user has saved addresses) */}
              {savedAddresses.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700 block text-[11px]">Select from Saved Directory:</label>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => handleSelectSavedAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- Choose Saved Address / Custom Entry --</option>
                    {savedAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.state || 'India'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Destination Facility & Address */}
              <div className="space-y-3 text-xs">
                {/* Dispatch Date Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Dispatch Date</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer / Plant Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="dispatch-saved-customers"
                    value={consigneeName}
                    onChange={(e) => setConsigneeName(e.target.value)}
                    placeholder="Enter Customer / Destination Facility Name..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Destination Address (100+ Words Capacity) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={consigneeAddress}
                    onChange={(e) => setConsigneeAddress(e.target.value)}
                    rows={3}
                    placeholder="Enter complete delivery address with Sector, Industrial Area, City, State..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Transporter & Vehicle Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transporter</label>
                    <select
                      value={transportName}
                      onChange={(e) => setTransportName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900"
                    >
                      {COMMON_TRANSPORTERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Truck No.</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="MH14MH3845"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* LR & Document Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">LR / Bilty No.</label>
                    <input
                      type="text"
                      value={lrNumber}
                      onChange={(e) => setLrNumber(e.target.value)}
                      placeholder="LR-32997"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Document Number</label>
                    <input
                      type="text"
                      value={transportDocNo}
                      onChange={(e) => setTransportDocNo(e.target.value)}
                      placeholder="DCVRL/26-27-0001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remarks / Dispatch Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Urgent plant shipment, driver contact, etc."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Big Authorize Direct Dispatch Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAuthorizeDirectFastDispatch}
                  disabled={parsedDirectPacks.length === 0}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-xl font-extrabold text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>⚡ Authorize & Dispatch Immediately ({parsedDirectPacks.length} Packs)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FLOW 2: STAGED CART DISPATCH (EXISTING STORAGE SELECTION) */}
      {/* ==================================================== */}
      {activeDispatchTab === 'STAGED_CART' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* LEFT COLUMN: Staged Packs Table & Stock Picker (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Staged Packs Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Packs Staged for Outward Lot ({stagedPacks.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select packs to include in this dispatch batch ({selectedPackIds.size} selected).
                  </p>
                </div>

                {stagedPacks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedPackIds(new Set(stagedPacks.map((p) => p.id)))}
                      className="text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>
                )}
              </div>

              {stagedPacks.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No battery packs currently in Staging Cart</p>
                  <p className="text-[11px] text-slate-400">
                    Use Fast Direct Dispatch above or add packs from available plant stock below.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedPackIds.size === stagedPacks.length && stagedPacks.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPackIds(new Set(stagedPacks.map((p) => p.id)));
                              } else {
                                setSelectedPackIds(new Set());
                              }
                            }}
                          />
                        </th>
                        <th className="p-3">Pack Number</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Doc No</th>
                        <th className="p-3">Current Location</th>
                        <th className="p-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stagedPacks.map((pack) => {
                        const model = BATTERY_MODELS[pack.packType];
                        const isSelected = selectedPackIds.has(pack.id);

                        return (
                          <tr key={pack.id} className={isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'}>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCartPackSelection(pack.id)}
                              />
                            </td>
                            <td className="p-3 font-mono-code font-bold text-slate-900">
                              #{pack.packNumber}
                            </td>
                            <td className="p-3">
                              <span className={'px-2 py-0.5 rounded font-bold text-[11px] border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                                {pack.packType}
                              </span>
                            </td>
                            <td className="p-3 font-mono-code text-blue-700 font-semibold">{pack.documentNo || '—'}</td>
                            <td className="p-3 font-mono-code text-slate-700">{pack.currentLocation || 'Inward Area'}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => onRemoveFromCart(pack.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Return pack to Inward Area"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Stock Selector Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Add Stock into Dispatch Cart ({availableStoragePacks.length} Available)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quickly pick packs from Inward Area / Warehouse Racks into this lot.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Add:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickAddCount(12)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                  >
                    +12
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddCount(16)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                  >
                    +16
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddCount(24)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                  >
                    +24
                  </button>
                </div>
              </div>

              {/* Search Available Stock */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder="Search available stock by pack number, type, doc no..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {stockPickerSelectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleAddSelectedFromStock}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add {stockPickerSelectedIds.size} Selected</span>
                  </button>
                )}
              </div>

              {/* Stock List with checkboxes */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {filteredAvailableStock.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No matching stock found.</div>
                ) : (
                  filteredAvailableStock.map((pack) => {
                    const model = BATTERY_MODELS[pack.packType];
                    const isChecked = stockPickerSelectedIds.has(pack.id);

                    return (
                      <div
                        key={pack.id}
                        onClick={() => toggleStockPickerSelection(pack.id)}
                        className={'p-2.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ' +
                          (isChecked ? 'bg-emerald-50/50' : '')}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded"
                          />
                          <span className="font-mono-code font-bold text-slate-900">
                            #{pack.packNumber}
                          </span>
                          <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold border ' + (model?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200')}>
                            {pack.packType}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Doc #{pack.documentNo || '—'}
                          </span>
                        </div>

                        <span className="text-slate-600 font-mono-code text-[11px]">
                          {pack.currentLocation || 'Inward Area'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Consignee Delivery Address & Gate Pass Form (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500" />
                Outward Consignee & Transport Details
              </h3>

              {/* Locked FROM Location */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  FROM (Dispatch Origin - Locked):
                </span>
                <p className="font-bold text-slate-900">{DEFAULT_PLANT_LOCATION.name}</p>
                <p className="text-[11px] text-slate-600">{DEFAULT_PLANT_LOCATION.address}</p>
                <p className="text-[10px] font-mono-code text-slate-500">GSTIN: {DEFAULT_PLANT_LOCATION.gstin}</p>
              </div>

              {/* TO Saved Address Selector (Only shown if user has saved addresses) */}
              <div className="space-y-3 text-xs">
                {savedAddresses.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">
                      Select Pre-Configured Delivery Address:
                    </label>
                    <select
                      value={selectedAddressId}
                      onChange={(e) => handleSelectSavedAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Choose from Saved Directory ({savedAddresses.length}) --</option>
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.state || 'India'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dispatch Date Picker */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dispatch Date</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer / Destination Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="dispatch-saved-customers"
                    value={consigneeName}
                    onChange={(e) => setConsigneeName(e.target.value)}
                    placeholder="Enter Customer / Destination Facility Name..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Destination Address (100+ Words Capacity) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={consigneeAddress}
                    onChange={(e) => setConsigneeAddress(e.target.value)}
                    rows={4}
                    placeholder="Enter complete delivery address with Gate No, Sector, Industrial Area, City, State, and Pincode..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Save Address to Directory Checkbox */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={saveCurrentAddressToBook}
                      onChange={(e) => setSaveCurrentAddressToBook(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Save this address to Directory for future dispatches</span>
                  </label>

                  {saveCurrentAddressToBook && (
                    <input
                      type="text"
                      value={newAddressTitle}
                      onChange={(e) => setNewAddressTitle(e.target.value)}
                      placeholder="Enter Short Title for Address Directory..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Consignee GSTIN</label>
                    <input
                      type="text"
                      value={consigneeGstin}
                      onChange={(e) => setConsigneeGstin(e.target.value)}
                      placeholder="27AAACT2727Q1ZR"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Destination State</label>
                    <input
                      type="text"
                      value={consigneeState}
                      onChange={(e) => setConsigneeState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* Logistics Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transporter</label>
                    <select
                      value={transportName}
                      onChange={(e) => setTransportName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-900"
                    >
                      {COMMON_TRANSPORTERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vehicle Truck No.</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="Enter Vehicle Truck Number..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">LR / Bilty No.</label>
                    <input
                      type="text"
                      value={lrNumber}
                      onChange={(e) => setLrNumber(e.target.value)}
                      placeholder="Enter LR / Bilty Number..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Document Number</label>
                    <input
                      type="text"
                      value={transportDocNo}
                      onChange={(e) => setTransportDocNo(e.target.value)}
                      placeholder="Enter Document Number..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-mono-code text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remarks / Driver Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter driver remarks notes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={selectedPackIds.size === 0}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Review & Generate Outward Dispatch ({selectedPackIds.size} Packs)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Dispatch Preview & Approval Dialog with Full Pack Table */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Official Tata Outward Dispatch Preview</h3>
                  <p className="text-[11px] text-slate-500">Tata AutoComp Systems Limited - Varale Plant</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Dispatched FROM:</span>
                  <p className="font-bold text-slate-900">{DEFAULT_PLANT_LOCATION.name}</p>
                  <p className="text-[11px] text-slate-600">{DEFAULT_PLANT_LOCATION.address}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Dispatched TO:</span>
                  <p className="font-bold text-slate-900">{consigneeName}</p>
                  <p className="text-[11px] text-slate-600">{consigneeAddress}</p>
                </div>
              </div>

              {/* Complete Table of all pack numbers in this lot */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  Battery Pack Manifest ({selectedPacksList.length} Units):
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Pack Number</th>
                        <th className="p-2.5">Product Name</th>
                        <th className="p-2.5">Inward Doc No</th>
                        <th className="p-2.5">Current Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPacksList.map((pack, idx) => (
                        <tr key={pack.id}>
                          <td className="p-2.5 text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono-code font-bold text-slate-900">#{pack.packNumber}</td>
                          <td className="p-2.5 font-bold">{pack.packType}</td>
                          <td className="p-2.5 font-mono-code text-blue-700">{pack.documentNo || '—'}</td>
                          <td className="p-2.5 text-slate-700">{pack.currentLocation || 'Inward Area'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-slate-600">
                Authorized By: <strong>{currentUser?.name || 'Staff Member'}</strong> ({currentUser?.role || 'operator'})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Edit Details
                </button>
                <button
                  onClick={handleAuthorizeStagedDispatch}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Outward Dispatch 🚀</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Inspect Pack Numbers inside any Past Dispatch Lot */}
      {inspectedLotPacks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Dispatched Pack Numbers Manifest ({inspectedLotPacks.length} Packs)
                </h3>
              </div>
              <button
                onClick={() => setInspectedLotPacks(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Pack Number</th>
                      <th className="p-2.5">Product Model</th>
                      <th className="p-2.5">Inward Doc No</th>
                      <th className="p-2.5">Inward Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectedLotPacks.map((pack, idx) => (
                      <tr key={pack.id}>
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono-code font-bold text-slate-900">#{pack.packNumber}</td>
                        <td className="p-2.5 font-bold">{pack.packType}</td>
                        <td className="p-2.5 font-mono-code text-blue-700">{pack.documentNo || '—'}</td>
                        <td className="p-2.5 text-slate-600">{pack.inwardDate ? new Date(pack.inwardDate).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectedLotPacks(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
