import type { DeviceSettings, LocalNetworkPrinter, OrderType, PaymentMethodOption, PermissionSet } from '@/shared/domain';

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
  version: 4,
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
    localReceiptPrinterId: null,
    localPrinters: [],
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
    localCashDrawerPrinterId: null,
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
  const localPrinters: LocalNetworkPrinter[] = [];
  const seenLocalPrinterIds = new Set<string>();
  for (const raw of Array.isArray(source.printing?.localPrinters) ? source.printing.localPrinters : []) {
    const id = String(raw?.id || '').trim().slice(0, 80);
    const host = String(raw?.host || '').trim().slice(0, 253);
    if (!id || !host || seenLocalPrinterIds.has(id)) continue;
    seenLocalPrinterIds.add(id);
    const port = Number(raw?.port);
    const department = ['kitchen', 'beverage', 'cashier', 'all'].includes(String(raw?.department))
      ? raw.department as LocalNetworkPrinter['department']
      : 'all';
    const categoryIds = Array.from(new Set((Array.isArray(raw?.categoryIds) ? raw.categoryIds : [])
      .map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0)));
    localPrinters.push({
      id,
      name: String(raw?.name || 'طابعة محلية').trim().slice(0, 100) || 'طابعة محلية',
      host,
      port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 9100,
      paperWidth: Number(raw?.paperWidth) === 58 ? 58 : 80,
      active: raw?.active !== false,
      printReceipt: raw?.printReceipt === true,
      printKot: raw?.printKot === true,
      department,
      categoryIds,
      fallbackPrinterId: raw?.fallbackPrinterId ? String(raw.fallbackPrinterId).trim().slice(0, 80) : null,
      cashDrawer: {
        enabled: raw?.cashDrawer?.enabled === true,
        pin: Number(raw?.cashDrawer?.pin) === 1 ? 1 : 0,
        onMs: Math.max(20, Math.min(510, Number(raw?.cashDrawer?.onMs) || 120)),
        offMs: Math.max(20, Math.min(510, Number(raw?.cashDrawer?.offMs) || 240)),
      },
      buzzer: {
        enabled: raw?.buzzer?.enabled === true,
        mode: raw?.buzzer?.mode === 'esc-b' ? 'esc-b' : 'bel',
        count: Math.max(1, Math.min(9, Number(raw?.buzzer?.count) || 1)),
        duration: Math.max(1, Math.min(9, Number(raw?.buzzer?.duration) || 2)),
      },
    });
  }
  const legacyHost = String(source.printing?.directHost ?? '').trim().slice(0, 253);
  if (!localPrinters.length && legacyHost) {
    localPrinters.push({
      id: 'legacy-primary', name: 'الطابعة الرئيسية', host: legacyHost, port: directPort,
      paperWidth, active: true, printReceipt: true, printKot: true, department: 'all', categoryIds: [],
      fallbackPrinterId: null,
      cashDrawer: { enabled: source.printing?.cashDrawerEnabled === true, pin: 0, onMs: 120, offMs: 240 },
      buzzer: { enabled: false, mode: 'bel', count: 1, duration: 2 },
    });
  }
  const localPrinterIds = new Set(localPrinters.map(printer => printer.id));
  localPrinters.forEach(printer => {
    if (!printer.fallbackPrinterId || printer.fallbackPrinterId === printer.id || !localPrinterIds.has(printer.fallbackPrinterId)) {
      printer.fallbackPrinterId = null;
    }
  });
  const requestedLocalReceiptId = String(source.printing?.localReceiptPrinterId || '');
  const localReceiptPrinterId = localPrinterIds.has(requestedLocalReceiptId)
    ? requestedLocalReceiptId
    : localPrinters.find(printer => printer.active && printer.printReceipt)?.id ?? null;
  const requestedLocalDrawerId = String(source.printing?.localCashDrawerPrinterId || '');
  const localCashDrawerPrinterId = localPrinterIds.has(requestedLocalDrawerId)
    ? requestedLocalDrawerId
    : localPrinters.find(printer => printer.active && printer.cashDrawer.enabled)?.id ?? null;

  return {
    ...DEFAULT_DEVICE_SETTINGS,
    ...source,
    version: 4,
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
      localReceiptPrinterId,
      localPrinters,
      paperWidth,
      connectionTimeoutMs,
      directPort,
      directHost: String(source.printing?.directHost ?? '').trim().slice(0, 253),
      bluetoothAddress: String(source.printing?.bluetoothAddress ?? '').trim().toUpperCase().slice(0, 17),
      bluetoothName: String(source.printing?.bluetoothName ?? '').trim().slice(0, 100),
      cashDrawerPrinterId: Number(source.printing?.cashDrawerPrinterId) > 0 ? Number(source.printing?.cashDrawerPrinterId) : null,
      localCashDrawerPrinterId,
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
