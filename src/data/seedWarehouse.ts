import { BatteryPack, BatteryPackType, DispatchLot, InwardShipmentRecord } from '../types';
import { ALL_PACK_TYPES, BATTERY_MODELS, COMMON_TRANSPORTERS } from './batteryCatalog';

// Generate warehouse lines list: Line A-01 to A-25 and Line B-01 to B-25 (50 lines total)
export const WAREHOUSE_LINES = [
  ...Array.from({ length: 25 }, (_, i) => 'A-' + String(i + 1).padStart(2, '0')),
  ...Array.from({ length: 25 }, (_, i) => 'B-' + String(i + 1).padStart(2, '0')),
];

export const RACKS_PER_LINE = 160; // R-01 to R-160
export const SLOTS_PER_RACK = 4;   // L-01 to L-04

// Clean Slate: Initial pack count starts at 0 for clean presentation
export function createInitialWarehousePacks(): BatteryPack[] {
  return [];
}

export function createInitialInwardShipments(): InwardShipmentRecord[] {
  return [];
}

export function createInitialDispatchLots(): DispatchLot[] {
  return [];
}
