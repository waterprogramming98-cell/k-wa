<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/app/stores/auth';
import { useSettingsStore } from '@/app/stores/settings';
import { useSyncStore } from '@/app/stores/sync';
import NotificationCenter from '@/components/NotificationCenter.vue';
import AppIcon from '@/components/AppIcon.vue';
import { directPrintQueue, requestCashDrawerOpen } from '@/app/services/direct-printing';
import { loadPrinterDirectory } from '@/app/services/printer-directory';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const settings = useSettingsStore();
const sync = useSyncStore();
const pendingPrints = ref(0);
const moreOpen = ref(false);
const tabletLandscape = ref(false);
const drawerOpen = ref(false);
const drawerReason = ref('');
const drawerBusy = ref(false);
const drawerError = ref('');

function updateViewportMode(): void {
  const orientationType = window.screen.orientation?.type ?? '';
  tabletLandscape.value = window.innerWidth > window.innerHeight
    || (window.innerWidth === window.innerHeight && orientationType.startsWith('landscape'));
}

async function loadPendingPrints(): Promise<void> {
  pendingPrints.value = (await directPrintQueue.jobs()).filter(job => job.status !== 'completed').length;
}
const printQueueChanged = () => { void loadPendingPrints(); };
onMounted(async () => {
  updateViewportMode();
  await Promise.all([loadPendingPrints(), loadPrinterDirectory(navigator.onLine).catch(() => [])]);
  window.addEventListener('kwaiter:print-queue-changed', printQueueChanged);
  window.addEventListener('resize', updateViewportMode);
  window.screen.orientation?.addEventListener('change', updateViewportMode);
});
onUnmounted(() => {
  window.removeEventListener('kwaiter:print-queue-changed', printQueueChanged);
  window.removeEventListener('resize', updateViewportMode);
  window.screen.orientation?.removeEventListener('change', updateViewportMode);
});
watch(() => route.fullPath, () => { moreOpen.value = false; });

const allItems = [
  { to: '/', screen: 'home', permission: null, icon: 'home', label: 'الرئيسية', primary: true },
  { to: '/tables', screen: 'tables', permission: 'can_tables', icon: 'tables', label: 'الطاولات', primary: true },
  { to: '/pos', screen: 'pos', permission: 'can_sell', icon: 'pos', label: 'نقطة البيع', primary: true },
  { to: '/orders', screen: 'orders', permission: 'can_orders', icon: 'receipt', label: 'طلباتي', primary: true },
  { to: '/pickups', screen: 'pickups', permission: 'can_pickup', icon: 'pickup', label: 'الاستلام', primary: false },
  { to: '/customers', screen: 'customers', permission: 'can_manage_customers', icon: 'users', label: 'العملاء', primary: false },
  { to: '/shift', screen: 'shift', permission: 'can_shift', icon: 'shift', label: 'الوردية', primary: false },
  { to: '/sync', screen: null, permission: null, icon: 'sync', label: 'المزامنة والطباعة', primary: false },
  { to: '/settings', screen: null, permission: null, icon: 'settings', label: 'الإعدادات', primary: false },
  { to: '/health', screen: null, permission: null, icon: 'cloud-check', label: 'صحة الجهاز', primary: false },
] as const;

const items = computed(() => allItems.filter(item => {
  if (item.to === '/pickups' && !(auth.permissions.can_pickup || auth.permissions.can_pay || auth.permissions.can_orders)) return false;
  if (item.to === '/customers' && !(auth.permissions.can_manage_customers || auth.permissions.can_sell)) return false;
  if (item.permission && !auth.permissions[item.permission]) return false;
  if (item.screen && !settings.settings.screens[item.screen]) return false;
  return true;
}));
const primaryItems = computed(() => items.value.filter(item => item.primary));
const moreItems = computed(() => items.value.filter(item => !item.primary));
const posRoute = computed(() => route.path.startsWith('/pos'));
const moreActive = computed(() => moreItems.value.some(item => isActive(item.to)));

function isActive(path: string): boolean {
  return path === '/' ? route.path === '/' : route.path.startsWith(path);
}

async function openCashDrawer(): Promise<void> {
  if (drawerReason.value.trim().length < 3 || drawerBusy.value) return;
  drawerBusy.value = true;
  drawerError.value = '';
  try {
    await requestCashDrawerOpen(settings.settings, { trigger: 'manual', reason: drawerReason.value.trim() });
    drawerReason.value = '';
    drawerOpen.value = false;
  } catch (reason) {
    drawerError.value = reason instanceof Error ? reason.message : 'تعذر فتح درج النقدية';
  } finally {
    drawerBusy.value = false;
  }
}
</script>

<template>
  <div class="app-shell" :class="{ 'pos-shell': posRoute, 'tablet-landscape': posRoute && tabletLandscape }">
    <header v-if="!posRoute" class="topbar">
      <div class="topbar-brand">
        <div class="brand-mark">K</div>
        <div><strong>K-Waiter</strong><small>{{ auth.location?.name || 'الفرع' }}</small></div>
      </div>
      <div class="topbar-status">
        <button v-if="sync.pendingCount" class="status-pill" @click="router.push('/sync')"><AppIcon name="sync" :size="16" /> {{ sync.pendingCount }}</button>
        <button v-if="pendingPrints" class="status-pill" @click="router.push('/sync')"><AppIcon name="printer" :size="16" /> {{ pendingPrints }}</button>
        <NotificationCenter />
        <div class="user-chip"><span class="avatar">{{ auth.user?.name?.slice(0, 1) }}</span><span><strong>{{ auth.user?.name }}</strong><small>{{ settings.settings.deviceName }}</small></span></div>
      </div>
    </header>

    <main class="app-content"><slot /></main>

    <nav class="bottom-nav" aria-label="التنقل الرئيسي">
      <RouterLink v-for="item in primaryItems" :key="item.to" :to="item.to" :class="{ active: isActive(item.to) }">
        <AppIcon :name="item.icon" :size="20" />
        <span>{{ item.label }}</span>
      </RouterLink>
      <button class="bottom-nav-more" :class="{ active: moreActive || moreOpen }" aria-label="المزيد" @click="moreOpen = true">
        <AppIcon name="more" :size="20" /><span>المزيد</span>
        <b v-if="sync.pendingCount || pendingPrints">{{ sync.pendingCount + pendingPrints }}</b>
      </button>
    </nav>

    <Teleport to="body">
      <div v-if="moreOpen" class="more-backdrop" @click.self="moreOpen = false">
        <section class="more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
          <header>
            <div class="more-user"><span class="avatar">{{ auth.user?.name?.slice(0, 1) }}</span><span><strong id="more-title">{{ auth.user?.name }}</strong><small>{{ settings.settings.deviceName }} · {{ auth.location?.name || 'الفرع' }}</small></span></div>
            <div class="row"><NotificationCenter /><button class="icon-button" aria-label="إغلاق" @click="moreOpen = false"><AppIcon name="close" /></button></div>
          </header>
          <nav class="more-grid" aria-label="شاشات إضافية">
            <RouterLink v-for="item in moreItems" :key="item.to" :to="item.to" :class="{ active: isActive(item.to) }">
              <span class="more-icon"><AppIcon :name="item.icon" :size="23" /></span>
              <span><strong>{{ item.label }}</strong><small v-if="item.to === '/sync' && (sync.pendingCount || pendingPrints)">{{ sync.pendingCount }} مزامنة · {{ pendingPrints }} طباعة</small></span>
            </RouterLink>
            <button v-if="auth.permissions.can_open_cash_drawer && settings.settings.printing.cashDrawerEnabled" type="button" class="drawer-action" @click="moreOpen = false; drawerOpen = true">
              <span class="more-icon"><AppIcon name="cash" :size="23" /></span>
              <span><strong>فتح درج النقدية</strong><small>يتطلب تسجيل سبب الفتح</small></span>
            </button>
          </nav>
        </section>
      </div>
      <div v-if="drawerOpen" class="modal-backdrop" @click.self="drawerOpen = false">
        <form class="modal cash-drawer-modal" @submit.prevent="openCashDrawer">
          <header class="modal-head"><AppIcon name="cash" :size="25" /><h2>فتح درج النقدية</h2><button type="button" class="icon-button" aria-label="إغلاق" @click="drawerOpen = false"><AppIcon name="close" /></button></header>
          <div class="modal-body stack"><p>اكتب سبب الفتح اليدوي. سيتم تسجيل المستخدم والوقت والطابعة للمراجعة.</p><label class="field"><span>سبب الفتح</span><input v-model.trim="drawerReason" maxlength="255" placeholder="مثال: صرف مبلغ للعميل" autofocus required /></label><p v-if="drawerError" class="error-text">{{ drawerError }}</p></div>
          <footer class="modal-foot"><button type="button" class="btn btn-secondary" @click="drawerOpen = false">إلغاء</button><button class="btn btn-primary" :disabled="drawerBusy || drawerReason.trim().length < 3">{{ drawerBusy ? 'جاري الفتح…' : 'فتح الدرج' }}</button></footer>
        </form>
      </div>
    </Teleport>
  </div>
</template>
