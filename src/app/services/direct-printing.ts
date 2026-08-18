import { Capacitor, registerPlugin } from '@capacitor/core';
import { appPreferences } from '@/app/services/preferences';
import { localDatabase } from '@/app/services/local-database';
import { receiptFromDraft, renderReceiptRaster } from '@/app/services/receipt';
import type { DeviceSettings, KotRoutingSnapshot, LocalPrintJob, PrintJobResult, ReceiptSnapshot, SyncOperation } from '@/shared/domain';
import type { OrderDraft, OrderType, ServerPrintJob } from '@/shared/domain';
import { belongsToActiveScope, getActiveDataScope, scopedKey } from '@/app/services/data-scope';
import { waiterApi } from '@/app/services/waiter-api';
import { getUiLanguage } from '@/app/services/localization';
import { selectedDrawerPrinter, selectedReceiptPrinter } from '@/app/services/printer-directory';
import { createId } from '@/shared/ids';

interface DirectPrintPlugin {
  printRaster(options: {
    host: string;
    port: number;
    timeout: number;
    paperWidth: 58 | 80;
    copies: number;
    cutPaper: boolean;
    beepEnabled?: boolean;
    beepMode?: 'bel' | 'esc-b';
    beepCount?: number;
    beepDuration?: number;
    imageBase64: string;
  }): Promise<{ bytes: number }>;
  testConnection(options: { host: string; port: number; timeout: number }): Promise<{ success: boolean; error?: string }>;
  requestBluetoothPermissions(): Promise<{ granted: boolean }>;
  btGetPaired(): Promise<{ devices: Array<{ address: string; name: string }> }>;
  btPrintRaster(options: {
    address: string;
    paperWidth: 58 | 80;
    copies: number;
    cutPaper: boolean;
    beepEnabled?: boolean;
    beepMode?: 'bel' | 'esc-b';
    beepCount?: number;
    beepDuration?: number;
    imageBase64: string;
  }): Promise<{ bytes: number }>;
  btTestConnection(options: { address: string }): Promise<{ success: boolean; error?: string }>;
  openCashDrawer(options: { host: string; port: number; timeout: number; pin: 0 | 1; onMs: number; offMs: number }): Promise<{ bytes: number }>;
  btOpenCashDrawer(options: { address: string; pin: 0 | 1; onMs: number; offMs: number }): Promise<{ bytes: number }>;
}

const androidPrinter = registerPlugin<DirectPrintPlugin>('KemetDirectPrint');
const iosPrinter = registerPlugin<DirectPrintPlugin>('KemetAirPrint');
const MAX_ATTEMPTS_BEFORE_SLOW_RETRY = 6;
const COMPLETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function plugin(): DirectPrintPlugin {
  if (!Capacitor.isNativePlatform()) throw new Error('الطباعة المباشرة متاحة داخل تطبيق التابلت المثبت فقط');
  return Capacitor.getPlatform() === 'ios' ? iosPrinter : androidPrinter;
}

export function validateDirectPrinter(settings: DeviceSettings['printing']): void {
  if (settings.mode === 'bluetooth') {
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(settings.bluetoothAddress.trim())) throw new Error('اختر طابعة Bluetooth مقترنة أولًا');
    return;
  }
  const host = settings.directHost.trim();
  if (!host) throw new Error('أدخل IP الطابعة، مثال 192.168.1.50');
  if (host.length > 253 || !/^[a-zA-Z0-9.:-]+$/.test(host)) throw new Error('عنوان الطابعة غير صالح');
  if (!Number.isInteger(settings.directPort) || settings.directPort < 1 || settings.directPort > 65535) throw new Error('منفذ الطابعة غير صالح');
}

function friendlyError(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason || '');
  if (/not local|PRINTER_NOT_LOCAL/i.test(message)) return 'يجب أن يكون IP الطابعة داخل نفس الشبكة المحلية';
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return 'انتهت مهلة الاتصال بالطابعة؛ راجع IP والشبكة';
  if (/refused|ECONNREFUSED/i.test(message)) return 'الطابعة رفضت الاتصال؛ راجع المنفذ وغالبًا يكون 9100';
  if (/unreachable|ENETUNREACH|EHOSTUNREACH/i.test(message)) return 'الطابعة غير متاحة على الشبكة المحلية';
  if (/only available|unimplemented|not implemented/i.test(message)) return 'الطباعة المباشرة غير متاحة على هذا الجهاز';
  return message || 'فشل الاتصال بالطابعة المباشرة';
}

async function nativePrint(receipt: ReceiptSnapshot, settings: DeviceSettings['printing'], copies: number, target?: Pick<LocalPrintJob, 'printerHost' | 'printerPort' | 'paperWidth'>): Promise<void> {
  const printTarget = target as (Pick<LocalPrintJob, 'printerHost' | 'printerPort' | 'paperWidth' | 'printerMode' | 'bluetoothAddress' | 'buzzer'> | undefined);
  const effective = {
    ...settings,
    mode: printTarget?.printerMode || settings.mode,
    directHost: printTarget?.printerHost || settings.directHost,
    directPort: printTarget?.printerPort || settings.directPort,
    paperWidth: printTarget?.paperWidth || settings.paperWidth,
    bluetoothAddress: printTarget?.bluetoothAddress || settings.bluetoothAddress,
  };
  validateDirectPrinter(effective);
  const imageBase64 = renderReceiptRaster(receipt, effective.paperWidth);
  if (effective.mode === 'bluetooth') {
    if (Capacitor.getPlatform() !== 'android') throw new Error('Bluetooth المباشر متاح على Android فقط؛ استخدم AirPrint أو TCP على iPad');
    await androidPrinter.btPrintRaster({
      address: effective.bluetoothAddress,
      paperWidth: effective.paperWidth,
      copies,
      cutPaper: settings.cutPaper,
      beepEnabled: printTarget?.buzzer?.enabled ?? false,
      beepMode: printTarget?.buzzer?.mode ?? 'bel',
      beepCount: printTarget?.buzzer?.count ?? 1,
      beepDuration: printTarget?.buzzer?.duration ?? 2,
      imageBase64,
    });
    return;
  }
  await plugin().printRaster({
    host: effective.directHost.trim(),
    port: effective.directPort,
    timeout: settings.connectionTimeoutMs,
    paperWidth: effective.paperWidth,
    copies,
    cutPaper: settings.cutPaper,
    beepEnabled: printTarget?.buzzer?.enabled ?? false,
    beepMode: printTarget?.buzzer?.mode ?? 'bel',
    beepCount: printTarget?.buzzer?.count ?? 1,
    beepDuration: printTarget?.buzzer?.duration ?? 2,
    imageBase64,
  });
}

async function saveJob(job: LocalPrintJob): Promise<void> {
  await localDatabase.put('printJobs', job.id, job);
  window.dispatchEvent(new CustomEvent('kwaiter:print-queue-changed'));
}

let flushing = false;
let started = false;
let timer: number | null = null;

async function runJob(job: LocalPrintJob, settings: DeviceSettings, force = false): Promise<PrintJobResult> {
  if (job.status === 'uncertain' && !force) return { jobIds: [], jobs: 1, local: true, queued: true, localJobId: job.id };
  if (!force && job.nextAttemptAt > Date.now()) return { jobIds: [], jobs: 1, local: true, queued: true, localJobId: job.id };
  const { lastError: _lastError, ...jobWithoutError } = job;
  const printing: LocalPrintJob = { ...jobWithoutError, status: 'printing', nextAttemptAt: Date.now() + 30_000 };
  await saveJob(printing);
  try {
    await nativePrint(job.receipt, settings.printing, job.copies, job);
    const completed = { ...printing, status: 'completed' as const, completedAt: Date.now(), nextAttemptAt: 0, serverAckPending: Boolean(job.serverJobId) };
    await saveJob(completed);
    if (job.serverJobId) {
      try {
        await waiterApi.completeDirectPrint(job.serverJobId, `direct-print-complete-${job.serverJobId}`);
        await saveJob({ ...completed, serverAckPending: false });
      } catch { /* Paper is already printed; acknowledge on the next flush without printing again. */ }
    }
    return { jobIds: [], jobs: 1, local: true, queued: false, localJobId: job.id };
  } catch (reason) {
    const attempts = job.attempts + 1;
    const delay = attempts >= MAX_ATTEMPTS_BEFORE_SLOW_RETRY
      ? 5 * 60_000
      : Math.min(120_000, 2 ** attempts * 1000);
    await saveJob({
      ...printing,
      status: 'failed',
      attempts,
      nextAttemptAt: Date.now() + delay,
      lastError: friendlyError(reason),
    });
    return { jobIds: [], jobs: 1, local: true, queued: true, localJobId: job.id };
  }
}

export const directPrintQueue = {
  async enqueue(receipt: ReceiptSnapshot, jobId: string, copies: 1 | 2 | 3, force = false): Promise<PrintJobResult> {
    const storageId = scopedKey(jobId);
    const existing = await localDatabase.get<LocalPrintJob>('printJobs', storageId);
    if (existing?.status === 'completed') return { jobIds: [], jobs: 1, local: true, queued: false, localJobId: storageId };
    if (existing?.status === 'uncertain' && !force) return { jobIds: [], jobs: 1, local: true, queued: true, localJobId: storageId };
    const settings = await appPreferences.getDeviceSettings();
    const configuredPrinter = await selectedReceiptPrinter(settings.printing.receiptPrinterId);
    const job: LocalPrintJob = existing ?? {
      scope: getActiveDataScope(),
      id: storageId,
      receipt,
      copies,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      printerMode: settings.printing.mode === 'bluetooth' ? 'bluetooth' : 'tcp',
      ...(settings.printing.mode === 'bluetooth'
        ? { bluetoothAddress: settings.printing.bluetoothAddress }
        : { printerHost: configuredPrinter?.ipAddress || settings.printing.directHost, printerPort: configuredPrinter?.port || settings.printing.directPort }),
      paperWidth: configuredPrinter?.paperWidth || settings.printing.paperWidth,
      ...(configuredPrinter ? { printerId: configuredPrinter.id, printerName: configuredPrinter.name, ...(configuredPrinter.buzzer ? { buzzer: configuredPrinter.buzzer } : {}) } : {}),
    };
    if (!existing) await saveJob(job);
    return runJob({ ...job, receipt, copies }, settings, force);
  },

  async enqueueTargeted(
    receipt: ReceiptSnapshot,
    jobId: string,
    copies: 1 | 2 | 3,
    target: { printerHost: string; printerPort: number; paperWidth: 58 | 80; printerId?: number; printerName?: string; buzzer?: LocalPrintJob['buzzer'] },
  ): Promise<PrintJobResult> {
    const storageId = scopedKey(jobId);
    const existing = await localDatabase.get<LocalPrintJob>('printJobs', storageId);
    if (existing?.status === 'completed') return { jobIds: [], jobs: 1, local: true, queued: false, localJobId: storageId };
    const settings = await appPreferences.getDeviceSettings();
    const job: LocalPrintJob = existing ?? {
      scope: getActiveDataScope(), id: storageId, receipt, copies, status: 'pending', attempts: 0,
      nextAttemptAt: Date.now(), createdAt: Date.now(), printerMode: 'tcp',
      printerHost: target.printerHost, printerPort: target.printerPort, paperWidth: target.paperWidth,
      ...(target.printerId ? { printerId: target.printerId } : {}),
      ...(target.printerName ? { printerName: target.printerName } : {}),
      ...(target.buzzer ? { buzzer: target.buzzer } : {}),
    };
    if (!existing) await saveJob(job);
    return runJob({
      ...job, receipt, copies,
      printerHost: target.printerHost, printerPort: target.printerPort, paperWidth: target.paperWidth,
      ...(target.printerId ? { printerId: target.printerId } : {}),
      ...(target.printerName ? { printerName: target.printerName } : {}),
      ...(target.buzzer ? { buzzer: target.buzzer } : {}),
    }, settings, false);
  },

  async flush(force = false): Promise<void> {
    if (flushing) return;
    flushing = true;
    try {
      const settings = await appPreferences.getDeviceSettings();
      if (!settings.printing.enabled || !isDirectPrintingMode(settings.printing.mode)) return;
      const jobs = (await localDatabase.list<LocalPrintJob>('printJobs')).filter(belongsToActiveScope).sort((a, b) => a.createdAt - b.createdAt);
      for (const job of jobs) {
        if (job.status === 'completed') {
          if (job.serverJobId && job.serverAckPending) {
            try {
              await waiterApi.completeDirectPrint(job.serverJobId, `direct-print-complete-${job.serverJobId}`);
              await saveJob({ ...job, serverAckPending: false });
            } catch { continue; }
          }
          if ((job.completedAt ?? job.createdAt) < Date.now() - COMPLETED_RETENTION_MS) await localDatabase.delete('printJobs', job.id);
          continue;
        }
        if (job.status === 'uncertain') continue;
        if (job.status === 'printing') {
          if (job.nextAttemptAt <= Date.now()) {
            await saveJob({ ...job, status: 'uncertain', lastError: 'قد تكون الفاتورة طُبعت قبل إغلاق التطبيق؛ راجع الورق قبل إعادة الطباعة' });
          }
          continue;
        }
        if (!['pending', 'failed'].includes(job.status)) continue;
        const result = await runJob(job, settings, force);
        if (result.queued && !force) break;
      }
    } finally { flushing = false; }
  },

  async jobs(): Promise<LocalPrintJob[]> {
    return (await localDatabase.list<LocalPrintJob>('printJobs')).filter(belongsToActiveScope).sort((a, b) => b.createdAt - a.createdAt);
  },

  async retry(jobId: string): Promise<void> {
    const job = await localDatabase.get<LocalPrintJob>('printJobs', jobId);
    if (!job) return;
    await saveJob({ ...job, status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
    await this.flush(true);
  },

  async completed(jobIds: string[]): Promise<boolean> {
    if (!jobIds.length) return false;
    const jobs = await Promise.all(jobIds.map(id => localDatabase.get<LocalPrintJob>('printJobs', id)));
    return jobs.every(job => job?.status === 'completed');
  },

  async discard(jobIds: string[]): Promise<void> {
    for (const id of jobIds) await localDatabase.delete('printJobs', id);
    if (jobIds.length) window.dispatchEvent(new CustomEvent('kwaiter:print-queue-changed'));
  },

  async enqueueServerJobs(serverJobs: ServerPrintJob[]): Promise<PrintJobResult[]> {
    const results: PrintJobResult[] = [];
    const settings = await appPreferences.getDeviceSettings();
    for (const source of serverJobs) {
      if (settings.printing.mode === 'tcp' && !source.printerIp) continue;
      const orderType = ['dine_in', 'takeaway', 'delivery', 'pickup'].includes(source.payload.order_type || '') ? source.payload.order_type as OrderType : 'takeaway';
      const contentLines = source.payload.lines ?? [];
      const items = contentLines.filter(line => line.type === 'item').map((line, index) => ({
        name: line.name || line.text || `صنف ${index + 1}`,
        quantity: Number(line.qty || 1), unitPrice: 0, total: 0, choices: [], ...(line.note ? { note: line.note } : {}),
      }));
      const headers = contentLines.filter(line => line.type !== 'item' && line.type !== 'divider' && line.type !== 'cut' && line.text).map(line => String(line.text));
      const receipt: ReceiptSnapshot = {
        scope: getActiveDataScope(), key: scopedKey(`server-print:${source.id}`), ...(Number(source.payload.invoice_no) ? { orderId: Number(source.payload.invoice_no) } : {}),
        invoiceNo: source.payload.invoice_no || `#${source.id}`, businessName: `KOT${source.printerName ? ` — ${source.printerName}` : ''}`,
        language: settings.language,
        orderType, ...(source.payload.table ? { tableName: source.payload.table } : {}), paymentStatus: 'due', total: 0,
        createdAt: new Date().toISOString(), temporary: false, documentType: 'kot',
        lines: items.length ? items : headers.map(text => ({ name: text, quantity: 1, unitPrice: 0, total: 0, choices: [] })),
      };
      if (headers.length && receipt.lines.length) receipt.lines[0]!.choices = headers;
      const storageId = scopedKey(`server-print-${source.id}`);
      const existing = await localDatabase.get<LocalPrintJob>('printJobs', storageId);
      if (existing?.status === 'completed') {
        results.push({ jobIds: [source.id], jobs: 1, local: true, queued: false, localJobId: existing.id });
        continue;
      }
      const job: LocalPrintJob = existing ?? {
        scope: getActiveDataScope(), id: storageId, receipt, copies: source.copies, status: 'pending', attempts: 0,
        nextAttemptAt: Date.now(), createdAt: Date.now(), serverJobId: source.id, printerHost: source.printerIp,
        printerPort: source.printerPort, paperWidth: source.paperWidth,
        printerName: source.printerName,
        ...(source.buzzer ? { buzzer: source.buzzer } : {}),
        printerMode: settings.printing.mode === 'bluetooth' ? 'bluetooth' : 'tcp',
        ...(settings.printing.mode === 'bluetooth' ? { bluetoothAddress: settings.printing.bluetoothAddress } : {}),
      };
      if (!existing) await saveJob(job);
      results.push(await runJob(job, settings, false));
    }
    return results;
  },

  async enqueueDraftKot(draft: OrderDraft): Promise<PrintJobResult> {
    const receipt = receiptFromDraft(draft, { temporary: true });
    receipt.documentType = 'kot';
    receipt.businessName = receipt.language === 'en' ? 'KOT — Offline' : 'KOT — أوفلاين';
    receipt.total = 0;
    receipt.lines = receipt.lines.map(line => ({ ...line, unitPrice: 0, total: 0 }));
    return this.enqueue(receipt, `offline-kot-${draft.localId}-${draft.revision}`, 1);
  },

  async enqueueRoutedDraftKot(draft: OrderDraft, routing: KotRoutingSnapshot | null): Promise<PrintJobResult[]> {
    const settings = await appPreferences.getDeviceSettings();
    if (settings.printing.mode !== 'tcp' || !routing?.routes.length) return [await this.enqueueDraftKot(draft)];

    const results: PrintJobResult[] = [];
    const routes = routing.routes
      .filter(route => route.orderType === 'all' || route.orderType === draft.type)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    for (const route of routes) {
      if (!route.printer.ipAddress) continue;
      const categoryIds = new Set(route.categoryIds);
      const lines = route.printScope === 'full_order'
        ? draft.lines
        : draft.lines.filter(line => !line.categoryId || categoryIds.has(line.categoryId));
      if (!lines.length || (route.printScope === 'categories' && !categoryIds.size)) continue;
      const routedDraft: OrderDraft = { ...draft, lines };
      const receipt = receiptFromDraft(routedDraft, { temporary: true });
      receipt.documentType = 'kot';
      receipt.businessName = `KOT — ${route.printer.name}`;
      receipt.total = 0;
      receipt.lines = receipt.lines.map(line => ({ ...line, unitPrice: 0, total: 0 }));
      results.push(await this.enqueueTargeted(
        receipt,
        `offline-kot-${draft.localId}-${draft.revision}-route-${route.id}`,
        route.copies,
        { printerHost: route.printer.ipAddress, printerPort: route.printer.port, paperWidth: route.printer.paperWidth, printerId: route.printer.id, printerName: route.printer.name, ...(route.printer.buzzer ? { buzzer: route.printer.buzzer } : {}) },
      ));
    }
    return results.length ? results : [await this.enqueueDraftKot(draft)];
  },

  start(): void {
    if (started) return;
    started = true;
    void this.flush();
    timer = window.setInterval(() => { void this.flush(); }, 15_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.flush();
    });
  },

  stop(): void {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    started = false;
  },
};

export async function checkDirectPrinterConnection(settings: DeviceSettings['printing']): Promise<void> {
  validateDirectPrinter(settings);
  if (settings.mode === 'bluetooth') {
    if (Capacitor.getPlatform() !== 'android') throw new Error('Bluetooth المباشر متاح على Android فقط');
    const permission = await androidPrinter.requestBluetoothPermissions();
    if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام أجهزة Bluetooth');
    const result = await androidPrinter.btTestConnection({ address: settings.bluetoothAddress });
    if (!result.success) throw new Error(friendlyError(result.error));
    return;
  }
  const result = await plugin().testConnection({
    host: settings.directHost.trim(),
    port: settings.directPort,
    timeout: settings.connectionTimeoutMs,
  });
  if (!result.success) throw new Error(friendlyError(result.error));
}

export function isDirectPrintingMode(mode: DeviceSettings['printing']['mode']): boolean {
  return mode === 'tcp' || mode === 'bluetooth';
}

export async function pairedBluetoothPrinters(): Promise<Array<{ address: string; name: string }>> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') throw new Error('قائمة Bluetooth متاحة داخل تطبيق Android المثبت فقط');
  const permission = await androidPrinter.requestBluetoothPermissions();
  if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام أجهزة Bluetooth');
  return (await androidPrinter.btGetPaired()).devices;
}

export async function testDirectPrinter(settings: DeviceSettings['printing']): Promise<void> {
  await checkDirectPrinterConnection(settings);
  const now = new Date().toISOString();
  const receipt: ReceiptSnapshot = {
    scope: getActiveDataScope(),
    key: `printer-test:${Date.now()}`,
    invoiceNo: 'TEST',
    businessName: 'K-Waiter 3',
    language: getUiLanguage(),
    orderType: 'takeaway',
    paymentStatus: 'paid',
    total: 0,
    createdAt: now,
    temporary: false,
    lines: [{ name: getUiLanguage() === 'en' ? 'Direct Print Test' : 'اختبار الطباعة المباشرة', quantity: 1, unitPrice: 0, total: 0, choices: [getUiLanguage() === 'en' ? 'Connection Successful' : 'الاتصال ناجح'] }],
  };
  const configured = await selectedReceiptPrinter(settings.receiptPrinterId);
  await nativePrint(receipt, settings, 1, configured ? {
    printerHost: configured.ipAddress || settings.directHost,
    printerPort: configured.port || settings.directPort,
    paperWidth: configured.paperWidth || settings.paperWidth,
    ...(configured.buzzer ? { buzzer: configured.buzzer } : {}),
  } as Pick<LocalPrintJob, 'printerHost' | 'printerPort' | 'paperWidth'> : undefined);
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
      const value = Math.floor(Math.random() * 16);
      return (token === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
}

export async function requestCashDrawerOpen(
  settings: DeviceSettings,
  input: { trigger: 'manual' | 'cash_payment' | 'split_cash' | 'test'; reason?: string; transactionId?: number | null },
): Promise<{ queued: boolean; eventUuid: string }> {
  if (!settings.printing.cashDrawerEnabled) throw new Error('فتح درج النقدية متوقف من إعدادات التابلت');
  const eventUuid = uuid();
  const direct = isDirectPrintingMode(settings.printing.mode);
  const configured = await selectedDrawerPrinter(settings.printing.cashDrawerPrinterId);
  let authorization: Awaited<ReturnType<typeof waiterApi.openCashDrawer>> | null = null;

  if (navigator.onLine) {
    authorization = await waiterApi.openCashDrawer({
      eventUuid,
      printerId: configured?.id ?? settings.printing.cashDrawerPrinterId,
      trigger: input.trigger,
      direct,
      ...(input.transactionId !== undefined ? { transactionId: input.transactionId } : {}),
      ...(input.reason ? { reason: input.reason } : {}),
    });
  } else if (!direct) {
    throw new Error('فتح الدرج عن طريق Print Agent يحتاج اتصالًا بالسيرفر');
  }

  if (!direct) return { queued: true, eventUuid };

  const drawer = authorization?.printer
    ? { pin: authorization.printer.pin, onMs: authorization.printer.onMs, offMs: authorization.printer.offMs }
    : {
        pin: configured?.cashDrawer?.pin ?? 0,
        onMs: configured?.cashDrawer?.onMs ?? 120,
        offMs: configured?.cashDrawer?.offMs ?? 240,
      };
  try {
    if (settings.printing.mode === 'bluetooth') {
      if (Capacitor.getPlatform() !== 'android') throw new Error('فتح الدرج عبر Bluetooth متاح على Android فقط');
      await androidPrinter.btOpenCashDrawer({ address: settings.printing.bluetoothAddress, ...drawer });
    } else {
      const host = authorization?.printer?.ipAddress || configured?.ipAddress || settings.printing.directHost;
      const port = authorization?.printer?.port || configured?.port || settings.printing.directPort;
      if (!host) throw new Error('لم يتم تحديد IP طابعة درج النقدية');
      await plugin().openCashDrawer({ host, port, timeout: settings.printing.connectionTimeoutMs, ...drawer });
    }
    if (authorization) {
      await waiterApi.cashDrawerResult(eventUuid, 'opened').catch(() => undefined);
    } else {
      const operation: SyncOperation = {
        scope: getActiveDataScope(), id: createId('sync'), kind: 'cash_drawer.report', aggregateId: eventUuid,
        idempotencyKey: `cash-drawer:${eventUuid}`, revision: Date.now(),
        payload: {
          eventUuid, printerId: configured?.id ?? settings.printing.cashDrawerPrinterId,
          transactionId: input.transactionId, trigger: input.trigger, reason: input.reason, status: 'opened',
        },
        status: 'pending', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now(),
      };
      await localDatabase.put('syncQueue', operation.id, operation);
    }
    return { queued: false, eventUuid };
  } catch (reason) {
    if (authorization) await waiterApi.cashDrawerResult(eventUuid, 'failed', friendlyError(reason)).catch(() => undefined);
    throw reason;
  }
}
