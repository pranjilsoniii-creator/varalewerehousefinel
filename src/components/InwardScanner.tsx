import React, { useState, useRef } from 'react';
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
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { BatteryPack, BatteryPackType, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, COMMON_TRANSPORTERS } from '../data/batteryCatalog';
import { useAuth } from '../context/AuthContext';

interface InwardScannerProps {
  existingPacks: BatteryPack[];
  onAddPacks: (newPacks: BatteryPack[], shipmentRecord: InwardShipmentRecord) => void;
  onNavigateToInwardLog: () => void;
}

interface PackRow {
  id: string;
  packNumber: string;
  packType: BatteryPackType;
}

export const InwardScanner: React.FC<InwardScannerProps> = ({
  existingPacks,
  onAddPacks,
  onNavigateToInwardLog,
}) => {
  const { currentUser, canDirectApprove } = useAuth();

  // Mode: 'AI_SCAN' vs 'MANUAL_TABLE'
  const [entryMode, setEntryMode] = useState<'AI_SCAN' | 'MANUAL_TABLE'>('AI_SCAN');

  // Common Header State
  const [documentNo, setDocumentNo] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dealershipName, setDealershipName] = useState('Tata Motors Authorized Source');
  const [receivedState, setReceivedState] = useState('Maharashtra');
  const [transportName, setTransportName] = useState(COMMON_TRANSPORTERS[0]);
  const [customTransport, setCustomTransport] = useState('');
  const [remark, setRemark] = useState('');
  const [hasInwardStamp, setHasInwardStamp] = useState(true);

  // Dynamic Pack Rows (1 to 35+ packs)
  const [packRows, setPackRows] = useState<PackRow[]>([
    { id: 'row-1', packNumber: '', packType: 'Kanger1.0_AIO' },
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

  // Add more rows
  const handleAddRow = (count: number = 1) => {
    const newRows: PackRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: 'row-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
        packNumber: '',
        packType: packRows[packRows.length - 1]?.packType || 'Kanger1.0_AIO',
      });
    }
    setPackRows((prev) => [...prev, ...newRows]);
  };

  const handleRemoveRow = (id: string) => {
    if (packRows.length <= 1) return;
    setPackRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: 'packNumber' | 'packType', value: string) => {
    setPackRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Bulk Paste Parser
  const handleApplyBulkPaste = () => {
    if (!bulkText.trim()) return;
    const tokens = bulkText
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (tokens.length === 0) return;

    const newRows: PackRow[] = tokens.map((token, index) => ({
      id: 'bulk-' + Date.now() + '-' + index,
      packNumber: token.replace(/[^0-9]/g, '') || token,
      packType: packRows[0]?.packType || 'Kanger1.0_AIO',
    }));

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
          const extractedRows: PackRow[] = data.packs.map((p: any, idx: number) => ({
            id: 'ocr-' + Date.now() + '-' + idx,
            packNumber: String(p.packNumber || '').replace(/[^0-9]/g, '') || String(p.packNumber || ''),
            packType: (p.packType as BatteryPackType) || 'Kanger1.0_AIO',
          }));
          setPackRows(extractedRows);
          setOcrMessage('Found ' + extractedRows.length + ' pack(s) in document. Tata Stamp: ' + (data.hasInwardStamp ? 'VERIFIED' : 'NOT DETECTED'));
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setOcrMessage('Document OCR processing finished.');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit Inward Entry
  const handleSubmitInward = (e: React.FormEvent) => {
    e.preventDefault();

    const validRows = packRows.filter((r) => r.packNumber.trim().length > 0);
    if (validRows.length === 0) {
      alert('Please enter at least 1 valid numeric Pack Number.');
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

    const newPacks: BatteryPack[] = validRows.map((r, index) => ({
      id: 'pack-' + Date.now() + '-' + index + '-' + Math.random().toString(36).slice(2, 6),
      packNumber: r.packNumber.trim(),
      packType: r.packType,
      status: autoApproved ? 'INWARD_AREA' : 'PENDING_APPROVAL',
      locationArea: 'Inward Area',
      currentLocation: 'Inward Area',
      inwardDate: receivedDate || nowIso,
      documentNo: documentNo.trim() || ('DOC-' + Date.now().toString().slice(-4)),
      dealershipName: dealershipName.trim(),
      receivedState: receivedState.trim(),
      transportName: finalTransporter,
      remark: remark.trim(),
      hasInwardStamp: hasInwardStamp,
      inwardBy: operatorName,
      inwardApprovedBy: autoApproved ? operatorName : undefined,
      inwardApprovedAt: autoApproved ? nowIso : undefined,
      movementHistory: [
        {
          id: 'mov-' + Date.now() + '-' + index,
          timestamp: nowIso,
          fromLocation: 'Receiving Dock',
          toLocation: 'Inward Area',
          movedBy: operatorName,
          reason: 'Initial Inward Receiving (Doc #' + documentNo + ')',
        },
      ],
    }));

    const typeSummary: Record<string, number> = {};
    validRows.forEach((r) => {
      typeSummary[r.packType] = (typeSummary[r.packType] || 0) + 1;
    });

    const shipmentRecord: InwardShipmentRecord = {
      id: 'inw-' + Date.now(),
      timestamp: nowIso,
      documentNo: documentNo.trim() || ('DOC-' + Date.now().toString().slice(-4)),
      dealershipName: dealershipName.trim(),
      receivedState: receivedState.trim(),
      transportName: finalTransporter,
      packCount: newPacks.length,
      packNumbers: enteredNumbers,
      packTypeSummary: typeSummary,
      inwardBy: operatorName,
      approvedBy: autoApproved ? operatorName : undefined,
      hasInwardStamp: hasInwardStamp,
      status: autoApproved ? 'APPROVED' : 'PENDING_APPROVAL',
      remark: remark.trim(),
    };

    onAddPacks(newPacks, shipmentRecord);
    setScannedImage(null);

    setSubmissionSuccess({
      count: newPacks.length,
      docNo: shipmentRecord.documentNo,
    });

    // Reset Form
    setDocumentNo('');
    setRemark('');
    setPackRows([{ id: 'row-' + Date.now(), packNumber: '', packType: 'Kanger1.0_AIO' }]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5 text-orange-600" /> Tata Inward System
            </span>
            <span className="text-xs text-slate-500 font-mono-code font-medium">Varale (B300 Plant)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
            AI Document Scan & Multi-Pack Inward Receiving
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Automatic OCR extraction of Tata Inward Stamp, Document No., and 1 to 35+ packs per delivery challan.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setEntryMode('AI_SCAN')}
            className={'px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ' +
              (entryMode === 'AI_SCAN'
                ? 'bg-white text-orange-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900')}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Paper Scan
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('MANUAL_TABLE')}
            className={'px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ' +
              (entryMode === 'MANUAL_TABLE'
                ? 'bg-white text-orange-600 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900')}
          >
            <Layers className="w-3.5 h-3.5" /> Manual Table Entry
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
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                <Camera className="w-4 h-4 text-orange-500" />
                Upload or Capture Inward Paper / Delivery Challan
              </h3>
              <p className="text-xs text-slate-500">
                AI will auto-read all Pack Numbers, Product Types, and verify Tata Inward Stamp seal.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/70 hover:bg-orange-50/20 p-6 rounded-xl transition cursor-pointer text-center space-y-2"
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
                <p className="text-[11px] text-slate-400">Supports JPG, PNG, WebP (Multi-pack challans & invoices)</p>
              </div>
            </div>

            {isScanning && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                <span>{ocrMessage || 'Extracting data with AI...'}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Document Header Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-display flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Inward Document & Origin Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Document / Invoice / Challan No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
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
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Dealership / Supplier Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={dealershipName}
                onChange={(e) => setDealershipName(e.target.value)}
                placeholder="Enter Dealership / Source Name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Received State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={receivedState}
                onChange={(e) => setReceivedState(e.target.value)}
                placeholder="Enter Received State..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Transporter Name <span className="text-rose-500">*</span>
              </label>
              <select
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
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
                  type="text"
                  value={customTransport}
                  onChange={(e) => setCustomTransport(e.target.value)}
                  placeholder="Enter custom transporter name"
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
              <label className="block font-bold text-slate-700 mb-1">Remark / Notes</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter remark notes (optional)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Multi-Pack Dynamic Table (1 to 35+ packs) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                <Layers className="w-4 h-4 text-orange-500" />
                Battery Packs in this Document ({packRows.length} Packs)
              </h3>
              <p className="text-xs text-slate-500">
                Enter numeric pack numbers and select the official product model.
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
                  <th className="p-3">Pack Number (Numeric)</th>
                  <th className="p-3">Product Name (12 Official Models)</th>
                  <th className="p-3">Destination Storage</th>
                  <th className="p-3 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono-code text-slate-400 font-bold">{index + 1}</td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={row.packNumber}
                        onChange={(e) => handleRowChange(row.id, 'packNumber', e.target.value)}
                        placeholder="Enter numeric serial..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono-code font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                        required
                      />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Actions */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-xs text-slate-500">
            {canDirectApprove ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Manager / Supervisor authority: Packs will be directly auto-approved into Inward Area.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Employee entry: Packs will be submitted for Supervisor / Manager approval.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Inward Batch ({packRows.filter((r) => r.packNumber.trim().length > 0).length} Packs)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
