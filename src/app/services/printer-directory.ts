import { localDatabase } from '@/app/services/local-database';
import { scopedKey } from '@/app/services/data-scope';
import { waiterApi } from '@/app/services/waiter-api';
import type { Printer } from '@/shared/domain';

const CACHE_KEY = 'printer-directory';

export async function loadPrinterDirectory(refresh = navigator.onLine): Promise<Printer[]> {
  const key = scopedKey(CACHE_KEY);
  const cached = await localDatabase.cachePeek<Printer[]>(key);
  if (!refresh) return cached?.value ?? [];
  try {
    const printers = await waiterApi.printers();
    await localDatabase.cachePut(key, printers);
    return printers;
  } catch {
    return cached?.value ?? [];
  }
}

export async function selectedReceiptPrinter(printerId: number | null): Promise<Printer | null> {
  const printers = await loadPrinterDirectory(false);
  return printers.find(item => item.id === printerId && item.active)
    ?? printers.find(item => item.active && item.printReceipt)
    ?? null;
}

export async function selectedDrawerPrinter(printerId: number | null): Promise<Printer | null> {
  const printers = await loadPrinterDirectory(false);
  return printers.find(item => item.id === printerId && item.active && item.cashDrawer?.enabled)
    ?? printers.find(item => item.active && item.cashDrawer?.enabled)
    ?? null;
}
