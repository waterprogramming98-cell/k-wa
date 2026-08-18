<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useConnectivityStore } from '@/app/stores/connectivity';
import { useOrderStore, lineTotal } from '@/app/stores/order';
import { waiterApi } from '@/app/services/waiter-api';
import { cacheOrderForPrinting, printOrderBill } from '@/app/services/printing';
import { useSettingsStore } from '@/app/stores/settings';
import { useAuthStore } from '@/app/stores/auth';
import { useSyncStore } from '@/app/stores/sync';
import { operationKeys } from '@/app/services/operation-keys';
import { ApiError } from '@/app/services/api-client';
import { money } from '@/shared/format';
import type { OrderDetail, OrderType, PaymentMethod, ShiftState } from '@/shared/domain';
import { enabledPaymentOptions, isOfflinePaymentMethod, paymentMethodIcon, paymentMethodLabel, shiftPaymentOptions } from '@/shared/payment-methods';
import { markReceiptPaid } from '@/app/services/receipt';
import { directPrintQueue, isDirectPrintingMode, requestCashDrawerOpen } from '@/app/services/direct-printing';
import AppIcon from '@/components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const connectivity = useConnectivityStore();
const settings = useSettingsStore();
const auth = useAuthStore();
const sync = useSyncStore();
const orderStore = useOrderStore();
const orderId = Number(route.params.id);
const total = ref(Number(route.query.total || 0));
const shift = ref<ShiftState | null>(null);
const method = ref<PaymentMethod>('cash');
const split = ref(false);
const allocations = reactive<Record<string, number>>({});
const methodSearch = ref('');
const received = ref(total.value);
const busy = ref(false);
const error = ref('');
const done = ref(false);
const pendingSync = ref(false);
const printBusy = ref(false);
const printMessage = ref('');
const orderDetail = ref<OrderDetail | null>(null);
const partialItems = ref(false);
const selectedLineIds = ref<number[]>([]);
const discountType = ref<'none' | 'pct' | 'fixed'>('none');
const discountAmount = ref(0);
const paymentKey = ref('');
const sourceDraft = typeof route.query.sourceDraft === 'string' ? route.query.sourceDraft : '';
const sourceType = (typeof route.query.sourceType === 'string' ? route.query.sourceType : 'delivery') as OrderType;
const sendKotAfterPayment = route.query.sendKot === '1';

async function clearSourceCart(): Promise<void> {
  const activeMatchesOrder = orderStore.draft.serverId === orderId;
  const localId = sourceDraft || (activeMatchesOrder ? orderStore.draft.localId : '');
  if (!localId) return;
  await orderStore.completePaidDraft(localId, orderId, sourceDraft ? sourceType : orderStore.draft.type);
}

const allOptions = computed(() => enabledPaymentOptions(shiftPaymentOptions(shift.value, settings.settings), settings.settings));
const onlineOptions = computed(() => connectivity.online ? allOptions.value : allOptions.value.filter(option => isOfflinePaymentMethod(option.id)));
const visibleOptions = computed(() => {
  const query = methodSearch.value.trim().toLocaleLowerCase('ar');
  return query ? onlineOptions.value.filter(option => option.label.toLocaleLowerCase('ar').includes(query)) : onlineOptions.value;
});
const canSplit = computed(() => connectivity.online && Boolean(shift.value?.allowSplitPayment) && settings.settings.payment.allowSplit && onlineOptions.value.length > 1);
const selectedLinesTotal = computed(() => (orderDetail.value?.lines ?? [])
  .filter(line => line.serverId && selectedLineIds.value.includes(line.serverId))
  .reduce((sum, line) => sum + lineTotal(line), 0));
const baseTotal = computed(() => partialItems.value ? selectedLinesTotal.value : total.value);
const payableTotal = computed(() => discountType.value === 'pct'
  ? Math.max(0, baseTotal.value * (1 - Math.min(100, Math.max(0, discountAmount.value)) / 100))
  : discountType.value === 'fixed' ? Math.max(0, baseTotal.value - Math.max(0, discountAmount.value)) : baseTotal.value);
const allocated = computed(() => onlineOptions.value.reduce((sum, option) => sum + Number(allocations[option.id] || 0), 0));
const change = computed(() => method.value === 'cash' && !split.value ? Math.max(0, received.value - payableTotal.value) : 0);
const selectedLabel = computed(() => split.value ? 'دفع مقسّم' : paymentMethodLabel(method.value, allOptions.value));
const receiptContext = () => ({
  ...(auth.business?.name ? { businessName: auth.business.name } : {}),
  ...(auth.location?.name ? { locationName: auth.location.name } : {}),
});

watch(payableTotal, value => { if (!split.value) received.value = value; });
watch(onlineOptions, options => {
  for (const option of options) if (allocations[option.id] === undefined) allocations[option.id] = 0;
  if (!options.some(option => option.id === method.value)) method.value = options[0]?.id ?? '';
}, { immediate: true });
watch(canSplit, value => { if (!value) split.value = false; });

onMounted(async () => {
  paymentKey.value = await operationKeys.get('payment', orderId);
  const [loadedShift, detail] = await Promise.all([
    waiterApi.shift().catch(() => null),
    waiterApi.order(orderId).catch(() => null),
  ]);
  shift.value = loadedShift;
  if (loadedShift?.paymentMethodOptions?.length) settings.settings.payment.knownMethods = loadedShift.paymentMethodOptions;
  if (detail) {
    orderDetail.value = detail;
    await cacheOrderForPrinting(detail, receiptContext());
    total.value = detail.total;
    received.value = detail.total;
    if (detail.paymentStatus === 'paid') error.value = 'هذا الطلب مدفوع بالفعل.';
  }
});

async function pay(): Promise<void> {
  error.value = '';
  if (!onlineOptions.value.length) { error.value = 'لا توجد طريقة دفع مفعلة لهذا التابلت.'; return; }
  if (connectivity.online && !shift.value?.active) { error.value = 'افتح الوردية أولًا قبل التحصيل.'; return; }
  if (!connectivity.online && !settings.settings.sync.offlinePayments) { error.value = 'تسجيل الدفع أوفلاين متوقف من إعدادات التابلت.'; return; }
  if (partialItems.value && !selectedLineIds.value.length) { error.value = 'اختر صنفًا واحدًا على الأقل للدفع.'; return; }
  const paymentParts = onlineOptions.value.map(option => ({ method: option.id, amount: Number(allocations[option.id] || 0) })).filter(part => part.amount > 0);
  if (split.value && (paymentParts.length < 2 || Math.abs(allocated.value - payableTotal.value) > 0.0005)) { error.value = 'وزّع المبلغ كاملًا على طريقتين على الأقل.'; return; }
  if (!split.value && method.value === 'cash' && received.value < payableTotal.value) { error.value = 'المبلغ المستلم أقل من إجمالي الفاتورة.'; return; }
  if (!paymentKey.value) paymentKey.value = await operationKeys.get('payment', orderId);
  busy.value = true;
  let paymentCommitted = false;
  try {
    const paymentPayload = {
      ...(split.value ? { payments: paymentParts } : { payment_method: method.value, amount: payableTotal.value, received: received.value }),
      ...(discountType.value !== 'none' && discountAmount.value > 0 ? { discount_type: discountType.value, discount_amount: discountAmount.value } : {}),
      ...(partialItems.value ? { is_partial: true, line_ids: selectedLineIds.value } : {}),
      receipt_only: true,
      direct: isDirectPrintingMode(settings.settings.printing.mode),
      send_kot: !partialItems.value && sendKotAfterPayment && settings.settings.printing.enabled && auth.permissions.can_print,
      suppress_print: !settings.settings.printing.enabled || settings.settings.printing.mode === 'airprint',
      ...(!connectivity.online ? { offlineRecordedAt: new Date().toISOString() } : {}),
    };
    if (!connectivity.online) {
      await sync.enqueuePayment({ localOrderId: sourceDraft || `server-order-${orderId}`, orderId, payment: paymentPayload, method: method.value });
      pendingSync.value = true;
      paymentCommitted = true;
    } else {
      const paymentPrintJobs = await waiterApi.pay(orderId, paymentPayload, paymentKey.value);
      paymentCommitted = true;
      if (isDirectPrintingMode(settings.settings.printing.mode) && paymentPrintJobs.jobData?.length) {
        await directPrintQueue.enqueueServerJobs(paymentPrintJobs.jobData);
      }
      await operationKeys.complete('payment', orderId);
    }
    const includesCash = split.value
      ? paymentParts.some(part => part.method === 'cash' && part.amount > 0)
      : method.value === 'cash';
    if (includesCash && settings.settings.printing.cashDrawerEnabled && settings.settings.printing.cashDrawerAutoOpenCash) {
      await requestCashDrawerOpen(settings.settings, {
        trigger: split.value ? 'split_cash' : 'cash_payment',
        transactionId: orderId,
      });
    }
    done.value = true;
    if (!partialItems.value) {
      await markReceiptPaid(orderId, selectedLabel.value);
      await clearSourceCart();
    }
    if (orderDetail.value) {
      orderDetail.value = { ...orderDetail.value, paymentStatus: partialItems.value ? 'partial' : 'paid', paymentMethod: selectedLabel.value };
      await cacheOrderForPrinting(orderDetail.value, receiptContext());
    }
    if (!partialItems.value && settings.settings.printing.enabled && settings.settings.printing.mode === 'airprint' && settings.settings.printing.autoPrintAfterPayment) {
      await printBill(`auto-payment-${orderId}`);
    }
  } catch (reason) {
    if (paymentCommitted) {
      done.value = true;
      if (!partialItems.value) await clearSourceCart().catch(() => undefined);
      printMessage.value = reason instanceof Error
        ? `تم تسجيل الدفع وتفريغ السلة، لكن الطباعة أو حفظ الإيصال يحتاج مراجعة: ${reason.message}`
        : 'تم تسجيل الدفع وتفريغ السلة، لكن الطباعة أو حفظ الإيصال يحتاج مراجعة';
      return;
    }
    if (reason instanceof ApiError && reason.status >= 400 && reason.status !== 409) await operationKeys.complete('payment', orderId);
    error.value = reason instanceof Error ? reason.message : 'تعذر إتمام الدفع';
  } finally { busy.value = false; }
}

async function printBill(automaticJobId?: string): Promise<void> {
  if (printBusy.value) return;
  printBusy.value = true; printMessage.value = '';
  try {
    const result = await printOrderBill(orderId, settings.settings, receiptContext(), automaticJobId);
    printMessage.value = result.queued ? 'الطابعة غير متاحة؛ الفاتورة محفوظة في طابور الطباعة' : result.local ? 'تمت طباعة الفاتورة مباشرة' : 'تم إرسال الفاتورة للطباعة';
  } catch (reason) { printMessage.value = reason instanceof Error ? reason.message : 'تعذرت الطباعة'; }
  finally { printBusy.value = false; }
}
</script>

<template>
  <div class="page payment-page">
    <section v-if="done" class="card payment-success">
      <AppIcon name="check" :size="52" /><h1>{{ pendingSync ? 'تم تسجيل الدفع أوفلاين' : 'تم الدفع بنجاح' }}</h1>
      <p>{{ pendingSync ? 'التحصيل محفوظ على التابلت وسيُرحّل مرة واحدة عند عودة الاتصال' : `تم تسجيل التحصيل للطلب #${orderId}` }}</p>
      <div class="row"><button class="btn btn-secondary" :disabled="printBusy" @click="printBill()">{{ printBusy ? 'جاري الطباعة…' : 'طباعة الفاتورة' }}</button><button class="btn btn-primary" @click="router.replace(sourceDraft ? '/pos' : '/orders')">{{ sourceDraft ? 'طلب جديد' : 'العودة للطلبات' }}</button></div>
      <p v-if="printMessage" class="muted">{{ printMessage }}</p>
    </section>
    <template v-else>
      <div class="page-head"><div><h1>تحصيل الطلب #{{ orderId }}</h1><p>اختر طريقة الدفع وراجع الإجمالي قبل التأكيد</p></div><button class="btn btn-secondary" @click="router.back()">رجوع</button></div>
      <div class="payment-layout">
        <section class="card stack">
          <div class="payment-total"><span>إجمالي الفاتورة</span><strong>{{ money(total) }}</strong></div>
          <label v-if="orderDetail?.lines.some(line => line.serverId)" class="switch-row"><span><strong>دفع أصناف محددة</strong><small class="muted">إنشاء دفعة جزئية للأصناف المختارة</small></span><input v-model="partialItems" class="switch" type="checkbox" :disabled="!connectivity.online" /></label>
          <div v-if="partialItems" class="stack"><label v-for="line in orderDetail?.lines.filter(item => item.serverId)" :key="line.localId" class="switch-row"><span><strong>{{ line.quantity }} × {{ line.name }}</strong><small>{{ money(lineTotal(line)) }}</small></span><input v-if="line.serverId" v-model="selectedLineIds" type="checkbox" :value="line.serverId" /></label></div>
          <div v-if="auth.permissions.can_discount && orderDetail?.type !== 'pickup' && !partialItems" class="form-grid"><label class="field"><span>نوع الخصم</span><select v-model="discountType"><option value="none">بدون خصم</option><option value="pct">نسبة مئوية</option><option value="fixed">قيمة ثابتة</option></select></label><label v-if="discountType !== 'none'" class="field"><span>قيمة الخصم</span><input v-model.number="discountAmount" type="number" min="0" :max="discountType === 'pct' ? 100 : total" step="0.001" /></label></div>
          <div v-if="payableTotal !== total" class="change-box"><span>المطلوب تحصيله</span><strong>{{ money(payableTotal) }}</strong></div>
          <label v-if="canSplit" class="switch-row"><span><strong>تقسيم الدفع</strong><small class="muted">استخدم أي طريقتين أو أكثر من الطرق المفعلة</small></span><input v-model="split" class="switch" type="checkbox" /></label>
          <template v-if="!split">
            <label v-if="onlineOptions.length > 8" class="catalog-search"><AppIcon name="search" :size="20" /><input v-model="methodSearch" placeholder="ابحث عن طريقة دفع…" /></label>
            <div class="payment-methods payment-methods-dynamic"><button v-for="item in visibleOptions" :key="item.id" class="payment-method" :class="{ active: method === item.id }" @click="method = item.id"><AppIcon :name="paymentMethodIcon(item.id)" :size="25" /><strong>{{ item.label }}</strong><i>{{ method === item.id ? '✓' : '' }}</i></button></div>
            <label v-if="method === 'cash'" class="field"><span>المبلغ المستلم</span><input v-model.number="received" type="number" min="0" step="0.001" inputmode="decimal" /></label>
            <div v-if="method === 'cash'" class="change-box"><span>الباقي للعميل</span><strong>{{ money(change) }}</strong></div>
          </template>
          <template v-else>
            <div class="payment-allocation-grid"><label v-for="item in onlineOptions" :key="item.id" class="field"><span><AppIcon :name="paymentMethodIcon(item.id)" :size="17" /> {{ item.label }}</span><input v-model.number="allocations[item.id]" type="number" min="0" step="0.001" /></label></div>
            <div class="change-box" :class="{ invalid: Math.abs(allocated-payableTotal) > .0005 }"><span>الموزع</span><strong>{{ money(allocated) }} / {{ money(payableTotal) }}</strong></div>
          </template>
          <p v-if="!connectivity.online" class="managed-note">أوفلاين — المتاح فقط تسجيل نقدي أو كي نت محليًا، وسيُرحّل عند عودة الاتصال.</p><p v-if="error" class="error-text">{{ error }}</p>
          <button class="btn btn-primary btn-block" :disabled="busy || !onlineOptions.length || (connectivity.online && !paymentKey)" @click="pay">{{ busy ? 'جاري التحصيل…' : !connectivity.online ? `تسجيل ${selectedLabel} أوفلاين` : `تأكيد دفع ${money(payableTotal)}` }}</button>
        </section>
        <aside class="card payment-summary"><h2>مراجعة سريعة</h2><div><span>رقم الطلب</span><strong>#{{ orderId }}</strong></div><div><span>الطريقة</span><strong>{{ selectedLabel }}</strong></div><div><span>حالة الوردية</span><strong :class="shift?.active ? 'success-text' : 'error-text'">{{ shift?.active ? 'مفتوحة' : 'مغلقة' }}</strong></div><p>السلة الأصلية تُفرغ فقط بعد نجاح الدفع الكامل. الدفع الجزئي أو الفشل لا يحذفان المسودة.</p></aside>
      </div>
    </template>
  </div>
</template>
