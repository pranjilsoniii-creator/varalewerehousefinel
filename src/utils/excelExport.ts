import * as XLSX from 'xlsx';
import { BatteryPack, DispatchLot, InwardShipmentRecord, InvoiceData } from '../types';
import { BATTERY_MODELS } from '../data/batteryCatalog';

export function exportInventoryToExcel(packs: BatteryPack[], filename = 'Tata_Battery_Warehouse_Inventory.xlsx') {
  const data = packs.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    return {
      'Sr No': index + 1,
      'Pack Number': p.packNumber,
      'Model / Pack Type': model?.name || p.packType,
      'Category': model?.category || 'Tata Lithium',
      'Remark': p.remark || '—',
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
      'Document Number': p.dispatchDocNo || '-',
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
    'Pack Numbers': Array.isArray(s.packNumbers) ? s.packNumbers.join(', ') : '',
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
      'Remark': p.remark || '—',
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
        'Document Number': lot.transportDocNo,
        'Pack Number': pack.packNumber,
        'Model Type': model?.name || pack.packType,
        'Remark': pack.remark || '-',
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

/**
 * High-Precision Excel Export for Line Storage Sheet (Grid Matrix + Detailed Pack Inventory)
 * Matches plant physical print sheet & warehouse ledger requirements
 */
export function exportLineSheetToExcel(
  lineId: string,
  packs: BatteryPack[],
  filename?: string
) {
  const linePacks = packs.filter(
    (p) => p.status !== 'DISPATCHED' && p.lineId === lineId
  );

  // Group packs by Rack Number
  const rackMap: Record<number, BatteryPack[]> = {};
  for (let r = 1; r <= 40; r++) {
    rackMap[r] = [];
  }
  linePacks.forEach((p) => {
    if (p.rackNumber) {
      if (!rackMap[p.rackNumber]) rackMap[p.rackNumber] = [];
      rackMap[p.rackNumber].push(p);
    }
  });

  // Determine highest rack to show (at least 38-40 racks)
  let maxRack = 38;
  Object.keys(rackMap).forEach((rStr) => {
    const rNum = parseInt(rStr, 10);
    if (rackMap[rNum]?.length > 0 && rNum > maxRack) {
      maxRack = rNum;
    }
  });
  maxRack = Math.min(maxRack, 160);

  // 1. Sheet 1: Matrix Grid Layout (Matching Plant Physical Crate Sheet)
  const gridRows: any[] = [];
  for (let r = 1; r <= maxRack; r++) {
    const rPacks = rackMap[r] || [];
    const slot1 = rPacks.find((p) => p.rackSlot === 1);
    const slot2 = rPacks.find((p) => p.rackSlot === 2);
    const slot3 = rPacks.find((p) => p.rackSlot === 3);
    const slot4 = rPacks.find((p) => p.rackSlot === 4);

    const formatSlot = (p?: BatteryPack) => {
      if (!p) return '—';
      if (p.secondaryStickerNumber) return `${p.packNumber} (${p.secondaryStickerNumber})`;
      return p.packNumber;
    };

    // Primary model for this rack
    const primaryModel = rPacks[0]
      ? (BATTERY_MODELS[rPacks[0].packType]?.name || rPacks[0].packType)
      : '—';

    // Combined remarks
    const remarks = rPacks
      .filter((p) => p.remark && p.remark.trim().length > 0)
      .map((p) => `#${p.packNumber}: ${p.remark}`)
      .join('; ') || '—';

    gridRows.push({
      'Rack No': `Rack ${r}`,
      'Slot 1 (Level 1)': formatSlot(slot1),
      'Slot 2 (Level 2)': formatSlot(slot2),
      'Slot 3 (Level 3)': formatSlot(slot3),
      'Slot 4 (Level 4)': formatSlot(slot4),
      'Model / Type': primaryModel,
      'Quality Remarks': remarks,
      'Packs Count': rPacks.length,
    });
  }

  // 2. Sheet 2: Detailed Line Inventory (Every single battery pack)
  const detailRows = linePacks.map((p, index) => {
    const model = BATTERY_MODELS[p.packType];
    return {
      'Sr No': index + 1,
      'Line ID': `Line ${lineId}`,
      'Rack Number': p.rackNumber ? `R-${String(p.rackNumber).padStart(2, '0')}` : '—',
      'Slot Level': p.rackSlot ? `Level ${p.rackSlot}` : '—',
      'Battery Pack No': p.packNumber,
      '2nd Sticker / Barcode': p.secondaryStickerNumber || '—',
      'Model Name': model?.name || p.packType,
      'Category': model?.category || 'Tata Lithium',
      'Quality / Inward Remark': p.remark || '—',
      'Location Code': `${lineId}-R${p.rackNumber || 1}-L${p.rackSlot || 1}`,
      'Status': p.status,
      'Inward Date': p.inwardDate ? new Date(p.inwardDate).toLocaleString('en-IN') : '—',
      'Tata Stamp Verified': p.hasInwardStamp ? 'YES' : 'NO',
      'Inwarded By': p.inwardBy || '—',
      'Approved By': p.inwardApprovedBy || '—',
    };
  });

  const wb = XLSX.utils.book_new();

  const wsGrid = XLSX.utils.json_to_sheet(gridRows);
  wsGrid['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGrid, `Line ${lineId} Rack Grid`);

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, `Line ${lineId} Inventory`);

  const safeFilename = filename || `Tata_WMS_Line_${lineId}_Storage_Sheet_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

