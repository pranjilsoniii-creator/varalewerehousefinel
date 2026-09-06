import { BatteryPack, BatteryPackType, DispatchLot, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, COMMON_TRANSPORTERS } from './batteryCatalog';

// Default warehouse lines: Line A-01 to A-25 and Line B-01 to B-25 (50 lines)
export const DEFAULT_WAREHOUSE_LINES = [
  ...Array.from({ length: 25 }, (_, i) => 'A-' + String(i + 1).padStart(2, '0')),
  ...Array.from({ length: 25 }, (_, i) => 'B-' + String(i + 1).padStart(2, '0')),
];

export function getStoredWarehouseLines(): string[] {
  try {
    const saved = localStorage.getItem('tata_wms_lines_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_WAREHOUSE_LINES;
}

export function saveStoredWarehouseLines(lines: string[]) {
  try {
    localStorage.setItem('tata_wms_lines_v4', JSON.stringify(lines));
  } catch (e) {}
}

export const WAREHOUSE_LINES = DEFAULT_WAREHOUSE_LINES;

export const RACKS_PER_LINE = 40; // Exactly 40 Racks per line (R-01 to R-40)
export const MAX_PACKS_PER_RACK = 4; // Exactly 4 packs maximum per rack (Level 1, 2, 3, 4)
export const SLOTS_PER_RACK = 4;   // L-01 to L-04

// Clean Slate
export function createInitialWarehousePacks(): BatteryPack[] {
  return [];
}

export function createInitialInwardShipments(): InwardShipmentRecord[] {
  return [];
}

export function createInitialDispatchLots(): DispatchLot[] {
  return [];
}

export const STANDARD_DAILY_PACK_NAMES = [
  'Kanger1.0',
  'Limber',
  'Kanger2.0',
  'Tamor',
  'Nova',
  'Challenger',
  'Kanger3.0',
  'Burnt Pack',
  'E-Dost',
  'Module',
];

export function createDefaultDailyStockRows(maintainedBy = 'Jitendra Soni', previousClosingRows?: any[]): any[] {
  return STANDARD_DAILY_PACK_NAMES.map((name, idx) => {
    const prevRow = previousClosingRows?.find((r) => r.packName.toLowerCase() === name.toLowerCase());
    const openingStock = prevRow ? Number(prevRow.closingStock) || 0 : 0;
    return {
      sr: idx + 1,
      packName: name,
      openingStock: openingStock,
      receiveQty: 0,
      totalAvailable: openingStock,
      dispatchQty: 0,
      closingStock: openingStock,
      maintainedBy: maintainedBy,
    };
  });
}

export function createInitialDailyStockRecords(): any[] {
  return [
    {
      id: 'stock-2026-08-08',
      date: '2026-08-08',
      displayDate: '08/08/2026',
      rows: [
        { sr: 1, packName: 'Kanger1.0', openingStock: 5673, receiveQty: 34, totalAvailable: 5707, dispatchQty: 24, closingStock: 5683, maintainedBy: 'Jitendra Soni' },
        { sr: 2, packName: 'Limber', openingStock: 221, receiveQty: 16, totalAvailable: 237, dispatchQty: 2, closingStock: 235, maintainedBy: 'Jitendra Soni' },
        { sr: 3, packName: 'Kanger2.0', openingStock: 515, receiveQty: 11, totalAvailable: 526, dispatchQty: 4, closingStock: 522, maintainedBy: 'Jitendra Soni' },
        { sr: 4, packName: 'Tamor', openingStock: 24, receiveQty: 1, totalAvailable: 25, dispatchQty: 2, closingStock: 23, maintainedBy: 'Jitendra Soni' },
        { sr: 5, packName: 'Nova', openingStock: 6, receiveQty: 0, totalAvailable: 6, dispatchQty: 1, closingStock: 5, maintainedBy: 'Jitendra Soni' },
        { sr: 6, packName: 'Challenger', openingStock: 146, receiveQty: 10, totalAvailable: 156, dispatchQty: 0, closingStock: 156, maintainedBy: 'Jitendra Soni' },
        { sr: 7, packName: 'Kanger3.0', openingStock: 0, receiveQty: 0, totalAvailable: 0, dispatchQty: 0, closingStock: 0, maintainedBy: 'Jitendra Soni' },
        { sr: 8, packName: 'Burnt Pack', openingStock: 31, receiveQty: 0, totalAvailable: 31, dispatchQty: 0, closingStock: 31, maintainedBy: 'Jitendra Soni' },
        { sr: 9, packName: 'E-Dost', openingStock: 2, receiveQty: 0, totalAvailable: 2, dispatchQty: 0, closingStock: 2, maintainedBy: 'Jitendra Soni' },
        { sr: 10, packName: 'Module', openingStock: 534, receiveQty: 0, totalAvailable: 534, dispatchQty: 0, closingStock: 534, maintainedBy: 'Jitendra Soni' },
      ],
      totalOpeningStock: 6618,
      totalReceivedToday: 72,
      totalDispatchToday: 33,
      totalClosingStock: 6657,
      createdAt: '2026-08-08T18:00:00.000Z',
      updatedAt: '2026-08-08T18:30:00.000Z',
      createdByName: 'Jitendra Soni',
      createdByUsername: 'jitendra',
      isLocked: false,
    },
  ];
}

