import * as XLSX from 'xlsx';
import { BatteryPack, DispatchLot, InwardShipmentRecord, InvoiceData } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

export function exportInventoryToExcel(packs: BatteryPack[], filename = 'Tata_Battery_Warehouse_Inventory.xlsx') {
  const data = packs.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    return {
      'Sr No': index + 1,
      'Pack Number / Serial': p.packNumber,
      'Model / Pack Type': model?.name || p.packType,
      'Category': model?.category || 'Tata Lithium',
      'Location Line': p.status === 'IN_STORAGE' ? p.lineId : (p.status === 'IN_DISPATCH_AREA' ? 'Dispatch Bay' : 'Dispatched'),
      'Rack No': p.status === 'IN_STORAGE' ? `R-${p.rackNumber}` : '-',
      'Slot (Level 1-4)': p.status === 'IN_STORAGE' ? `Level ${p.rackSlot}` : '-',
      'Status': p.status,
      'Nominal Voltage': p.voltage,
      'Capacity (Ah)': p.capacityAh,
      'Energy (kWh)': model?.energyKwh || '',
      'HSN Code': model?.hsnCode || '85076000',
      'Inward Date': new Date(p.inwardDate).toLocaleString('en-IN'),
      'Transport Company': p.transportName,
      'Transport Doc / Inv No': p.transportDocNo,
      'LR Number': p.lrNumber,
      'Vehicle Number': p.vehicleNumber,
      'Batch Number': p.batchNumber || '',
      'Dispatched Date': p.dispatchedAt ? new Date(p.dispatchedAt).toLocaleString('en-IN') : '-',
      'Destination Consignee': p.destinationConsignee || '-',
      'Invoice / Challan No': p.invoiceNumber || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Warehouse Inventory');
  XLSX.writeFile(wb, filename);
}

export function exportInwardShipmentsToExcel(shipments: InwardShipmentRecord[], filename = 'Tata_Inward_Shipment_Log.xlsx') {
  const data = shipments.map((s, index) => ({
    'Sr No': index + 1,
    'Inward Date & Time': new Date(s.timestamp).toLocaleString('en-IN'),
    'Transport Name': s.transportName,
    'LR Number': s.lrNumber,
    'Document / Invoice No': s.transportDocNo,
    'Vehicle Number': s.vehicleNumber,
    'Driver Name': s.driverName || '-',
    'Driver Phone': s.driverPhone || '-',
    'Packs Received': s.packCount,
    'Pack Serial Numbers': s.packNumbers.join(', '),
    'Received By': s.receivedBy,
    'Notes': s.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inward Shipments');
  XLSX.writeFile(wb, filename);
}

export function exportDispatchLotsToExcel(lots: DispatchLot[], filename = 'Tata_Battery_Dispatch_Lots.xlsx') {
  const rows: any[] = [];
  
  lots.forEach((lot) => {
    lot.packs.forEach((pack, pIdx) => {
      const model = BATTERY_MODELS[pack.packType];
      rows.push({
        'Lot Number': lot.lotNumber,
        'Dispatch Date': new Date(lot.timestamp).toLocaleString('en-IN'),
        'Consignee Name': lot.consigneeName,
        'Destination Address': lot.consigneeAddress,
        'Vehicle Number': lot.vehicleNumber,
        'Driver Name & Phone': `${lot.driverName} (${lot.driverMobile})`,
        'Transport Carrier': lot.transportName,
        'LR / Bilty No': lot.lrNumber,
        'Gate Pass No': lot.transportDocNo,
        'Pack Serial': pack.packNumber,
        'Model Type': model?.name || pack.packType,
        'Voltage / Ah': `${pack.voltage} / ${pack.capacityAh}`,
        'Invoice Number': lot.invoiceNumber || '-',
        'Approved By': lot.approvedBy,
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Lots');
  XLSX.writeFile(wb, filename);
}

export function exportInvoiceToExcel(invoice: InvoiceData, filename?: string) {
  const itemsData = invoice.items.map((it, idx) => ({
    'S.No': idx + 1,
    'Description of Goods': it.description,
    'HSN/SAC': it.hsnCode,
    'Quantity': it.quantity,
    'Unit': 'NOS',
    'Rate (INR)': it.unitPrice || it.ratePerUnit || 0,
    'Taxable Amount (INR)': it.taxableAmount || it.amount || 0,
    'Serial Numbers in Lot': (it.packNumbers || []).join(' | '),
  }));

  const summary = [
    {},
    { 'Description of Goods': 'Sub Total', 'Taxable Amount (INR)': invoice.totalTaxableAmount },
    { 'Description of Goods': 'CGST', 'Taxable Amount (INR)': invoice.cgstAmount },
    { 'Description of Goods': 'SGST', 'Taxable Amount (INR)': invoice.sgstAmount },
    { 'Description of Goods': 'IGST', 'Taxable Amount (INR)': invoice.igstAmount },
    { 'Description of Goods': 'Grand Total', 'Taxable Amount (INR)': invoice.grandTotal },
  ];

  const headerInfo = [
    { 'S.No': 'TAX INVOICE / DELIVERY CHALLAN' },
    { 'S.No': `Invoice No: ${invoice.invoiceNumber}`, 'Description of Goods': `Date: ${invoice.date}` },
    { 'S.No': `E-Way Bill: ${invoice.eWayBillNo || '-'}`, 'Description of Goods': `LR No: ${invoice.lrNumber}` },
    { 'S.No': `Transporter: ${invoice.transportName}`, 'Description of Goods': `Vehicle No: ${invoice.vehicleNumber}` },
    { 'S.No': `SELLER: ${invoice.sellerName} | GSTIN: ${invoice.sellerGstin}` },
    { 'S.No': `BUYER: ${invoice.buyerName} | GSTIN: ${invoice.buyerGstin}` },
    { 'S.No': `Delivery Address: ${invoice.buyerAddress}` },
    {},
  ];

  const ws = XLSX.utils.json_to_sheet([...headerInfo, ...itemsData, ...summary]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tax Invoice');
  
  const finalName = filename || `Tax_Invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
