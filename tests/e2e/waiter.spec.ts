import { expect, test } from '@playwright/test';

async function openExtraScreen(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'المزيد', exact: true }).click();
  await page.getByRole('link', { name }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'فتح النسخة التجريبية' }).click();
  await expect(page.getByRole('heading', { name: /أهلًا/ })).toBeVisible();
});

test('creates a delivery order through customer search and address selection', async ({ page }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await expect(page.locator('.order-type-strip').getByRole('button', { name: 'توصيل', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await expect(page.locator('.cart-line').filter({ hasText: 'أمريكانو' })).toBeVisible();
  await page.locator('.cart-close').click();
  await page.locator('.pos-compact-header').getByRole('button', { name: 'حفظ' }).click();
  await expect(page.locator('.toast')).toContainText('تم حفظ الطلب رقم');
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
  await page.reload();
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
});

test('clears the cart after sending a routed KOT to the kitchen', async ({ page }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await page.getByRole('button', { name: 'إرسال للمطبخ' }).click();
  await expect(page.locator('.toast')).toContainText('تم إرسال الطلب للمطبخ');
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
  await page.reload();
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
});

test('clears the cart after quick KNET payment', async ({ page }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await page.getByRole('button', { name: /كي نت سريع/ }).click();
  await page.getByRole('button', { name: 'تأكيد كي نت' }).click();
  await expect(page.locator('.toast')).toContainText('وتفريغ السلة');
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
  await page.reload();
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
});

test('clears the source cart after full detailed payment', async ({ page }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await page.getByRole('button', { name: 'الدفع بالتفصيل أو التقسيم' }).click();
  await page.getByRole('button', { name: /تأكيد دفع/ }).click();
  await expect(page.getByRole('heading', { name: 'تم الدفع بنجاح' })).toBeVisible();
  await page.getByRole('button', { name: 'طلب جديد' }).click();
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
  await page.reload();
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
});

test('switches order type with a populated cart and collapses order context', async ({ page }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  const started = Date.now();
  await page.locator('.order-type-strip').getByRole('button', { name: 'استلام', exact: true }).click();
  expect(Date.now() - started).toBeLessThan(1000);
  await expect(page.locator('.order-type-strip').getByRole('button', { name: 'استلام', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.compact-order-context')).toBeVisible();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.locator('.cart-order-type-options').getByRole('button', { name: 'توصيل', exact: true })).toBeVisible();
  await page.locator('.cart-order-type-options').getByRole('button', { name: 'توصيل', exact: true }).click();
  await expect(page.locator('.cart-order-type-options').getByRole('button', { name: 'توصيل', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.cart-line')).toHaveCount(1);
  await page.locator('.cart-close').click();
  await expect(page.locator('.order-type-strip').getByRole('button', { name: 'توصيل', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('configures a sandwich with product options, modifiers, and combo choices', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 1280 });
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.product-card').filter({ hasText: 'برجر لحم' }).click();

  await expect(page.getByRole('heading', { name: 'برجر لحم' })).toBeVisible();
  await expect(page.getByText('اختيار المنتج', { exact: true })).toBeVisible();
  await expect(page.getByText('إضافات', { exact: true })).toBeVisible();
  await expect(page.getByText('اختيار الوجبة', { exact: true })).toBeVisible();
  await expect(page.locator('.modal')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: /تأكيد/ }).click();
  await expect(page.getByText(/اختر من مجموعة «اختيار الخبز»/)).toBeVisible();
  await page.getByRole('button', { name: /خبز عادي/ }).click();
  await page.getByRole('button', { name: /جبن/ }).click();
  await page.getByRole('button', { name: 'سفن أب', exact: true }).click();
  await page.getByRole('button', { name: /تأكيد/ }).click();

  await page.getByRole('button', { name: 'عرض السلة' }).click();
  const line = page.locator('.cart-line').filter({ hasText: 'برجر لحم' });
  await expect(line).toContainText('خبز عادي');
  await expect(line).toContainText('جبن');
  await expect(line).toContainText('سفن أب');
});

test('records quick cash offline and exposes it in the sync queue', async ({ page, context }) => {
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: /نقدي سريع/ }).click();
  await expect(page.getByRole('heading', { name: 'تأكيد الدفع النقدي' })).toBeVisible();
  await page.getByRole('button', { name: 'تأكيد نقدي' }).click();
  await expect(page.locator('.toast')).toContainText('أوفلاين');
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toContainText('السلة فارغة');
  await openExtraScreen(page, 'المزامنة والطباعة');
  await expect(page.getByText('دفع أوفلاين')).toBeVisible();
  await context.setOffline(false);
});

test('persists the POS image visibility setting locally', async ({ page }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.getByRole('button', { name: /نقطة البيع/ }).click();
  await page.getByLabel('ألوان التصنيفات').selectOption('both');
  await page.getByLabel('شكل كارت المنتج').selectOption('accent');
  await page.getByLabel('حجم اسم وسعر المنتج').selectOption('xlarge');
  const imageToggle = page.locator('label.switch-row').filter({ hasText: 'إظهار صور المنتجات' }).getByRole('checkbox');
  await imageToggle.uncheck();
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await expect(page.getByRole('button', { name: /تم الحفظ/ })).toBeVisible();
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await expect(page.locator('.product-image')).toHaveCount(0);
  await expect(page.locator('.compact-pos')).toHaveClass(/product-font-xlarge/);
  await expect(page.locator('.compact-pos')).toHaveClass(/category-chip-colors/);
  await expect(page.locator('.product-grid')).toHaveClass(/category-card-colors/);
  await expect(page.locator('.product-grid')).toHaveClass(/card-style-accent/);
  const categoryAccents = await page.locator('.category-chip').evaluateAll(elements => elements.slice(0, 3).map(element => (element as HTMLElement).style.getPropertyValue('--category-accent')));
  expect(new Set(categoryAccents).size).toBe(3);
  const textCard = page.locator('.product-card.no-image').first();
  await expect(textCard).toBeVisible();
  expect(await textCard.locator('.product-body strong').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(22);
});

test('opens the daily operation screens and completes a demo payment', async ({ page }) => {
  await openExtraScreen(page, 'الاستلام');
  await expect(page.getByRole('heading', { name: 'طلبات الاستلام' })).toBeVisible();
  await expect(page.getByText('INV-503')).toBeVisible();
  await expect(page.getByText(/50000001/)).toBeVisible();

  await page.getByRole('link', { name: 'طلباتي' }).click();
  await expect(page.getByRole('heading', { name: 'الطلبات' })).toBeVisible();
  await expect(page.getByText('في طابور الطباعة')).toBeVisible();
  await expect(page.getByText('تمت الطباعة')).toBeVisible();
  const pickupOrder = page.locator('.order-card').filter({ hasText: 'INV-503' });
  await pickupOrder.getByRole('button', { name: 'الدفع' }).click();
  await expect(page.getByRole('heading', { name: /تحصيل الطلب/ })).toBeVisible();
  await page.getByRole('button', { name: /تأكيد دفع/ }).click();
  await expect(page.getByRole('heading', { name: 'تم الدفع بنجاح' })).toBeVisible();

  await openExtraScreen(page, 'الوردية');
  await expect(page.getByRole('heading', { name: 'الوردية', exact: true })).toBeVisible();
  await expect(page.getByText('إجمالي التحصيل')).toBeVisible();
});

test('shows all branch payment methods, saves local visibility, and opens the full change workflow', async ({ page }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.locator('.settings-nav').getByRole('button', { name: /طرق الدفع/ }).click();
  await expect(page.locator('.payment-setting-card')).toHaveCount(12);
  const hiddenMethod = page.locator('.payment-setting-card').filter({ hasText: 'طريقة مخصصة' });
  await expect(hiddenMethod).toHaveClass(/enabled/);
  await hiddenMethod.click();
  await expect(hiddenMethod).not.toHaveClass(/enabled/);
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();

  await page.getByRole('link', { name: 'طلباتي' }).click();
  const paidOrder = page.locator('.order-card').filter({ hasText: 'INV-504' });
  await paidOrder.getByRole('button', { name: 'تغيير الدفع' }).click();
  await expect(page.getByRole('heading', { name: 'تغيير طريقة الدفع' })).toBeVisible();
  await expect(page.locator('.payment-change-methods .payment-method')).toHaveCount(11);
  await page.getByRole('button', { name: 'تقسيم بالمبلغ' }).click();
  await expect(page.locator('.payment-allocation-grid input')).toHaveCount(11);
  await page.getByRole('button', { name: 'تقسيم بالأصناف' }).click();
  await expect(page.locator('.payment-item-row')).toHaveCount(1);
});

test('adds a customer and address from the customer workflow', async ({ page }) => {
  await openExtraScreen(page, 'العملاء');
  await page.getByRole('button', { name: '＋ إضافة عميل' }).click();
  await page.getByRole('button', { name: '＋ إضافة عميل جديد' }).click();
  await page.getByLabel('اسم العميل *').fill('عميل اختبار');
  await page.getByLabel('رقم الهاتف *').fill('55500123');
  await page.getByRole('button', { name: 'حفظ العميل' }).click();
  await expect(page.getByText('لا توجد عناوين لهذا العميل')).toBeVisible();
  await page.getByRole('button', { name: 'إضافة أول عنوان' }).click();
  await page.getByLabel('اسم العنوان *').fill('المنزل');
  await page.getByLabel('المنطقة *').fill('السالمية');
  await page.getByLabel('الجادة').fill('الجادة 3');
  await page.getByLabel('علامة مميزة').fill('بجوار الجمعية');
  await page.getByRole('button', { name: 'حفظ العنوان' }).click();
  await expect(page.locator('.customer-modal')).toBeHidden();
});

test('enables tables from settings and runs a table transfer', async ({ page }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.locator('.settings-nav').getByRole('button', { name: /الشاشات/ }).click();
  await page.locator('label.switch-row').filter({ hasText: 'الطاولات' }).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await page.getByRole('link', { name: 'الطاولات' }).click();
  await expect(page.getByRole('heading', { name: 'الطاولات' })).toBeVisible();
  const table = page.locator('.table-card').filter({ hasText: 'T2' });
  await table.click();
  await page.locator('.table-selection-panel').getByRole('button', { name: 'نقل' }).click();
  await page.getByLabel('إلى الطاولة *').selectOption('1');
  await page.getByRole('button', { name: 'تأكيد العملية' }).click();
  await expect(page.getByText('تم نقل الطلب')).toBeVisible();
  await page.locator('.table-card.available').filter({ hasText: 'T1' }).dblclick();
  await expect(page.locator('.pos-compact-header')).toBeVisible();
  await expect(page.locator('.context-summary')).toContainText('T1');
});

test('keeps cached tables usable offline and marks local table orders', async ({ page, context }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.getByRole('button', { name: 'كاشير', exact: true }).click();
  await page.locator('.settings-nav').getByRole('button', { name: /الشاشات/ }).click();
  await page.locator('label.switch-row').filter({ hasText: 'الطاولات' }).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await page.getByRole('link', { name: 'الطاولات' }).click();

  const available = page.locator('.table-card.available').filter({ hasText: 'T1' });
  const occupied = page.locator('.table-card.occupied').filter({ hasText: 'T2' });
  const withCall = page.locator('.table-card.has-call').filter({ hasText: 'T3' });
  await expect(available).toContainText('متاحة');
  await expect(occupied).toContainText('مشغولة');
  await expect(withCall).toContainText('تطلب جارسون');
  const colors = await page.evaluate(() => ({
    available: getComputedStyle(document.querySelector('.table-card.available')!).color,
    occupied: getComputedStyle(document.querySelector('.table-card.occupied:not(.has-call)')!).color,
    pending: getComputedStyle(document.querySelector('.table-card.pending_confirmation')!).color,
    reserved: getComputedStyle(document.querySelector('.table-card.reserved')!).color,
  }));
  expect(new Set(Object.values(colors)).size).toBe(4);
  expect(await page.locator('.tables-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(4);
  await page.setViewportSize({ width: 800, height: 1280 });
  expect(await page.locator('.tables-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Preload the lazy POS bundle before emulating a disconnected dev server;
  // packaged tablet builds read this asset locally even while offline.
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await expect(page.locator('.pos-compact-header')).toBeVisible();
  await page.getByRole('link', { name: 'الطاولات' }).click();
  await context.setOffline(true);
  await expect(page.getByText(/أوفلاين — آخر تحديث/)).toBeVisible();
  await available.click();
  await page.locator('.table-selection-panel').getByRole('button', { name: 'طلب جديد' }).click();
  await expect(page.locator('.context-summary')).toContainText('T1');
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.locator('.pos-compact-header').getByRole('button', { name: 'حفظ' }).click();
  await expect(page.locator('.toast')).toContainText('سيُرسل عند عودة الاتصال');
  await page.getByRole('link', { name: 'الطاولات' }).click();
  const localTable = page.locator('.table-card').filter({ hasText: 'T1' });
  await expect(localTable).toContainText('مشغولة');
  await expect(localTable).toContainText('محلي');
  await page.locator('.table-card').filter({ hasText: 'T3' }).click();
  await expect(page.locator('.table-selection-panel').getByRole('button', { name: 'نقل' })).toBeDisabled();
  await context.setOffline(false);
});

test('configures multiple direct tablet printers without a print agent', async ({ page }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.locator('.settings-nav').getByRole('button', { name: /الطباعة/ }).click();
  await page.getByLabel('طريقة طباعة الفاتورة').selectOption('tcp');
  await expect(page.getByText(/يعمل بدون إنترنت وبدون كمبيوتر/)).toBeVisible();
  await page.getByRole('button', { name: 'إضافة طابعة' }).click();
  let printerModal = page.locator('.local-printer-modal');
  await printerModal.getByLabel('اسم الطابعة').fill('طابعة الفاتورة');
  await printerModal.getByLabel('IP الطابعة').fill('192.168.1.50');
  await printerModal.getByLabel('Port').fill('9100');
  await printerModal.getByLabel('مقاس الورق').selectOption('58');
  await printerModal.getByRole('checkbox', { name: /طباعة الفاتورة/ }).check();
  await printerModal.getByRole('checkbox', { name: /طباعة KOT/ }).uncheck();
  await page.getByRole('button', { name: 'حفظ الطابعة' }).click();
  await page.getByRole('button', { name: 'إضافة طابعة' }).click();
  printerModal = page.locator('.local-printer-modal');
  await printerModal.getByLabel('اسم الطابعة').fill('طابعة المشروبات');
  await printerModal.getByLabel('IP الطابعة').fill('192.168.1.51');
  await printerModal.getByLabel('القسم').selectOption('beverage');
  await page.getByRole('button', { name: 'حفظ الطابعة' }).click();
  await expect(page.locator('.local-printer-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await expect(page.getByRole('button', { name: /تم الحفظ/ })).toBeVisible();
  await page.reload();
  await page.locator('.settings-nav').getByRole('button', { name: /الطباعة/ }).click();
  await expect(page.getByLabel('طريقة طباعة الفاتورة')).toHaveValue('tcp');
  await expect(page.locator('.local-printer-card').filter({ hasText: 'طابعة الفاتورة' })).toContainText('192.168.1.50:9100');
  await expect(page.locator('.local-printer-card').filter({ hasText: 'طابعة المشروبات' })).toContainText('192.168.1.51:9100');
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await page.locator('.context-summary').click();
  await page.getByPlaceholder(/اكتب الاسم/).fill('محمد');
  await page.getByRole('button', { name: /محمد علي/ }).click();
  await page.getByRole('button', { name: /المنزل/ }).click();
  await page.locator('.product-card').filter({ hasText: 'أمريكانو' }).click();
  await page.locator('.pos-compact-header').getByRole('button', { name: 'حفظ' }).click();
  await expect(page.locator('.toast')).toContainText('الطباعة محفوظة في الطابور');
  await openExtraScreen(page, 'المزامنة والطباعة');
  await expect(page.getByRole('heading', { name: 'طابور الطباعة المباشرة' })).toBeVisible();
  await expect(page.getByText(/الطباعة المباشرة متاحة داخل تطبيق التابلت المثبت فقط/)).toBeVisible();
});

test('keeps the approved compact POS usable in landscape and portrait', async ({ page }) => {
  await openExtraScreen(page, 'الإعدادات');
  await page.getByRole('button', { name: 'كاشير', exact: true }).click();
  await page.locator('.settings-nav').getByRole('button', { name: /نقطة البيع/ }).click();
  await page.getByLabel('عدد المنتجات في الصف').selectOption('3');
  await page.getByRole('button', { name: 'حفظ الإعدادات' }).click();
  await page.getByRole('link', { name: 'نقطة البيع' }).click();
  await expect(page.locator('.desktop-cart')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'عرض السلة' })).toBeVisible();
  await expect(page.locator('.order-type-strip')).toBeVisible();
  await expect(page.locator('.order-type-strip').getByRole('button')).toHaveCount(4);
  await expect(page.locator('.app-shell')).toHaveClass(/tablet-landscape/);
  await page.locator('.categories').evaluate(element => {
    for (let index = 0; index < 12; index += 1) {
      const category = document.createElement('button');
      category.className = 'chip category-chip';
      category.textContent = `قسم اختبار طويل جدًا ${index + 1}`;
      element.append(category);
    }
  });
  const landscapeChrome = await page.evaluate(() => ({
    header: document.querySelector('.pos-compact-header')?.getBoundingClientRect().height ?? 999,
    cart: document.querySelector('.cart-summary-bar')?.getBoundingClientRect().height ?? 999,
    footer: document.querySelector('.bottom-nav')?.getBoundingClientRect().height ?? 999,
  }));
  expect(landscapeChrome.header).toBeLessThanOrEqual(44);
  expect(landscapeChrome.cart).toBeLessThanOrEqual(42);
  expect(landscapeChrome.footer).toBeLessThanOrEqual(50);
  const landscapeColumns = await page.locator('.product-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(landscapeColumns).toBe(3);
  const landscapeOverflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    shell: (document.querySelector('.pos-shell')?.scrollWidth ?? 0) - (document.querySelector('.pos-shell')?.clientWidth ?? 0),
    page: (document.querySelector('.compact-pos')?.scrollWidth ?? 0) - (document.querySelector('.compact-pos')?.clientWidth ?? 0),
    catalog: (document.querySelector('.catalog-pane')?.scrollWidth ?? 0) - (document.querySelector('.catalog-pane')?.clientWidth ?? 0),
  }));
  expect(landscapeOverflow).toEqual({ document: 0, shell: 0, page: 0, catalog: 0 });
  await page.locator('.product-card').first().click();
  await page.getByRole('button', { name: 'عرض السلة' }).click();
  await expect(page.locator('.cart-order-type-options').getByRole('button')).toHaveCount(4);
  await page.locator('.cart-close').click();

  await page.setViewportSize({ width: 800, height: 1280 });
  await expect(page.locator('.app-shell')).not.toHaveClass(/tablet-landscape/);
  await expect(page.locator('.product-grid')).toBeVisible();
  const portraitColumns = await page.locator('.product-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(portraitColumns).toBe(3);
  const portraitOverflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    page: (document.querySelector('.compact-pos')?.scrollWidth ?? 0) - (document.querySelector('.compact-pos')?.clientWidth ?? 0),
    catalog: (document.querySelector('.catalog-pane')?.scrollWidth ?? 0) - (document.querySelector('.catalog-pane')?.clientWidth ?? 0),
  }));
  expect(portraitOverflow).toEqual({ document: 0, page: 0, catalog: 0 });
});
