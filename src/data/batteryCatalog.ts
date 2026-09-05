import { BatteryModelInfo, BatteryPackType, SavedAddress } from '../types';

export const ALL_PACK_TYPES: BatteryPackType[] = [
  'Kanger1.0_AIO',
  'Kanger1.0_AIO_Ais',
  'Kanger1.0_Gen3',
  'Kanger1.0_Gen3_Ais',
  'Kanger1.0_CKD',
  'Kanger1.0_CKD_Ais',
  'Kanger1.0_FBU',
  'Kanger1.0_FBU_Ais',
  'Kanger2.0',
  'Kanger2.0_Ais',
  'Kanger3.0',
  'Tamor_ELR',
  'Nova_LRP',
  'Challenger_LR',
  'Challenger_MR',
  'Limber_Ais',
  'Limber_Non_Ais',
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
    description: 'Kanger 1.0 All-In-One Standard Pack',
  },
  'Kanger1.0_AIO_Ais': {
    id: 'Kanger1.0_AIO_Ais',
    name: 'Kanger1.0_AIO_Ais',
    shortCode: 'K1-AIO-AIS',
    category: 'Kanger Series',
    color: '#1d4ed8',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    borderColor: 'border-indigo-500',
    description: 'Kanger 1.0 All-In-One AIS Compliant Pack (>= 30000)',
  },
  'Kanger1.0_Gen3': {
    id: 'Kanger1.0_Gen3',
    name: 'Kanger1.0_Gen3',
    shortCode: 'K1-GEN3',
    category: 'Kanger Series',
    color: '#0284c7',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    borderColor: 'border-sky-500',
    description: 'Kanger 1.0 Gen3 Standard Pack',
  },
  'Kanger1.0_Gen3_Ais': {
    id: 'Kanger1.0_Gen3_Ais',
    name: 'Kanger1.0_Gen3_Ais',
    shortCode: 'K1-GEN3-AIS',
    category: 'Kanger Series',
    color: '#0369a1',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    borderColor: 'border-cyan-600',
    description: 'Kanger 1.0 Gen3 AIS Compliant Pack (>= 30000)',
  },
  'Kanger1.0_CKD': {
    id: 'Kanger1.0_CKD',
    name: 'Kanger1.0_CKD',
    shortCode: 'K1-CKD',
    category: 'Kanger Series',
    color: '#0d9488',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    borderColor: 'border-teal-500',
    description: 'Kanger 1.0 CKD Standard Pack',
  },
  'Kanger1.0_CKD_Ais': {
    id: 'Kanger1.0_CKD_Ais',
    name: 'Kanger1.0_CKD_Ais',
    shortCode: 'K1-CKD-AIS',
    category: 'Kanger Series',
    color: '#0f766e',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    borderColor: 'border-teal-600',
    description: 'Kanger 1.0 CKD AIS Compliant Pack (>= 30000)',
  },
  'Kanger1.0_FBU': {
    id: 'Kanger1.0_FBU',
    name: 'Kanger1.0_FBU',
    shortCode: 'K1-FBU',
    category: 'Kanger Series',
    color: '#059669',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-500',
    description: 'Kanger 1.0 Fully Built Unit Standard Pack',
  },
  'Kanger1.0_FBU_Ais': {
    id: 'Kanger1.0_FBU_Ais',
    name: 'Kanger1.0_FBU_Ais',
    shortCode: 'K1-FBU-AIS',
    category: 'Kanger Series',
    color: '#047857',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    borderColor: 'border-emerald-600',
    description: 'Kanger 1.0 FBU AIS Compliant Pack (>= 30000)',
  },
  'Kanger2.0': {
    id: 'Kanger2.0',
    name: 'Kanger2.0',
    shortCode: 'K2',
    category: 'Kanger Series',
    color: '#7c3aed',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-500',
    description: 'Kanger 2.0 Standard Pack (4 Digits)',
  },
  'Kanger2.0_Ais': {
    id: 'Kanger2.0_Ais',
    name: 'Kanger2.0_Ais',
    shortCode: 'K2-AIS',
    category: 'Kanger Series',
    color: '#6d28d9',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    borderColor: 'border-purple-600',
    description: 'Kanger 2.0 AIS Compliant Pack (5 Digits e.g. 11242)',
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
    description: 'Limber AIS Compliant Pack (5 Digits e.g. 11111)',
  },
  'Limber_Non_Ais': {
    id: 'Limber_Non_Ais',
    name: 'Limber_Non_Ais',
    shortCode: 'LIM-NON',
    category: 'Limber',
    color: '#65a30d',
    badgeBg: 'bg-lime-100 text-lime-800 border-lime-200',
    borderColor: 'border-lime-500',
    description: 'Limber Standard Non-AIS Pack (4 Digits e.g. 1111, 9999)',
  },
};

export const MODEL_KEYWORDS = [
  'K1-AIO-AIS', 'K1-GEN3-AIS', 'K1-CKD-AIS', 'K1-FBU-AIS', 'K2-AIS', 'LIM-AIS', 'LIM-NON',
  'K1-AIO', 'K1-GEN3', 'K1-CKD', 'K1-FBU', 'K2AIS', 'K1AIS', 'GEN3-AIS', 'CKD-AIS', 'FBU-AIS',
  'NONAIS', 'NON-AIS', 'LIMBER', 'GEN3', 'TAMOR', 'NOVA', 'CHALLENGER',
  'FBU', 'CKD', 'AIO', 'G3', 'K2', 'K3', 'K1', 'AIS'
];

/**
 * Intelligent Shorthand & Digit-Threshold Model Auto-Derivation Helper
 * Rules:
 * - FBU / CKD / GEN3 / AIO keywords anywhere in string are auto-detected.
 * - Limber: 4 digits -> Limber_Non_Ais, 5 digits -> Limber_Ais
 * - Kanger 2.0: 4 digits -> Kanger2.0, 5 digits -> Kanger2.0_Ais
 * - Kanger 1.0 (AIO / Gen3 / CKD / FBU): serial >= 30000 -> _Ais variant
 */
export function deriveModelFromShorthand(serial: string, shorthand: string = 'AIO'): BatteryPackType {
  const rawCombined = `${serial || ''} ${shorthand || ''}`.toUpperCase();
  const cleanSerial = (serial || '').replace(/[^0-9]/g, '');
  const serialNum = parseInt(cleanSerial, 10) || 0;
  const digitCount = cleanSerial.length;

  // 1. Check for FBU
  if (rawCombined.includes('FBU')) {
    return (serialNum >= 30000 || rawCombined.includes('AIS')) ? 'Kanger1.0_FBU_Ais' : 'Kanger1.0_FBU';
  }

  // 2. Check for CKD
  if (rawCombined.includes('CKD')) {
    return (serialNum >= 30000 || rawCombined.includes('AIS')) ? 'Kanger1.0_CKD_Ais' : 'Kanger1.0_CKD';
  }

  // 3. Check for GEN3
  if (rawCombined.includes('GEN3') || rawCombined.includes('GEN 3') || rawCombined.includes('G3')) {
    return (serialNum >= 30000 || rawCombined.includes('AIS')) ? 'Kanger1.0_Gen3_Ais' : 'Kanger1.0_Gen3';
  }

  // 4. Check for Kanger 2.0 / K2
  if (rawCombined.includes('KANGER2') || rawCombined.includes('K2') || rawCombined.includes('KANGER 2')) {
    if (rawCombined.includes('AIS') || digitCount >= 5) {
      return 'Kanger2.0_Ais';
    }
    return 'Kanger2.0';
  }

  // 5. Check for Limber
  if (rawCombined.includes('LIMBER') || rawCombined.includes('LIM')) {
    if (rawCombined.includes('NON') || rawCombined.includes('NONAIS') || rawCombined.includes('NON-AIS')) {
      return 'Limber_Non_Ais';
    }
    if (rawCombined.includes('AIS')) {
      return 'Limber_Ais';
    }
    return digitCount >= 5 ? 'Limber_Ais' : 'Limber_Non_Ais';
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
    return (serialNum >= 30000 || rawCombined.includes('AIS')) ? 'Kanger1.0_AIO_Ais' : 'Kanger1.0_AIO';
  }

  // 9. Numeric threshold fallback if no explicit letters:
  if (serialNum >= 30000) {
    return 'Kanger1.0_AIO_Ais';
  }
  if (digitCount === 5) {
    return 'Kanger2.0_Ais';
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

export const INITIAL_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    title: 'Tata Motors - Pune CVBU Assembly Plant',
    address: 'Sector 7, PCMC Industrial Area, Bhosari, Pune, Maharashtra 411026',
    gstin: '27AAACT2727Q1ZR',
    state: 'Maharashtra',
    contactPerson: 'Logistics Desk',
    phone: '+91 20 6613 1111',
  },
  {
    id: 'addr-2',
    title: 'Tata Motors - Sanand EV Plant (Gujarat)',
    address: 'Plot No. 1, GIDC Industrial Estate, Phase II, Sanand, Ahmedabad, Gujarat 382170',
    gstin: '24AAACT2727Q1ZV',
    state: 'Gujarat',
    contactPerson: 'Receiving Dock Lead',
    phone: '+91 2717 662000',
  },
  {
    id: 'addr-3',
    title: 'Tata AutoComp Systems - Chakan Plant 2',
    address: 'Plot No. C-2, MIDC Phase II, Chakan, Taluka Khed, Pune, Maharashtra 410501',
    gstin: '27AAACT2727Q1ZR',
    state: 'Maharashtra',
    contactPerson: 'Stores Manager',
    phone: '+91 2135 664000',
  },
  {
    id: 'addr-4',
    title: 'Tata Motors - Jamshedpur Plant',
    address: 'Telco Colony, Jamshedpur, Jharkhand 831010',
    gstin: '20AAACT2727Q1Z4',
    state: 'Jharkhand',
    contactPerson: 'EV Logistics Coordinator',
    phone: '+91 657 228 2222',
  },
  {
    id: 'addr-5',
    title: 'Tata Motors - Dharwad Plant (Karnataka)',
    address: 'Plot 1, KIADB Industrial Area, Belur, Dharwad, Karnataka 580011',
    gstin: '29AAACT2727Q1ZP',
    state: 'Karnataka',
    contactPerson: 'Dock In-charge',
    phone: '+91 836 248 8000',
  },
];

export const DEFAULT_SAVED_ADDRESSES = INITIAL_SAVED_ADDRESSES;

export const DEFAULT_PLANT_LOCATION = {
  name: 'Tata AutoComp Systems Limited - Varale (B300 Plant)',
  address: 'Plot No. 16, Varale, Taluka Khed, Chakan Industrial Area Phase II, Pune, Maharashtra 410501',
  gstin: '27AAACT2727Q1ZR',
  state: 'Maharashtra',
  stateCode: '27',
};

export const COMMON_DESTINATIONS = INITIAL_SAVED_ADDRESSES.map((a) => ({ name: a.title, address: a.address, gstin: a.gstin || "", state: a.state || "Maharashtra" }));
