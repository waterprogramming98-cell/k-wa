<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth';
import { useConnectivityStore } from '@/app/stores/connectivity';
import { useSettingsStore } from '@/app/stores/settings';
import { appPreferences } from '@/app/services/preferences';
import { normalizeDeviceSettings } from '@/app/settings/defaults';
import { waiterApi } from '@/app/services/waiter-api';
import { isDirectPrintingMode, pairedBluetoothPrinters, requestCashDrawerOpen, testDirectPrinter, validateDirectPrinter } from '@/app/services/direct-printing';
import type { DeviceSettings, Printer } from '@/shared/domain';
import type { ReceiptSnapshot } from '@/shared/domain';
import { localDatabase } from '@/app/services/local-database';
import { belongsToActiveScope } from '@/app/services/data-scope';
import { receiptHtml } from '@/app/services/receipt';
import { normalizePaymentOptions, paymentMethodIcon } from '@/shared/payment-methods';
import AppIcon from '@/components/AppIcon.vue';
import { setUiLanguage } from '@/app/services/localization';
import { loadPrinterDirectory } from '@/app/services/printer-directory';

type Tab = 'general' | 'screens' | 'types' | 'pos' | 'payment' | 'tables' | 'notifications' | 'sync' | 'printing';
const router = useRouter();
const auth = useAuthStore();
const connectivity = useConnectivityStore();
const settingsStore = useSettingsStore();
const tab = ref<Tab>('general');
const draft = ref<DeviceSettings>(normalizeDeviceSettings(settingsStore.settings));
const serverUrl = ref('');
const saved = ref(false);
const error = ref('');
const printers = ref<Printer[]>([]);
const printerId = ref<number | null>(null);
const printerMessage = ref('');
const bluetoothPrinters = ref<Array<{ address: string; name: string }>>([]);
const bluetoothLoading = ref(false);
const showUnlock = ref(false);
const managerPassword = ref('');
const unlocking = ref(false);
const canManage = computed(() => auth.permissions.can_manage_device || settingsStore.unlocked);

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'general', label: 'عام', icon: 'settings' }, { id: 'screens', label: 'الشاشات', icon: 'home' },
  { id: 'types', label: 'أنواع الطلب', icon: 'receipt' }, { id: 'pos', label: 'نقطة البيع', icon: 'pos' },
  { id: 'payment', label: 'طرق الدفع', icon: 'wallet' },
  { id: 'tables', label: 'الطاولات', icon: 'table-top' }, { id: 'notifications', label: 'التنبيهات', icon: 'bell' },
  { id: 'sync', label: 'الأوفلاين', icon: 'sync' }, { id: 'printing', label: 'الطباعة', icon: 'printer' },
];

const screenRows = [
  ['home', 'الرئيسية', 'ملخص التشغيل والوصول السريع'], ['pos', 'نقطة البيع', 'إنشاء وتعديل الطلبات'],
  ['tables', 'الطاولات', 'الحالة والنداءات'], ['pickups', 'طلبات الاستلام', 'التجهيز والتسليم'],
  ['orders', 'كل الطلبات', 'قائمة طلبات الجارسون'], ['customers', 'العملاء والعناوين', 'البحث والإضافة والتعديل'],
  ['payment', 'الدفع والتحصيل', 'طرق الدفع وتقسيم الفاتورة'], ['shift', 'الوردية', 'فتح وإغلاق وتسوية'],
] as const;
const typeRows = [
  ['dine_in', 'داخل المطعم', 'يتطلب اختيار طاولة'], ['takeaway', 'تيك أواي', 'طلب مباشر دون طاولة'],
  ['delivery', 'توصيل', 'يتطلب عميلًا وعنوانًا'], ['pickup', 'استلام', 'يتطلب العميل ومسؤول الاستلام'],
] as const;

const paymentOptions = computed(() => normalizePaymentOptions(draft.value.payment.knownMethods));
const enabledPaymentCount = computed(() => paymentOptions.value.filter(option => !draft.value.payment.hiddenMethods.includes(option.id)).length);
const receiptPrinters = computed(() => printers.value.filter(item => item.active && item.printReceipt));
const drawerPrinters = computed(() => printers.value.filter(item => item.active && item.cashDrawer?.enabled));
function paymentEnabled(method: string): boolean { return !draft.value.payment.hiddenMethods.includes(method); }
function togglePayment(method: string): void {
  const hidden = new Set(draft.value.payment.hiddenMethods);
  if (hidden.has(method)) hidden.delete(method);
  else {
    if (enabledPaymentCount.value <= 1) { error.value = 'يجب إبقاء طريقة دفع واحدة على الأقل مفعلة.'; return; }
    hidden.add(method);
  }
  error.value = '';
  draft.value.payment.hiddenMethods = Array.from(hidden);
}

onMounted(async () => {
  serverUrl.value = await appPreferences.getServerUrl();
  const shift = await waiterApi.shift().catch(() => null);
  if (shift?.paymentMethodOptions?.length) draft.value.payment.knownMethods = normalizePaymentOptions(shift.paymentMethodOptions);
});

watch([tab, () => draft.value.printing.mode], async ([value, mode]) => {
  if (value !== 'printing' || !auth.permissions.can_print) return;
  if (mode === 'bluetooth' && !bluetoothPrinters.value.length) {
    await loadBluetoothPrinters();
  }
  if (printers.value.length) return;
  try {
    printers.value = await loadPrinterDirectory(true);
    printerId.value = printers.value.find(item => item.active)?.id ?? printers.value[0]?.id ?? null;
    if (!draft.value.printing.receiptPrinterId) draft.value.printing.receiptPrinterId = printers.value.find(item => item.active && item.printReceipt)?.id ?? null;
    if (!draft.value.printing.cashDrawerPrinterId) draft.value.printing.cashDrawerPrinterId = printers.value.find(item => item.active && item.cashDrawer?.enabled)?.id ?? null;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'تعذر تحميل الطابعات'; }
});

watch(() => draft.value.language, language => setUiLanguage(language));
onUnmounted(() => setUiLanguage(settingsStore.settings.language));

function applyPreset(preset: DeviceSettings['preset']): void {
  const values = {
    waiter: { screens: { ...draft.value.screens, tables: true, pickups: false, customers: false, payment: false }, orderTypes: { dine_in: true, takeaway: true, delivery: false, pickup: false } },
    pickup: { screens: { ...draft.value.screens, tables: false, pickups: true, customers: true, payment: true }, orderTypes: { dine_in: false, takeaway: false, delivery: false, pickup: true } },
    cashier: { screens: Object.fromEntries(Object.keys(draft.value.screens).map(key => [key, true])) as DeviceSettings['screens'], orderTypes: { dine_in: true, takeaway: true, delivery: true, pickup: true } },
    custom: { screens: draft.value.screens, orderTypes: draft.value.orderTypes },
  }[preset];
  draft.value = normalizeDeviceSettings({ ...draft.value, ...values, preset });
}

async function save(): Promise<void> {
  if (!canManage.value) return;
  error.value = ''; saved.value = false;
  try {
    if (!enabledPaymentCount.value) throw new Error('يجب تفعيل طريقة دفع واحدة على الأقل.');
    if (draft.value.printing.enabled && isDirectPrintingMode(draft.value.printing.mode)) validateDirectPrinter(draft.value.printing);
    await settingsStore.save(draft.value);
    saved.value = true; window.setTimeout(() => { saved.value = false; }, 2500);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات'; }
}

async function unlockSettings(): Promise<void> {
  if (!managerPassword.value || unlocking.value) return;
  unlocking.value = true;
  error.value = '';
  try {
    await settingsStore.unlock(managerPassword.value);
    managerPassword.value = '';
    showUnlock.value = false;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'تعذر فتح الإعدادات';
  } finally {
    unlocking.value = false;
  }
}

async function testConnection(): Promise<void> { await connectivity.check(); }

async function loadBluetoothPrinters(): Promise<void> {
  bluetoothLoading.value = true; error.value = '';
  try {
    bluetoothPrinters.value = await pairedBluetoothPrinters();
    if (!draft.value.printing.bluetoothAddress && bluetoothPrinters.value[0]) {
      draft.value.printing.bluetoothAddress = bluetoothPrinters.value[0].address;
      draft.value.printing.bluetoothName = bluetoothPrinters.value[0].name;
    }
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'تعذر تحميل طابعات Bluetooth'; }
  finally { bluetoothLoading.value = false; }
}

function selectBluetoothPrinter(): void {
  draft.value.printing.bluetoothName = bluetoothPrinters.value.find(item => item.address === draft.value.printing.bluetoothAddress)?.name ?? '';
}

async function resetSettings(): Promise<void> {
  if (!canManage.value || !window.confirm('إعادة كل إعدادات هذا التابلت للقيم الافتراضية؟')) return;
  await settingsStore.reset();
  draft.value = normalizeDeviceSettings(settingsStore.settings);
  saved.value = true;
}

async function testPrinter(): Promise<void> {
  error.value = ''; printerMessage.value = '';
  try {
    if (isDirectPrintingMode(draft.value.printing.mode)) {
      await testDirectPrinter(draft.value.printing);
      printerMessage.value = draft.value.printing.mode === 'bluetooth'
        ? `تمت الطباعة عبر Bluetooth على ${draft.value.printing.bluetoothName || draft.value.printing.bluetoothAddress}`
        : `تمت الطباعة مباشرة على ${draft.value.printing.directHost}:${draft.value.printing.directPort}`;
      return;
    }
    if (draft.value.printing.mode === 'airprint') {
      printerMessage.value = 'سيظهر اختيار AirPrint عند طباعة فاتورة من iPad.';
      return;
    }
    if (!printerId.value) { error.value = 'اختر طابعة السيرفر أولًا'; return; }
    const result = await waiterApi.testPrinter(printerId.value);
    printerMessage.value = `تم إرسال اختبار إلى ${result.printer} — مهمة #${result.jobId}`;
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'فشل اختبار الطابعة'; }
}

async function testCashDrawer(): Promise<void> {
  error.value = ''; printerMessage.value = '';
  try {
    const result = await requestCashDrawerOpen(draft.value, { trigger: 'test', reason: 'اختبار درج النقدية من إعدادات التابلت' });
    printerMessage.value = result.queued ? 'تم إرسال أمر اختبار الدرج إلى Print Agent' : 'تم فتح درج النقدية بنجاح';
  } catch (reason) { error.value = reason instanceof Error ? reason.message : 'تعذر اختبار درج النقدية'; }
}

async function previewLastReceipt(): Promise<void> {
  const receipt = (await localDatabase.list<ReceiptSnapshot>('receipts')).filter(belongsToActiveScope).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!receipt) { error.value = 'لا توجد فاتورة محفوظة للمعاينة بعد'; return; }
  const preview = window.open('', '_blank');
  if (!preview) { error.value = 'اسمح بفتح نافذة المعاينة من إعدادات الجهاز'; return; }
  preview.opener = null;
  preview.document.open(); preview.document.write(receiptHtml(receipt)); preview.document.close();
}

async function logout(): Promise<void> {
  settingsStore.lock();
  await auth.logout();
  await router.replace('/login');
}
</script>

<template>
  <div class="page settings-page">
    <div class="page-head"><div><h1>إعدادات التابلت</h1><p>إعدادات ثابتة لهذا الجهاز لا تتغير عند تبديل المستخدم</p></div><div class="row"><button class="btn btn-danger" @click="logout">تسجيل الخروج</button><button class="btn btn-secondary" @click="router.push('/health')">صحة الجهاز</button><button v-if="!canManage" class="btn btn-primary" @click="showUnlock = true"><AppIcon name="lock" :size="18" /> فتح بواسطة المدير</button><button v-else-if="settingsStore.unlocked" class="btn btn-secondary" @click="settingsStore.lock()"><AppIcon name="lock" :size="18" /> قفل</button><button class="btn btn-secondary" :disabled="!canManage" @click="resetSettings">إعادة الضبط</button><button class="btn btn-primary" :disabled="!canManage || settingsStore.saving" @click="save">{{ settingsStore.saving ? 'جاري الحفظ…' : saved ? 'تم الحفظ ✓' : 'حفظ الإعدادات' }}</button></div></div>
    <div v-if="!canManage" class="managed-note"><strong>الإعدادات مقفلة للحماية.</strong> يمكن للكاشير أو الجارسون مشاهدة القيم، وللتعديل أدخل كلمة مرور مدير النظام. كلمة المرور لا تُحفظ على التابلت.</div>
    <div v-else-if="settingsStore.unlocked" class="managed-note success-note">تم فتح الإعدادات مؤقتًا بواسطة مدير النظام. ستظل القيم محفوظة على نفس التابلت لكل المستخدمين.</div>
    <div v-else-if="settingsStore.remotePending" class="managed-note">الإعدادات محفوظة على التابلت وتنتظر المزامنة مع السيرفر عند عودة الاتصال.</div>
    <div class="settings-layout">
      <nav class="settings-nav"><button v-for="item in tabs" :key="item.id" :class="{ active: tab === item.id }" @click="tab = item.id"><AppIcon :name="item.icon" :size="20" />{{ item.label }}</button></nav>
      <fieldset class="settings-content" :disabled="!canManage">
        <section v-if="tab === 'general'" class="settings-section stack">
          <div><h2>الإعدادات العامة</h2><p>هوية الجهاز واللغة والمظهر واتصال السيرفر</p></div>
          <div class="form-grid"><label class="field"><span>اسم التابلت</span><input v-model="draft.deviceName" :disabled="!canManage" /></label><label class="field"><span>اللغة</span><select v-model="draft.language" :disabled="!canManage"><option value="ar">العربية</option><option value="en">English</option></select></label><label class="field"><span>المظهر</span><select v-model="draft.theme" :disabled="!canManage"><option value="light">فاتح</option><option value="dark">داكن</option><option value="system">حسب الجهاز</option></select></label><label class="field"><span>رابط السيرفر</span><input v-model="serverUrl" disabled inputmode="url" /><small class="muted">لتغيير السيرفر سجّل الخروج ثم أدخل الرابط الجديد؛ هذا يحمي جلسة الجهاز.</small></label></div>
          <div class="row"><button class="btn btn-secondary" @click="testConnection">اختبار الاتصال</button><span :class="connectivity.serverReachable ? 'success-text' : 'error-text'">{{ connectivity.serverReachable === null ? 'لم يتم الاختبار' : connectivity.serverReachable ? 'متصل ✓' : 'غير متصل' }}</span></div>
          <h3>تجهيز سريع حسب وظيفة التابلت</h3><div class="preset-grid"><button v-for="item in [{id:'waiter',label:'جارسون'},{id:'pickup',label:'استلام'},{id:'cashier',label:'كاشير'},{id:'custom',label:'مخصص'}]" :key="item.id" class="preset-card" :class="{ active: draft.preset === item.id }" :disabled="!canManage" @click="applyPreset(item.id as DeviceSettings['preset'])">{{ item.label }}</button></div>
        </section>

        <section v-else-if="tab === 'screens'" class="settings-section"><div><h2>إظهار وإخفاء الشاشات</h2><p>الإخفاء لا يمنح صلاحية منعها السيرفر.</p></div><label v-for="row in screenRows" :key="row[0]" class="switch-row"><span><strong>{{ row[1] }}</strong><small class="muted">{{ row[2] }}</small></span><input v-model="draft.screens[row[0]]" class="switch" type="checkbox" :disabled="!canManage" /></label></section>
        <section v-else-if="tab === 'types'" class="settings-section"><div><h2>أنواع الطلب المتاحة</h2><p>يمكن إبقاء التوصيل والاستلام فقط كما هو مطلوب حاليًا.</p></div><label v-for="row in typeRows" :key="row[0]" class="switch-row"><span><strong>{{ row[1] }}</strong><small class="muted">{{ row[2] }}</small></span><input v-model="draft.orderTypes[row[0]]" class="switch" type="checkbox" :disabled="!canManage" /></label></section>
        <section v-else-if="tab === 'pos'" class="settings-section stack pos-appearance-settings">
          <div><h2>نقطة البيع</h2><p>خصص شكل الكتالوج وحجم النص وسلوك السلة على هذا التابلت.</p></div>

          <div class="settings-subsection">
            <div><h3>مظهر كروت المنتجات والتصنيفات</h3><p class="muted">الألوان تُوزع تلقائيًا وثابتًا على كل تصنيف، فلا تتغير بين مرات التشغيل.</p></div>
            <div class="form-grid">
              <label class="field"><span>ألوان التصنيفات</span><select v-model="draft.pos.categoryColorMode"><option value="off">بدون ألوان — موحد</option><option value="categories">التصنيفات فقط</option><option value="cards">كروت المنتجات فقط</option><option value="both">التصنيفات والكروت</option></select></label>
              <label class="field"><span>شكل كارت المنتج</span><select v-model="draft.pos.productCardStyle"><option value="clean">نظيف — خلفية بيضاء</option><option value="soft">ألوان هادئة</option><option value="accent">لون واضح وقوي</option></select></label>
              <label class="field"><span>حجم اسم وسعر المنتج</span><select v-model="draft.pos.fontScale"><option value="normal">عادي</option><option value="large">كبير</option><option value="xlarge">كبير جدًا</option></select></label>
              <label class="field"><span>عدد المنتجات في الصف</span><select v-model.number="draft.pos.productColumns"><option :value="2">2</option><option :value="3">3</option><option :value="4">4</option><option :value="5">5</option></select></label>
            </div>
            <div class="catalog-style-preview" :class="[`preview-${draft.pos.productCardStyle}`, `preview-colors-${draft.pos.categoryColorMode}`, `preview-font-${draft.pos.fontScale}`, { 'preview-no-images': !draft.pos.showImages }]" aria-label="معاينة مظهر المنتجات">
              <div class="preview-category-row"><span style="--preview-accent:#137a55">مشروبات</span><span style="--preview-accent:#7350b4">وجبات</span><span style="--preview-accent:#b85f22">حلويات</span></div>
              <div class="preview-product-row"><article style="--preview-accent:#137a55"><i v-if="draft.pos.showImages"><AppIcon name="image" :size="24" /></i><strong>اسم المنتج</strong><b>1.500 د.ك</b></article><article style="--preview-accent:#7350b4"><i v-if="draft.pos.showImages"><AppIcon name="image" :size="24" /></i><strong>منتج طويل للتجربة</strong><b>2.750 د.ك</b></article></div>
            </div>
          </div>

          <div class="settings-subsection">
            <h3>عرض وترتيب المنتجات</h3>
            <label class="switch-row"><span><strong>إظهار صور المنتجات</strong><small class="muted">عند الإخفاء تتحول الكروت تلقائيًا لشكل نصي أكبر ومتناسق.</small></span><input v-model="draft.pos.showImages" class="switch" type="checkbox" /></label>
            <label class="field"><span>ترتيب المنتجات</span><select v-model="draft.pos.productSort"><option value="server">ترتيب السيرفر</option><option value="favorites">المفضلة أولًا</option><option value="name">حسب الاسم</option><option value="price">حسب السعر</option></select></label>
            <label class="switch-row"><span><strong>المفضلة</strong><small class="muted">إظهار نجمة سريعة داخل كل كارت.</small></span><input v-model="draft.pos.favorites" class="switch" type="checkbox" /></label>
          </div>

          <div class="settings-subsection">
            <h3>السلة وتنفيذ الطلب</h3>
            <label class="switch-row"><span><strong>إظهار شريط السلة وهي فارغة</strong><small class="muted">السلة نفسها تفتح كدرج عند الضغط على الشريط.</small></span><input v-model="draft.pos.keepCartOpen" class="switch" type="checkbox" /></label>
            <label class="switch-row"><span><strong>حفظ المسودة تلقائيًا</strong><small class="muted">يتم في الخلفية بعد توقف اللمس.</small></span><input v-model="draft.pos.autosaveDraft" class="switch" type="checkbox" /></label>
            <label class="switch-row"><span><strong>الدفع السريع</strong><small class="muted">يظهر فقط لمن يملك صلاحية التحصيل.</small></span><input v-model="draft.pos.quickPay" class="switch" type="checkbox" /></label>
            <label class="switch-row"><strong>زر نقدي سريع</strong><input v-model="draft.pos.quickCash" class="switch" type="checkbox" /></label>
            <label class="switch-row"><strong>زر كي نت سريع</strong><input v-model="draft.pos.quickKnet" class="switch" type="checkbox" /></label>
            <label class="switch-row"><strong>إظهار زر إرسال المطبخ</strong><input v-model="draft.pos.showKitchen" class="switch" type="checkbox" /></label>
            <label class="switch-row"><strong>تأكيد قبل الدفع</strong><input v-model="draft.pos.confirmPayment" class="switch" type="checkbox" /></label>
            <label class="switch-row"><span><strong>تأكيد قبل الإرسال للمطبخ</strong><small class="muted">يمنع الإرسال بالخطأ عند لمس الزر.</small></span><input v-model="draft.pos.confirmKitchen" class="switch" type="checkbox" /></label>
          </div>
        </section>
        <section v-else-if="tab === 'payment'" class="settings-section stack">
          <div><h2>طرق الدفع على هذا التابلت</h2><p>الطرق تأتي بأسمائها الفعلية من إعدادات الفرع. إخفاء أي طريقة هنا محلي لهذا الجهاز فقط.</p></div>
          <div class="managed-note"><strong>{{ enabledPaymentCount }} من {{ paymentOptions.length }} مفعلة</strong><br />أي طريقة جديدة يضيفها السيرفر ستظهر تلقائيًا حتى تقوم بإخفائها.</div>
          <div class="payment-settings-grid">
            <button v-for="item in paymentOptions" :key="item.id" type="button" class="payment-setting-card" :class="{ enabled: paymentEnabled(item.id) }" :disabled="!canManage" @click="togglePayment(item.id)">
              <AppIcon :name="paymentMethodIcon(item.id)" :size="24" />
              <span><strong>{{ item.label }}</strong><small>{{ item.id }}</small></span>
              <i>{{ paymentEnabled(item.id) ? 'مفعلة ✓' : 'مخفية' }}</i>
            </button>
          </div>
          <label class="switch-row"><span><strong>السماح بتقسيم الدفع</strong><small class="muted">يظهر فقط إذا كان السيرفر يسمح بالتقسيم وهناك طريقتان مفعّلتان على الأقل.</small></span><input v-model="draft.payment.allowSplit" class="switch" type="checkbox" /></label>
          <div class="managed-note">نقدي سريع وكي نت سريع يظهران في السلة فقط إذا كانت الطريقة نفسها مفعلة هنا ومع تفعيل أزرار الدفع السريع في إعدادات نقطة البيع.</div>
        </section>
        <section v-else-if="tab === 'tables'" class="settings-section"><div><h2>الطاولات</h2><p>العناصر والعمليات المسموحة على هذا الجهاز.</p></div><label v-for="item in [{key:'showCalls',label:'نداءات الجارسون'},{key:'showTimer',label:'مدة فتح الطاولة'},{key:'showTotal',label:'إجمالي الطاولة'},{key:'allowTransfer',label:'نقل الطلب'},{key:'allowMerge',label:'دمج الطاولات'},{key:'allowSplit',label:'تقسيم الطاولة'}]" :key="item.key" class="switch-row"><strong>{{ item.label }}</strong><input v-model="draft.tables[item.key as keyof DeviceSettings['tables']]" class="switch" type="checkbox" /></label></section>
        <section v-else-if="tab === 'notifications'" class="settings-section"><div><h2>التنبيهات</h2><p>الصوت والاهتزاز والأحداث المهمة.</p></div><label v-for="item in [{key:'sound',label:'الصوت'},{key:'vibration',label:'الاهتزاز'},{key:'tableCalls',label:'نداءات الطاولات'},{key:'pickups',label:'طلبات الاستلام'}]" :key="item.key" class="switch-row"><strong>{{ item.label }}</strong><input v-model="draft.notifications[item.key as keyof DeviceSettings['notifications']]" class="switch" type="checkbox" /></label></section>
        <section v-else-if="tab === 'sync'" class="settings-section"><div><h2>الأوفلاين والمزامنة</h2><p>سياسة حفظ الطلبات عند ضعف الشبكة.</p></div><label class="switch-row"><span><strong>إنشاء الطلب دون إنترنت</strong><small class="muted">يحفظ محليًا ويرسل تلقائيًا</small></span><input v-model="draft.sync.offlineOrders" class="switch" type="checkbox" /></label><label class="switch-row"><span><strong>تسجيل الدفع أوفلاين</strong><small class="muted">نقدي أو كي نت يُحفظ بمفتاح منع تكرار ثم يُرحّل بعد الطلب</small></span><input v-model="draft.sync.offlinePayments" class="switch" type="checkbox" /></label><label class="switch-row"><span><strong>مزامنة في الخلفية</strong><small class="muted">عند رجوع الاتصال وفتح التطبيق</small></span><input v-model="draft.sync.backgroundSync" class="switch" type="checkbox" /></label><label class="field"><span>دورية الفحص والتحديث</span><select v-model.number="draft.sync.intervalSeconds"><option :value="15">15 ثانية</option><option :value="30">30 ثانية</option><option :value="60">دقيقة</option><option :value="120">دقيقتان</option></select></label><div class="managed-note">الدفع الأوفلاين لا يعني تنفيذ عملية KNET البنكية لحظيًا؛ يسجل التحصيل على التابلت ويُرحّله للسيرفر عند الاتصال.</div></section>
        <section v-else class="settings-section stack">
          <div><h2>الطباعة</h2><p>اختر هل يطبع التابلت بنفسه أم يرسل المهمة إلى جهاز الفرع.</p></div>
          <label class="switch-row"><strong>تفعيل الطباعة</strong><input v-model="draft.printing.enabled" class="switch" type="checkbox" /></label>
          <label class="field"><span>طريقة طباعة الفاتورة</span><select v-model="draft.printing.mode"><option value="server">عن طريق جهاز الفرع — Print Agent</option><option value="tcp">شبكة محلية TCP — مباشر من التابلت</option><option value="bluetooth">Bluetooth — مباشر من تابلت Android</option><option value="airprint">AirPrint على iPad — اختيار يدوي</option></select></label>
          <div v-if="draft.printing.mode === 'server'" class="managed-note">التابلت يرسل مهمة الطباعة إلى Laravel، ويقوم Print Agent الموجود على كمبيوتر الفرع بطباعتها. يحتاج الوصول إلى السيرفر.</div>
          <template v-else-if="draft.printing.mode === 'tcp'">
            <div class="managed-note success-note">اتصال محلي مباشر: يعمل بدون إنترنت وبدون كمبيوتر، بشرط أن يكون التابلت والطابعة على نفس شبكة Wi‑Fi.</div>
            <div class="form-grid"><label class="field"><span>IP الطابعة</span><input v-model.trim="draft.printing.directHost" inputmode="decimal" placeholder="192.168.1.50" autocapitalize="off" autocorrect="off" /></label><label class="field"><span>Port</span><input v-model.number="draft.printing.directPort" type="number" min="1" max="65535" inputmode="numeric" placeholder="9100" /></label><label class="field"><span>مقاس الورق</span><select v-model.number="draft.printing.paperWidth"><option :value="80">80 mm</option><option :value="58">58 mm</option></select></label><label class="field"><span>مهلة الاتصال</span><select v-model.number="draft.printing.connectionTimeoutMs"><option :value="3000">3 ثوانٍ</option><option :value="5000">5 ثوانٍ</option><option :value="8000">8 ثوانٍ</option></select></label></div>
          </template>
          <template v-else-if="draft.printing.mode === 'bluetooth'">
            <div class="managed-note success-note">يعمل بدون إنترنت وبدون كمبيوتر على Android. اقترن بالطابعة أولًا من إعدادات Bluetooth في التابلت.</div>
            <div class="row"><label class="field grow"><span>الطابعة المقترنة</span><select v-model="draft.printing.bluetoothAddress" @change="selectBluetoothPrinter"><option value="">اختر الطابعة</option><option v-for="item in bluetoothPrinters" :key="item.address" :value="item.address">{{ item.name }} — {{ item.address }}</option></select></label><button class="btn btn-secondary" :disabled="bluetoothLoading" @click="loadBluetoothPrinters">{{ bluetoothLoading ? 'جاري البحث…' : 'تحديث الأجهزة' }}</button></div>
            <label class="field"><span>مقاس الورق</span><select v-model.number="draft.printing.paperWidth"><option :value="80">80 mm</option><option :value="58">58 mm</option></select></label>
          </template>
          <template v-if="draft.printing.mode === 'tcp' || draft.printing.mode === 'bluetooth'">
            <label class="switch-row"><span><strong>قص الورق تلقائيًا</strong><small class="muted">يعمل إذا كانت الطابعة تدعم Auto Cutter</small></span><input v-model="draft.printing.cutPaper" class="switch" type="checkbox" /></label>
          </template>
          <label class="switch-row"><span><strong>طباعة تلقائية عند حفظ الطلب</strong><small class="muted">تنطبق على طريقة الطباعة المختارة؛ الأوفلاين يُحفظ في طابور آمن</small></span><input v-model="draft.printing.autoPrintOnSave" class="switch" type="checkbox" /></label>
          <label class="switch-row"><span><strong>طباعة تلقائية بعد الدفع</strong><small class="muted">يطبع الفاتورة النهائية بعد نجاح التحصيل الكامل</small></span><input v-model="draft.printing.autoPrintAfterPayment" class="switch" type="checkbox" /></label>
          <div v-if="draft.printing.mode === 'airprint'" class="managed-note">AirPrint لا يحتاج Agent أو إنترنت، لكنه يعرض نافذة اختيار الطابعة والتأكيد على iPad.</div>
          <label class="field"><span>عدد نسخ الفاتورة</span><select v-model.number="draft.printing.receiptCopies"><option :value="1">نسخة واحدة</option><option :value="2">نسختان</option><option :value="3">3 نسخ</option></select></label>
          <label v-if="receiptPrinters.length" class="field"><span>طابعة الفاتورة الرئيسية</span><select v-model.number="draft.printing.receiptPrinterId"><option :value="null">تلقائي حسب إعداد الفرع</option><option v-for="printer in receiptPrinters" :key="printer.id" :value="printer.id">{{ printer.name }} · {{ printer.department || 'الكل' }} · {{ printer.paperWidth || 80 }}mm</option></select><small class="muted">توجيه KOT للمطبخ والمشروبات يظل مستقلًا حسب قواعد الأقسام.</small></label>
          <div class="settings-subsection">
            <h3>درج النقدية وصوت الطابعة</h3>
            <label class="switch-row"><span><strong>تفعيل درج النقدية على هذا التابلت</strong><small class="muted">الطابعة نفسها يجب أن تكون مفعلة للدرج من إعدادات السيرفر.</small></span><input v-model="draft.printing.cashDrawerEnabled" class="switch" type="checkbox" /></label>
            <label v-if="drawerPrinters.length" class="field"><span>طابعة درج النقدية</span><select v-model.number="draft.printing.cashDrawerPrinterId"><option :value="null">أول طابعة درج مفعلة</option><option v-for="printer in drawerPrinters" :key="printer.id" :value="printer.id">{{ printer.name }} · {{ printer.connectionType }}</option></select></label>
            <label class="switch-row"><span><strong>فتح الدرج تلقائيًا مع الدفع النقدي</strong><small class="muted">لا يفتح مع KNET أو إعادة طباعة الفاتورة، وكل عملية فتح تُسجل للمراجعة.</small></span><input v-model="draft.printing.cashDrawerAutoOpenCash" class="switch" type="checkbox" /></label>
            <div class="managed-note success-note">صوت الطابعة يُضبط لكل طابعة من شاشة طابعات الفرع؛ يمكن تشغيله للمطبخ أو المشروبات أو الفاتورة بصورة مستقلة.</div>
            <button v-if="auth.permissions.can_open_cash_drawer" class="btn btn-secondary" :disabled="!draft.printing.cashDrawerEnabled" @click="testCashDrawer">اختبار فتح درج النقدية</button>
          </div>
          <label v-if="draft.printing.mode === 'server' && printers.length" class="field"><span>طابعة الاختبار</span><select v-model.number="printerId"><option v-for="printer in printers" :key="printer.id" :value="printer.id">{{ printer.name }}{{ printer.active ? '' : ' — متوقفة' }}</option></select></label>
          <button class="btn btn-secondary" :disabled="!auth.permissions.can_print || (draft.printing.mode === 'server' && !printerId) || (draft.printing.mode === 'bluetooth' && !draft.printing.bluetoothAddress)" @click="testPrinter">{{ draft.printing.mode === 'tcp' ? 'طباعة اختبار TCP' : draft.printing.mode === 'bluetooth' ? 'طباعة اختبار Bluetooth' : draft.printing.mode === 'server' ? 'اختبار طابعة جهاز الفرع' : 'طريقة اختبار AirPrint' }}</button>
          <button class="btn btn-secondary" @click="previewLastReceipt">معاينة آخر فاتورة</button>
          <p v-if="printerMessage" class="success-text">{{ printerMessage }}</p>
        </section>
        <p v-if="error" class="error-text">{{ error }}</p>
      </fieldset>
    </div>
    <div v-if="showUnlock" class="modal-backdrop" @click.self="showUnlock = false">
      <form class="modal settings-unlock-modal" @submit.prevent="unlockSettings">
        <header class="modal-head"><AppIcon name="lock" :size="24" /><h2>فتح إعدادات التابلت</h2><button type="button" class="icon-button" aria-label="إغلاق" @click="showUnlock = false">×</button></header>
        <div class="modal-body stack"><p>أدخل نفس كلمة مرور مدير النظام أو صاحب المنشأة. لن يتم حفظها على الجهاز.</p><label class="field"><span>كلمة مرور المدير</span><input v-model="managerPassword" type="password" autocomplete="current-password" autofocus required /></label><p v-if="error" class="error-text">{{ error }}</p></div>
        <footer class="modal-foot"><button type="button" class="btn btn-secondary" @click="showUnlock = false">إلغاء</button><button class="btn btn-primary" :disabled="unlocking || !managerPassword">{{ unlocking ? 'جاري التحقق…' : 'فتح الإعدادات' }}</button></footer>
      </form>
    </div>
  </div>
</template>
