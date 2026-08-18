import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { localDatabase } from '@/app/services/local-database';
import { waiterApi } from '@/app/services/waiter-api';
import { ApiError } from '@/app/services/api-client';
import { useConnectivityStore } from '@/app/stores/connectivity';
import { useSettingsStore } from '@/app/stores/settings';
import type { OrderDraft, SyncOperation } from '@/shared/domain';
import type { PaymentMethod } from '@/shared/domain';
import { belongsToActiveScope, getActiveDataScope } from '@/app/services/data-scope';
import { createId, createIdempotencyKey } from '@/shared/ids';
import { markReceiptPaid, promoteDraftReceipt } from '@/app/services/receipt';
import { directPrintQueue, isDirectPrintingMode } from '@/app/services/direct-printing';

const MAX_AUTO_ATTEMPTS = 6;

export const useSyncStore = defineStore('sync', () => {
  const connectivity = useConnectivityStore();
  const settings = useSettingsStore();
  const operations = ref<SyncOperation[]>([]);
  const running = ref(false);
  const pendingCount = computed(() => operations.value.filter(item => ['pending', 'failed'].includes(item.status)).length);
  const reviewCount = computed(() => operations.value.filter(item => item.status === 'review').length);
  let timer: number | null = null;
  let stopped = true;

  async function load(): Promise<void> {
    operations.value = (await localDatabase.list<SyncOperation>('syncQueue'))
      .filter(belongsToActiveScope)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async function save(operation: SyncOperation): Promise<void> {
    await localDatabase.put('syncQueue', operation.id, operation);
    const index = operations.value.findIndex(item => item.id === operation.id);
    if (index >= 0) operations.value.splice(index, 1, operation);
    else operations.value.push(operation);
  }

  async function attachServerOrderId(localOrderId: string, orderId: number): Promise<void> {
    const queued = (await localDatabase.list<SyncOperation>('syncQueue')).filter(item =>
      item.aggregateId === localOrderId && item.kind !== 'order.create',
    );
    for (const operation of queued) {
      const payload = operation.payload && typeof operation.payload === 'object'
        ? { ...(operation.payload as Record<string, unknown>), orderId }
        : operation.payload;
      await save({ ...operation, payload });
    }
  }

  async function execute(operation: SyncOperation): Promise<void> {
    const hasLaterOperation = operations.value.some(item =>
      item.aggregateId === operation.aggregateId
      && item.id !== operation.id
      && ['pending', 'failed', 'running'].includes(item.status),
    );
    const nextSyncState: OrderDraft['syncState'] = hasLaterOperation ? 'pending' : 'synced';

    if (operation.kind === 'order.create') {
      const draft = operation.payload as OrderDraft;
      const response = await waiterApi.createOrder(draft);
      const current = await localDatabase.get<OrderDraft>('drafts', draft.localId);
      if (current) await localDatabase.put('drafts', draft.localId, {
        ...current, serverId: response.id, serverUpdatedAt: response.updatedAt, syncState: nextSyncState,
      });
      await attachServerOrderId(draft.localId, response.id);
      await promoteDraftReceipt(draft.localId, response.id, response.invoiceNo);
      window.dispatchEvent(new CustomEvent('kwaiter:order-synced', {
        detail: { localId: draft.localId, serverId: response.id, serverUpdatedAt: response.updatedAt, syncState: nextSyncState },
      }));
      return;
    }
    if (operation.kind === 'order.update') {
      const queuedDraft = operation.payload as OrderDraft;
      const current = await localDatabase.get<OrderDraft>('drafts', queuedDraft.localId);
      const serverId = current?.serverId ?? queuedDraft.serverId;
      // Prefer the timestamp written by the previous queued operation. This keeps
      // our own ordered offline edits from conflicting with one another while the
      // first queued edit still detects a real external server change.
      const serverUpdatedAt = current?.serverUpdatedAt ?? queuedDraft.serverUpdatedAt;
      const draft: OrderDraft = {
        ...queuedDraft,
        ...(serverId === undefined ? {} : { serverId }),
        ...(serverUpdatedAt === undefined ? {} : { serverUpdatedAt }),
        idempotencyKey: operation.idempotencyKey,
      };
      if (!draft.serverId) throw new Error('رقم الطلب غير موجود');
      const response = await waiterApi.updateOrder(draft.serverId, draft);
      const latest = await localDatabase.get<OrderDraft>('drafts', draft.localId);
      if (latest) await localDatabase.put('drafts', draft.localId, { ...latest, serverId: draft.serverId, serverUpdatedAt: response.updatedAt, syncState: nextSyncState });
      window.dispatchEvent(new CustomEvent('kwaiter:order-synced', {
        detail: { localId: draft.localId, serverId: draft.serverId, serverUpdatedAt: response.updatedAt, syncState: nextSyncState },
      }));
      return;
    }
    if (operation.kind === 'order.kot') {
      const payload = operation.payload as { orderId?: number; localOrderId: string; localPrintJobIds?: string[] };
      const draft = await localDatabase.get<OrderDraft>('drafts', payload.localOrderId);
      const orderId = payload.orderId ?? draft?.serverId;
      if (!orderId) throw new Error('ينتظر إرسال الطلب أولًا قبل إرساله للمطبخ');
      const direct = isDirectPrintingMode(settings.settings.printing.mode);
      const result = await waiterApi.sendToKitchen(orderId, operation.idempotencyKey, direct);
      if (direct && result.jobData?.length) {
        const localIds = payload.localPrintJobIds ?? [];
        if (await directPrintQueue.completed(localIds)) {
          for (const job of result.jobData) await waiterApi.completeDirectPrint(job.id, `offline-kot-complete-${job.id}`);
        } else {
          await directPrintQueue.discard(localIds);
          await directPrintQueue.enqueueServerJobs(result.jobData);
        }
      }
      return;
    }
    if (operation.kind === 'payment.create') {
      const payload = operation.payload as {
        orderId?: number;
        localOrderId: string;
        payment: unknown;
        method: PaymentMethod | 'split_payment';
        localPrintJobIds?: string[];
      };
      const draft = await localDatabase.get<OrderDraft>('drafts', payload.localOrderId);
      const orderId = payload.orderId ?? draft?.serverId;
      if (!orderId) throw new Error('ينتظر إنشاء الطلب قبل تسجيل الدفع');
      const result = await waiterApi.pay(orderId, payload.payment, operation.idempotencyKey);
      if (isDirectPrintingMode(settings.settings.printing.mode) && result.jobData?.length) {
        const localIds = payload.localPrintJobIds ?? [];
        if (await directPrintQueue.completed(localIds)) {
          for (const job of result.jobData) await waiterApi.completeDirectPrint(job.id, `offline-bill-complete-${job.id}`);
        } else {
          await directPrintQueue.discard(localIds);
          await directPrintQueue.enqueueServerJobs(result.jobData);
        }
      }
      await markReceiptPaid(orderId, payload.method);
      await localDatabase.delete('drafts', payload.localOrderId);
      window.dispatchEvent(new CustomEvent('kwaiter:payment-synced', { detail: { orderId, localOrderId: payload.localOrderId } }));
      return;
    }
    if (operation.kind === 'print.submit') {
      const payload = operation.payload as { orderId?: number; localOrderId: string; copies?: 1 | 2 | 3 };
      const draft = await localDatabase.get<OrderDraft>('drafts', payload.localOrderId);
      const orderId = payload.orderId ?? draft?.serverId;
      if (!orderId) throw new Error('ينتظر إنشاء الطلب قبل إرسال الفاتورة للطباعة');
      await waiterApi.printBill(orderId, payload.copies ?? 1, undefined, operation.idempotencyKey);
      return;
    }
    if (operation.kind === 'cash_drawer.report') {
      const payload = operation.payload as {
        eventUuid: string; printerId?: number | null; transactionId?: number | null;
        trigger: 'manual' | 'cash_payment' | 'split_cash' | 'test'; reason?: string;
        status: 'opened' | 'failed' | 'uncertain';
      };
      await waiterApi.openCashDrawer({
        eventUuid: payload.eventUuid, trigger: payload.trigger, direct: true,
        ...(payload.printerId !== undefined ? { printerId: payload.printerId } : {}),
        ...(payload.transactionId !== undefined ? { transactionId: payload.transactionId } : {}),
        ...(payload.reason ? { reason: payload.reason } : {}),
      });
      await waiterApi.cashDrawerResult(payload.eventUuid, payload.status);
      return;
    }
    throw new Error(`عملية المزامنة غير مدعومة: ${operation.kind}`);
  }

  async function flush(online = navigator.onLine): Promise<void> {
    if (running.value || !online) return;
    running.value = true;
    await load();
    try {
      for (const operation of operations.value) {
        if (!['pending', 'failed'].includes(operation.status) || operation.nextAttemptAt > Date.now()) continue;
        const runningOperation: SyncOperation = { ...operation, status: 'running' };
        await save(runningOperation);
        try {
          await execute(runningOperation);
          await localDatabase.delete('syncQueue', operation.id);
          operations.value = operations.value.filter(item => item.id !== operation.id);
        } catch (reason) {
          const attempts = operation.attempts + 1;
          const isConflict = reason instanceof ApiError && reason.status === 409;
          const status = isConflict || attempts >= MAX_AUTO_ATTEMPTS ? 'review' : 'failed';
          await save({
            ...operation,
            attempts,
            status,
            nextAttemptAt: Date.now() + Math.min(120_000, 2 ** attempts * 1000),
            lastError: reason instanceof Error ? reason.message : 'تعذر تنفيذ العملية',
          });
          if (status === 'review') continue;
          break;
        }
      }
    } finally {
      running.value = false;
    }
  }

  async function retry(operationId: string): Promise<void> {
    const operation = operations.value.find(item => item.id === operationId);
    if (!operation) return;
    await save({ ...operation, status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
    await flush();
  }

  async function enqueueKot(localOrderId: string, orderId?: number, localPrintJobIds: string[] = [], idempotencyKey?: string): Promise<void> {
    const key = idempotencyKey ?? createIdempotencyKey('order-kot', orderId ?? localOrderId);
    await save({
      scope: getActiveDataScope(), id: createId('sync'), kind: 'order.kot', aggregateId: localOrderId,
      idempotencyKey: key, revision: Date.now(), payload: { localOrderId, ...(orderId ? { orderId } : {}), localPrintJobIds },
      status: 'pending', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now(),
    });
  }

  async function enqueueBill(localOrderId: string, orderId?: number, copies: 1 | 2 | 3 = 1): Promise<void> {
    const key = createIdempotencyKey('order-bill', orderId ?? localOrderId);
    await save({
      scope: getActiveDataScope(), id: createId('sync'), kind: 'print.submit', aggregateId: localOrderId,
      idempotencyKey: key, revision: Date.now(), payload: { localOrderId, ...(orderId ? { orderId } : {}), copies },
      status: 'pending', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now(),
    });
  }

  async function enqueuePayment(input: {
    localOrderId: string;
    orderId?: number;
    payment: unknown;
    method: PaymentMethod | 'split_payment';
    localPrintJobIds?: string[];
  }): Promise<void> {
    if (!settings.settings.sync.offlinePayments) throw new Error('تسجيل الدفع الأوفلاين متوقف من إعدادات التابلت');
    const existing = operations.value.some(item => item.kind === 'payment.create' && item.aggregateId === input.localOrderId);
    if (existing) throw new Error('يوجد دفع محفوظ لهذا الطلب وينتظر المزامنة');
    const key = createIdempotencyKey('offline-payment', input.orderId ?? input.localOrderId);
    await save({
      scope: getActiveDataScope(), id: createId('sync'), kind: 'payment.create', aggregateId: input.localOrderId,
      idempotencyKey: key, revision: Date.now(), payload: input,
      status: 'pending', attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now(),
    });
  }

  async function resolveConflict(operationId: string, resolution: 'server' | 'local'): Promise<void> {
    const operation = operations.value.find(item => item.id === operationId && item.kind === 'order.update');
    if (!operation) return;
    const queued = operation.payload as OrderDraft;
    if (!queued.serverId) return;
    const server = await waiterApi.order(queued.serverId);
    if (resolution === 'server') {
      const current = await localDatabase.get<OrderDraft>('drafts', queued.localId) ?? queued;
      await localDatabase.put('drafts', queued.localId, {
        ...current,
        serverId: server.id,
        type: server.type,
        tableId: server.tableId,
        customerId: server.customerId,
        addressId: server.addressId,
        pickupWaiterId: server.pickupWaiterId,
        ...(server.customer ? { customerSnapshot: server.customer } : {}),
        ...(server.address ? { addressSnapshot: server.address } : {}),
        note: server.note,
        lines: server.lines,
        serverUpdatedAt: server.serverUpdatedAt,
        syncState: 'synced',
        updatedAt: new Date().toISOString(),
      });
      await localDatabase.delete('syncQueue', operation.id);
      operations.value = operations.value.filter(item => item.id !== operation.id);
      window.dispatchEvent(new CustomEvent('kwaiter:order-reloaded', { detail: { localId: queued.localId } }));
      return;
    }
    const nextPayload = { ...queued, serverUpdatedAt: server.serverUpdatedAt, idempotencyKey: createIdempotencyKey('conflict-override', `${queued.serverId}-${Date.now()}`) };
    await save({ ...operation, payload: nextPayload, idempotencyKey: nextPayload.idempotencyKey, status: 'pending', attempts: 0, nextAttemptAt: Date.now() });
    await flush(true);
  }

  function schedule(): void {
    if (stopped) return;
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      if (settings.settings.sync.backgroundSync) await flush(connectivity.online);
      schedule();
    }, settings.settings.sync.intervalSeconds * 1000);
  }

  function start(): void {
    if (!stopped) return;
    stopped = false;
    void load().then(() => flush(connectivity.online));
    schedule();
  }

  function stop(): void {
    stopped = true;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }

  return { operations, running, pendingCount, reviewCount, load, flush, retry, enqueueKot, enqueueBill, enqueuePayment, resolveConflict, start, stop };
});
