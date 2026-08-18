export type Language = 'ar' | 'en';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'pickup';
export type SyncState = 'local' | 'pending' | 'syncing' | 'synced' | 'review';
// Payment methods are configured by Laravel and can include seven business-defined
// methods. Keep the identifier dynamic instead of silently dropping custom methods.
export type PaymentMethod = string;

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
}

export interface PaymentAllocation {
  method: PaymentMethod;
  amount: number;
}

export interface PaymentItemAllocation {
  method: PaymentMethod;
  items: Array<{ line_id: number; quantity: number }>;
}

export interface PaymentChangePayload {
  reason: string;
  method?: PaymentMethod;
  split_mode?: 'amount' | 'items';
  payments?: PaymentAllocation[];
  item_groups?: PaymentItemAllocation[];
}

export interface PermissionSet {
  can_sell: boolean;
  can_dine_in: boolean;
  can_takeaway: boolean;
  can_delivery: boolean;
  can_pickup: boolean;
  can_tables: boolean;
  can_orders: boolean;
  can_manage_customers: boolean;
  can_pay: boolean;
  can_change_payment: boolean;
  can_discount: boolean;
  can_shift: boolean;
  can_open_shift: boolean;
  can_close_shift: boolean;
  can_settings: boolean;
  can_manage_device: boolean;
  can_print: boolean;
  can_delete_line: boolean;
  can_open_cash_drawer: boolean;
  can_view_cash_drawer_log: boolean;
  can_manage_printers: boolean;
}

export interface SessionUser {
  id: number;
  name: string;
  businessId: number;
  locationId: number;
  roleNames: string[];
}

export interface SessionState {
  user: SessionUser;
  permissions: PermissionSet;
  accessToken?: string;
  expiresAt?: string;
}

export interface Category {
  id: number;
  name: string;
  image?: string | null;
  sortOrder?: number;
}

export interface ProductChoice {
  id: number;
  name: string;
  price: number;
  selected?: boolean;
  kind?: 'option' | 'modifier' | 'combo';
  groupId?: number;
  groupName?: string;
  variationId?: number;
  clientKey?: string;
  linkedVariationId?: number | null;
  deductQuantity?: number;
  components?: Array<{ linkedVariationId: number; deductQuantity: number }>;
}

export interface ProductChoiceGroup {
  id: number;
  name: string;
  kind?: 'option' | 'modifier' | 'combo';
  required: boolean;
  multiple: boolean;
  min: number;
  max: number;
  showWhenItemKey?: string | null;
  choices: ProductChoice[];
}

export interface Product {
  id: number;
  serverProductId?: number;
  menuItemId?: number;
  categoryId: number;
  name: string;
  searchText?: string | null;
  sku?: string | null;
  description?: string | null;
  image?: string | null;
  price: number;
  available: boolean;
  favorite?: boolean;
  choiceGroups?: ProductChoiceGroup[];
  variationId?: number;
  hasChoices?: boolean;
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  label: string;
  area?: string;
  block?: string;
  street?: string;
  avenue?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  alternateNumber?: string;
  addresses?: CustomerAddress[];
}

export interface RestaurantTable {
  id: number;
  name: string;
  status: 'available' | 'occupied' | 'pending_confirmation' | 'reserved';
  hasCall?: boolean;
  orderId?: number | null;
  localOrderId?: string;
  localSyncState?: 'pending' | 'review';
  guests?: number;
  total?: number;
  openedAt?: string | null;
  displayTime?: string | null;
  reservationAt?: string | null;
}

export interface PickupWaiter {
  id: number;
  name: string;
}

export interface CartChoice {
  id: number;
  name: string;
  price: number;
  kind?: 'option' | 'modifier' | 'combo';
  groupId?: number;
  groupName?: string;
  variationId?: number;
  clientKey?: string;
  linkedVariationId?: number | null;
  deductQuantity?: number;
  components?: Array<{ linkedVariationId: number; deductQuantity: number }>;
}

export interface CartLine {
  localId: string;
  serverId?: number;
  catalogProductId?: number;
  productId: number;
  categoryId?: number;
  menuItemId?: number;
  variationId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  choices: CartChoice[];
  note: string;
  seat?: number;
  course?: number;
  locked?: boolean;
}

export interface OrderDraft {
  scope: string;
  localId: string;
  serverId?: number;
  idempotencyKey: string;
  revision: number;
  type: OrderType;
  tableId: number | null;
  customerId: number | null;
  addressId: number | null;
  customerSnapshot?: Customer;
  addressSnapshot?: CustomerAddress;
  pickupWaiterId: number | null;
  guests: number;
  note: string;
  lines: CartLine[];
  syncState: SyncState;
  updatedAt: string;
  serverUpdatedAt?: string;
}

export interface OrderSummary {
  id: number;
  invoiceNo: string;
  type: OrderType;
  status: string;
  paymentStatus: 'due' | 'partial' | 'paid';
  customerName?: string;
  customerMobile?: string;
  addressLabel?: string;
  tableName?: string;
  total: number;
  createdAt: string;
  syncState?: SyncState;
  canPay?: boolean;
  canEdit?: boolean;
  canPrint?: boolean;
  canChangePayment?: boolean;
  printState?: string;
  printRequestedCopies?: number;
  printConfirmedCopies?: number;
  printJobIds?: number[];
}

export interface OrderDetail extends OrderSummary {
  tableId: number | null;
  customerId: number | null;
  addressId: number | null;
  pickupWaiterId: number | null;
  customer?: Customer | null;
  address?: CustomerAddress | null;
  note: string;
  lines: CartLine[];
  serverUpdatedAt: string;
  paymentMethod?: string | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  serviceCharge?: number;
  waiterName?: string;
  taxNumber?: string;
  receiptFooter?: string;
}

export interface TableCall {
  id: number;
  tableId: number;
  tableName: string;
  note?: string | null;
  createdAt: string;
}

export interface NotificationSnapshot {
  waiterCalls: TableCall[];
  pickupAssigned: Array<{ id: number; invoiceNo?: string | null; customer?: string | null; customerMobile?: string | null; pickupTime?: string | null; total?: number | null }>;
  tableUpdate: boolean;
  cursor: string;
}

export interface RealtimeConfig {
  enabled: boolean;
  key: string;
  cluster: string;
  host: string;
  wsPort: number;
  wssPort: number;
  forceTLS: boolean;
  channel: string;
  authEndpoint: string;
}

export interface Printer {
  id: number;
  name: string;
  connectionType: string;
  ipAddress?: string | null;
  port: number;
  department?: string;
  paperWidth?: 58 | 80;
  printKot?: boolean;
  printReceipt?: boolean;
  fallbackPrinterId?: number | null;
  cashDrawer?: {
    enabled: boolean;
    autoOpen: boolean;
    pin: 0 | 1;
    onMs: number;
    offMs: number;
  };
  buzzer?: {
    enabled: boolean;
    mode: 'bel' | 'esc-b';
    count: number;
    duration: number;
  };
  active: boolean;
}

export interface LocalNetworkPrinter {
  id: string;
  name: string;
  host: string;
  port: number;
  paperWidth: 58 | 80;
  active: boolean;
  printReceipt: boolean;
  printKot: boolean;
  department: 'kitchen' | 'beverage' | 'cashier' | 'all';
  categoryIds: number[];
  fallbackPrinterId: string | null;
  cashDrawer: {
    enabled: boolean;
    pin: 0 | 1;
    onMs: number;
    offMs: number;
  };
  buzzer: {
    enabled: boolean;
    mode: 'bel' | 'esc-b';
    count: number;
    duration: number;
  };
}

export interface KotPrintRoute {
  id: number;
  name: string;
  orderType: OrderType | 'all';
  printScope: 'full_order' | 'categories' | 'items';
  categoryIds: number[];
  copies: 1 | 2 | 3;
  sortOrder: number;
  printer: {
    id: number;
    name: string;
    ipAddress: string;
    port: number;
    paperWidth: 58 | 80;
    fallbackPrinterId?: number | null;
    buzzer?: { enabled: boolean; mode: 'bel' | 'esc-b'; count: number; duration: number };
  };
}

export interface KotRoutingSnapshot {
  version: string;
  routes: KotPrintRoute[];
}

export interface PrintJobResult {
  jobIds: number[];
  jobs: number;
  local?: boolean;
  queued?: boolean;
  localJobId?: string;
  jobData?: ServerPrintJob[];
}

export interface ServerPrintJob {
  id: number;
  jobType: string;
  printerName: string;
  printerIp: string;
  printerPort: number;
  paperWidth: 58 | 80;
  copies: 1 | 2 | 3;
  buzzer?: { enabled: boolean; mode: 'bel' | 'esc-b'; count: number; duration: number };
  payload: { invoice_no?: string; department?: string; order_type?: string; table?: string; lines?: Array<{ type?: string; text?: string; name?: string; qty?: string | number; note?: string }> };
}

export interface ReceiptLineSnapshot {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  choices: string[];
  note?: string;
}

export interface ReceiptSnapshot {
  scope: string;
  key: string;
  orderId?: number;
  localOrderId?: string;
  invoiceNo: string;
  businessName: string;
  language?: Language;
  locationName?: string;
  orderType: OrderType;
  customerName?: string;
  customerMobile?: string;
  deliveryAddress?: string;
  tableName?: string;
  paymentStatus: 'due' | 'partial' | 'paid';
  paymentMethod?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  serviceCharge?: number;
  waiterName?: string;
  taxNumber?: string;
  footer?: string;
  total: number;
  createdAt: string;
  temporary: boolean;
  documentType?: 'receipt' | 'kot';
  lines: ReceiptLineSnapshot[];
}

export interface LocalPrintJob {
  scope: string;
  id: string;
  receipt: ReceiptSnapshot;
  copies: 1 | 2 | 3;
  status: 'pending' | 'printing' | 'failed' | 'uncertain' | 'completed';
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  completedAt?: number;
  lastError?: string;
  serverJobId?: number;
  serverAckPending?: boolean;
  printerHost?: string;
  printerPort?: number;
  paperWidth?: 58 | 80;
  printerMode?: 'tcp' | 'bluetooth';
  bluetoothAddress?: string;
  printerId?: number | string;
  printerName?: string;
  buzzer?: { enabled: boolean; mode: 'bel' | 'esc-b'; count: number; duration: number };
}

export type SyncOperationKind =
  | 'order.create'
  | 'order.update'
  | 'order.kot'
  | 'payment.create'
  | 'customer.create'
  | 'customer.update'
  | 'address.create'
  | 'address.update'
  | 'print.submit'
  | 'cash_drawer.report';

export interface SyncOperation {
  scope: string;
  id: string;
  kind: SyncOperationKind;
  aggregateId: string;
  idempotencyKey: string;
  revision: number;
  payload: unknown;
  status: 'pending' | 'running' | 'failed' | 'review';
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError?: string;
}

export interface ShiftState {
  active: boolean;
  sessionId?: number;
  openedAt?: string;
  ordersCount: number;
  total: number;
  cashTotal: number;
  knetTotal: number;
  pendingFromCustomers: number;
  physicalTotal: number;
  driversUnsettled: number;
  recentOrders: Array<{ id: number; invoiceNo: string; type?: OrderType; total: number; collected: number; pending: number; paymentMethod?: string; createdAt?: string }>;
  paymentMethods: PaymentMethod[];
  paymentMethodOptions: PaymentMethodOption[];
  allowSplitPayment: boolean;
}

export interface DeviceSettings {
  version: 4;
  deviceName: string;
  preset: 'waiter' | 'pickup' | 'cashier' | 'custom';
  language: Language;
  theme: 'light' | 'dark' | 'system';
  screens: {
    home: boolean;
    pos: boolean;
    tables: boolean;
    pickups: boolean;
    orders: boolean;
    customers: boolean;
    payment: boolean;
    shift: boolean;
  };
  orderTypes: Record<OrderType, boolean>;
  payment: {
    hiddenMethods: PaymentMethod[];
    knownMethods: PaymentMethodOption[];
    allowSplit: boolean;
  };
  pos: {
    showImages: boolean;
    productColumns: 2 | 3 | 4 | 5;
    productSort: 'server' | 'name' | 'price' | 'favorites';
    fontScale: 'normal' | 'large' | 'xlarge';
    categoryColorMode: 'off' | 'categories' | 'cards' | 'both';
    productCardStyle: 'clean' | 'soft' | 'accent';
    keepCartOpen: boolean;
    quickPay: boolean;
    quickCash: boolean;
    quickKnet: boolean;
    showKitchen: boolean;
    confirmPayment: boolean;
    confirmKitchen: boolean;
    autosaveDraft: boolean;
    favorites: boolean;
  };
  tables: {
    showCalls: boolean;
    showTimer: boolean;
    showTotal: boolean;
    allowMerge: boolean;
    allowTransfer: boolean;
    allowSplit: boolean;
  };
  notifications: {
    sound: boolean;
    vibration: boolean;
    tableCalls: boolean;
    pickups: boolean;
  };
  sync: {
    offlineOrders: boolean;
    offlinePayments: boolean;
    backgroundSync: boolean;
    intervalSeconds: 15 | 30 | 60 | 120;
  };
  printing: {
    enabled: boolean;
    mode: 'server' | 'tcp' | 'bluetooth' | 'airprint';
    receiptCopies: 1 | 2 | 3;
    receiptPrinterId: number | null;
    localReceiptPrinterId: string | null;
    localPrinters: LocalNetworkPrinter[];
    directHost: string;
    directPort: number;
    bluetoothAddress: string;
    bluetoothName: string;
    paperWidth: 58 | 80;
    cutPaper: boolean;
    autoPrintOnSave: boolean;
    autoPrintAfterPayment: boolean;
    cashDrawerEnabled: boolean;
    cashDrawerPrinterId: number | null;
    localCashDrawerPrinterId: string | null;
    cashDrawerAutoOpenCash: boolean;
    connectionTimeoutMs: 3000 | 5000 | 8000;
  };
}

export const DEFAULT_PERMISSIONS: PermissionSet = {
  can_sell: false,
  can_dine_in: false,
  can_takeaway: false,
  can_delivery: false,
  can_pickup: false,
  can_tables: false,
  can_orders: false,
  can_manage_customers: false,
  can_pay: false,
  can_change_payment: false,
  can_discount: false,
  can_shift: false,
  can_open_shift: false,
  can_close_shift: false,
  can_settings: false,
  can_manage_device: false,
  can_print: false,
  can_delete_line: false,
  can_open_cash_drawer: false,
  can_view_cash_drawer_log: false,
  can_manage_printers: false,
};
