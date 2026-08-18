import type { DeviceSettings, LocalNetworkPrinter } from '@/shared/domain';

type PrintingSettings = DeviceSettings['printing'];

function activeOrFallback(settings: PrintingSettings, printer: LocalNetworkPrinter | undefined): LocalNetworkPrinter | null {
  if (!printer) return null;
  if (printer.active) return printer;
  if (!printer.fallbackPrinterId) return null;
  return settings.localPrinters.find(item => item.id === printer.fallbackPrinterId && item.active) ?? null;
}

export function localPrinterFallback(settings: PrintingSettings, printer: LocalNetworkPrinter): LocalNetworkPrinter | null {
  if (!printer.fallbackPrinterId) return null;
  return settings.localPrinters.find(item => item.id === printer.fallbackPrinterId && item.active) ?? null;
}

export function selectedLocalReceiptPrinter(settings: PrintingSettings): LocalNetworkPrinter | null {
  const selected = settings.localPrinters.find(item => item.id === settings.localReceiptPrinterId);
  return activeOrFallback(settings, selected)
    ?? settings.localPrinters.find(item => item.active && item.printReceipt)
    ?? null;
}

export function selectedLocalDrawerPrinter(settings: PrintingSettings): LocalNetworkPrinter | null {
  const selected = settings.localPrinters.find(item => item.id === settings.localCashDrawerPrinterId);
  const effective = activeOrFallback(settings, selected);
  if (effective?.cashDrawer.enabled) return effective;
  return settings.localPrinters.find(item => item.active && item.cashDrawer.enabled) ?? null;
}

export function localKotPrinters(settings: PrintingSettings): LocalNetworkPrinter[] {
  return settings.localPrinters.filter(item => item.active && item.printKot);
}

export function localPrinterLabel(printer: LocalNetworkPrinter): string {
  return `${printer.name} · ${printer.host}:${printer.port}`;
}
