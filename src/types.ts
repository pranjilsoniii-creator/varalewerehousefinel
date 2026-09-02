export type BatteryPackType =
  | 'Kanger1.0_AIO'
  | 'Kanger1.0_Gen3'
  | 'Kanger1.0_CKD'
  | 'Kanger1.0_FBU'
  | 'Kanger2.0'
  | 'Kanger3.0'
  | 'Tamor_ELR'
  | 'Nova_LRP'
  | 'Challenger_LR'
  | 'Challenger_MR'
  | 'Limber_Ais'
  | 'Limber_Non_Ais';

export type UserRole = 'superadmin' | 'manager' | 'supervisor' | 'employee';

export interface UserAccount {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  plant: string;
  active: boolean;
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
  packNumber: string;                 // Strictly numeric e.g. "1", "12", "5284", "894102"
  packType: BatteryPackType;          // Kanger1.0_AIO, Kanger1.0_Gen3, etc.
  productName?: string;
  status: PackStatus;
  locationArea: string;               // Default: "Inward Area"
  currentLocation: string;            // e.g. "Inward Area" or "A-04, R-12, L-02"

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

  // Storage Physical Coordinates (When allocated from Inward Area to Line)
  lineId?: string;                    // e.g. "A-01" to "A-25", "B-01" to "B-25"
  rackNumber?: number;                // 1 to 160
  rackSlot?: number;                  // 1 to 4 (Level L-01 to L-04)

  notes?: string;
  movementHistory?: MovementLog[];

  // Dispatch Details
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchApprovedBy?: string;
  dispatchLotId?: string;
  dispatchDocNo?: string;
  dispatchLrNo?: string;
  dispatchVehicleNo?: string;
  dispatchTransportName?: string;
  dispatchFromPlant?: string;         // Default: "Tata AutoComp Systems Limited - Varale"
  dispatchToAddress?: string;         // Full 100+ words address
  dispatchToCustomer?: string;
  dispatchRemarks?: string;
  invoiceNumber?: string;
}

export interface InwardShipmentRecord {
  id: string;
  timestamp: string;
  documentNo: string;
  dealershipName: string;
  receivedState: string;
  transportName: string;
  lrNumber?: string;
  vehicleNumber?: string;
  packCount: number;
  packNumbers: string[];
  packTypeSummary: Record<string, number>;
  inwardBy: string;
  approvedBy?: string;
  hasInwardStamp: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED';
  remark?: string;
  notes?: string;
}

export interface DispatchLot {
  id: string;
  lotNumber: string;                  // e.g. "LOT-2026-0901-01"
  timestamp: string;
  status: 'PENDING_SUPERVISOR_APPROVAL' | 'DISPATCHED';
  fromPlant: string;                  // Tata AutoComp Systems Limited - Varale
  consigneeName: string;
  consigneeAddress: string;           // 100+ words full address
  consigneeGstin?: string;
  vehicleNumber: string;
  driverName?: string;
  driverMobile?: string;
  transportName: string;
  lrNumber: string;
  transportDocNo: string;
  packs: BatteryPack[];
  packCount: number;
  invoiceNumber?: string;
  dispatchedBy: string;
  approvedBy: string;
  approvedAt?: string;
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  packType?: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  packNumbers?: string[];
  ratePerUnit?: number;
  amount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  eWayBillNo?: string;
  poNumber?: string;
  sellerName: string;
  sellerAddress: string;
  sellerGstin: string;
  sellerState: string;
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  buyerState: string;
  placeOfSupply: string;
  transportName: string;
  vehicleNumber: string;
  lrNumber: string;
  items: InvoiceItem[];
  totalTaxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  termsAndConditions: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
}

export type InvoiceData = Invoice;

export interface OcrScanResult {
  success: boolean;
  hasInwardStamp: boolean;
  documentNo?: string;
  receivedDate?: string;
  dealershipName?: string;
  receivedState?: string;
  transportName?: string;
  remark?: string;
  packs: Array<{
    packNumber: string;
    packType: BatteryPackType;
  }>;
  rawText: string;
  confidence: number;
  error?: string;
}
