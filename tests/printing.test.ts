import { describe, expect, it } from 'vitest';
import { normalizeDeviceSettings } from '@/app/settings/defaults';
import { createEmptyDraft } from '@/app/stores/order';
import { receiptFromDraft } from '@/app/services/receipt';
import { validateDirectPrinter } from '@/app/services/direct-printing';

describe('direct local printing', () => {
  it('normalizes the LAN printer configuration safely', () => {
    const settings = normalizeDeviceSettings({
      printing: {
        mode: 'tcp', directHost: ' 192.168.1.50 ', directPort: 9100,
        paperWidth: 58, connectionTimeoutMs: 8000,
      },
    } as never);
    expect(settings.printing.directHost).toBe('192.168.1.50');
    expect(settings.printing.directPort).toBe(9100);
    expect(settings.printing.paperWidth).toBe(58);
    expect(() => validateDirectPrinter(settings.printing)).not.toThrow();
  });

  it('falls back from invalid port and rejects a missing printer address', () => {
    const settings = normalizeDeviceSettings({ printing: { mode: 'tcp', directPort: 99999 } } as never);
    expect(settings.printing.directPort).toBe(9100);
    expect(() => validateDirectPrinter(settings.printing)).toThrow('IP الطابعة');
  });

  it('keeps multiple local printers and their independent routes', () => {
    const settings = normalizeDeviceSettings({
      printing: {
        mode: 'tcp',
        localReceiptPrinterId: 'receipt',
        localPrinters: [
          { id: 'receipt', name: 'Receipt', host: '192.168.1.50', port: 9100, paperWidth: 80, active: true, printReceipt: true, printKot: false, department: 'cashier', categoryIds: [], fallbackPrinterId: null, cashDrawer: { enabled: true, pin: 0, onMs: 120, offMs: 240 }, buzzer: { enabled: false, mode: 'bel', count: 1, duration: 2 } },
          { id: 'beverage', name: 'Beverage', host: '192.168.1.51', port: 9100, paperWidth: 58, active: true, printReceipt: false, printKot: true, department: 'beverage', categoryIds: [7, 8], fallbackPrinterId: 'receipt', cashDrawer: { enabled: false, pin: 0, onMs: 120, offMs: 240 }, buzzer: { enabled: true, mode: 'esc-b', count: 2, duration: 3 } },
        ],
      },
    } as never);
    expect(settings.printing.localPrinters).toHaveLength(2);
    expect(settings.printing.localPrinters[1]?.categoryIds).toEqual([7, 8]);
    expect(settings.printing.localPrinters[1]?.fallbackPrinterId).toBe('receipt');
    expect(settings.printing.localPrinters[1]?.buzzer.enabled).toBe(true);
    expect(() => validateDirectPrinter(settings.printing)).not.toThrow();
  });

  it('creates an offline Arabic receipt snapshot from the saved cart', () => {
    const draft = createEmptyDraft('delivery');
    draft.updatedAt = '2026-08-14T10:00:00.000Z';
    draft.customerSnapshot = { id: 7, name: 'أحمد محمد', mobile: '50000000' };
    draft.lines = [{
      localId: 'line-1', productId: 1, name: 'قهوة عربية', quantity: 2,
      unitPrice: 1.25, choices: [{ id: 2, name: 'سكر زيادة', price: 0.25 }], note: 'ساخنة',
    }];
    const receipt = receiptFromDraft(draft, { businessName: 'مطعم الاختبار', temporary: true });
    expect(receipt.temporary).toBe(true);
    expect(receipt.customerName).toBe('أحمد محمد');
    expect(receipt.total).toBe(3);
    expect(receipt.lines[0]?.choices).toEqual(['سكر زيادة']);
  });
});
