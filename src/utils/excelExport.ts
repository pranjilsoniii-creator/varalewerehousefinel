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
      'Location Line': p.status === 'IN_STORAGE' ? p.lineId : (p.status === 'IN_DISPATCH_AREA' ? 'Dispatch Bay' : p.locationArea || 'Inward Area'),
      'Rack No': p.status === 'IN_STORAGE' ? 'R-' + (p.rackNumber || 1) : '-',
      'Slot (Level 1-4)': p.status === 'IN_STORAGE' ? 'Level ' + (p.rackSlot || 1) : '-',
      'Status': p.status,
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '-',
      'Document / Challan No': p.documentNo || '-',
      'Dealership / Source': p.dealershipName || '-',
      'Transport Company': p.transportName || '-',
      'Tata Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Inwarded By': p.inwardBy || '-',
      'Approved By': p.inwardApprovedBy || '-',
      'Dispatched Date': p.dispatchedAt ? new Date(p.dispatchedAt).toLocaleString('en-IN') : '-',
      'Destination Consignee': p.dispatchToCustomer || p.dispatchToAddress || '-',
      'Vehicle Number': p.dispatchVehicleNo || '-',
      'LR Number': p.dispatchLrNo || '-',
      'Gate Pass No': p.dispatchDocNo || '-',
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
    'Document / Invoice No': s.documentNo,
    'Dealership / Source': s.dealershipName,
    'Received State': s.receivedState,
    'Transport Name': s.transportName,
    'Packs Received': s.packCount,
    'Pack Serial Numbers': Array.isArray(s.packNumbers) ? s.packNumbers.join(', ') : '',
    'Received / Inwarded By': s.inwardBy,
    'Approved By': s.approvedBy || '-',
    'Tata Stamp Verified': s.hasInwardStamp ? 'YES' : 'NO',
    'Status': s.status,
    'Remark / Notes': s.remark || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inward Shipments');
  XLSX.writeFile(wb, filename);
}

export function exportInwardRegisterPacksToExcel(packs: BatteryPack[], filename = 'Tata_Inward_Packs_Ledger.xlsx') {
  const data = packs.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    const modelName = p.packType === 'Limber_Non_Ais' || p.packType === 'Limber_Ais' 
      ? 'Limber_Ais' 
      : (model?.name || p.packType);
    const statusLabel = p.status === 'PENDING_APPROVAL'
      ? 'Pending Approval'
      : p.status === 'IN_STORAGE'
      ? `Allocated (Line ${p.lineId || 1})`
      : 'Inward Area';

    return {
      'Sr No': index + 1,
      'Pack Number': p.packNumber,
      'Model': modelName,
      'Document / Challan No': p.documentNo || '—',
      'Dealership / Source Supplier': p.dealershipName || '—',
      'Received State & City': p.receivedState || 'Maharashtra',
      'Transporter Carrier': p.transportName || '—',
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '—',
      'Tata Inward Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Current Status': statusLabel,
      'Location Area': p.status === 'IN_STORAGE'
        ? `Line ${p.lineId} (R-${p.rackNumber || 1}, Slot ${p.rackSlot || 1})`
        : (p.locationArea || 'Inward Area'),
      'Inwarded By': p.inwardBy || '—',
      'Approved By': p.inwardApprovedBy || '—',
      'Remark / Notes': p.remark || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inward Packs Ledger');
  XLSX.writeFile(wb, filename);
}

export function exportDispatchLotsToExcel(lots: DispatchLot[], filename = 'Tata_Battery_Dispatch_Lots.xlsx') {
  const rows: any[] = [];
  
  lots.forEach((lot) => {
    (lot.packs || []).forEach((pack) => {
      const model = BATTERY_MODELS[pack.packType];
      rows.push({
        'Lot Number': lot.lotNumber,
        'Dispatch Date': new Date(lot.timestamp).toLocaleString('en-IN'),
        'Consignee Name': lot.consigneeName,
        'Destination Address': lot.consigneeAddress,
        'Consignee GSTIN': lot.consigneeGstin || '-',
        'Vehicle Number': lot.vehicleNumber,
        'Transport Carrier': lot.transportName,
        'LR / Bilty No': lot.lrNumber,
        'Gate Pass No': lot.transportDocNo,
        'Pack Serial': pack.packNumber,
        'Model Type': model?.name || pack.packType,
        'Dispatched By': lot.dispatchedBy || '-',
        'Approved By': lot.approvedBy || '-',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Lots');
  XLSX.writeFile(wb, filename);
}

export function exportInvoiceToExcel(invoice: InvoiceData, filename?: string) {
  const itemsData = (invoice.items || []).map((it, idx) => ({
    'S.No': idx + 1,
    'Description of Goods': it.description,
    'HSN/SAC': it.hsnCode,
    'Quantity': it.quantity,
    'Unit': 'NOS',
    'Rate (INR)': it.unitPrice || it.ratePerUnit || 0,
    'Taxable Amount (INR)': it.taxableAmount || it.amount || 0,
    'Total Amount': (it.quantity || 1) * (it.unitPrice || it.ratePerUnit || 0),
  }));

  const ws = XLSX.utils.json_to_sheet(itemsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tax Invoice');
  XLSX.writeFile(wb, filename || 'Tata_Invoice_' + invoice.invoiceNumber + '.xlsx');
}
