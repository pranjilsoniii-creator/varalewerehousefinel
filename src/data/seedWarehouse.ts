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

export const RACKS_PER_LINE = 160; // R-01 to R-160
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
