import { apiClient } from '@/app/services/api-client';
import { appPreferences } from '@/app/services/preferences';
import { DEMO_MODE_ENABLED } from '@/app/config/features';
import type {
  Category,
  Customer,
  CustomerAddress,
  OrderDraft,
  OrderDetail,
  OrderSummary,
  PaymentChangePayload,
  NotificationSnapshot,
  PermissionSet,
  PickupWaiter,
  Product,
  Printer,
  KotRoutingSnapshot,
  PrintJobResult,
  RestaurantTable,
  RealtimeConfig,
  ServerPrintJob,
  SessionUser,
  ShiftState,
} from '@/shared/domain';
import {
  demoCategories,
  demoCustomers,
  demoOrderDetail,
  demoOrders,
  demoPermissions,
  demoPickupWaiters,
  demoProducts,
  demoShift,
  demoTables,
  demoUser,
} from '@/shared/demo-data';
import { normalizeRestaurantTable } from '@/features/tables/table-state';
import type { AppReleaseInfo } from '@/app/services/app-update';

const API = '/api/waiter/v3';

async function isDemo(): Promise<boolean> {
  return DEMO_MODE_ENABLED && (await appPreferences.getServerUrl()) === 'demo://local';
}

export interface BootstrapResponse {
  user: SessionUser;
  permissions: PermissionSet;
  business: { id: number; name: string; currency: string };
  location: { id: number; name: string };
  deviceSettings?: unknown;
  realtime?: RealtimeConfig;
}

export interface MenuResponse {
  version: string;
  categories: Category[];
  products: Product[];
}

function mapPrintJobs(input: Array<Record<string, unknown>> = []): ServerPrintJob[] {
  return input.map(job => ({
    id: Number(job.id),
    jobType: String(job.job_type ?? 'kot'),
    printerName: String(job.printer_name ?? ''),
    printerIp: String(job.printer_ip ?? ''),
    printerPort: Number(job.printer_port ?? 9100),
    paperWidth: (Number(job.paper_width) === 58 ? 58 : 80) as 58 | 80,
    copies: Math.min(3, Math.max(1, Number(job.copies ?? 1))) as 1 | 2 | 3,
    ...(job.buzzer && typeof job.buzzer === 'object' ? { buzzer: job.buzzer as NonNullable<ServerPrintJob['buzzer']> } : {}),
    payload: (job.payload && typeof job.payload === 'object' ? job.payload : {}) as ServerPrintJob['payload'],
  })).filter(job => job.id > 0);
}

export const waiterApi = {
  async appVersion(platform: 'android' | 'ios', currentVersion: string): Promise<AppReleaseInfo> {
    return apiClient.get(`${API}/app-version?platform=${platform}&current=${encodeURIComponent(currentVersion)}`, {
      timeoutMs: 6000,
      skipAuth: true,
    });
  },

  async login(username: string, password: string, deviceId: string, deviceName: string): Promise<{ accessToken: string; refreshToken?: string; bootstrap: BootstrapResponse }> {
    if (await isDemo()) {
      if (!username.trim() || !password.trim()) throw new Error('أدخل اسم المستخدم وكلمة المرور');
      return {
        accessToken: 'demo-token',
        refreshToken: 'demo-refresh',
        bootstrap: {
          user: demoUser,
          permissions: demoPermissions,
          business: { id: 1, name: 'مطعم K-Waiter التجريبي', currency: 'د.ك' },
          location: { id: 1, name: 'الفرع الرئيسي' },
        },
      };
    }
    return apiClient.post(`${API}/auth/login`, {
      username,
      password,
      device_id: deviceId,
      device_name: deviceName,
    }, { skipAuth: true });
  },

  async bootstrap(): Promise<BootstrapResponse> {
    if (await isDemo()) return {
      user: demoUser,
      permissions: demoPermissions,
      business: { id: 1, name: 'مطعم K-Waiter التجريبي', currency: 'د.ك' },
      location: { id: 1, name: 'الفرع الرئيسي' },
    };
    return apiClient.get(`${API}/bootstrap`);
  },

  async logout(): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/auth/logout`);
  },

  async menu(): Promise<MenuResponse> {
    if (await isDemo()) return { version: 'demo-1', categories: demoCategories, products: demoProducts };
    const response = await apiClient.get<MenuResponse>(`${API}/menu`);
    const serverUrl = await appPreferences.getServerUrl();
    const absolute = (value?: string | null): string | null | undefined => {
      if (!value || !serverUrl) return value;
      try { return new URL(value, `${serverUrl.replace(/\/$/, '')}/`).toString(); }
      catch { return value; }
    };
    return {
      ...response,
      categories: response.categories.map(category => {
        const image = absolute(category.image);
        return { ...category, ...(image === undefined ? {} : { image }) };
      }),
      products: response.products.map(product => {
        const image = absolute(product.image);
        return { ...product, ...(image === undefined ? {} : { image }) };
      }),
    };
  },

  async productChoices(productId: number): Promise<{ choiceGroups: import('@/shared/domain').ProductChoiceGroup[] }> {
    if (await isDemo()) {
      return { choiceGroups: structuredClone(demoProducts.find(item => item.id === productId)?.choiceGroups ?? []) };
    }
    return apiClient.get(`${API}/products/${productId}/choices`);
  },

  async tables(): Promise<RestaurantTable[]> {
    if (await isDemo()) return structuredClone(demoTables).map(normalizeRestaurantTable);
    const response = await apiClient.get<{ tables: Array<RestaurantTable & Record<string, unknown>> }>(`${API}/tables`);
    return response.tables.map(table => normalizeRestaurantTable(table));
  },

  async customers(term: string): Promise<Customer[]> {
    if (await isDemo()) {
      const query = term.trim().toLocaleLowerCase('ar');
      if (!query) return [];
      return structuredClone(demoCustomers.filter(customer =>
        `${customer.name} ${customer.mobile} ${customer.alternateNumber ?? ''}`.toLocaleLowerCase('ar').includes(query),
      ));
    }
    const response = await apiClient.get<{ customers: Customer[] }>(`${API}/customers?term=${encodeURIComponent(term)}`);
    return response.customers;
  },

  async customerAddresses(customerId: number): Promise<CustomerAddress[]> {
    if (await isDemo()) return structuredClone(demoCustomers.find(item => item.id === customerId)?.addresses ?? []);
    const response = await apiClient.get<{ addresses: CustomerAddress[] }>(`${API}/customers/${customerId}/addresses`);
    return response.addresses;
  },

  async createCustomer(payload: Omit<Customer, 'id'>): Promise<Customer> {
    if (await isDemo()) return { ...payload, id: Date.now() };
    return apiClient.post(`${API}/customers`, payload);
  },

  async updateCustomer(customerId: number, payload: Partial<Customer>): Promise<Customer> {
    if (await isDemo()) return { ...demoCustomers.find(item => item.id === customerId), ...payload, id: customerId } as Customer;
    return apiClient.put(`${API}/customers/${customerId}`, payload);
  },

  async createAddress(customerId: number, payload: Omit<CustomerAddress, 'id' | 'customerId'>): Promise<CustomerAddress> {
    if (await isDemo()) return { ...payload, id: Date.now(), customerId };
    return apiClient.post(`${API}/customers/${customerId}/addresses`, payload);
  },

  async updateAddress(customerId: number, addressId: number, payload: Partial<CustomerAddress>): Promise<CustomerAddress> {
    if (await isDemo()) return { ...payload, id: addressId, customerId, label: payload.label ?? 'عنوان' };
    return apiClient.put(`${API}/customers/${customerId}/addresses/${addressId}`, payload);
  },

  async pickupWaiters(): Promise<PickupWaiter[]> {
    if (await isDemo()) return structuredClone(demoPickupWaiters);
    const response = await apiClient.get<{ waiters: PickupWaiter[] }>(`${API}/pickup-waiters`);
    return response.waiters;
  },

  async orders(): Promise<OrderSummary[]> {
    if (await isDemo()) return structuredClone(demoOrders);
    const response = await apiClient.get<{ orders: OrderSummary[] }>(`${API}/orders`);
    return response.orders;
  },

  async order(orderId: number): Promise<OrderDetail> {
    if (await isDemo()) return structuredClone(demoOrderDetail(orderId));
    return apiClient.get(`${API}/orders/${orderId}`);
  },

  async createOrder(draft: OrderDraft & { sendToKitchen?: boolean }): Promise<{ id: number; invoiceNo: string; updatedAt: string; printJobs?: number[] }> {
    if (await isDemo()) return { id: Date.now(), invoiceNo: `DEMO-${Date.now().toString().slice(-5)}`, updatedAt: new Date().toISOString() };
    return apiClient.post(`${API}/orders`, draft, { idempotencyKey: draft.idempotencyKey });
  },

  async updateOrder(orderId: number, draft: OrderDraft & { sendToKitchen?: boolean }): Promise<{ id: number; updatedAt: string; printJobs?: number[] }> {
    if (await isDemo()) return { id: orderId, updatedAt: new Date().toISOString() };
    return apiClient.put(`${API}/orders/${orderId}`, draft, { idempotencyKey: draft.idempotencyKey });
  },

  async sendToKitchen(orderId: number, key: string, direct = false): Promise<PrintJobResult> {
    if (await isDemo()) return { jobIds: [Date.now()], jobs: 1 };
    const response = await apiClient.post<{ jobs?: number; job_ids?: number[]; jobs_data?: Array<Record<string, unknown>> }>(`${API}/orders/${orderId}/kot`, { direct }, { idempotencyKey: key });
    return { jobs: Number(response.jobs ?? 0), jobIds: response.job_ids ?? [], jobData: mapPrintJobs(response.jobs_data) };
  },

  async reprintKot(orderId: number, reason: string, key: string, direct = false): Promise<PrintJobResult> {
    if (await isDemo()) return { jobIds: [Date.now()], jobs: 1 };
    const response = await apiClient.post<{ jobs?: number; job_ids?: number[]; jobs_data?: Array<Record<string, unknown>> }>(`${API}/orders/${orderId}/reprint-kot`, { reason, direct, idempotency_key: key }, { idempotencyKey: key });
    return { jobs: Number(response.jobs ?? 0), jobIds: response.job_ids ?? [], jobData: mapPrintJobs(response.jobs_data) };
  },

  async requestPayment(orderId: number, key: string): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/orders/${orderId}/request-payment`, {}, { idempotencyKey: key });
  },

  async changePayment(orderId: number, payload: PaymentChangePayload, key: string): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/orders/${orderId}/change-payment`, payload, { idempotencyKey: key });
  },

  async completeDirectPrint(jobId: number, key: string): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/print-jobs/${jobId}/complete`, {}, { idempotencyKey: key });
  },

  async pay(orderId: number, payload: unknown, key: string): Promise<PrintJobResult> {
    if (await isDemo()) return { jobIds: [Date.now()], jobs: 1 };
    const response = await apiClient.post<{ jobs?: number; job_ids?: number[]; jobs_data?: Array<Record<string, unknown>> }>(`${API}/orders/${orderId}/payments`, payload, { idempotencyKey: key });
    return { jobs: Number(response.jobs ?? 0), jobIds: response.job_ids ?? [], jobData: mapPrintJobs(response.jobs_data) };
  },

  async shift(): Promise<ShiftState> {
    if (await isDemo()) return structuredClone(demoShift);
    return apiClient.get(`${API}/shift`);
  },

  async openShift(openingCash: number): Promise<ShiftState> {
    if (await isDemo()) return { ...demoShift, active: true, openedAt: new Date().toISOString() };
    return apiClient.post(`${API}/shift/open`, { opening_cash: openingCash });
  },

  async closeShift(closingCash: number, terminalBatchNumber = '', notes = ''): Promise<ShiftState> {
    if (await isDemo()) return { ...demoShift, active: false };
    return apiClient.post(`${API}/shift/close`, { closing_cash: closingCash, terminalBatchNumber, notes });
  },

  async deviceSettings(): Promise<unknown> {
    if (await isDemo()) return null;
    const response = await apiClient.get<{ settings: unknown }>(`${API}/device/settings`);
    return response.settings;
  },

  async unlockDeviceSettings(password: string): Promise<{ unlockToken: string; expiresAt: string }> {
    if (await isDemo()) return { unlockToken: 'demo-settings-unlock', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
    return apiClient.post(`${API}/device/settings/unlock`, { password });
  },

  async updateDeviceSettings(settings: unknown, unlockToken = ''): Promise<void> {
    if (await isDemo()) return;
    await apiClient.put(`${API}/device/settings`, { settings, ...(unlockToken ? { unlockToken } : {}) });
  },

  async notifications(cursor?: string): Promise<NotificationSnapshot> {
    if (await isDemo()) return { waiterCalls: [], pickupAssigned: [], tableUpdate: false, cursor: new Date().toISOString() };
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiClient.get(`${API}/notifications${query}`, { timeoutMs: 8000 });
  },

  async acknowledgeTableCall(tableId: number): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/calls/ack`, { table_id: tableId });
  },

  async transferTable(orderId: number, toTableId: number): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/tables/transfer`, { sell_id: orderId, to_table_id: toTableId });
  },

  async mergeTables(fromTableId: number, toTableId: number): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/tables/merge`, { from_table_id: fromTableId, to_table_id: toTableId });
  },

  async splitTable(orderId: number, toTableId: number, lineIds: number[]): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/tables/split`, { sell_id: orderId, to_table_id: toTableId, line_ids: lineIds });
  },

  async printers(): Promise<Printer[]> {
    if (await isDemo()) return [{ id: 1, name: 'طابعة تجريبية', connectionType: 'server', port: 9100, active: true }];
    const response = await apiClient.get<{ printers: Printer[] }>(`${API}/printers`);
    return response.printers;
  },

  async kotRoutes(): Promise<KotRoutingSnapshot> {
    if (await isDemo()) return {
      version: 'demo',
      routes: [{
        id: 1,
        name: 'مسار المطبخ التجريبي',
        orderType: 'all',
        printScope: 'full_order',
        categoryIds: [],
        copies: 1,
        sortOrder: 0,
        printer: { id: 1, name: 'طابعة المطبخ', ipAddress: '', port: 9100, paperWidth: 80 },
      }],
    };
    return apiClient.get(`${API}/printing/kot-routes`);
  },

  async testPrinter(printerId: number): Promise<{ jobId: number; printer: string }> {
    if (await isDemo()) return { jobId: Date.now(), printer: 'طابعة تجريبية' };
    return apiClient.post(`${API}/printers/${printerId}/test`, {}, { idempotencyKey: `printer-test-${printerId}-${Date.now()}` });
  },

  async openCashDrawer(payload: {
    eventUuid: string;
    printerId?: number | null;
    transactionId?: number | null;
    trigger: 'manual' | 'cash_payment' | 'split_cash' | 'test';
    reason?: string;
    direct: boolean;
  }): Promise<{
    eventId: number;
    eventUuid: string;
    jobId?: number | null;
    status: string;
    duplicate?: boolean;
    printer?: { id: number; name: string; ipAddress: string; port: number; pin: 0 | 1; onMs: number; offMs: number };
  }> {
    if (await isDemo()) return { eventId: Date.now(), eventUuid: payload.eventUuid, status: payload.direct ? 'authorized' : 'queued' };
    return apiClient.post(`${API}/cash-drawer/open`, payload, { idempotencyKey: `drawer-${payload.eventUuid}` });
  },

  async cashDrawerResult(eventUuid: string, status: 'opened' | 'failed' | 'uncertain', error = ''): Promise<void> {
    if (await isDemo()) return;
    await apiClient.post(`${API}/cash-drawer/events/${encodeURIComponent(eventUuid)}`, { status, ...(error ? { error } : {}) });
  },

  async printBill(orderId: number, copies = 1, reason?: string, operationKey?: string): Promise<PrintJobResult> {
    if (await isDemo()) return { jobIds: [Date.now()], jobs: 1 };
    const key = operationKey ?? `bill-${orderId}-${Date.now()}`;
    return apiClient.post(`${API}/orders/${orderId}/bill`, { copies, ...(reason ? { reason, idempotency_key: key } : {}) }, { idempotencyKey: key });
  },
};
