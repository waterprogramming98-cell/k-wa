import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { appPreferences } from '@/app/services/preferences';
import { secureStorage } from '@/app/services/secure-storage';
import { waiterApi } from '@/app/services/waiter-api';
import { DEFAULT_DEVICE_SETTINGS, normalizeDeviceSettings } from '@/app/settings/defaults';
import type { DeviceSettings } from '@/shared/domain';
import { setUiLanguage } from '@/app/services/localization';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<DeviceSettings>(structuredClone(DEFAULT_DEVICE_SETTINGS));
  const ready = ref(false);
  const saving = ref(false);
  const remotePending = ref(false);
  const unlockToken = ref('');
  const unlockExpiresAt = ref(0);
  const isRtl = computed(() => settings.value.language === 'ar');
  const unlocked = computed(() => unlockToken.value !== '' && unlockExpiresAt.value > Date.now());

  function applyToDocument(): void {
    setUiLanguage(settings.value.language);
    document.documentElement.dataset.theme = settings.value.theme;
  }

  async function load(preferRemote = true): Promise<void> {
    unlockToken.value = '';
    unlockExpiresAt.value = 0;
    settings.value = await appPreferences.getDeviceSettings();
    const token = preferRemote ? await secureStorage.get('access_token') : null;
    if (token) {
      try {
        const remote = await waiterApi.deviceSettings();
        if (remote && typeof remote === 'object' && Object.keys(remote as object).length > 0) {
          settings.value = await appPreferences.setDeviceSettings(normalizeDeviceSettings(remote as Partial<DeviceSettings>));
          remotePending.value = false;
        }
      } catch { remotePending.value = true; }
    }
    ready.value = true;
    applyToDocument();
  }

  async function unlock(password: string): Promise<void> {
    const grant = await waiterApi.unlockDeviceSettings(password);
    unlockToken.value = grant.unlockToken;
    unlockExpiresAt.value = new Date(grant.expiresAt).getTime();
  }

  function lock(): void {
    unlockToken.value = '';
    unlockExpiresAt.value = 0;
  }

  async function save(next: DeviceSettings): Promise<void> {
    saving.value = true;
    try {
      const normalized = normalizeDeviceSettings(next);
      await waiterApi.updateDeviceSettings(normalized, unlocked.value ? unlockToken.value : '');
      settings.value = await appPreferences.setDeviceSettings(normalized);
      applyToDocument();
      remotePending.value = false;
    } finally {
      saving.value = false;
    }
  }

  async function reset(): Promise<void> {
    await save(structuredClone(DEFAULT_DEVICE_SETTINGS));
  }

  async function syncRemote(): Promise<void> {
    if (!remotePending.value) return;
    try {
      await waiterApi.updateDeviceSettings(settings.value, unlocked.value ? unlockToken.value : '');
      remotePending.value = false;
    } catch { /* Keep the local copy and retry on the next online event. */ }
  }

  return { settings, ready, saving, remotePending, isRtl, unlocked, load, save, reset, syncRemote, unlock, lock, applyToDocument };
});
