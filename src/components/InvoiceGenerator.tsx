import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Building,
  Truck,
  DollarSign,
  Download,
  CheckCircle2,
  Sparkles,
  Edit3,
  Layers,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { Invoice, InvoiceItem, DispatchLot } from '../types';
import { BATTERY_MODELS, COMMON_DESTINATIONS } from '../data/batteryCatalog';

interface InvoiceGeneratorProps {
  initialLot?: DispatchLot | null;
  savedInvoices: Invoice[];
  onSaveInvoice: (invoice: Invoice) => void;
  onBackToDispatch?: () => void;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  initialLot,
  savedInvoices,
  onSaveInvoice,
  onBackToDispatch,
}) => {
  // Invoice Header State
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `TATA/EV/2026/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eWayBillNo, setEWayBillNo] = useState<string>(`2810${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [poNumber, setPoNumber] = useState<string>(`PO-TATA-${new Date().getFullYear()}-4490`);

  // Seller Details (Tata AutoComp Systems Ltd)
  const [sellerName, setSellerName] = useState('TATA AUTOCOMP SYSTEMS LIMITED');
  const [sellerAddress, setSellerAddress] = useState('EV Battery Division, Plot No. A-1/2, Chakan Industrial Area Phase II, Pune - 410501, Maharashtra, India');
  const [sellerGstin, setSellerGstin] = useState('27AAACT2940K1ZB');
  const [sellerState, setSellerState] = useState('Maharashtra (27)');

  // Buyer / Consignee Details
  const [buyerName, setBuyerName] = useState(COMMON_DESTINATIONS[0].name);
  const [buyerAddress, setBuyerAddress] = useState(COMMON_DESTINATIONS[0].address);
  const [buyerGstin, setBuyerGstin] = useState(COMMON_DESTINATIONS[0].gstin);
  const [buyerState, setBuyerState] = useState(COMMON_DESTINATIONS[0].state);
  const [placeOfSupply, setPlaceOfSupply] = useState(COMMON_DESTINATIONS[0].state);

  // Transport Details
  const [transportName, setTransportName] = useState('VRL Logistics Ltd.');
  const [vehicleNumber, setVehicleNumber] = useState('MH-12-RN-4589');
  const [lrNumber, setLrNumber] = useState('LR-MH-9042');

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Tata Kanger1.0 Gen3 Lithium-Ion Traction Battery Pack (350V 135Ah)',
      hsnCode: '85076000',
      packType: 'Kanger1.0_Gen3',
      quantity: 24,
      unitPrice: 285000,
      taxableAmount: 24 * 285000,
      gstRate: 18,
      gstAmount: 24 * 285000 * 0.18,
      totalAmount: 24 * 285000 * 1.18,
      packNumbers: ['TATA-TK1G-26-894101', 'TATA-TK1G-26-894102'],
    },
  ]);

  // Bank & Payment Details
  const [bankName, setBankName] = useState('State Bank of India (Industrial Branch)');
  const [accountNumber, setAccountNumber] = useState('30998822104928');
  const [ifscCode, setIfscCode] = useState('SBIN0004921');
  const [terms, setTerms] = useState(
    '1. Goods once sold will not be taken back.\n2. Warranty valid as per Tata Motors Battery Service Level Agreement (8 Years / 160,000 km).\n3. Subject to Pune jurisdiction.'
  );

  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW' | 'HISTORY'>('PREVIEW');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Initialize from Lot if passed
  useEffect(() => {
    if (initialLot) {
      setBuyerName(initialLot.consigneeName);
      setBuyerAddress(initialLot.consigneeAddress);
      setBuyerGstin(initialLot.consigneeGstin || '27AAACT2940K1ZB');
      setTransportName(initialLot.transportName);
      setVehicleNumber(initialLot.vehicleNumber);
      setLrNumber(initialLot.lrNumber);

      // Group packs by type
      const countsByType: Record<string, { count: number; packNumbers: string[] }> = {};
      initialLot.packs.forEach((p) => {
        if (!countsByType[p.packType]) {
          countsByType[p.packType] = { count: 0, packNumbers: [] };
        }
        countsByType[p.packType].count += 1;
        countsByType[p.packType].packNumbers.push(p.packNumber);
      });

      const newItems: InvoiceItem[] = Object.entries(countsByType).map(([typeKey, data], idx) => {
        const model = BATTERY_MODELS[typeKey as any];
        const unitPrice = 280000;
        const taxable = data.count * unitPrice;
        const gst = taxable * 0.18;
        return {
          id: `item-${idx + 1}`,
          description: `Tata ${typeKey} Lithium Traction Pack (${model?.nominalVoltage || '350V'} ${model?.capacityAh || '135Ah'} AIS-038 Rev2)`,
          hsnCode: '85076000',
          packType: typeKey,
          quantity: data.count,
          unitPrice: unitPrice,
          taxableAmount: taxable,
          gstRate: 18,
          gstAmount: gst,
          totalAmount: taxable + gst,
          packNumbers: data.packNumbers,
        };
      });

      if (newItems.length > 0) {
        setItems(newItems);
      }
      setActiveTab('PREVIEW');
    }
  }, [initialLot]);

  // Recalculate financial totals
  const totalTaxable = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const isInterState = !sellerState.includes('27') || !buyerState.includes('27');
  const cgstAmount = isInterState ? 0 : totalGst / 2;
  const sgstAmount = isInterState ? 0 : totalGst / 2;
  const igstAmount = isInterState ? totalGst : 0;
  const grandTotal = totalTaxable + totalGst;

  // Add line item
  const handleAddItem = () => {
    const defaultType = 'Kanger1.0_Gen3';
    const unitPrice = 285000;
    const qty = 12;
    const taxable = qty * unitPrice;
    const gst = taxable * 0.18;

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: `Tata ${defaultType} Lithium Battery Pack (350V 135Ah)`,
      hsnCode: '85076000',
      packType: defaultType,
      quantity: qty,
      unitPrice: unitPrice,
      taxableAmount: taxable,
      gstRate: 18,
      gstAmount: gst,
      totalAmount: taxable + gst,
      packNumbers: [],
    };
    setItems([...items, newItem]);
  };

  // Update item field
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitPrice' || field === 'gstRate') {
          const qty = field === 'quantity' ? Number(val) : item.quantity;
          const price = field === 'unitPrice' ? Number(val) : item.unitPrice;
          const gstRate = field === 'gstRate' ? Number(val) : item.gstRate;
          updated.taxableAmount = qty * price;
          updated.gstAmount = updated.taxableAmount * (gstRate / 100);
          updated.totalAmount = updated.taxableAmount + updated.gstAmount;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  // Handle Save Invoice
  const handleSave = () => {
    const inv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: invoiceDate,
      eWayBillNo: eWayBillNo,
      poNumber: poNumber,
      sellerName: sellerName,
      sellerAddress: sellerAddress,
      sellerGstin: sellerGstin,
      sellerState: sellerState,
      buyerName: buyerName,
      buyerAddress: buyerAddress,
      buyerGstin: buyerGstin,
      buyerState: buyerState,
      placeOfSupply: placeOfSupply,
      transportName: transportName,
      vehicleNumber: vehicleNumber,
      lrNumber: lrNumber,
      items: items,
      totalTaxableAmount: totalTaxable,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      igstAmount: igstAmount,
      grandTotal: grandTotal,
      termsAndConditions: terms,
      bankDetails: {
        bankName,
        accountNumber,
        ifscCode,
        branch: 'Chakan Industrial Branch',
      },
    };

    onSaveInvoice(inv);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Top Banner with Actions */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> GST Tax Invoice & Material Challan Generator
              </span>
              <span className="text-xs text-slate-500 font-medium">Standard Tata AutoComp Format</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Invoice #{invoiceNumber}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Edit materials, unit rates, consignee addresses, print GST tax invoices, or export copies.
            </p>
          </div>

          {/* Action Tabs & Print */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Print Preview
              </button>
              <button
                onClick={() => setActiveTab('EDIT')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeTab === 'EDIT'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edit Invoice
              </button>
              <button
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Past Invoices ({savedInvoices.length})
              </button>
            </div>

            <button
              onClick={handleSave}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Record</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice / PDF</span>
            </button>
          </div>
        </div>

        {isSavedNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Invoice #{invoiceNumber} successfully saved to system!
          </div>
        )}
      </div>

      {/* Mode 1: Edit Mode Form */}
      {activeTab === 'EDIT' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-orange-500" />
              Edit Invoice Parameters & Materials
            </h3>
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Back to Preview ➔
            </button>
          </div>

          {/* Top Meta Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono-code font-bold focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">E-Way Bill Number</label>
              <input
                type="text"
                value={eWayBillNo}
                onChange={(e) => setEWayBillNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono-code focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buyer PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Seller vs Buyer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 text-xs">
            {/* Seller */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-blue-700 uppercase tracking-wider text-[11px]">
                Seller / Supplier Information
              </h4>
              <div>
                <label className="block text-slate-500 mb-1">Company Name</label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={sellerGstin}
                    onChange={(e) => setSellerGstin(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono-code focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">State & Code</label>
                  <input
                    type="text"
                    value={sellerState}
                    onChange={(e) => setSellerState(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Buyer */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-orange-700 uppercase tracking-wider text-[11px]">
                Buyer / Consignee Information
              </h4>
              <div>
                <label className="block text-slate-500 mb-1">Buyer Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">Buyer GSTIN</label>
                  <input
                    type="text"
                    value={buyerGstin}
                    onChange={(e) => setBuyerGstin(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono-code focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Place of Supply</label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" /> Battery Material Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Material Item
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-[11px] uppercase font-bold">
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 w-24">HSN/SAC</th>
                    <th className="p-2.5 w-20 text-center">Qty</th>
                    <th className="p-2.5 w-32 text-right">Unit Rate (₹)</th>
                    <th className="p-2.5 w-20 text-center">GST %</th>
                    <th className="p-2.5 w-32 text-right">Total Amount (₹)</th>
                    <th className="p-2.5 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => handleUpdateItem(item.id, 'hsnCode', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-mono-code text-xs text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-mono-code text-xs text-center"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-mono-code text-xs text-right"
                        />
                      </td>
                      <td className="p-2.5 text-center font-mono-code text-slate-600">
                        {item.gstRate}%
                      </td>
                      <td className="p-2.5 text-right font-mono-code font-bold text-slate-900">
                        ₹{item.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Professional Clean Print Preview Format */}
      {activeTab === 'PREVIEW' && (
        <div className="bg-white text-slate-900 rounded-xl shadow-md p-8 sm:p-10 border border-slate-200 print:border-none print:shadow-none print:p-0 max-w-5xl mx-auto font-sans">
          {/* Print Document Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase font-display">
                  {sellerName}
                </h1>
                <p className="text-xs text-slate-600 max-w-lg mt-1 font-medium leading-relaxed">
                  {sellerAddress}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-700">
                  <span>GSTIN: <strong className="text-slate-900 font-mono">{sellerGstin}</strong></span>
                  <span>State: <strong className="text-slate-900">{sellerState}</strong></span>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white text-xs font-extrabold px-3 py-1 rounded tracking-wider uppercase">
                  TAX INVOICE
                </span>
                <div className="mt-2 text-xs space-y-0.5">
                  <div className="font-mono font-black text-sm text-slate-900">{invoiceNumber}</div>
                  <div className="text-slate-600">Date: <strong className="text-slate-900">{new Date(invoiceDate).toLocaleDateString('en-IN')}</strong></div>
                  <div className="text-slate-600">E-Way Bill: <strong className="font-mono text-slate-900">{eWayBillNo}</strong></div>
                  <div className="text-slate-600">PO Ref: <strong className="text-slate-900">{poNumber}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Consignee & Transport Meta */}
          <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
            {/* Buyer / Consignee */}
            <div className="space-y-1">
              <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Details of Receiver (Billed to & Shipped to):</span>
              <p className="font-bold text-slate-900 text-sm">{buyerName}</p>
              <p className="text-slate-600 leading-snug">{buyerAddress}</p>
              <p className="text-slate-700 font-semibold pt-1">
                GSTIN: <span className="font-mono font-bold text-slate-900">{buyerGstin}</span> • State: {buyerState}
              </p>
              <p className="text-slate-600">Place of Supply: <strong>{placeOfSupply}</strong></p>
            </div>

            {/* Transport Details */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1 text-xs font-mono">
              <span className="font-sans font-bold text-slate-500 uppercase text-[10px] tracking-wider block">Transportation Dispatch Details:</span>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">Transporter:</span>
                <span className="font-bold text-slate-900">{transportName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">Vehicle Truck No:</span>
                <span className="font-bold text-slate-900">{vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">LR / Bilty No:</span>
                <span className="font-bold text-slate-900">{lrNumber}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-4">
            <table className="w-full text-left border border-slate-200 text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
                <tr>
                  <th className="p-2.5 w-8 text-center border-r border-slate-200">#</th>
                  <th className="p-2.5 border-r border-slate-200">Description of Goods</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-200">HSN Code</th>
                  <th className="p-2.5 w-16 text-center border-r border-slate-200">Qty</th>
                  <th className="p-2.5 w-28 text-right border-r border-slate-200">Rate (₹)</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200">Taxable Value (₹)</th>
                  <th className="p-2.5 w-28 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-2.5 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2.5 border-r border-slate-200">
                      <p className="font-bold text-slate-900">{item.description}</p>
                      {item.packNumbers && item.packNumbers.length > 0 && (
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate max-w-md">
                          Pack Serials: {item.packNumbers.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono border-r border-slate-200">{item.hsnCode}</td>
                    <td className="p-2.5 text-center font-bold font-mono border-r border-slate-200">{item.quantity}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-200">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200">₹{item.taxableAmount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="grid grid-cols-2 gap-6 py-2 border-t border-slate-200 text-xs">
            {/* Bank Details & Terms */}
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] block">Company Bank Details for RTGS / NEFT:</span>
                <p className="text-slate-600">Bank: <strong className="text-slate-900">{bankName}</strong></p>
                <p className="text-slate-600 font-mono">A/C No: <strong className="text-slate-900">{accountNumber}</strong></p>
                <p className="text-slate-600 font-mono">IFSC: <strong className="text-slate-900">{ifscCode}</strong></p>
              </div>
              <div className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">
                <strong>Terms & Conditions:</strong>
                {'\n' + terms}
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-2 border-l border-slate-200 pl-6">
              <div className="flex justify-between text-slate-600">
                <span>Total Taxable Value:</span>
                <span className="font-mono font-bold text-slate-900">₹{totalTaxable.toLocaleString('en-IN')}</span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono font-bold text-slate-900">₹{cgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono font-bold text-slate-900">₹{sgstAmount.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (18%):</span>
                  <span className="font-mono font-bold text-slate-900">₹{igstAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm font-black text-slate-950">
                <span>GRAND TOTAL (INR):</span>
                <span className="font-mono text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[10px] text-slate-500 text-right italic">
                Amount in words: INR Indian Rupees Only
              </p>

              {/* Signature Box */}
              <div className="pt-6 text-right">
                <p className="font-bold text-[11px] text-slate-800">For TATA AUTOCOMP SYSTEMS LIMITED</p>
                <div className="h-12"></div>
                <p className="text-[11px] text-slate-600 font-semibold">Authorized Signatory / Plant Logistics</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Invoice History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-900">Historical Generated Tax Invoices</h3>
          {savedInvoices.length === 0 ? (
            <p className="text-xs text-slate-500">No invoices saved yet in current session.</p>
          ) : (
            <div className="space-y-2">
              {savedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="font-mono-code font-bold text-slate-900 text-sm">{inv.invoiceNumber}</div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Buyer: {inv.buyerName} • {new Date(inv.date).toLocaleDateString()} • Vehicle: {inv.vehicleNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-code font-bold text-blue-700">
                      ₹{inv.grandTotal.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                      PAID / DISPATCHED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
