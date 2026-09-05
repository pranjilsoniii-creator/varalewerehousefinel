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

/**
 * Intelligent Shorthand & Digit-Threshold Model Auto-Derivation Helper
 * Rules:
 * - Limber: 4 digits -> Limber_Non_Ais, 5 digits -> Limber_Ais
 * - Kanger 2.0: 4 digits -> Kanger2.0, 5 digits -> Kanger2.0_Ais
 * - Kanger 1.0 (AIO / Gen3 / CKD / FBU): serial >= 30000 -> _Ais variant
 */
export function deriveModelFromShorthand(serial: string, shorthand: string = 'AIO'): BatteryPackType {
  const cleanSerial = serial.replace(/[^0-9]/g, '');
  const serialNum = parseInt(cleanSerial, 10) || 0;
  const digitCount = cleanSerial.length;
  const cleanShort = (shorthand || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Limber Series Rules
  if (cleanShort.includes('limber') || cleanShort.includes('ais') || cleanShort.includes('nonais')) {
    if (cleanShort.includes('non') || cleanShort === 'limbernon' || cleanShort === 'nonais') {
      return 'Limber_Non_Ais';
    }
    if (cleanShort.includes('ais') && !cleanShort.includes('non')) {
      return 'Limber_Ais';
    }
    // Auto-detect by digit length: 5 digits -> Ais, 4 digits -> Non_Ais
    if (digitCount >= 5) return 'Limber_Ais';
    return 'Limber_Non_Ais';
  }

  // 2. Kanger 2.0 Series Rules
  if (cleanShort === 'k2' || cleanShort.includes('kanger2') || cleanShort === 'k2ais') {
    if (cleanShort.includes('ais') || digitCount >= 5) {
      return 'Kanger2.0_Ais';
    }
    return 'Kanger2.0';
  }

  // 3. Kanger 3.0 Series Rules
  if (cleanShort === 'k3' || cleanShort.includes('kanger3')) {
    return 'Kanger3.0';
  }

  // 4. Tamor, Nova, Challenger
  if (cleanShort.includes('tamor') || cleanShort.includes('elr')) return 'Tamor_ELR';
  if (cleanShort.includes('nova') || cleanShort.includes('lrp')) return 'Nova_LRP';
  if (cleanShort.includes('challengermr') || cleanShort === 'mr') return 'Challenger_MR';
  if (cleanShort.includes('challenger') || cleanShort === 'lr' || cleanShort === 'chal') return 'Challenger_LR';

  // 5. Kanger 1.0 Variants (Gen3, CKD, FBU, AIO)
  const isAisThreshold = serialNum >= 30000;

  if (cleanShort.includes('gen3') || cleanShort === 'g3' || cleanShort === 'k1gen3') {
    return isAisThreshold ? 'Kanger1.0_Gen3_Ais' : 'Kanger1.0_Gen3';
  }
  if (cleanShort.includes('ckd') || cleanShort === 'k1ckd') {
    return isAisThreshold ? 'Kanger1.0_CKD_Ais' : 'Kanger1.0_CKD';
  }
  if (cleanShort.includes('fbu') || cleanShort === 'k1fbu') {
    return isAisThreshold ? 'Kanger1.0_FBU_Ais' : 'Kanger1.0_FBU';
  }
  if (cleanShort.includes('aio') || cleanShort === 'allinone' || cleanShort === 'k1aio' || cleanShort === 'k1') {
    return isAisThreshold ? 'Kanger1.0_AIO_Ais' : 'Kanger1.0_AIO';
  }

  // Default fallback for Kanger 1.0 AIO
  return isAisThreshold ? 'Kanger1.0_AIO_Ais' : 'Kanger1.0_AIO';
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
