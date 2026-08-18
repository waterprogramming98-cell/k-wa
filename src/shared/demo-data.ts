import type {
  Category,
  Customer,
  OrderDetail,
  OrderSummary,
  PermissionSet,
  PickupWaiter,
  Product,
  RestaurantTable,
  SessionUser,
  ShiftState,
} from '@/shared/domain';

export const demoUser: SessionUser = {
  id: 1,
  name: 'أحمد — حساب تجريبي',
  businessId: 1,
  locationId: 1,
  roleNames: ['waiter', 'cashier'],
};

export const demoPermissions: PermissionSet = {
  can_sell: true,
  can_dine_in: true,
  can_takeaway: true,
  can_delivery: true,
  can_pickup: true,
  can_tables: true,
  can_orders: true,
  can_manage_customers: true,
  can_pay: true,
  can_change_payment: true,
  can_discount: true,
  can_shift: true,
  can_open_shift: true,
  can_close_shift: true,
  can_settings: true,
  can_manage_device: true,
  can_print: true,
  can_delete_line: true,
  can_open_cash_drawer: true,
  can_view_cash_drawer_log: true,
  can_manage_printers: true,
};

export const demoCategories: Category[] = [
  { id: 1, name: 'الأكثر طلبًا', sortOrder: 1 },
  { id: 2, name: 'المشروبات', sortOrder: 2 },
  { id: 3, name: 'ساندويتشات', sortOrder: 3 },
  { id: 4, name: 'الحلويات', sortOrder: 4 },
];

const demoVisuals: Record<string, { color: string; accent: string; label: string }> = {
  americano: { color: '#5b3525', accent: '#ead8c8', label: '☕' },
  'seven-up': { color: '#15814b', accent: '#d9f5e4', label: '7UP' },
  water: { color: '#2b7bbb', accent: '#dff3ff', label: 'H₂O' },
  burger: { color: '#b66122', accent: '#ffe3b7', label: 'BURGER' },
  club: { color: '#d59a23', accent: '#fff0bd', label: 'CLUB' },
  cheesecake: { color: '#b76b76', accent: '#ffe6ea', label: 'CAKE' },
  'chocolate-cake': { color: '#57352c', accent: '#efd8ce', label: 'CHOCO' },
  nescafe: { color: '#a72824', accent: '#ffe0d4', label: '3 in 1' },
};
const foodImage = (seed: string) => {
  const item = demoVisuals[seed] ?? { color: '#197447', accent: '#e6f5ec', label: 'K' };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" rx="36" fill="${item.accent}"/><circle cx="320" cy="220" r="142" fill="${item.color}" opacity=".16"/><circle cx="320" cy="220" r="108" fill="${item.color}"/><text x="320" y="238" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="44" font-weight="800">${item.label}</text><path d="M220 380h200" stroke="${item.color}" stroke-width="14" stroke-linecap="round" opacity=".35"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const demoProducts: Product[] = [
  { id: 101, categoryId: 1, name: 'أمريكانو', price: 1.5, image: foodImage('americano'), available: true, favorite: true },
  { id: 102, categoryId: 2, name: 'سفن أب', price: 0.75, image: foodImage('seven-up'), available: true, favorite: true },
  { id: 103, categoryId: 2, name: 'مياه معدنية', price: 0.25, image: foodImage('water'), available: true },
  { id: 104, categoryId: 3, name: 'برجر لحم', price: 2.75, image: foodImage('burger'), available: true, favorite: true,
    hasChoices: true,
    choiceGroups: [
      { id: 11, name: 'اختيار الخبز', kind: 'option', required: true, multiple: false, min: 1, max: 1, choices: [
        { id: 1101, name: 'خبز عادي', price: 0, kind: 'option', groupId: 11, clientKey: 'bread_regular' },
        { id: 1102, name: 'خبز بريوش', price: 0.2, kind: 'option', groupId: 11, clientKey: 'bread_brioche' },
      ] },
      { id: -21, name: 'الإضافات', kind: 'modifier', required: false, multiple: true, min: 0, max: 3, choices: [
        { id: 2101, variationId: 2101, name: 'جبن', price: 0.25, kind: 'modifier', groupId: 21 },
        { id: 2102, variationId: 2102, name: 'صوص إضافي', price: 0.15, kind: 'modifier', groupId: 21 },
        { id: 2103, variationId: 2103, name: 'بدون بصل', price: 0, kind: 'modifier', groupId: 21 },
      ] },
      { id: -2000000000, name: 'اختيار المشروب', kind: 'combo', required: true, multiple: false, min: 1, max: 1, choices: [
        { id: 3101, variationId: 3101, name: 'سفن أب', price: 0, kind: 'combo', groupName: 'اختيار المشروب' },
        { id: 3102, variationId: 3102, name: 'مياه معدنية', price: 0, kind: 'combo', groupName: 'اختيار المشروب' },
      ] },
    ] },
  { id: 105, categoryId: 3, name: 'كلوب ساندويتش', price: 2.25, image: foodImage('club'), available: true },
  { id: 106, categoryId: 4, name: 'تشيز كيك', price: 1.75, image: foodImage('cheesecake'), available: true },
  { id: 107, categoryId: 4, name: 'كيك شوكولاتة', price: 1.5, image: foodImage('chocolate-cake'), available: false },
  { id: 108, categoryId: 1, name: 'نسكافيه 3 في 1', price: 1, image: foodImage('nescafe'), available: true },
];

export const demoCustomers: Customer[] = [
  { id: 1, name: 'محمد علي', mobile: '50000001', addresses: [
    { id: 11, customerId: 1, label: 'المنزل', area: 'السالمية', block: '4', street: 'شارع سالم', building: '12', floor: '3', apartment: '7', isDefault: true },
  ] },
  { id: 2, name: 'سارة أحمد', mobile: '50000002', alternateNumber: '60000002', addresses: [
    { id: 21, customerId: 2, label: 'العمل', area: 'شرق', block: '2', street: 'أحمد الجابر', building: '8' },
  ] },
];

export const demoTables: RestaurantTable[] = [
  { id: 1, name: 'T1', status: 'available' },
  { id: 2, name: 'T2', status: 'occupied', orderId: 501, guests: 3, total: 8.25, openedAt: new Date(Date.now() - 24 * 60_000).toISOString() },
  { id: 3, name: 'T3', status: 'occupied', hasCall: true, orderId: 502, guests: 2, total: 4.5, openedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  { id: 4, name: 'T4', status: 'available' },
  { id: 5, name: 'T5', status: 'reserved', reservationAt: new Date(Date.now() + 45 * 60_000).toISOString() },
  { id: 6, name: 'T6', status: 'available' },
  { id: 7, name: 'T7', status: 'pending_confirmation', orderId: 507, guests: 4, total: 11.75, openedAt: new Date(Date.now() - 7 * 60_000).toISOString() },
];

export const demoPickupWaiters: PickupWaiter[] = [
  { id: 1, name: 'أحمد' },
  { id: 2, name: 'محمود' },
];

export const demoOrders: OrderSummary[] = [
  { id: 501, invoiceNo: 'INV-501', type: 'dine_in', status: 'في المطبخ', paymentStatus: 'due', tableName: 'T2', total: 8.25, createdAt: new Date(Date.now() - 24 * 60_000).toISOString() },
  { id: 502, invoiceNo: 'INV-502', type: 'dine_in', status: 'جاهز', paymentStatus: 'due', tableName: 'T3', total: 4.5, createdAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  { id: 507, invoiceNo: 'INV-507', type: 'dine_in', status: 'بانتظار التأكيد', paymentStatus: 'due', tableName: 'T7', total: 11.75, createdAt: new Date(Date.now() - 7 * 60_000).toISOString() },
  { id: 503, invoiceNo: 'INV-503', type: 'pickup', status: 'جديد', paymentStatus: 'due', customerName: 'محمد علي', customerMobile: '50000001', addressLabel: 'المنزل — السالمية', printState: 'queued', printRequestedCopies: 1, printConfirmedCopies: 0, total: 3.25, createdAt: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: 504, invoiceNo: 'INV-504', type: 'delivery', status: 'تم الدفع', paymentStatus: 'paid', customerName: 'سارة أحمد', customerMobile: '50000002', addressLabel: 'العمل — شرق', printState: 'printed', printRequestedCopies: 1, printConfirmedCopies: 1, canChangePayment: true, total: 6.75, createdAt: new Date(Date.now() - 45 * 60_000).toISOString() },
];

export function demoOrderDetail(id: number): OrderDetail {
  const summary = demoOrders.find(order => order.id === id) ?? demoOrders[0]!;
  const customer = summary.customerName ? demoCustomers.find(item => item.name === summary.customerName) ?? null : null;
  const table = demoTables.find(item => item.orderId === summary.id);
  const firstProduct = demoProducts[id % demoProducts.length] ?? demoProducts[0]!;
  return {
    ...summary,
    tableId: table?.id ?? null,
    customerId: customer?.id ?? null,
    addressId: customer?.addresses?.[0]?.id ?? null,
    pickupWaiterId: summary.type === 'pickup' ? demoPickupWaiters[0]!.id : null,
    customer,
    address: customer?.addresses?.[0] ?? null,
    note: '',
    serverUpdatedAt: summary.createdAt,
    canPay: summary.paymentStatus !== 'paid',
    canEdit: summary.paymentStatus !== 'paid',
    canPrint: true,
    lines: [{
      localId: `demo-line-${summary.id}`,
      serverId: summary.id * 10,
      productId: firstProduct.id,
      ...(firstProduct.menuItemId === undefined ? {} : { menuItemId: firstProduct.menuItemId }),
      ...(firstProduct.variationId === undefined ? {} : { variationId: firstProduct.variationId }),
      name: firstProduct.name,
      quantity: 2,
      unitPrice: firstProduct.price,
      choices: [],
      note: '',
      locked: false,
    }],
  };
}

export const demoShift: ShiftState = {
  active: true,
  sessionId: 1,
  openedAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
  ordersCount: 18,
  total: 74.25,
  cashTotal: 31.5,
  knetTotal: 42.75,
  pendingFromCustomers: 0,
  physicalTotal: 74.25,
  driversUnsettled: 0,
  recentOrders: [],
  paymentMethods: ['cash', 'knet', 'cheque', 'bank_transfer', 'other', 'payment_link', 'custom_pay_2', 'custom_pay_3', 'custom_pay_4', 'custom_pay_5', 'custom_pay_6', 'custom_pay_7'],
  paymentMethodOptions: [
    { id: 'cash', label: 'نقدي' },
    { id: 'knet', label: 'بطاقة / كي نت' },
    { id: 'cheque', label: 'شيك' },
    { id: 'bank_transfer', label: 'تحويل بنكي' },
    { id: 'other', label: 'أخرى' },
    { id: 'payment_link', label: 'رابط دفع' },
    { id: 'custom_pay_2', label: 'محفظة إلكترونية' },
    { id: 'custom_pay_3', label: 'قسيمة' },
    { id: 'custom_pay_4', label: 'حساب شركة' },
    { id: 'custom_pay_5', label: 'نقاط ولاء' },
    { id: 'custom_pay_6', label: 'دفع موظف' },
    { id: 'custom_pay_7', label: 'طريقة مخصصة' },
  ],
  allowSplitPayment: true,
};
