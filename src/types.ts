export type BatteryPackType =
  | 'Kanger1.0_AIO'
  | 'Kanger1.0_AIO_Ais'
  | 'Kanger1.0_Gen3'
  | 'Kanger1.0_Gen3_Ais'
  | 'Kanger1.0_CKD'
  | 'Kanger1.0_CKD_Ais'
  | 'Kanger1.0_FBU'
  | 'Kanger1.0_FBU_Ais'
  | 'Kanger2.0'
  | 'Kanger2.0_Ais'
  | 'Kanger3.0'
  | 'Tamor_ELR'
  | 'Nova_LRP'
  | 'Challenger_LR'
  | 'Challenger_MR'
  | 'Limber_Ais'
  | 'Limber_Non_Ais';

export type UserRole = 'superadmin' | 'manager' | 'supervisor' | 'employee';

export interface UserPermissions {
  canInward: boolean;
  canDispatch: boolean;
  canLineManage: boolean;
  canViewStock: boolean;
  canInvoices: boolean;
  canAnalytics: boolean;
}

export interface UserAccount {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  plant: string;
  active: boolean;
  permissions?: UserPermissions;
}

export interface SavedAddress {
  id: string;
  title: string;
  address: string;
  gstin?: string;
  state?: string;
  contactPerson?: string;
  phone?: string;
  createdAt?: string;
}

export interface BatteryModelInfo {
  id: BatteryPackType;
  name: string;
  shortCode: string;
  category: 'Kanger Series' | 'Tamor' | 'Nova' | 'Limber' | 'Challenger';
  color: string;
  badgeBg: string;
  borderColor: string;
  description?: string;
  energyKwh?: string;
  hsnCode?: string;
}

export type PackStatus =
  | 'PENDING_APPROVAL'
  | 'INWARD_AREA'
  | 'IN_STORAGE'
  | 'IN_DISPATCH_AREA'
  | 'PENDING_DISPATCH_APPROVAL'
  | 'DISPATCHED'
  | 'HOLD';

export interface MovementLog {
  id: string;
  timestamp: string;
  fromLocation: string;
  toLocation: string;
  movedBy: string;
  reason: string;
}

export interface BatteryPack {
  id: string;
  packNumber: string;                 // Strictly numeric e.g. "1", "12", "5284", "894102", or "NP-1001" for without plate
  packType: BatteryPackType;          // Model type
  productName?: string;
  status: PackStatus;
  locationArea: string;               // Default: "Inward Area"
  currentLocation: string;            // e.g. "Inward Area" or "A-04, R-12, L-02"
  isWithoutPlate?: boolean;           // True if pack arrived without serial plate/sticker
  sourceType?: 'INWARD' | 'LINE_POPULATE'; // Source: Inward Dock vs Direct Line Matrix Populator

  // Inward Details
  inwardDate: string;                 // ISO date string
  documentNo: string;                 // Invoice / Inward Document Number
  dealershipName: string;             // Dealership / Supplier / Source
  receivedState: string;              // State of receipt
  transportName: string;              // Transporter name
  transportDocNo?: string;
  lrNumber?: string;
  vehicleNumber?: string;
  remark?: string;
  hasInwardStamp: boolean;            // Tata Inward Stamp verified
  inwardBy: string;                   // Username/Name who inwarded
  inwardApprovedBy?: string;          // Supervisor/Manager who approved
  inwardApprovedAt?: string;

  // Storage Physical Coordinates (When allocated to Line & Rack)
  lineId?: string;                    // e.g. "A-01" to "A-25", "B-01" to "B-25"
  rackNumber?: number;                // 1 to 160
  rackSlot?: number;                  // 1 to 4 (Level L-01 to L-04)

  notes?: string;
  movementHistory?: MovementLog[];

  // Dispatch Details
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchLotId?: string;
  dispatchDocNo?: string;
  dispatchLrNo?: string;
  dispatchVehicleNo?: string;
  dispatchToAddress?: string;
  dispatchToCustomer?: string;
}

export interface InwardShipmentRecord {
  id: string;
  timestamp: string;
  documentNo: string;
  dealershipName: string;
  receivedState: string;
  transportName: string;
  packCount: number;
  packNumbers: string[];
  packTypeSummary: Record<string, number>;
  inwardBy: string;
  approvedBy?: string;
  hasInwardStamp: boolean;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  remark?: string;
}

export interface DispatchLot {
  id: string;
  lotNumber: string;
  timestamp: string;
  status: 'PENDING_APPROVAL' | 'DISPATCHED' | 'CANCELLED';
  fromPlant: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin?: string;
  vehicleNumber: string;
  driverName?: string;
  driverMobile?: string;
  transportName: string;
  lrNumber: string;
  transportDocNo: string;
  packCount: number;
  packs: BatteryPack[];
  dispatchedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  model?: BatteryPackType;
  packType?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  gstRate?: number;
  gstAmount?: number;
  totalAmount?: number;
  packSerials?: string[];
  packNumbers?: string[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  lotId?: string;
  lotNumber?: string;
  eWayBillNo?: string;
  poNumber?: string;
  sellerName?: string;
  sellerAddress?: string;
  sellerGstin?: string;
  sellerState?: string;
  sellerStateCode?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  buyerState?: string;
  buyerStateCode?: string;
  vehicleNumber?: string;
  transporterName?: string;
  lrNumber?: string;
  items?: InvoiceItem[];
  subTotal?: number;
  totalTaxable?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalGst?: number;
  totalGstAmount?: number;
  grandTotal?: number;
  grandTotalWords?: string;
  isInterState?: boolean;
  notes?: string;
  generatedBy?: string;
  fromPlant?: {
    name: string;
    address: string;
    gstin: string;
    state: string;
    stateCode: string;
  };
  consignee?: {
    name: string;
    address: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
  };
  transporter?: {
    name: string;
    vehicleNumber: string;
    lrNumber: string;
    gatePassNo: string;
  };
  [key: string]: any;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  buyerName: string;
  buyerAddress?: string;
  buyerGstin?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  items: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unitPrice?: number;
    ratePerUnit?: number;
    taxableAmount?: number;
    amount?: number;
  }>;
  subTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
}
