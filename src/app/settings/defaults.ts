import type { DeviceSettings, OrderType, PaymentMethodOption, PermissionSet } from '@/shared/domain';

export const DEFAULT_PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { id: 'cash', label: 'نقدي' },
  { id: 'knet', label: 'بطاقة / كي نت' },
  { id: 'cheque', label: 'شيك' },
  { id: 'bank_transfer', label: 'تحويل بنكي' },
  { id: 'other', label: 'أخرى' },
  { id: 'payment_link', label: 'دفع مخصص 1' },
  { id: 'custom_pay_2', label: 'دفع مخصص 2' },
  { id: 'custom_pay_3', label: 'دفع مخصص 3' },
  { id: 'custom_pay_4', label: 'دفع مخصص 4' },
  { id: 'custom_pay_5', label: 'دفع مخصص 5' },
  { id: 'custom_pay_6', label: 'دفع مخصص 6' },
  { id: 'custom_pay_7', label: 'دفع مخصص 7' },
];

export const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  version: 3,
  deviceName: 'تابلت الجارسون',
  preset: 'custom',
  language: 'ar',
  theme: 'light',
  screens: {
    home: true,
    pos: true,
    tables: false,
    pickups: true,
    orders: true,
    customers: true,
    payment: true,
    shift: true,
  },
  orderTypes: {
    dine_in: false,
    takeaway: false,
    delivery: true,
    pickup: true,
  },
  payment: {
    hiddenMethods: [],
    knownMethods: DEFAULT_PAYMENT_METHOD_OPTIONS,
    allowSplit: true,
  },
  pos: {
    showImages: true,
    productColumns: 4,
    productSort: 'server',
    fontScale: 'normal',
    categoryColorMode: 'both',
    productCardStyle: 'soft',
    keepCartOpen: true,
    quickPay: true,
    quickCash: true,
    quickKnet: true,
    showKitchen: true,
    confirmPayment: true,
    confirmKitchen: false,
    autosaveDraft: true,
    favorites: true,
  },
  tables: {
    showCalls: true,
    showTimer: true,
    showTotal: true,
    allowMerge: true,
    allowTransfer: true,
    allowSplit: true,
  },
  notifications: {
    sound: true,
    vibration: true,
    tableCalls: true,
    pickups: true,
  },
  sync: {
    offlineOrders: true,
    offlinePayments: true,
    backgroundSync: true,
    intervalSeconds: 30,
  },
  printing: {
    enabled: true,
    mode: 'server',
    receiptCopies: 1,
    receiptPrinterId: null,
    directHost: '',
    directPort: 9100,
    bluetoothAddress: '',
    bluetoothName: '',
    paperWidth: 80,
    cutPaper: true,
    autoPrintOnSave: true,
    autoPrintAfterPayment: true,
    cashDrawerEnabled: true,
    cashDrawerPrinterId: null,
    cashDrawerAutoOpenCash: true,
    connectionTimeoutMs: 5000,
  },
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'داخل المطعم',
  takeaway: 'تيك أواي',
  delivery: 'توصيل',
  pickup: 'استلام',
};

export function normalizeDeviceSettings(input?: Partial<DeviceSettings> | null): DeviceSettings {
  const source = input ?? {};
  const orderTypes = { ...DEFAULT_DEVICE_SETTINGS.orderTypes, ...source.orderTypes };
  if (!Object.values(orderTypes).some(Boolean)) orderTypes.pickup = true;
  const columns = [2, 3, 4, 5].includes(Number(source.pos?.productColumns))
    ? source.pos?.productColumns as 2 | 3 | 4 | 5
    : DEFAULT_DEVICE_SETTINGS.pos.productColumns;
  const fontScale = ['normal', 'large', 'xlarge'].includes(String(source.pos?.fontScale))
    ? source.pos?.fontScale as DeviceSettings['pos']['fontScale']
    : DEFAULT_DEVICE_SETTINGS.pos.fontScale;
  const categoryColorMode = ['off', 'categories', 'cards', 'both'].includes(String(source.pos?.categoryColorMode))
    ? source.pos?.categoryColorMode as DeviceSettings['pos']['categoryColorMode']
    : DEFAULT_DEVICE_SETTINGS.pos.categoryColorMode;
  const productCardStyle = ['clean', 'soft', 'accent'].includes(String(source.pos?.productCardStyle))
    ? source.pos?.productCardStyle as DeviceSettings['pos']['productCardStyle']
    : DEFAULT_DEVICE_SETTINGS.pos.productCardStyle;
  const interval = [15, 30, 60, 120].includes(Number(source.sync?.intervalSeconds))
    ? source.sync?.intervalSeconds as 15 | 30 | 60 | 120
    : DEFAULT_DEVICE_SETTINGS.sync.intervalSeconds;
  const copies = [1, 2, 3].includes(Number(source.printing?.receiptCopies))
    ? source.printing?.receiptCopies as 1 | 2 | 3
    : DEFAULT_DEVICE_SETTINGS.printing.receiptCopies;
  const paperWidth = [58, 80].includes(Number(source.printing?.paperWidth))
    ? source.printing?.paperWidth as 58 | 80
    : DEFAULT_DEVICE_SETTINGS.printing.paperWidth;
  const connectionTimeoutMs = [3000, 5000, 8000].includes(Number(source.printing?.connectionTimeoutMs))
    ? source.printing?.connectionTimeoutMs as 3000 | 5000 | 8000
    : DEFAULT_DEVICE_SETTINGS.printing.connectionTimeoutMs;
  const directPort = Number.isInteger(Number(source.printing?.directPort))
    && Number(source.printing?.directPort) >= 1
    && Number(source.printing?.directPort) <= 65535
    ? Number(source.printing?.directPort)
    : DEFAULT_DEVICE_SETTINGS.printing.directPort;
  const hiddenMethods = Array.from(new Set((source.payment?.hiddenMethods ?? [])
    .map(value => String(value).trim().toLowerCase())
    .filter(Boolean)));
  const knownMethods = Array.from(new Map((source.payment?.knownMethods ?? DEFAULT_PAYMENT_METHOD_OPTIONS)
    .map(option => ({ id: String(option?.id ?? '').trim().toLowerCase(), label: String(option?.label ?? '').trim() }))
    .filter(option => option.id && option.label)
    .map(option => [option.id, option] as const)).values());

  return {
    ...DEFAULT_DEVICE_SETTINGS,
    ...source,
    version: 3,
    language: source.language === 'en' ? 'en' : 'ar',
    deviceName: String(source.deviceName || DEFAULT_DEVICE_SETTINGS.deviceName).trim().slice(0, 80),
    screens: { ...DEFAULT_DEVICE_SETTINGS.screens, ...source.screens },
    orderTypes,
    payment: {
      ...DEFAULT_DEVICE_SETTINGS.payment,
      ...source.payment,
      hiddenMethods,
      knownMethods: knownMethods.length ? knownMethods : structuredClone(DEFAULT_PAYMENT_METHOD_OPTIONS),
      allowSplit: source.payment?.allowSplit !== false,
    },
    pos: {
      ...DEFAULT_DEVICE_SETTINGS.pos,
      ...source.pos,
      productColumns: columns,
      fontScale,
      categoryColorMode,
      productCardStyle,
    },
    tables: { ...DEFAULT_DEVICE_SETTINGS.tables, ...source.tables },
    notifications: { ...DEFAULT_DEVICE_SETTINGS.notifications, ...source.notifications },
    sync: { ...DEFAULT_DEVICE_SETTINGS.sync, ...source.sync, intervalSeconds: interval },
    printing: {
      ...DEFAULT_DEVICE_SETTINGS.printing,
      ...source.printing,
      receiptCopies: copies,
      receiptPrinterId: Number(source.printing?.receiptPrinterId) > 0 ? Number(source.printing?.receiptPrinterId) : null,
      paperWidth,
      connectionTimeoutMs,
      directPort,
      directHost: String(source.printing?.directHost ?? '').trim().slice(0, 253),
      bluetoothAddress: String(source.printing?.bluetoothAddress ?? '').trim().toUpperCase().slice(0, 17),
      bluetoothName: String(source.printing?.bluetoothName ?? '').trim().slice(0, 100),
      cashDrawerPrinterId: Number(source.printing?.cashDrawerPrinterId) > 0 ? Number(source.printing?.cashDrawerPrinterId) : null,
    },
  };
}

export function effectiveOrderTypes(settings: DeviceSettings, permissions: PermissionSet): Record<OrderType, boolean> {
  return {
    dine_in: settings.orderTypes.dine_in && permissions.can_dine_in,
    takeaway: settings.orderTypes.takeaway && permissions.can_takeaway,
    delivery: settings.orderTypes.delivery && permissions.can_delivery,
    pickup: settings.orderTypes.pickup && permissions.can_pickup,
  };
}
