import { BatteryModelInfo, BatteryPackType, SavedAddress } from '../types';

export const ALL_PACK_TYPES: BatteryPackType[] = [
  'Kanger1.0_AIO',
  'Kanger1.0_Gen3',
  'Kanger1.0_CKD',
  'Kanger1.0_FBU',
  'Kanger2.0',
  'Kanger3.0',
  'Limber_Ais',
  'Tamor_ELR',
  'Nova_LRP',
  'Challenger_LR',
  'Challenger_MR',
];

export const BATTERY_MODELS: Record<BatteryPackType, BatteryModelInfo> = {
  'Kanger1.0_AIO': {
    id: 'Kanger1.0_AIO',
    name: 'Kanger1.0_AIO',
    shortCode: 'K1-AIO',
    category: 'Kanger Series',
    color: '#2563eb',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-500',
    description: 'Kanger 1.0 All-In-One Pack',
  },
  'Kanger1.0_AIO_Ais': {
    id: 'Kanger1.0_AIO_Ais',
    name: 'Kanger1.0_AIO',
    shortCode: 'K1-AIO',
    category: 'Kanger Series',
    color: '#2563eb',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-500',
    description: 'Kanger 1.0 All-In-One Pack',
  },
  'Kanger1.0_Gen3': {
    id: 'Kanger1.0_Gen3',
    name: 'Kanger1.0_Gen3',
    shortCode: 'K1-GEN3',
    category: 'Kanger Series',
    color: '#0284c7',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    borderColor: 'border-sky-500',
    description: 'Kanger 1.0 Gen3 Pack',
  },
  'Kanger1.0_Gen3_Ais': {
    id: 'Kanger1.0_Gen3_Ais',
    name: 'Kanger1.0_Gen3',
    shortCode: 'K1-GEN3',
    category: 'Kanger Series',
    color: '#0284c7',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    borderColor: 'border-sky-500',
    description: 'Kanger 1.0 Gen3 Pack',
  },
  'Kanger1.0_CKD': {
    id: 'Kanger1.0_CKD',
    name: 'Kanger1.0_CKD',
    shortCode: 'K1-CKD',
    category: 'Kanger Series',
    color: '#0d9488',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    borderColor: 'border-teal-500',
    description: 'Kanger 1.0 CKD Pack',
  },
  'Kanger1.0_CKD_Ais': {
    id: 'Kanger1.0_CKD_Ais',
    name: 'Kanger1.0_CKD',
    shortCode: 'K1-CKD',
    category: 'Kanger Series',
    color: '#0d9488',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    borderColor: 'border-teal-500',
    description: 'Kanger 1.0 CKD Pack',
  },
  'Kanger1.0_FBU': {
    id: 'Kanger1.0_FBU',
    name: 'Kanger1.0_FBU',
    shortCode: 'K1-FBU',
    category: 'Kanger Series',
    color: '#059669',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-500',
    description: 'Kanger 1.0 Fully Built Unit Pack',
  },
  'Kanger1.0_FBU_Ais': {
    id: 'Kanger1.0_FBU_Ais',
    name: 'Kanger1.0_FBU',
    shortCode: 'K1-FBU',
    category: 'Kanger Series',
    color: '#059669',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-500',
    description: 'Kanger 1.0 Fully Built Unit Pack',
  },
  'Kanger2.0': {
    id: 'Kanger2.0',
    name: 'Kanger2.0',
    shortCode: 'K2',
    category: 'Kanger Series',
    color: '#7c3aed',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-500',
    description: 'Kanger 2.0 Pack',
  },
  'Kanger2.0_Ais': {
    id: 'Kanger2.0_Ais',
    name: 'Kanger2.0',
    shortCode: 'K2',
    category: 'Kanger Series',
    color: '#7c3aed',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-500',
    description: 'Kanger 2.0 Pack',
  },
  'Kanger3.0': {
    id: 'Kanger3.0',
    name: 'Kanger3.0',
    shortCode: 'K3',
    category: 'Kanger Series',
    color: '#c026d3',
    badgeBg: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    borderColor: 'border-fuchsia-500',
    description: 'Kanger 3.0 Next-Gen High Density Pack',
  },
  'Tamor_ELR': {
    id: 'Tamor_ELR',
    name: 'Tamor_ELR',
    shortCode: 'TAM-ELR',
    category: 'Tamor',
    color: '#ea580c',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    borderColor: 'border-orange-500',
    description: 'Tamor Extended Long Range Pack',
  },
  'Nova_LRP': {
    id: 'Nova_LRP',
    name: 'Nova_LRP',
    shortCode: 'NOV-LRP',
    category: 'Nova',
    color: '#d97706',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-amber-500',
    description: 'Nova Long Range Performance Pack',
  },
  'Challenger_LR': {
    id: 'Challenger_LR',
    name: 'Challenger_LR',
    shortCode: 'CHAL-LR',
    category: 'Challenger',
    color: '#475569',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    borderColor: 'border-slate-500',
    description: 'Challenger Long Range Heavy Duty Pack',
  },
  'Challenger_MR': {
    id: 'Challenger_MR',
    name: 'Challenger_MR',
    shortCode: 'CHAL-MR',
    category: 'Challenger',
    color: '#64748b',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    borderColor: 'border-slate-400',
    description: 'Challenger Medium Range Utility Pack',
  },
  'Limber_Ais': {
    id: 'Limber_Ais',
    name: 'Limber_Ais',
    shortCode: 'LIM-AIS',
    category: 'Limber',
    color: '#16a34a',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    borderColor: 'border-green-500',
    description: 'Limber AIS Pack',
  },
  'Limber_Non_Ais': {
    id: 'Limber_Ais',
    name: 'Limber_Ais',
    shortCode: 'LIM-AIS',
    category: 'Limber',
    color: '#16a34a',
    badgeBg: 'bg-green-100 text-green-800 border-green-200',
    borderColor: 'border-green-500',
    description: 'Limber AIS Pack',
  },
};

export const MODEL_KEYWORDS = [
  'K1-AIO', 'K1-GEN3', 'K1-CKD', 'K1-FBU', 'K2', 'K3', 'LIMBER',
  'GEN3', 'TAMOR', 'NOVA', 'CHALLENGER',
  'FBU', 'CKD', 'AIO', 'G3', 'K1'
];

/**
 * Intelligent Shorthand Model Auto-Derivation Helper
 * Rules:
 * - FBU -> Kanger1.0_FBU
 * - CKD -> Kanger1.0_CKD
 * - GEN3 / G3 -> Kanger1.0_Gen3
 * - Kanger 2.0 / K2 -> Kanger2.0
 * - Limber -> Limber_Ais (Limber)
 * - Kanger 3.0 / K3 -> Kanger3.0
 * - Tamor / Nova / Challenger -> Tamor_ELR / Nova_LRP / Challenger_LR / Challenger_MR
 * - AIO / Default -> Kanger1.0_AIO
 */
export function deriveModelFromShorthand(serial: string, shorthand: string = 'AIO'): BatteryPackType {
  const rawCombined = `${serial || ''} ${shorthand || ''}`.toUpperCase();

  // 1. Check for FBU
  if (rawCombined.includes('FBU')) {
    return 'Kanger1.0_FBU';
  }

  // 2. Check for CKD
  if (rawCombined.includes('CKD')) {
    return 'Kanger1.0_CKD';
  }

  // 3. Check for GEN3
  if (rawCombined.includes('GEN3') || rawCombined.includes('GEN 3') || rawCombined.includes('G3')) {
    return 'Kanger1.0_Gen3';
  }

  // 4. Check for Kanger 2.0 / K2
  if (rawCombined.includes('KANGER2') || rawCombined.includes('K2') || rawCombined.includes('KANGER 2')) {
    return 'Kanger2.0';
  }

  // 5. Check for Limber
  if (rawCombined.includes('LIMBER') || rawCombined.includes('LIM')) {
    return 'Limber_Ais';
  }

  // 6. Check for Kanger 3.0 / K3
  if (rawCombined.includes('KANGER3') || rawCombined.includes('K3')) {
    return 'Kanger3.0';
  }

  // 7. Check for Tamor, Nova, Challenger
  if (rawCombined.includes('TAMOR') || rawCombined.includes('ELR')) return 'Tamor_ELR';
  if (rawCombined.includes('NOVA') || rawCombined.includes('LRP')) return 'Nova_LRP';
  if (rawCombined.includes('CHALLENGER MR') || rawCombined.includes('CHALLENGER_MR')) return 'Challenger_MR';
  if (rawCombined.includes('CHALLENGER')) return 'Challenger_LR';

  // 8. Check for AIO
  if (rawCombined.includes('AIO') || rawCombined.includes('ALL IN ONE')) {
    return 'Kanger1.0_AIO';
  }

  return 'Kanger1.0_AIO';
}

/**
 * Robust Parser: Extracts clean numeric pack number and derives correct model enum
 */
export function parseBoxCodeAndModel(rawInput: string, fallbackModel: string = 'AIO'): {
  cleanPackNumber: string;
  derivedModel: BatteryPackType;
  isWithoutPlate: boolean;
} {
  const raw = (rawInput || '').trim();
  if (!raw || raw === '0') {
    return {
      cleanPackNumber: '',
      derivedModel: 'Kanger1.0_AIO',
      isWithoutPlate: false,
    };
  }

  // Check if plate-less
  if (raw.toUpperCase().startsWith('NP-') || raw.toUpperCase().startsWith('NP')) {
    const cleanNoPlate = raw.toUpperCase().startsWith('NP-') ? raw.toUpperCase() : `NP-${raw.slice(2)}`;
    return {
      cleanPackNumber: cleanNoPlate,
      derivedModel: deriveModelFromShorthand(raw, fallbackModel),
      isWithoutPlate: true,
    };
  }

  // Determine model first from full raw string
  const derivedModel = deriveModelFromShorthand(raw, fallbackModel);

  // Strip known model keywords to get pure serial number
  let stripped = raw.toUpperCase();
  for (const kw of MODEL_KEYWORDS) {
    const regex = new RegExp(kw, 'gi');
    stripped = stripped.replace(regex, '');
  }

  const cleanDigits = stripped.replace(/[^0-9]/g, '').trim();
  const cleanPackNumber = cleanDigits.length > 0 ? cleanDigits : raw.replace(/[^0-9A-Za-z_-]/g, '');

  return {
    cleanPackNumber,
    derivedModel,
    isWithoutPlate: false,
  };
}

/**
 * Standard Product Name and Product Type breakdown helper
 * Product Name: Family name e.g. "Kanger 1.0", "Kanger 2.0", "Limber", "Tamor", "Nova", "Challenger"
 * Product Type: Short variant e.g. "AIO", "CKD", "FBU", "Gen3", "K2", "K3", "Limber_Ais", "Tamor_ELR", "Nova_LRP", "Challenger_LR", "Challenger_MR"
 */
export function getProductNameAndType(packType: string | BatteryPackType): {
  productName: string;
  productType: string;
  fullBadgeName: string;
} {
  const raw = String(packType || 'Kanger1.0_AIO').trim().toUpperCase();

  if (raw.includes('CKD')) {
    return { productName: 'Kanger 1.0', productType: 'CKD', fullBadgeName: 'Kanger 1.0 CKD' };
  }
  if (raw.includes('FBU')) {
    return { productName: 'Kanger 1.0', productType: 'FBU', fullBadgeName: 'Kanger 1.0 FBU' };
  }
  if (raw.includes('GEN3') || raw.includes('GEN 3') || raw.includes('G3')) {
    return { productName: 'Kanger 1.0', productType: 'Gen3', fullBadgeName: 'Kanger 1.0 Gen3' };
  }
  if (raw.includes('KANGER2') || raw.includes('K2') || raw.includes('2.0')) {
    return { productName: 'Kanger 2.0', productType: 'K2', fullBadgeName: 'Kanger 2.0' };
  }
  if (raw.includes('KANGER3') || raw.includes('K3') || raw.includes('3.0')) {
    return { productName: 'Kanger 3.0', productType: 'K3', fullBadgeName: 'Kanger 3.0' };
  }
  if (raw.includes('LIMBER') || raw.includes('LIM')) {
    return { productName: 'Limber', productType: 'Limber_Ais', fullBadgeName: 'Limber AIS' };
  }
  if (raw.includes('TAMOR') || raw.includes('ELR')) {
    return { productName: 'Tamor', productType: 'Tamor_ELR', fullBadgeName: 'Tamor ELR' };
  }
  if (raw.includes('NOVA') || raw.includes('LRP')) {
    return { productName: 'Nova', productType: 'Nova_LRP', fullBadgeName: 'Nova LRP' };
  }
  if (raw.includes('CHALLENGER MR') || raw.includes('CHALLENGER_MR')) {
    return { productName: 'Challenger', productType: 'Challenger_MR', fullBadgeName: 'Challenger MR' };
  }
  if (raw.includes('CHALLENGER') || raw.includes('CHAL')) {
    return { productName: 'Challenger', productType: 'Challenger_LR', fullBadgeName: 'Challenger LR' };
  }

  // Default AIO (always uppercase AIO)
  return { productName: 'Kanger 1.0', productType: 'AIO', fullBadgeName: 'Kanger 1.0 AIO' };
}

export const COMMON_TRANSPORTERS = [
  'Sahyadri Enterprises',
  'Aai Saheb Freight Line',
  'TCI Express (Transport Corporation of India)',
  'Atlantic Road Line',
  'OM Logistics Limited',
  'Safe Express Private Limited',
  'Maitri Transport',
  'VRL Logistics Limited',
  'Tata Motors Dedicated Fleet',
  'Delhivery Supply Chain',
  'Blue Dart Express',
  'Other',
];

export const INITIAL_SAVED_ADDRESSES: SavedAddress[] = [];

export const DEFAULT_SAVED_ADDRESSES: SavedAddress[] = [];

export const DEFAULT_PLANT_LOCATION = {
  name: 'Tata AutoComp Systems Limited - Varale (B300 Plant)',
  address: 'Plot No. 16, Varale, Taluka Khed, Chakan Industrial Area Phase II, Pune, Maharashtra 410501',
  gstin: '27AAACT2727Q1ZR',
  state: 'Maharashtra',
  stateCode: '27',
};

export const COMMON_DESTINATIONS: { name: string; address: string; gstin: string; state: string }[] = [];
