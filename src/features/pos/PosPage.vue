<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth';
import { useCatalogStore } from '@/app/stores/catalog';
import { useConnectivityStore } from '@/app/stores/connectivity';
import { useOrderStore } from '@/app/stores/order';
import { useSettingsStore } from '@/app/stores/settings';
import { useSyncStore } from '@/app/stores/sync';
import { effectiveOrderTypes, ORDER_TYPE_LABELS } from '@/app/settings/defaults';
import { waiterApi } from '@/app/services/waiter-api';
import { printDraftReceipt, printOrderBill } from '@/app/services/printing';
import { cacheReceipt, markDraftReceiptPaid, markReceiptPaid, receiptFromDraft } from '@/app/services/receipt';
import { createIdempotencyKey } from '@/shared/ids';
import { directPrintQueue, isDirectPrintingMode, requestCashDrawerOpen } from '@/app/services/direct-printing';
import { loadKotRouting } from '@/app/services/kot-routing';
import { plainClone } from '@/shared/clone';
import type { CartLine, Customer, CustomerAddress, KotRoutingSnapshot, OrderDraft, OrderType, PaymentMethod, Product } from '@/shared/domain';
import { isPaymentMethodEnabled, normalizePaymentMethod } from '@/shared/payment-methods';
import OrderContext from '@/features/pos/OrderContext.vue';
import ProductGrid from '@/features/pos/ProductGrid.vue';
import CartPanel from '@/features/pos/CartPanel.vue';
import ProductOptionsModal from '@/features/pos/ProductOptionsModal.vue';
import CustomerPickerModal from '@/features/customers/CustomerPickerModal.vue';
import AppIcon from '@/components/AppIcon.vue';
import { categoryAccentStyle } from '@/features/pos/category-colors';

const auth = useAuthStore();
const catalog = useCatalogStore();
const connectivity = useConnectivityStore();
const order = useOrderStore();
const settings = useSettingsStore();
const sync = useSyncStore();
const route = useRoute();
const router = useRouter();
const customerModal = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const selectedAddress = ref<CustomerAddress | null>(null);
const optionProduct = ref<Product | null>(null);
const editLine = ref<CartLine | null>(null);
const cartOpen = ref(false);
const pendingQuickMethod = ref<'cash' | 'knet' | null>(null);
const message = ref('');
const messageError = ref(false);
const branchPaymentMethods = ref<PaymentMethod[] | null>(null);
const kotRouting = ref<KotRoutingSnapshot | null>(null);
const orderTypeIcons: Record<OrderType, string> = { dine_in: 'dine-in', takeaway: 'takeaway', delivery: 'delivery', pickup: 'pickup' };

const allowedTypes = computed(() => {
  const types = effectiveOrderTypes(settings.settings, auth.permissions);
  const openedFromTable = typeof route.query.table === 'string' && Number(route.query.table) > 0;
  return openedFromTable && auth.permissions.can_dine_in ? { ...types, dine_in: true } : types;
});
const visibleOrderTypes = computed(() => (Object.keys(allowedTypes.value) as OrderType[]).filter(type => allowedTypes.value[type]));
const quantities = computed(() => order.draft.lines.reduce<Record<number, number>>((totals, line) => {
  const catalogId = line.catalogProductId ?? line.productId;
  totals[catalogId] = (totals[catalogId] ?? 0) + line.quantity;
  return totals;
}, {}));
const saveStatus = computed(() => order.saving ? 'جارٍ الحفظ' : order.persistedAt ? 'محفوظ' : 'مسودة');
const branchAllowsPayment = (method: PaymentMethod) => !branchPaymentMethods.value || branchPaymentMethods.value.map(normalizePaymentMethod).includes(normalizePaymentMethod(method));
const quickCashEnabled = computed(() => settings.settings.pos.quickCash && isPaymentMethodEnabled('cash', settings.settings) && branchAllowsPayment('cash'));
const quickKnetEnabled = computed(() => settings.settings.pos.quickKnet && isPaymentMethodEnabled('knet', settings.settings) && branchAllowsPayment('knet'));

watch(() => order.draft.type, type => {
  if (type !== 'delivery') selectedAddress.value = null;
  if (type !== 'delivery' && type !== 'pickup') selectedCustomer.value = null;
});

onMounted(async () => {
  const requestedOrderId = typeof route.query.order === 'string' ? Number(route.query.order) : 0;
  const requestedLocalId = typeof route.query.localOrder === 'string' ? route.query.localOrder : '';
  if (requestedLocalId) {
    const loaded = await order.loadLocalDraft(requestedLocalId);
    if (!loaded) show('تعذر فتح الطلب المحلي المحفوظ', true);
  } else if (Number.isInteger(requestedOrderId) && requestedOrderId > 0) await order.loadServerOrder(requestedOrderId);
  else await order.hydrate();
  selectedCustomer.value = order.draft.customerSnapshot ?? null;
  selectedAddress.value = order.draft.addressSnapshot ?? null;
  const firstAllowed = Object.entries(allowedTypes.value).find(([, allowed]) => allowed)?.[0];
  const requestedType = typeof route.query.type === 'string' && route.query.type in allowedTypes.value
    ? route.query.type as keyof typeof allowedTypes.value
    : null;
  if (requestedType && allowedTypes.value[requestedType]) order.setType(requestedType);
  else if (!allowedTypes.value[order.draft.type] && firstAllowed) order.setType(firstAllowed as keyof typeof allowedTypes.value);
  if (order.draft.type === 'dine_in' && typeof route.query.table === 'string') {
    const tableId = Number(route.query.table);
    if (Number.isInteger(tableId) && tableId > 0) order.setContext({ tableId });
  }
  await catalog.load().catch(reason => show(reason instanceof Error ? reason.message : 'تعذر تحميل المنتجات', true));
  kotRouting.value = await loadKotRouting(connectivity.online);
  const currentShift = await waiterApi.shift().catch(() => null);
  branchPaymentMethods.value = currentShift?.paymentMethods ?? null;
});

function show(text: string, isError = false): void {
  message.value = text; messageError.value = isError;
  window.setTimeout(() => { if (message.value === text) message.value = ''; }, 3500);
}

async function selectProduct(product: Product): Promise<void> {
  if (product.choiceGroups?.length) { optionProduct.value = product; return; }
  if (product.hasChoices) {
    try {
      const choiceGroups = await catalog.ensureProductChoices(product);
      if (choiceGroups.length) {
        optionProduct.value = product;
        return;
      }
    } catch (reason) {
      show(reason instanceof Error ? reason.message : 'تعذر تحميل الإضافات', true);
      return;
    }
  }
  order.addProduct(product);
  show(`تمت إضافة ${product.name}`);
}

function confirmOptions(payload: { choices: Array<{ id: number; name: string; price: number }>; note: string; quantity: number }): void {
  if (editLine.value) {
    order.updateLine(editLine.value.localId, payload);
  } else if (optionProduct.value) {
    order.addProduct(optionProduct.value, payload.choices, payload.quantity, payload.note);
  }
  optionProduct.value = null; editLine.value = null;
}

function chooseCustomer(payload: { customer: Customer; address: CustomerAddress | null }): void {
  selectedCustomer.value = payload.customer;
  selectedAddress.value = payload.address;
  order.setContext({
    customerId: payload.customer.id,
    addressId: payload.address?.id ?? null,
    customerSnapshot: payload.customer,
    ...(payload.address ? { addressSnapshot: payload.address } : {}),
  });
  customerModal.value = false;
}

type SubmitResult = { queued: boolean; localOrderId: string; orderId?: number; invoiceNo?: string };

async function submitDraft(): Promise<SubmitResult | null> {
  try {
    return await order.submit(connectivity.online);
  } catch (reason) { show(reason instanceof Error ? reason.message : 'تعذر حفظ الطلب', true); return null; }
}

function receiptOptions(snapshot: OrderDraft, result: SubmitResult) {
  return {
    ...(result.orderId ? { orderId: result.orderId } : {}),
    ...(result.invoiceNo ? { invoiceNo: result.invoiceNo } : {}),
    temporary: result.queued,
    ...(auth.business?.name ? { businessName: auth.business.name } : {}),
    ...(auth.location?.name ? { locationName: auth.location.name } : {}),
  };
}

async function finishOrder(snapshot: OrderDraft, successMessage: string): Promise<void> {
  await order.completeDraft(snapshot.localId, snapshot.type);
  selectedCustomer.value = null;
  selectedAddress.value = null;
  cartOpen.value = false;
  pendingQuickMethod.value = null;
  if (route.path === '/pos' && Object.keys(route.query).length) await router.replace('/pos');
  show(successMessage);
}

async function printSavedOrder(snapshot: OrderDraft, result: SubmitResult): Promise<'printed' | 'queued' | 'disabled'> {
  if (!settings.settings.printing.enabled || !settings.settings.printing.autoPrintOnSave) return 'disabled';
  if (settings.settings.printing.mode === 'server') {
    if (result.queued || !result.orderId) {
      await sync.enqueueBill(result.localOrderId, result.orderId, settings.settings.printing.receiptCopies);
      return 'queued';
    }
    try {
      await printOrderBill(result.orderId, settings.settings, {
        ...(auth.business?.name ? { businessName: auth.business.name } : {}),
        ...(auth.location?.name ? { locationName: auth.location.name } : {}),
      }, `auto-save-${result.orderId}`);
      return 'printed';
    } catch {
      await sync.enqueueBill(result.localOrderId, result.orderId, settings.settings.printing.receiptCopies);
      return 'queued';
    }
  }
  const printResult = await printDraftReceipt(snapshot, settings.settings, receiptOptions(snapshot, result));
  return printResult?.queued ? 'queued' : printResult ? 'printed' : 'disabled';
}

async function localKotJobIds(snapshot: OrderDraft): Promise<string[]> {
  if (!settings.settings.printing.enabled || !isDirectPrintingMode(settings.settings.printing.mode)) return [];
  kotRouting.value ??= await loadKotRouting(false);
  const results = await directPrintQueue.enqueueRoutedDraftKot(snapshot, kotRouting.value);
  return results.flatMap(result => result.localJobId ? [result.localJobId] : []);
}

async function saveOnly(): Promise<void> {
  const snapshot = plainClone(order.draft);
  const result = await submitDraft();
  if (!result) return;
  try {
    const printState = await printSavedOrder(snapshot, result);
    const suffix = printState === 'queued' ? ' والطباعة محفوظة في الطابور' : printState === 'printed' ? ' وتمت الطباعة' : '';
    await finishOrder(snapshot, `${result.queued ? 'تم حفظ الطلب على التابلت وسيُرسل عند عودة الاتصال' : `تم حفظ الطلب رقم ${result.orderId}`}${suffix}`);
  } catch (reason) {
    // The order itself is already durable. Clear it to prevent an accidental
    // duplicate and surface the printing problem separately.
    await finishOrder(snapshot, result.queued ? 'تم حفظ الطلب والمزامنة معلقة' : `تم حفظ الطلب رقم ${result.orderId}`);
    show(reason instanceof Error ? `تم حفظ الطلب، لكن الطباعة تحتاج مراجعة: ${reason.message}` : 'تم حفظ الطلب، لكن الطباعة تحتاج مراجعة', true);
  }
}

async function kitchen(): Promise<void> {
  if (settings.settings.pos.confirmKitchen && !window.confirm('إرسال الطلب إلى المطبخ الآن؟')) return;
  const snapshot = plainClone(order.draft);
  const localOrderId = snapshot.localId;
  const kotKey = createIdempotencyKey('order-kot', `${snapshot.serverId ?? localOrderId}-${snapshot.revision}`);
  let result: SubmitResult | null = null;
  let kotAccepted = false;
  try {
    result = await order.submit(connectivity.online);
    if (result.queued || !result.orderId) {
      const localPrintJobIds = await localKotJobIds(snapshot);
      await sync.enqueueKot(localOrderId, undefined, localPrintJobIds, kotKey);
      await finishOrder(snapshot, localPrintJobIds.length
        ? 'تم حفظ الطلب وطباعة KOT محليًا، وسيُعتمد على السيرفر بعد المزامنة'
        : 'تم حفظ الطلب، وسيُرسل للمطبخ بعد المزامنة');
      return;
    }
    const direct = isDirectPrintingMode(settings.settings.printing.mode);
    const printResult = await waiterApi.sendToKitchen(result.orderId, kotKey, direct);
    kotAccepted = true;
    if (direct && printResult.jobData?.length) await directPrintQueue.enqueueServerJobs(printResult.jobData);
    await finishOrder(snapshot, printResult.jobs ? `تم إرسال الطلب للمطبخ وإنشاء ${printResult.jobs} مهمة KOT` : 'تم إرسال الطلب للمطبخ');
  } catch (reason) {
    if (!result) {
      show(reason instanceof Error ? reason.message : 'تعذر حفظ الطلب', true);
      return;
    }
    // The order is already durable. Do not leave it in the basket where a
    // waiter can accidentally submit it twice. Queue only an unaccepted KOT.
    if (!kotAccepted) await sync.enqueueKot(localOrderId, result.orderId, [], kotKey).catch(() => undefined);
    await finishOrder(snapshot, 'تم حفظ الطلب وتفريغ السلة، وKOT في طابور إعادة المحاولة');
    show(reason instanceof Error ? `تم حفظ الطلب، لكن طباعة KOT تحتاج مراجعة: ${reason.message}` : 'تم حفظ الطلب، لكن طباعة KOT تحتاج مراجعة', true);
  }
}

async function payNow(): Promise<void> {
  if (!connectivity.online) { show('استخدم نقدي سريع أو كي نت سريع لتسجيل الدفع الأوفلاين', true); return; }
  const sourceLocalId = order.draft.localId;
  const sourceType = order.draft.type;
  const sourceTotal = order.subtotal;
  const result = await submitDraft();
  if (result?.orderId) await router.push({
    path: `/payment/${result.orderId}`,
    query: { total: String(sourceTotal), sourceDraft: sourceLocalId, sourceType, sendKot: '1' },
  });
}

async function quickPayment(method: PaymentMethod): Promise<void> {
  const snapshot = plainClone(order.draft);
  const total = order.subtotal;
  const result = await submitDraft();
  if (!result) return;
  const direct = isDirectPrintingMode(settings.settings.printing.mode);
  const payment = {
    payment_method: method,
    amount: total,
    ...(method === 'cash' ? { received: total } : {}),
    receipt_only: true,
    direct,
    suppress_print: !settings.settings.printing.enabled,
    ...(!connectivity.online ? { offlineRecordedAt: new Date().toISOString() } : {}),
  };
  let paymentCommitted = false;
  let completionMessage = '';
  try {
    const receipt = receiptFromDraft(snapshot, {
      ...(result.orderId ? { orderId: result.orderId } : {}),
      ...(result.invoiceNo ? { invoiceNo: result.invoiceNo } : {}),
      temporary: result.queued,
      ...(auth.business?.name ? { businessName: auth.business.name } : {}),
      ...(auth.location?.name ? { locationName: auth.location.name } : {}),
    });
    // Receipt caching is useful for reprint, but it must never block a payment
    // or leave an already-saved order in the active cart.
    await cacheReceipt(receipt).catch(() => undefined);
    if (result.queued || !result.orderId) {
      let localKotIds: string[] = [];
      let localBillIds: string[] = [];
      try { localKotIds = await localKotJobIds(snapshot); } catch { /* Server KOT stays queued below. */ }
      await sync.enqueueKot(result.localOrderId, undefined, localKotIds);
      try {
        const billResult = await printDraftReceipt(snapshot, settings.settings, {
          ...receiptOptions(snapshot, result), afterPayment: true, paymentStatus: 'paid',
          paymentMethod: method === 'cash' ? 'نقدي' : 'كي نت',
        });
        localBillIds = billResult?.localJobId ? [billResult.localJobId] : [];
      } catch { /* Payment is still recorded; printing can be retried after sync. */ }
      await sync.enqueuePayment({ localOrderId: result.localOrderId, payment, method, localPrintJobIds: localBillIds });
      paymentCommitted = true;
      completionMessage = `تم تسجيل الدفع ${method === 'cash' ? 'النقدي' : 'كي نت'} أوفلاين وتفريغ السلة`;
      await markDraftReceiptPaid(result.localOrderId, method === 'cash' ? 'نقدي — ينتظر المزامنة' : 'كي نت — ينتظر المزامنة');
    } else {
      const printLocallyWithAirPrint = settings.settings.printing.enabled && settings.settings.printing.mode === 'airprint';
      const paymentResult = await waiterApi.pay(result.orderId, {
        ...payment,
        send_kot: settings.settings.printing.enabled && auth.permissions.can_print,
        suppress_print: !settings.settings.printing.enabled || printLocallyWithAirPrint,
      }, createIdempotencyKey('quick-payment', `${result.orderId}-${method}`));
      paymentCommitted = true;
      completionMessage = `تم الدفع ${method === 'cash' ? 'نقدي' : 'كي نت'} بنجاح وتفريغ السلة`;
      if (direct && paymentResult.jobData?.length) await directPrintQueue.enqueueServerJobs(paymentResult.jobData);
      if (printLocallyWithAirPrint) await printDraftReceipt(snapshot, settings.settings, {
        ...receiptOptions(snapshot, result), afterPayment: true, paymentStatus: 'paid',
        paymentMethod: method === 'cash' ? 'نقدي' : 'كي نت',
      });
      await markReceiptPaid(result.orderId, method === 'cash' ? 'نقدي' : 'كي نت');
    }
    if (method === 'cash' && settings.settings.printing.cashDrawerEnabled && settings.settings.printing.cashDrawerAutoOpenCash) {
      await requestCashDrawerOpen(settings.settings, {
        trigger: 'cash_payment',
        ...(result.orderId ? { transactionId: result.orderId } : {}),
      });
    }
    await finishOrder(snapshot, completionMessage);
  } catch (reason) {
    if (paymentCommitted) {
      await finishOrder(snapshot, completionMessage || 'تم تسجيل الدفع وتفريغ السلة');
      show(reason instanceof Error ? `تم الدفع، لكن الطباعة أو حفظ الإيصال يحتاج مراجعة: ${reason.message}` : 'تم الدفع، لكن الطباعة أو حفظ الإيصال يحتاج مراجعة', true);
      return;
    }
    show(reason instanceof Error ? reason.message : 'تعذر تسجيل الدفع السريع', true);
  }
}

function requestQuickPayment(method: 'cash' | 'knet'): void {
  if (!order.draft.lines.length || order.submitting) return;
  if (settings.settings.pos.confirmPayment) { pendingQuickMethod.value = method; return; }
  void quickPayment(method);
}

async function confirmQuickPayment(): Promise<void> {
  const method = pendingQuickMethod.value;
  if (!method) return;
  pendingQuickMethod.value = null;
  await quickPayment(method);
}

async function editCartLine(line: CartLine): Promise<void> {
  if (line.locked) return;
  editLine.value = line;
  const product = catalog.products.find(item => item.id === (line.catalogProductId ?? line.productId));
  if (!product) return;
  try {
    if (!product.choiceGroups?.length && (product.hasChoices || line.choices.length)) {
      product.choiceGroups = await catalog.ensureProductChoices(product);
    }
    optionProduct.value = product;
  } catch (reason) { show(reason instanceof Error ? reason.message : 'تعذر تحميل إضافات الصنف', true); }
}

async function newOrder(): Promise<void> {
  if (order.draft.lines.length && !window.confirm('يوجد أصناف في الطلب الحالي. هل تريد حذف المسودة وبدء طلب جديد؟')) return;
  await order.newOrder();
  selectedCustomer.value = null;
  selectedAddress.value = null;
  cartOpen.value = false;
  show('تم بدء طلب جديد');
}
</script>

<template>
  <div
    class="pos-page compact-pos"
    :class="[
      `product-font-${settings.settings.pos.fontScale}`,
      { 'category-chip-colors': settings.settings.pos.categoryColorMode === 'categories' || settings.settings.pos.categoryColorMode === 'both' },
    ]"
  >
    <header class="pos-compact-header">
      <div class="pos-title"><button class="compact-icon-button" aria-label="رجوع" @click="router.back()"><AppIcon name="back" :size="21" /></button><strong>{{ order.draft.serverId ? `تعديل الطلب #${order.draft.serverId}` : 'طلب جديد' }}</strong></div>
      <span class="pos-save-status" :class="{ saving: order.saving }"><AppIcon name="cloud-check" :size="18" />{{ saveStatus }}</span>
      <div class="pos-header-actions"><button class="compact-icon-button" aria-label="بدء طلب جديد" @click="newOrder"><AppIcon name="plus" :size="20" /></button><button class="compact-save-button" :disabled="!order.draft.lines.length || order.submitting" @click="saveOnly"><AppIcon name="save" :size="18" />{{ order.submitting ? 'جارٍ الحفظ' : 'حفظ' }}</button></div>
    </header>

    <nav class="order-type-strip" :class="`order-types-${visibleOrderTypes.length}`" aria-label="نوع الطلب">
      <button v-for="type in visibleOrderTypes" :key="type" :class="{ active: order.draft.type === type }" :aria-pressed="order.draft.type === type" @click="order.setType(type)"><AppIcon :name="orderTypeIcons[type]" :size="17" /><span>{{ ORDER_TYPE_LABELS[type] }}</span></button>
    </nav>

    <div class="pos-context-slot"><OrderContext :customer="selectedCustomer" :address="selectedAddress" @customer="customerModal = true" /></div>

    <div class="pos-workspace">
      <section class="catalog-pane">
        <div class="catalog-toolbar">
          <label class="catalog-search"><AppIcon name="search" :size="20" /><input v-model="catalog.search" inputmode="search" placeholder="ابحث عن منتج…" /><button v-if="catalog.search" aria-label="مسح البحث" @click="catalog.search = ''"><AppIcon name="close" :size="16" /></button></label>
          <div class="chip-row categories">
            <button class="chip all-categories-chip" :class="{ active: catalog.activeCategoryId === null }" @click="catalog.activeCategoryId = null">كل الأصناف</button>
            <button v-for="category in catalog.categories" :key="category.id" class="chip category-chip" :style="categoryAccentStyle(category.id)" :class="{ active: catalog.activeCategoryId === category.id }" @click="catalog.activeCategoryId = category.id">{{ category.name }}</button>
          </div>
        </div>
        <div v-if="catalog.loading && !catalog.products.length" class="empty-state">جاري تحميل المنتجات…</div>
        <p v-if="catalog.stale" class="offline-catalog-note">تظهر نسخة المنتجات المحفوظة على التابلت</p>
        <ProductGrid
          :products="catalog.visibleProducts"
          :show-images="settings.settings.pos.showImages"
          :show-favorites="settings.settings.pos.favorites"
          :quantities="quantities"
          :columns="settings.settings.pos.productColumns"
          :category-color-mode="settings.settings.pos.categoryColorMode"
          :card-style="settings.settings.pos.productCardStyle"
          @select="selectProduct"
          @favorite="catalog.toggleFavorite"
        />
      </section>
    </div>

    <button v-if="settings.settings.pos.keepCartOpen || order.itemCount" class="cart-summary-bar" :class="{ empty: !order.itemCount }" aria-label="عرض السلة" @click="cartOpen = true"><span class="cart-summary-title"><span class="cart-summary-icon"><AppIcon name="cart" :size="21" /><b v-if="order.itemCount">{{ order.itemCount }}</b></span><span>{{ order.itemCount ? 'السلة' : 'السلة فارغة' }}</span></span><strong>{{ order.subtotal.toFixed(3) }} د.ك</strong><span class="cart-summary-action">عرض السلة</span></button>

    <Teleport to="body"><div v-if="cartOpen" class="modal-backdrop cart-sheet-backdrop" @click.self="cartOpen = false"><div class="cart-sheet-wrap"><button class="sheet-grabber" aria-label="إغلاق السلة" @click="cartOpen = false"></button><CartPanel closable :lines="order.draft.lines" :subtotal="order.subtotal" :note="order.draft.note" :saving="order.saving" :persisted-at="order.persistedAt" :submitting="order.submitting" :quick-pay="settings.settings.pos.quickPay && auth.permissions.can_pay" :quick-cash="quickCashEnabled" :quick-knet="quickKnetEnabled" :show-kitchen="settings.settings.pos.showKitchen" :order-type="order.draft.type" :allowed-order-types="allowedTypes" @close="cartOpen = false" @quantity="order.changeQuantity" @remove="order.removeLine" @edit="editCartLine" @note="order.setContext({ note: $event })" @order-type="order.setType" @submit="saveOnly" @kitchen="kitchen" @pay="payNow" @quick-cash="requestQuickPayment('cash')" @quick-knet="requestQuickPayment('knet')" /></div></div></Teleport>

    <Teleport to="body"><div v-if="pendingQuickMethod" class="modal-backdrop quick-payment-backdrop" @click.self="pendingQuickMethod = null"><section class="quick-payment-confirm" role="dialog" aria-modal="true" aria-labelledby="quick-payment-title"><span class="quick-confirm-icon" :class="pendingQuickMethod"><AppIcon :name="pendingQuickMethod === 'cash' ? 'cash' : 'card'" :size="28" /></span><h2 id="quick-payment-title">تأكيد الدفع {{ pendingQuickMethod === 'cash' ? 'النقدي' : 'كي نت' }}</h2><p>سيتم حفظ الطلب وتسجيل كامل المبلغ {{ pendingQuickMethod === 'cash' ? 'نقدي' : 'كي نت' }}.</p><strong>{{ order.subtotal.toFixed(3) }} د.ك</strong><div class="row"><button class="btn btn-secondary" @click="pendingQuickMethod = null">إلغاء</button><button class="btn btn-primary" :disabled="order.submitting" @click="confirmQuickPayment">تأكيد {{ pendingQuickMethod === 'cash' ? 'نقدي' : 'كي نت' }}</button></div></section></div></Teleport>

    <CustomerPickerModal :open="customerModal" :order-type="order.draft.type" :selected-customer-id="order.draft.customerId" :selected-address-id="order.draft.addressId" :initial-customer="selectedCustomer" :can-manage="auth.permissions.can_manage_customers" @close="customerModal = false" @select="chooseCustomer" />
    <ProductOptionsModal :product="optionProduct" :line="editLine" @close="optionProduct = null; editLine = null" @confirm="confirmOptions" />
    <div v-if="message" class="toast" :class="{ error: messageError }">{{ message }}</div>
  </div>
</template>
