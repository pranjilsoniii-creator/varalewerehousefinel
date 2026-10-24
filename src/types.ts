export type StandardBatteryPackType =
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

export type BatteryPackType = StandardBatteryPackType | (string & {});

export interface CustomBatteryModel {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  description?: string;
  energyKwh?: string;
  hsnCode?: string;
  nominalVoltage?: string;
  capacityAh?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ShiftChatAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileDataUrl?: string;
  fileExpiresAt: string;
  isExpiredInCloud?: boolean;
}

export type ShiftChatScope = 'DIRECT' | 'CHANNEL';

export interface ShiftChatPackShare {
  packNumber: string;
  serialNumber?: string;
  packType: string;
  status: string;
  line?: string;
  rack?: string;
  location?: string;
  voltage?: number;
  soc?: number;
  soh?: number;
  inwardDate?: string;
  sourceType?: string;
  supplierName?: string;
  documentNo?: string;
  remark?: string;
}

export interface ShiftChatTableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ShiftChatMessage {
  id: string;
  senderUsername: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: string;
  expiresAt: string;
  fileAttachment?: ShiftChatAttachment;
  systemNote?: boolean;

  // Microsoft Teams Style Direct & Channel Messaging
  scope?: ShiftChatScope; // 'DIRECT' | 'CHANNEL' (default is 'CHANNEL')
  channelId?: string;     // e.g. 'general', 'inward', 'dispatch', 'supervisors'
  recipientUsername?: string; // For 1-on-1 private direct chat (e.g. 'Sureshchavan')
  recipientName?: string;
  isDeleted?: boolean;

  // Rich Pack Share Card
  packShare?: ShiftChatPackShare;

  // Excel / Spreadsheet Pasted Table
  tableData?: ShiftChatTableData;
}

export interface ShiftCallSignal {
  id: string;
  type: 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'END' | 'REJECT' | 'BUSY';
  callerUsername: string;
  callerName: string;
  recipientUsername: string;
  isVideo: boolean;
  sdp?: any;
  candidate?: any;
  timestamp: string;
}

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
  isDifferentSerial?: boolean;        // True if physical pack number differs from Challan/Invoice pack number
  challanPackNumber?: string;         // Serial number stated on delivery challan / invoice
  secondaryStickerNumber?: string;    // Second barcode sticker number (for packs with 2 serial numbers)
  mismatchReason?: string;            // Notes on serial discrepancy
  sourceType?: 'INWARD' | 'LINE_POPULATE' | 'DIRECT_DISPATCH';
  scannedAt?: string; // Source: Inward Dock vs Direct Line Matrix vs Fast Direct Dispatch

  // 7-Day Auto Reconciliation (For Direct Fast Dispatch before Inward)
  pendingInwardReconciliation?: boolean;
  reconciliationValidUntil?: string;
  reconciledAt?: string;

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

  // Customer Return / Warranty Repair Lifecycle Tracking
  isCustomerReturn?: boolean;
  returnReason?: string;
  returnPlant?: string;
  returnChallanNo?: string;
  lifecycleCount?: number;            // Current cycle (1 = 1st inward, 2 = 2nd inward / return, etc.)
  lifecycleHistory?: PackCycle[];     // Completed past cycles (Cycle 1, Cycle 2, ...)

  // Dispatch Details
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchLotId?: string;
  dispatchDocNo?: string;
  dispatchLrNo?: string;
  dispatchVehicleNo?: string;
  dispatchTransporter?: string;
  dispatchToAddress?: string;
  dispatchToCustomer?: string;

  // Previous Cycle Dispatch Archive (Retained when pack is re-inwarded)
  lastDispatchedAt?: string;
  lastDispatchDocNo?: string;
  lastDispatchCustomer?: string;
}

export interface PackCycle {
  cycleNumber: number;
  inwardDate: string;
  documentNo: string;
  dealershipName: string;
  receivedState?: string;
  transportName?: string;
  inwardBy: string;
  remark?: string;
  hasInwardStamp?: boolean;
  isWithoutPlate?: boolean;
  isDifferentSerial?: boolean;
  challanPackNumber?: string;
  mismatchReason?: string;
  lineId?: string;
  rackNumber?: number;
  rackSlot?: number;
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchLotId?: string;
  dispatchDocNo?: string;
  dispatchLrNo?: string;
  dispatchVehicleNo?: string;
  dispatchTransporter?: string;
  dispatchToCustomer?: string;
  dispatchToAddress?: string;
  isCustomerReturn?: boolean;
  returnReason?: string;
  returnPlant?: string;
  returnChallanNo?: string;
  completedAt?: string;
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
  isCustomerReturn?: boolean;
  returnReason?: string;
  returnPlant?: string;
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

export interface DailyStockRow {
  sr: number;
  packName: string;
  openingStock: number;
  receiveQty: number;
  totalAvailable: number; // openingStock + receiveQty
  dispatchQty: number;
  closingStock: number;   // totalAvailable - dispatchQty
  maintainedBy: string;   // e.g. "Jitendra Soni" or logged in operator
}

export interface DailyStockRecord {
  id: string;             // e.g. "stock-2026-08-08"
  date: string;           // "YYYY-MM-DD" e.g. "2026-08-08"
  displayDate?: string;   // "DD/MM/YYYY" e.g. "08/08/2026"
  rows: DailyStockRow[];
  totalOpeningStock: number;
  totalReceivedToday: number;
  totalDispatchToday: number;
  totalClosingStock: number;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
  createdByUsername: string;
  isLocked?: boolean;
}

