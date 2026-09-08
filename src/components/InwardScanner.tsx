import React, { useState, useRef, useMemo } from 'react';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building,
  Truck,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Copy,
  Tag,
  MapPin,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, COMMON_TRANSPORTERS, deriveModelFromShorthand, parseBoxCodeAndModel, INITIAL_SAVED_ADDRESSES } from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';
import { TataLoadingSpinner } from './TataLoadingSpinner';

interface InwardScannerProps {
  existingPacks: BatteryPack[];
  onAddPacks: (newPacks: BatteryPack[], shipmentRecord: InwardShipmentRecord) => void;
  onNavigateToInwardLog: () => void;
}

interface PackRow {
  id: string;
  packNumber: string;
  packType: BatteryPackType;
  remark?: string;
  isWithoutPlate?: boolean;
  isDifferentSerial?: boolean;
  challanPackNumber?: string;
  mismatchReason?: string;
}

export const InwardScanner: React.FC<InwardScannerProps> = ({
  existingPacks,
  onAddPacks,
  onNavigateToInwardLog,
}) => {
  const { currentUser, canDirectApprove } = useAuth();

  // Mode: 'AI_SCAN' vs 'MANUAL_TABLE'
  const [entryMode, setEntryMode] = useState<'AI_SCAN' | 'MANUAL_TABLE'>('AI_SCAN');

  // Inward Category: Standard New Inward vs Customer Plant Return / Warranty Repair
  const [inwardCategory, setInwardCategory] = useState<'NEW_SUPPLY' | 'CUSTOMER_RETURN'>('NEW_SUPPLY');
  const [returnReason, setReturnReason] = useState<string>('Transit Damage');

  // Common Header State - Completely Blank on Open, Only Today Date filled
  const [documentNo, setDocumentNo] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dealershipName, setDealershipName] = useState('');
  const [receivedState, setReceivedState] = useState('');
  const [receivedCity, setReceivedCity] = useState('');
  const [transportName, setTransportName] = useState(COMMON_TRANSPORTERS[0]);
  const [customTransport, setCustomTransport] = useState('');
  const [remark, setRemark] = useState('');
  const [hasInwardStamp, setHasInwardStamp] = useState(true);

  // Dynamic Pack Rows
  const [packRows, setPackRows] = useState<PackRow[]>([
    {
      id: 'row-1',
      packNumber: '',
      packType: 'Kanger1.0_AIO',
      remark: '',
      isWithoutPlate: false,
      isDifferentSerial: false,
      challanPackNumber: '',
      mismatchReason: '',
    },
  ]);

  // Bulk Paste Text
  const [bulkText, setBulkText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // AI OCR State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ count: number; docNo: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Suggestions derived strictly from saved records & catalog directory
  const { dealershipSuggestions, stateSuggestions, citySuggestions, dealershipInfoMap } = useMemo(() => {
    const dealerSet = new Set<string>();
    const stateSet = new Set<string>();
    const citySet = new Set<string>();
    const dealerMap: Record<string, { name: string; state: string; city: string }> = {};

    // Initial catalog directory
    INITIAL_SAVED_ADDRESSES.forEach((addr) => {
      if (addr.title) {
        dealerSet.add(addr.title);
        let extractedCity = '';
        if (addr.address) {
          const addrLow = addr.address.toLowerCase();
          if (addrLow.includes('pune') || addrLow.includes('chakan') || addrLow.includes('bhosari')) {
            extractedCity = 'Pune';
          } else if (addrLow.includes('sanand') || addrLow.includes('ahmedabad')) {
            extractedCity = 'Sanand';
          } else if (addrLow.includes('jamshedpur')) {
            extractedCity = 'Jamshedpur';
          } else if (addrLow.includes('dharwad')) {
            extractedCity = 'Dharwad';
          }
        }
        dealerMap[addr.title.toLowerCase().trim()] = {
          name: addr.title,
          state: addr.state || 'Maharashtra',
          city: extractedCity || (addr.state === 'Maharashtra' ? 'Pune' : ''),
        };
      }
      if (addr.state) stateSet.add(addr.state);
    });

    // Populate from existing real-time packs
    existingPacks.forEach((p) => {
      let packCity = '';
      let packState = '';

      if (p.receivedState && p.receivedState.trim()) {
        const raw = p.receivedState.trim();
        if (raw.includes(',')) {
          const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            packCity = parts[0];
            packState = parts[1];
            citySet.add(parts[0]);
            stateSet.add(parts[1]);
          } else if (parts.length === 1) {
            packState = parts[0];
            stateSet.add(parts[0]);
          }
        } else {
          packState = raw;
          stateSet.add(raw);
        }
      }

      if (p.dealershipName && p.dealershipName.trim()) {
        const dName = p.dealershipName.trim();
        dealerSet.add(dName);
        const existingInfo = dealerMap[dName.toLowerCase()];
        if (!existingInfo) {
          dealerMap[dName.toLowerCase()] = {
            name: dName,
            state: packState || 'Maharashtra',
            city: packCity || '',
          };
        } else {
          if (packState && !existingInfo.state) existingInfo.state = packState;
          if (packCity && !existingInfo.city) existingInfo.city = packCity;
        }
      }

      if (p.dispatchToCustomer && p.dispatchToCustomer.trim()) {
        dealerSet.add(p.dispatchToCustomer.trim());
      }
    });

    return {
      dealershipSuggestions: Array.from(dealerSet).filter(Boolean),
      stateSuggestions: Array.from(stateSet).filter(Boolean),
      citySuggestions: Array.from(citySet).filter(Boolean),
      dealershipInfoMap: dealerMap,
    };
  }, [existingPacks]);

  // Handle Dealership selection: ONLY exact saved suggestion selection will autofill State & City
  const handleDealershipChange = (val: string) => {
    setDealershipName(val);
    if (!val || !val.trim()) return;

    const cleanKey = val.trim().toLowerCase();
    const matched = dealershipInfoMap[cleanKey];
    
    // Only autofill when user selects an exact saved dealership from suggestions / database
    if (matched) {
      if (matched.state) setReceivedState(matched.state);
      if (matched.city) setReceivedCity(matched.city);
    }
  };

  // Keyboard Enter-step navigation helper
  const handleKeyDownStep = (e: React.KeyboardEvent, nextElementId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextElementId);
      if (nextEl) {
        nextEl.focus();
      }
    }
  };

  // Pack row Enter-key handler to jump to next row or auto-create a new row
  const handlePackRowKeyDown = (e: React.KeyboardEvent, index: number, isChallan?: boolean, isReason?: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const row = packRows[index];

      if (row.isDifferentSerial && !isChallan && !isReason) {
        // Move to challan pack number input
        const challanInput = document.getElementById(`inward-challan-pack-${index}`);
        if (challanInput) {
          challanInput.focus();
          return;
        }
      } else if (row.isDifferentSerial && isChallan && !isReason) {
        // Move to mismatch reason input
        const reasonInput = document.getElementById(`inward-mismatch-reason-${index}`);
        if (reasonInput) {
          reasonInput.focus();
          return;
        }
      }

      if (index < packRows.length - 1) {
        const nextInput = document.getElementById(`inward-pack-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        // Last row: Auto add a new row and focus it!
        handleAddRow(1);
        setTimeout(() => {
          const nextInput = document.getElementById(`inward-pack-${index + 1}`);
          if (nextInput) {
            nextInput.focus();
          }
        }, 50);
      }
    }
  };

  // Map of existing packs by packNumber for quick duplicate & return inspection
  const existingPackMap = useMemo(() => {
    const map = new Map<string, BatteryPack>();
    existingPacks.forEach((p) => {
      if (p.packNumber) map.set(p.packNumber.toLowerCase().trim(), p);
    });
    return map;
  }, [existingPacks]);

  // Next DC Number sequence auto-generator
  const handleAutoGenerateDocNo = () => {
    const currentYear = new Date().getFullYear();
    const nextYearShort = String(currentYear + 1).slice(-2);
    const currentYearShort = String(currentYear).slice(-2);
    const fiscal = `${currentYearShort}-${nextYearShort}`;
    let maxSeq = 0;
    existingPacks.forEach((p) => {
      if (p.documentNo && p.documentNo.includes('DCVRL')) {
        const match = p.documentNo.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    const nextSeqStr = String(maxSeq + 1).padStart(4, '0');
    setDocumentNo(`DCVRL/${fiscal}-${nextSeqStr}`);
  };

  // Helper to generate Without-Plate tracked code
  const generateNoPlateCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `NP-${randomNum}`;
  };

  // Add more rows
  const handleAddRow = (count: number = 1) => {
    const newRows: PackRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: `row-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        packNumber: '',
        packType: packRows[packRows.length - 1]?.packType || 'Kanger1.0_AIO',
        remark: '',
        isWithoutPlate: false,
        isDifferentSerial: false,
        challanPackNumber: '',
        mismatchReason: '',
      });
    }
    setPackRows((prev) => [...prev, ...newRows]);
  };

  const handleRemoveRow = (id: string) => {
    if (packRows.length <= 1) return;
    setPackRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (
    id: string,
    field: 'packNumber' | 'packType' | 'remark' | 'challanPackNumber' | 'mismatchReason',
    value: string
  ) => {
    setPackRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          if (field === 'packNumber') {
            const parsed = parseBoxCodeAndModel(value, r.packType);
            return {
              ...r,
              packNumber: parsed.cleanPackNumber,
              packType: parsed.derivedModel,
              isWithoutPlate: parsed.isWithoutPlate ? true : r.isWithoutPlate,
            };
          }
          if (field === 'challanPackNumber') {
            const cleanChallan = value.replace(/[^0-9A-Za-z_-]/g, '');
            return { ...r, challanPackNumber: cleanChallan };
          }
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleToggleWithoutPlate = (id: string) => {
    setPackRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextWithout = !r.isWithoutPlate;
          return {
            ...r,
            isWithoutPlate: nextWithout,
            packNumber: nextWithout ? generateNoPlateCode() : '',
          };
        }
        return r;
      })
    );
  };

  const handleToggleDifferentSerial = (id: string) => {
    setPackRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextDiff = !r.isDifferentSerial;
          return {
            ...r,
            isDifferentSerial: nextDiff,
            challanPackNumber: nextDiff ? (r.challanPackNumber || '') : '',
            mismatchReason: nextDiff ? (r.mismatchReason || '') : '',
          };
        }
        return r;
      })
    );
  };

  // Bulk Paste Parser
  const handleApplyBulkPaste = () => {
    if (!bulkText.trim()) return;
    const tokens = bulkText
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s !== '0');

    if (tokens.length === 0) return;

    const newRows: PackRow[] = tokens.map((token, index) => {
      const initialType = packRows[0]?.packType || 'Kanger1.0_AIO';
      const parsed = parseBoxCodeAndModel(token, initialType);
      return {
        id: `bulk-${Date.now()}-${index}`,
        packNumber: parsed.cleanPackNumber || token,
        packType: parsed.derivedModel,
        remark: '',
        isWithoutPlate: parsed.isWithoutPlate,
        isDifferentSerial: false,
        challanPackNumber: '',
        mismatchReason: '',
      };
    });

    setPackRows(newRows);
    setBulkText('');
    setShowBulkPaste(false);
  };

  // AI Scan Image Upload / Capture
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setScannedImage(base64);
      await runOcrOnImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const runOcrOnImage = async (base64Data: string) => {
    setIsScanning(true);
    setOcrMessage('AI Vision is analyzing invoice for Tata Inward Stamp & battery pack serials...');

    try {
      const res = await fetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg',
        }),
      });

      const result = await res.json();
      if (result.success && result.data) {
        const data = result.data;
        if (data.documentNo) setDocumentNo(data.documentNo);
        if (data.receivedDate) setReceivedDate(data.receivedDate);
        if (data.dealershipName) setDealershipName(data.dealershipName);
        if (data.receivedState) setReceivedState(data.receivedState);
        if (data.transportName) setTransportName(data.transportName);
        if (data.remark) setRemark(data.remark);
        setHasInwardStamp(Boolean(data.hasInwardStamp));

        if (Array.isArray(data.packs) && data.packs.length > 0) {
          const extractedRows: PackRow[] = data.packs.map((p: any, idx: number) => {
            const rawSerial = String(p.packNumber || '').trim();
            const fallbackModel = (p.packType as BatteryPackType) || 'Kanger1.0_AIO';
            const parsed = parseBoxCodeAndModel(rawSerial, fallbackModel);
            return {
              id: `ocr-${Date.now()}-${idx}`,
              packNumber: parsed.cleanPackNumber || rawSerial,
              packType: parsed.derivedModel,
              isWithoutPlate: parsed.isWithoutPlate,
            };
          });
          setPackRows(extractedRows);
          setOcrMessage(`Found ${extractedRows.length} pack(s) in document. Tata Stamp: ${data.hasInwardStamp ? 'VERIFIED' : 'NOT DETECTED'}`);
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrMessage('Document OCR processing completed.');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit Inward Entry
  const handleSubmitInward = (e: React.FormEvent) => {
    e.preventDefault();

    const validRows = packRows.filter((r) => r.packNumber.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please enter at least 1 valid Pack Number.');
      return;
    }

    if (!documentNo.trim()) {
      alert('Please enter Document / Challan Number.');
      return;
    }

    if (!dealershipName.trim()) {
      alert('Please enter Dealership / Source Supplier Name.');
      return;
    }

    const enteredNumbers = validRows.map((r) => r.packNumber.trim());
    const uniqueNumbers = new Set(enteredNumbers);
    if (uniqueNumbers.size !== enteredNumbers.length) {
      if (!confirm('Warning: Duplicate pack numbers found in this document batch. Proceed anyway?')) {
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const finalTransporter = transportName === 'Other' ? (customTransport || 'Other') : transportName;
    const operatorName = currentUser?.name || currentUser?.username || 'Staff Operator';
    const autoApproved = canDirectApprove;
    const finalStateStr = receivedCity.trim() ? `${receivedCity.trim()}, ${receivedState.trim()}` : (receivedState.trim() || 'Maharashtra');

    const newPacks: BatteryPack[] = validRows.map((r, index) => {
      const packNumKey = r.packNumber.toLowerCase().trim();
      const existing = existingPackMap.get(packNumKey);
      const isReInward = existing && existing.status === 'DISPATCHED';
      const packRemark = (r.remark && r.remark.trim()) ? r.remark.trim() : (remark.trim() || undefined);
      const lifecycle = isReInward ? (existing.lifecycleCount || 1) + 1 : 1;

      const previousHistory = isReInward && existing.movementHistory ? existing.movementHistory : [];
      const newMovement = {
        id: `mov-${Date.now()}-${index}`,
        timestamp: nowIso,
        fromLocation: isReInward ? `Customer Return (${existing.dispatchToCustomer || 'Customer'})` : 'Receiving Dock',
        toLocation: 'Inward Area',
        movedBy: operatorName,
        reason: inwardCategory === 'CUSTOMER_RETURN'
          ? `Customer Return Inward (Doc #${documentNo.trim()}) - Reason: ${returnReason}`
          : r.isDifferentSerial
          ? `Initial Inward Receiving (Doc #${documentNo.trim()}) - [DIFF NO: Challan #${r.challanPackNumber || '—'} vs Phys #${r.packNumber}]`
          : `Initial Inward Receiving (Doc #${documentNo.trim()})`,
      };

      return {
        id: isReInward ? existing.id : `pack-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        packNumber: r.packNumber.trim(),
        packType: r.packType,
        status: autoApproved ? ('INWARD_AREA' as const) : ('PENDING_APPROVAL' as const),
        locationArea: 'Inward Area',
        currentLocation: 'Inward Area',
        isWithoutPlate: r.isWithoutPlate,
        isDifferentSerial: Boolean(r.isDifferentSerial),
        challanPackNumber: r.isDifferentSerial ? (r.challanPackNumber?.trim() || undefined) : undefined,
        mismatchReason: r.isDifferentSerial ? (r.mismatchReason?.trim() || undefined) : undefined,
        sourceType: 'INWARD' as const,
        inwardDate: receivedDate || nowIso,
        documentNo: documentNo.trim(),
        dealershipName: dealershipName.trim(),
        receivedState: finalStateStr,
        transportName: finalTransporter,
        remark: packRemark,
        hasInwardStamp: hasInwardStamp,
        inwardBy: operatorName,
        inwardApprovedBy: autoApproved ? operatorName : undefined,
        inwardApprovedAt: autoApproved ? nowIso : undefined,
        isCustomerReturn: inwardCategory === 'CUSTOMER_RETURN' || Boolean(isReInward),
        returnReason: inwardCategory === 'CUSTOMER_RETURN' ? returnReason : undefined,
        returnPlant: inwardCategory === 'CUSTOMER_RETURN' ? dealershipName.trim() : undefined,
        returnChallanNo: inwardCategory === 'CUSTOMER_RETURN' ? documentNo.trim() : undefined,
        lifecycleCount: lifecycle,
        movementHistory: [...previousHistory, newMovement],
      };
    });

    const typeSummary: Record<string, number> = {};
    validRows.forEach((r) => {
      typeSummary[r.packType] = (typeSummary[r.packType] || 0) + 1;
    });

    const shipmentRecord: InwardShipmentRecord = {
      id: `inw-${Date.now()}`,
      timestamp: nowIso,
      documentNo: documentNo.trim(),
      dealershipName: dealershipName.trim(),
      receivedState: finalStateStr,
      transportName: finalTransporter,
      packCount: newPacks.length,
      packNumbers: enteredNumbers,
      packTypeSummary: typeSummary,
      inwardBy: operatorName,
      approvedBy: autoApproved ? operatorName : undefined,
      hasInwardStamp: hasInwardStamp,
      status: autoApproved ? 'APPROVED' : 'PENDING_APPROVAL',
      remark: remark.trim(),
      isCustomerReturn: inwardCategory === 'CUSTOMER_RETURN',
      returnReason: inwardCategory === 'CUSTOMER_RETURN' ? returnReason : undefined,
      returnPlant: inwardCategory === 'CUSTOMER_RETURN' ? dealershipName.trim() : undefined,
    };

    onAddPacks(newPacks, shipmentRecord);
    setScannedImage(null);

    setSubmissionSuccess({
      count: newPacks.length,
      docNo: shipmentRecord.documentNo,
    });

    // Reset Form completely
    setDocumentNo('');
    setDealershipName('');
    setReceivedState('');
    setReceivedCity('');
    setRemark('');
    setPackRows([
      {
        id: `row-${Date.now()}`,
        packNumber: '',
        packType: 'Kanger1.0_AIO',
        remark: '',
        isWithoutPlate: false,
        isDifferentSerial: false,
        challanPackNumber: '',
        mismatchReason: '',
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              Plant Inward Receiving
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Tata AutoComp Systems (Varale B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            Inward Receiving & Document Inward
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automatic OCR extraction of Tata Inward Stamp, Document No., and 1 to 35+ packs per delivery challan.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setEntryMode('AI_SCAN')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
              entryMode === 'AI_SCAN'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Paper Scan
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('MANUAL_TABLE')}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1.5 ${
              entryMode === 'MANUAL_TABLE'
                ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Manual Table
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {submissionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">
                Successfully Inwarded {submissionSuccess.count} Battery Pack(s) under Doc #{submissionSuccess.docNo}!
              </p>
              <p className="text-emerald-700 text-[11px]">
                All packs placed in <strong>Inward Area</strong>. You can now view them in the Inward Register or allocate to Lines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToInwardLog}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>View Inward Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSubmissionSuccess(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Inward Form Container */}
      <form onSubmit={handleSubmitInward} className="space-y-6">
        {/* Step 1: AI Paper Scan Upload Box (If in AI_SCAN mode) */}
        {entryMode === 'AI_SCAN' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                <Camera className="w-4 h-4 text-blue-600" />
                Upload Inward Paper / Delivery Challan
              </h3>
              <p className="text-xs text-slate-500">
                AI Vision will automatically parse pack numbers and verify the Tata Inward Stamp seal.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/20 p-6 rounded-xl transition cursor-pointer text-center space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700">Click to upload document or drag photo here</p>
                <p className="text-[11px] text-slate-400">Supports JPG, PNG, WebP</p>
              </div>
            </div>

            {/* Tata Circular Animated Loading Spinner during Scan */}
            {isScanning && (
              <TataLoadingSpinner
                size="md"
                message="AI Vision OCR Analyzing Invoice..."
                subMessage="Detecting Tata Inward Stamp & battery pack serials"
              />
            )}
          </div>
        )}

        {/* Inward Category Selector (New Supply vs Customer Plant Return) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Inward Shipment Classification
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Select Inward Receiving Category
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setInwardCategory('NEW_SUPPLY')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  inwardCategory === 'NEW_SUPPLY'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Standard Plant Supply (New Batteries)</span>
              </button>

              <button
                type="button"
                onClick={() => setInwardCategory('CUSTOMER_RETURN')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  inwardCategory === 'CUSTOMER_RETURN'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Customer Return / Warranty Repair</span>
              </button>
            </div>
          </div>

          {/* Customer Return Reason Box */}
          {inwardCategory === 'CUSTOMER_RETURN' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fadeIn text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  Customer Return / Warranty Reason (Tata Motors / Sanand / Chakan):
                </span>
                <span className="text-[10px] text-rose-700 uppercase font-mono-code font-bold">
                  Tracked in Customer Return Register
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1">
                    Primary Defect / Return Reason <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  >
                    <option value="Transit / Box Damage">Transit / Box Damage</option>
                    <option value="Cell Voltage Low">Cell Voltage Low</option>
                    <option value="BMS Communication Error">BMS Communication Error</option>
                    <option value="Connector Pin Broken / Damage">Connector Pin Broken / Damage</option>
                    <option value="Customer Plant Line QC Reject">Customer Plant Line QC Reject</option>
                    <option value="Warranty Service / Inspection">Warranty Service / Inspection</option>
                    <option value="Rework / Line Investigation">Rework / Line Investigation</option>
                    <option value="Other Return">Other Return</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-900 mb-1">
                    Return Challan / Plant Note
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="e.g. Sanand EV Line return due to packaging seal cut..."
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Document Header Information with Autocomplete Suggestions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Inward Document & Origin Information
          </h3>

          {/* HTML5 Datalists for Autocomplete */}
          <datalist id="dealership-suggestions">
            {dealershipSuggestions.map((d, i) => (
              <option key={i} value={d} />
            ))}
          </datalist>

          <datalist id="state-suggestions">
            {stateSuggestions.map((s, i) => (
              <option key={i} value={s} />
            ))}
          </datalist>

          <datalist id="city-suggestions">
            {citySuggestions.map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Document / Invoice / Challan No. <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateDocNo}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded cursor-pointer transition"
                  title="Auto-generate next DC sequence number"
                >
                  ⚡ Auto-DC
                </button>
              </div>
              <input
                id="inward-doc-no"
                type="text"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-rec-date')}
                placeholder="Enter Document / Challan Number..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Received Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="inward-rec-date"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-dealer-name')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Dealership Name with Predictive Autocomplete & Auto State/City Fill */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {inwardCategory === 'CUSTOMER_RETURN' ? 'Returning Customer / Plant Name' : 'Dealership / Supplier Name'} <span className="text-rose-500">*</span>
              </label>
              <input
                id="inward-dealer-name"
                type="text"
                list="dealership-suggestions"
                value={dealershipName}
                onChange={(e) => handleDealershipChange(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-rec-state')}
                placeholder={inwardCategory === 'CUSTOMER_RETURN' ? 'e.g. Tata Motors Sanand Plant...' : 'Type or select dealership...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Received State with Predictive Autocomplete */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Received State <span className="text-rose-500">*</span>
              </label>
              <input
                id="inward-rec-state"
                type="text"
                list="state-suggestions"
                value={receivedState}
                onChange={(e) => setReceivedState(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-rec-city')}
                placeholder="Select or type State (e.g. Maharashtra)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Received City / Plant with Predictive Autocomplete */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Received City / Location
              </label>
              <input
                id="inward-rec-city"
                type="text"
                list="city-suggestions"
                value={receivedCity}
                onChange={(e) => setReceivedCity(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-transport-name')}
                placeholder="Select or type City (e.g. Pune, Chakan)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Transporter Name <span className="text-rose-500">*</span>
              </label>
              <select
                id="inward-transport-name"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, transportName === 'Other' ? 'inward-custom-transport' : 'inward-pack-0')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              >
                {COMMON_TRANSPORTERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {transportName === 'Other' && (
                <input
                  id="inward-custom-transport"
                  type="text"
                  value={customTransport}
                  onChange={(e) => setCustomTransport(e.target.value)}
                  onKeyDown={(e) => handleKeyDownStep(e, 'inward-pack-0')}
                  placeholder="Enter custom transporter name..."
                  className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tata Inward Stamp Verified?
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-800">
                  <input
                    type="checkbox"
                    checked={hasInwardStamp}
                    onChange={(e) => setHasInwardStamp(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Official Stamp Verified OK</span>
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">Batch Remark / Notes</label>
              <input
                id="inward-remark"
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                onKeyDown={(e) => handleKeyDownStep(e, 'inward-pack-0')}
                placeholder="Enter general remark notes (applies to all packs unless specified per row)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Multi-Pack Dynamic Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-blue-600" />
                Battery Packs in this Document ({packRows.length} Packs)
              </h3>
              <p className="text-xs text-slate-500">
                Enter pack numbers (Auto-detects model shorthands like FBU, CKD, AIO, K2, LIMBER). Press Enter to add next row.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{showBulkPaste ? 'Hide Bulk Paste' : 'Fast Bulk Paste'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddRow(1)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+1 Row</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddRow(5)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                +5 Rows
              </button>
              <button
                type="button"
                onClick={() => handleAddRow(10)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                +10 Rows
              </button>
            </div>
          </div>

          {/* Fast Bulk Paste Box */}
          {showBulkPaste && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn text-xs">
              <label className="block font-bold text-slate-800">
                Paste Pack Numbers (Comma or Newline Separated):
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste numeric serials here..."
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 font-mono-code text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(false)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPaste}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Apply & Populate Rows
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Rows Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3 w-12">#</th>
                  <th className="p-3 min-w-[220px]">Pack Number (Physical Serial)</th>
                  <th className="p-3 min-w-[180px]">Product Name (Auto-Derived)</th>
                  <th className="p-3 min-w-[160px]">Flags & Discrepancies</th>
                  <th className="p-3 min-w-[180px]">Pack Remark (Damage / Quality Note)</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packRows.map((row, index) => {
                  const cleanNum = row.packNumber.toLowerCase().trim();
                  const foundExisting = cleanNum ? existingPackMap.get(cleanNum) : undefined;
                  const isDispatchedEarlier = foundExisting && foundExisting.status === 'DISPATCHED';
                  const isCurrentlyInWarehouse = foundExisting && foundExisting.status !== 'DISPATCHED';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 align-top">
                      <td className="p-3 font-mono-code text-slate-400 font-bold">{index + 1}</td>
                      <td className="p-2.5 space-y-1.5">
                        <div>
                          <input
                            id={`inward-pack-${index}`}
                            type="text"
                            value={row.packNumber}
                            readOnly={row.isWithoutPlate}
                            onChange={(e) => handleRowChange(row.id, 'packNumber', e.target.value)}
                            onKeyDown={(e) => handlePackRowKeyDown(e, index)}
                            placeholder={row.isWithoutPlate ? 'Auto NP Code' : 'Enter physical serial (e.g. 2195)...'}
                            className={`w-full border rounded-lg px-3 py-2 text-xs font-mono-code font-bold focus:outline-none ${
                              row.isWithoutPlate
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : row.isDifferentSerial
                                ? 'bg-purple-50/50 border-purple-300 text-slate-900 focus:bg-white focus:border-purple-500'
                                : isCurrentlyInWarehouse
                                ? 'bg-rose-50 border-rose-400 text-rose-900 focus:bg-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'
                            }`}
                            required
                          />
                        </div>

                        {/* Duplicate Alert or Customer Return Re-Inward Badge */}
                        {isCurrentlyInWarehouse && (
                          <div className="p-1.5 bg-rose-50 border border-rose-300 rounded text-[10px] text-rose-800 font-bold flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span>⚠️ Already in Warehouse ({foundExisting.currentLocation || foundExisting.locationArea || 'Inward Area'}) — Duplicate Warning!</span>
                          </div>
                        )}

                        {isDispatchedEarlier && (
                          <div className="p-1.5 bg-purple-50 border border-purple-300 rounded text-[10px] text-purple-900 font-bold flex items-center gap-1 animate-fadeIn">
                            <RefreshCw className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            <span>🔄 Re-Inward (Lifecycle #{(foundExisting.lifecycleCount || 1) + 1}) — Dispatched earlier to {foundExisting.dispatchToCustomer || 'Customer'}</span>
                          </div>
                        )}

                        {/* Discrepancy / Challan Mismatch Expandable Input */}
                        {row.isDifferentSerial && (
                          <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg space-y-1.5 animate-fadeIn">
                            <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
                              <span>Challan / Invoice Document Serial:</span>
                              <span className="text-[9px] text-purple-600 uppercase">Audit Tracked</span>
                            </div>
                            <input
                              id={`inward-challan-pack-${index}`}
                              type="text"
                              value={row.challanPackNumber || ''}
                              onChange={(e) => handleRowChange(row.id, 'challanPackNumber', e.target.value)}
                              onKeyDown={(e) => handlePackRowKeyDown(e, index, true, false)}
                              placeholder="Challan Doc Serial # (e.g. 2190)..."
                              className="w-full bg-white border border-purple-300 rounded px-2 py-1 text-xs font-mono-code font-bold text-purple-900 focus:outline-none focus:border-purple-600"
                              required
                            />
                            <input
                              id={`inward-mismatch-reason-${index}`}
                              type="text"
                              value={row.mismatchReason || ''}
                              onChange={(e) => handleRowChange(row.id, 'mismatchReason', e.target.value)}
                              onKeyDown={(e) => handlePackRowKeyDown(e, index, true, true)}
                              placeholder="Mismatch reason (e.g. Received #2195 instead of #2190)..."
                              className="w-full bg-white border border-purple-200 rounded px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <select
                          value={row.packType}
                          onChange={(e) => handleRowChange(row.id, 'packType', e.target.value as BatteryPackType)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                        >
                          {ALL_PACK_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleWithoutPlate(row.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              row.isWithoutPlate
                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                            title="Toggle if pack has no physical serial sticker/plate"
                          >
                            <Tag className="w-3 h-3" />
                            <span>{row.isWithoutPlate ? 'NO-PLATE' : 'No Plate?'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDifferentSerial(row.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              row.isDifferentSerial
                                ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                            title="Toggle if physical serial number differs from delivery challan serial"
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>{row.isDifferentSerial ? 'DIFF-NO' : 'Diff No?'}</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={row.remark || ''}
                          onChange={(e) => handleRowChange(row.id, 'remark', e.target.value)}
                          placeholder="e.g. Damage Box, Reject Cell..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                          Inward Area
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {packRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Actions */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="text-xs text-slate-500">
            {canDirectApprove ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Manager / Supervisor authority: Packs will be auto-approved into Inward Area.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Employee entry: Packs will be submitted for Supervisor approval.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Inward Batch ({packRows.filter((r) => r.packNumber.trim().length > 0).length} Packs)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
