import type { Language, OrderType } from '@/shared/domain';

let activeLanguage: Language = 'ar';
let observer: MutationObserver | null = null;

const translations: Record<string, string> = {
  'الرئيسية': 'Home', 'الطاولات': 'Tables', 'نقطة البيع': 'Point of Sale', 'طلباتي': 'My Orders',
  'الاستلام': 'Pickup', 'العملاء': 'Customers', 'الوردية': 'Shift', 'المزامنة والطباعة': 'Sync & Printing',
  'الإعدادات': 'Settings', 'صحة الجهاز': 'Device Health', 'المزيد': 'More', 'الفرع': 'Branch',
  'التنقل الرئيسي': 'Main navigation', 'شاشات إضافية': 'More screens', 'إغلاق': 'Close', 'رجوع': 'Back',
  'تحديث مطلوب': 'Update Required', 'تحديث جديد متاح': 'New Update Available',
  'حدّث التطبيق للحصول على أحدث تحسينات التشغيل والأمان.': 'Update the app to get the latest operational and security improvements.',
  'النسخة الجديدة لم تُرفع بعد. تواصل مع مسؤول النظام.': 'The new build has not been uploaded yet. Contact your system administrator.',
  'لاحقًا': 'Later', 'تعذر فحص التحديثات': 'Unable to check for updates', 'تحديث التطبيق': 'App Update',
  'متابعة العمل مؤقتًا': 'Continue Working Temporarily',
  'جاري فحص التحديث…': 'Checking for updates…', 'جاري الفحص…': 'Running checks…',
  'أنت تستخدم أحدث إصدار': 'You are using the latest version', 'لم تتوفر معلومات التحديث': 'Update information is unavailable',
  'طلب جديد': 'New Order', 'تعديل الطلب': 'Edit Order', 'حفظ': 'Save', 'جاري الحفظ': 'Saving',
  'جارٍ الحفظ': 'Saving', 'جاري الحفظ…': 'Saving…', 'محفوظ': 'Saved', 'مسودة': 'Draft',
  'نوع الطلب': 'Order Type', 'داخل المطعم': 'Dine In', 'تيك أواي': 'Takeaway', 'توصيل': 'Delivery',
  'استلام': 'Pickup', 'كل الأصناف': 'All Items', 'ابحث عن منتج…': 'Search products…',
  'مسح البحث': 'Clear search', 'جاري تحميل المنتجات…': 'Loading products…',
  'تظهر نسخة المنتجات المحفوظة على التابلت': 'Showing the product catalogue saved on this tablet',
  'لا توجد منتجات مطابقة': 'No matching products', 'غير متاح': 'Unavailable',
  'إضافة': 'Add', 'إزالة': 'Remove', 'من المفضلة': 'from favorites',
  'الطلب الحالي': 'Current Order', 'أصناف': 'items', 'جارٍ حفظ المسودة': 'saving draft',
  'السلة': 'Cart', 'السلة فارغة': 'Cart is empty', 'اضغط على أي منتج لإضافته': 'Tap any product to add it',
  'إغلاق السلة': 'Close cart', 'عرض السلة': 'View Cart', 'ملاحظة الطلب': 'Order Note',
  'ملاحظة عامة للمطبخ أو الكاشير': 'General note for the kitchen or cashier', 'ملاحظة': 'Note',
  'الإجمالي': 'Total', 'تحصيل سريع': 'Quick Payment', 'نقدي سريع': 'Quick Cash', 'كي نت سريع': 'Quick KNET',
  'حفظ الطلب + دفع': 'Save order + pay', 'الدفع بالتفصيل أو التقسيم': 'Detailed or Split Payment',
  'حفظ فقط': 'Save Only', 'إرسال للمطبخ': 'Send to Kitchen', 'تأكيد الدفع النقدي': 'Confirm Cash Payment',
  'تأكيد الدفع كي نت': 'Confirm KNET Payment', 'إلغاء': 'Cancel', 'تأكيد نقدي': 'Confirm Cash',
  'تأكيد كي نت': 'Confirm KNET', 'الكمية': 'Quantity', 'ملاحظة الصنف': 'Item Note',
  'مثال: بدون بصل، الصوص منفصل': 'Example: no onions, sauce on the side', 'اختيار المنتج': 'Product Options',
  'إضافات': 'Modifiers', 'اختيار الوجبة': 'Combo Options', 'اختيار واحد': 'Choose one',
  'اختيارات متعددة': 'Multiple choices', 'مطلوب': 'Required', 'تأكيد': 'Confirm',
  'خصص الصنف أو الوجبة ثم أكد الإضافة': 'Customize the item or combo, then confirm',
  'ابحث داخل الاختيارات…': 'Search options…', 'بحث واختيار العميل': 'Find and select customer',
  'بالاسم أو رقم الهاتف': 'By name or phone number', 'اختر العميل': 'Select Customer',
  'اختر عنوان التوصيل': 'Select delivery address', 'اختر مسؤول الاستلام': 'Select pickup waiter',
  'مسؤول الاستلام': 'Pickup Waiter', 'اختر المسؤول': 'Select waiter', 'بيانات الاستلام': 'Pickup Details',
  'اختر العميل ومسؤول الاستلام': 'Select the customer and pickup waiter', 'اختيار الطاولة': 'Select Table',
  'اختر الطاولة': 'Select a table', 'اختر الطاولة وعدد الضيوف': 'Select a table and guest count',
  'الطاولة': 'Table', 'عدد الضيوف': 'Guests', 'الطاولة مختارة': 'Table selected', 'عرض الطاولات': 'View tables',
  'مطلوب قبل الحفظ': 'Required before saving', 'مسؤول الطلب': 'Order handler',
  'جاري تحميل الخيارات…': 'Loading options…', 'تم': 'Done', 'تعديل': 'Edit', 'حذف': 'Delete',
  'تقليل': 'Decrease', 'زيادة': 'Increase', 'بدء طلب جديد': 'Start new order',
  'إرسال الطلب إلى المطبخ الآن؟': 'Send this order to the kitchen now?',
  'يوجد أصناف في الطلب الحالي. هل تريد حذف المسودة وبدء طلب جديد؟': 'The current order has items. Discard the draft and start a new order?',

  'أهلًا': 'Welcome', 'حالة الاتصال': 'Connection', 'متصل': 'Online', 'غير متصل': 'Offline',
  'أوفلاين': 'Offline', 'آخر فحص الآن': 'Checked just now', 'مفتوحة': 'Open', 'مغلقة': 'Closed',
  'إجمالي الوردية': 'Shift Total', 'حسب صلاحية المستخدم': 'Based on user permissions',
  'المزامنة': 'Sync', 'تحتاج مراجعة': 'Needs Review', 'عمليات معلقة': 'Pending operations',
  'الطاولات المشغولة': 'Occupied Tables', 'استلام مفتوح': 'Open Pickups',
  'ينتظر التجهيز أو التحصيل': 'Awaiting preparation or payment', 'الطباعة': 'Printing', 'جاهزة': 'Ready',
  'حسب إعدادات طابعات الفرع': 'Based on branch printer settings', 'الوصول السريع': 'Quick Access',
  'أكثر العمليات استخدامًا أثناء الوردية': 'Most-used actions during the shift', 'آخر الطلبات': 'Recent Orders',
  'نظرة سريعة على آخر النشاط': 'A quick view of recent activity', 'عرض الكل': 'View All',
  'طلب مباشر': 'Direct Order', 'مدفوع': 'Paid', 'مستحق': 'Due', 'لا توجد طلبات بعد': 'No orders yet',
  'ابدأ طلب توصيل أو استلام بسرعة': 'Start a delivery or pickup order quickly',
  'تابع التجهيز والتسليم والدفع': 'Track preparation, handoff, and payment',
  'الحالة والنداءات ونقل الطلب': 'Status, calls, and order transfers',
  'بحث وإضافة وتعديل العناوين': 'Find customers and manage addresses',

  'الكل': 'All', 'متاحة': 'Available', 'مشغولة': 'Occupied', 'بانتظار التأكيد': 'Pending Confirmation',
  'محجوزة': 'Reserved', 'نداء جارسون': 'Waiter Call', 'غير متوفر': 'Unavailable',
  'الحالة المباشرة والنداءات والطلبات المفتوحة': 'Live status, calls, and open orders',
  'تحديث': 'Refresh', 'جارٍ التحديث': 'Refreshing', 'فلترة الطاولات': 'Filter tables',
  'ضغطة للتحديد · ضغطتان للفتح السريع · ويمكن استخدام الزر الواضح داخل البطاقة': 'Tap to select · double-tap to open quickly · or use the button on the card',
  'جاري تحميل الطاولات…': 'Loading tables…', 'لا توجد نسخة طاولات محفوظة': 'No saved table data',
  'لا توجد طاولات متاحة لهذا الفرع': 'No tables are available for this branch',
  'افتح شاشة الطاولات مرة واحدة أثناء الاتصال لحفظها على هذا التابلت.': 'Open Tables once while online to save them on this tablet.',
  'تطلب جارسون': 'Waiter Requested', 'فتح الطاولة': 'Open Table', 'مراجعة الطلب': 'Review Order',
  'تفاصيل الحجز': 'Reservation Details', 'فتح الطلب': 'Open Order', 'محلي': 'Local', 'نقل': 'Transfer',
  'دمج': 'Merge', 'تقسيم': 'Split', 'استلام النداء': 'Acknowledge Call',
  'العمليات المحفوظة فقط متاحة أوفلاين': 'Only saved operations are available offline',
  'دليل حالات الطاولات': 'Table status legend', 'نقل الطلب': 'Transfer Order', 'دمج الطاولات': 'Merge Tables',
  'تقسيم الطلب': 'Split Order', 'إلى الطاولة': 'To Table', 'اختر الأصناف المطلوب نقلها': 'Select items to move',
  'جاري التنفيذ…': 'Processing…', 'تأكيد العملية': 'Confirm Action',

  'تسجيل الدخول': 'Sign In', 'أدخل بيانات السيرفر وحساب الجارسون': 'Enter the server and waiter account details',
  'رابط السيرفر': 'Server URL', 'اسم المستخدم': 'Username', 'كلمة المرور': 'Password', 'اسم التابلت': 'Tablet Name',
  'جاري الاتصال…': 'Connecting…', 'دخول': 'Sign In', 'فتح النسخة التجريبية': 'Open Demo',
  'واجهة أسرع للجارسون، تعمل حتى عند ضعف الإنترنت وتحافظ على كل طلب.': 'A faster waiter app that keeps every order safe, even with a weak connection.',
  'نقطة بيع مصممة للتابلت': 'A point of sale designed for tablets',
  'عملاء وعناوين دون خطوات زائدة': 'Customers and addresses with fewer steps',
  'أوفلاين ومزامنة آمنة بلا طلبات مكررة': 'Safe offline sync without duplicate orders',

  'إعدادات التابلت': 'Tablet Settings', 'تحكم في كل ما يظهر ويعمل على هذا الجهاز فقط': 'Control everything shown and used on this device',
  'تسجيل الخروج': 'Sign Out', 'إعادة الضبط': 'Reset', 'حفظ الإعدادات': 'Save Settings', 'تم الحفظ ✓': 'Saved ✓',
  'هذه الصفحة للعرض فقط؛ الدور الحالي لا يملك صلاحية إدارة التابلت.': 'This page is read-only; the current role cannot manage this tablet.',
  'الإعدادات محفوظة على التابلت وتنتظر المزامنة مع السيرفر عند عودة الاتصال.': 'Settings are saved on the tablet and will sync when the server is reachable.',
  'عام': 'General', 'الشاشات': 'Screens', 'أنواع الطلب': 'Order Types', 'طرق الدفع': 'Payment Methods',
  'التنبيهات': 'Notifications', 'الأوفلاين': 'Offline', 'الإعدادات العامة': 'General Settings',
  'هوية الجهاز واللغة والمظهر واتصال السيرفر': 'Device identity, language, appearance, and server connection',
  'اللغة': 'Language', 'العربية': 'Arabic', 'المظهر': 'Appearance', 'فاتح': 'Light', 'داكن': 'Dark',
  'حسب الجهاز': 'System', 'اختبار الاتصال': 'Test Connection', 'لم يتم الاختبار': 'Not Tested',
  'تجهيز سريع حسب وظيفة التابلت': 'Quick setup by tablet role', 'جارسون': 'Waiter', 'كاشير': 'Cashier', 'مخصص': 'Custom',
  'إظهار وإخفاء الشاشات': 'Show or Hide Screens', 'الإخفاء لا يمنح صلاحية منعها السيرفر.': 'Hiding a screen does not grant or override server permissions.',
  'ملخص التشغيل والوصول السريع': 'Operations summary and quick access', 'إنشاء وتعديل الطلبات': 'Create and edit orders',
  'الحالة والنداءات': 'Status and calls', 'طلبات الاستلام': 'Pickup Orders', 'التجهيز والتسليم': 'Preparation and handoff',
  'كل الطلبات': 'All Orders', 'قائمة طلبات الجارسون': 'Waiter order list', 'العملاء والعناوين': 'Customers & Addresses',
  'البحث والإضافة والتعديل': 'Search, add, and edit', 'الدفع والتحصيل': 'Payments & Collection',
  'طرق الدفع وتقسيم الفاتورة': 'Payment methods and split payment', 'فتح وإغلاق وتسوية': 'Open, close, and reconcile',
  'أنواع الطلب المتاحة': 'Available Order Types', 'يتطلب اختيار طاولة': 'Requires a table',
  'طلب مباشر دون طاولة': 'Direct order without a table', 'يتطلب عميلًا وعنوانًا': 'Requires a customer and address',
  'يتطلب العميل ومسؤول الاستلام': 'Requires a customer and pickup waiter',
  'خصص شكل الكتالوج وحجم النص وسلوك السلة على هذا التابلت.': 'Customize catalogue layout, text size, and cart behavior on this tablet.',
  'مظهر كروت المنتجات والتصنيفات': 'Product & Category Appearance',
  'الألوان تُوزع تلقائيًا وثابتًا على كل تصنيف، فلا تتغير بين مرات التشغيل.': 'Colors are assigned consistently to each category and remain stable.',
  'ألوان التصنيفات': 'Category Colors', 'بدون ألوان — موحد': 'No Colors — Unified', 'التصنيفات فقط': 'Categories Only',
  'كروت المنتجات فقط': 'Product Cards Only', 'التصنيفات والكروت': 'Categories & Cards', 'شكل كارت المنتج': 'Product Card Style',
  'نظيف — خلفية بيضاء': 'Clean — White Background', 'ألوان هادئة': 'Soft Colors', 'لون واضح وقوي': 'Strong Accent',
  'حجم اسم وسعر المنتج': 'Product Name & Price Size', 'عادي': 'Normal', 'كبير': 'Large', 'كبير جدًا': 'Extra Large',
  'عدد المنتجات في الصف': 'Products per Row', 'معاينة مظهر المنتجات': 'Product appearance preview',
  'مشروبات': 'Drinks', 'وجبات': 'Meals', 'حلويات': 'Desserts', 'اسم المنتج': 'Product Name',
  'منتج طويل للتجربة': 'Long Product Name', 'عرض وترتيب المنتجات': 'Product Display & Sorting',
  'إظهار صور المنتجات': 'Show Product Images', 'عند الإخفاء تتحول الكروت تلقائيًا لشكل نصي أكبر ومتناسق.': 'When hidden, cards automatically use a larger, balanced text layout.',
  'ترتيب المنتجات': 'Product Sorting', 'ترتيب السيرفر': 'Server Order', 'المفضلة أولًا': 'Favorites First',
  'حسب الاسم': 'By Name', 'حسب السعر': 'By Price', 'المفضلة': 'Favorites', 'إظهار نجمة سريعة داخل كل كارت.': 'Show a favorite star on every card.',
  'السلة وتنفيذ الطلب': 'Cart & Order Actions', 'إظهار شريط السلة وهي فارغة': 'Show Cart Bar When Empty',
  'السلة نفسها تفتح كدرج عند الضغط على الشريط.': 'The cart opens as a drawer when the bar is tapped.',
  'حفظ المسودة تلقائيًا': 'Autosave Draft', 'يتم في الخلفية بعد توقف اللمس.': 'Runs in the background after interaction stops.',
  'الدفع السريع': 'Quick Payment', 'يظهر فقط لمن يملك صلاحية التحصيل.': 'Shown only to users with payment permission.',
  'زر نقدي سريع': 'Quick Cash Button', 'زر كي نت سريع': 'Quick KNET Button', 'إظهار زر إرسال المطبخ': 'Show Send to Kitchen',
  'تأكيد قبل الدفع': 'Confirm Before Payment', 'تأكيد قبل الإرسال للمطبخ': 'Confirm Before Sending to Kitchen',
  'يمنع الإرسال بالخطأ عند لمس الزر.': 'Prevents accidental kitchen submission.',
  'طرق الدفع على هذا التابلت': 'Payment Methods on This Tablet',
  'الطرق تأتي بأسمائها الفعلية من إعدادات الفرع. إخفاء أي طريقة هنا محلي لهذا الجهاز فقط.': 'Methods use the names configured by the branch. Hiding a method applies only to this device.',
  'مفعلة': 'Enabled', 'مخفية': 'Hidden', 'السماح بتقسيم الدفع': 'Allow Split Payment',
  'يظهر فقط إذا كان السيرفر يسمح بالتقسيم وهناك طريقتان مفعّلتان على الأقل.': 'Shown only when the server allows splitting and at least two methods are enabled.',
  'العناصر والعمليات المسموحة على هذا الجهاز.': 'Items and actions available on this device.', 'نداءات الجارسون': 'Waiter Calls',
  'مدة فتح الطاولة': 'Table Open Time', 'إجمالي الطاولة': 'Table Total', 'تقسيم الطاولة': 'Split Table',
  'الصوت والاهتزاز والأحداث المهمة.': 'Sound, vibration, and important events.', 'الصوت': 'Sound', 'الاهتزاز': 'Vibration',
  'نداءات الطاولات': 'Table Calls', 'الأوفلاين والمزامنة': 'Offline & Sync', 'سياسة حفظ الطلبات عند ضعف الشبكة.': 'How orders are saved when the connection is weak.',
  'إنشاء الطلب دون إنترنت': 'Create Orders Offline', 'يحفظ محليًا ويرسل تلقائيًا': 'Saved locally and sent automatically',
  'تسجيل الدفع أوفلاين': 'Record Payment Offline', 'مزامنة في الخلفية': 'Background Sync',
  'عند رجوع الاتصال وفتح التطبيق': 'When connection returns and the app is open', 'دورية الفحص والتحديث': 'Refresh Interval',
  'ثانية': 'seconds', 'دقيقة': 'minute', 'دقيقتان': '2 minutes',
  'اختر هل يطبع التابلت بنفسه أم يرسل المهمة إلى جهاز الفرع.': 'Choose whether the tablet prints directly or sends the job to the branch device.',
  'تفعيل الطباعة': 'Enable Printing', 'طريقة طباعة الفاتورة': 'Receipt Printing Method', 'مقاس الورق': 'Paper Width',
  'مهلة الاتصال': 'Connection Timeout', 'قص الورق تلقائيًا': 'Auto-cut Paper', 'طباعة تلقائية عند حفظ الطلب': 'Auto-print When Saving',
  'طباعة تلقائية بعد الدفع': 'Auto-print After Payment', 'عدد نسخ الفاتورة': 'Receipt Copies', 'نسخة واحدة': 'One Copy',
  'نسختان': 'Two Copies', 'طابعة الاختبار': 'Test Printer', 'اختر الطابعة': 'Select Printer', 'تحديث الأجهزة': 'Refresh Devices',
  'جاري البحث…': 'Searching…', 'الطابعة المقترنة': 'Paired Printer', 'فشل اختبار الطابعة': 'Printer test failed',

  'نقدي': 'Cash', 'بطاقة / كي نت': 'Card / KNET', 'كي نت': 'KNET', 'شيك': 'Cheque',
  'تحويل بنكي': 'Bank Transfer', 'أخرى': 'Other', 'دفع مخصص 1': 'Custom Payment 1',
  'دفع مخصص 2': 'Custom Payment 2', 'دفع مخصص 3': 'Custom Payment 3', 'دفع مخصص 4': 'Custom Payment 4',
  'دفع مخصص 5': 'Custom Payment 5', 'دفع مخصص 6': 'Custom Payment 6', 'دفع مخصص 7': 'Custom Payment 7',
  'تغيير الدفع': 'Change Payment', 'تقسيم الدفع': 'Split Payment', 'طريقة الدفع': 'Payment Method',
  'المبلغ': 'Amount', 'المتبقي': 'Remaining', 'المجموع': 'Total', 'إتمام الدفع': 'Complete Payment',
  'الدفع': 'Payment', 'معاينة الطلب': 'Order Preview', 'تفاصيل الطلب': 'Order Details', 'طباعة الفاتورة': 'Print Receipt',
  'إعادة KOT': 'Reprint KOT', 'لم تُطلب الطباعة': 'Printing not requested', 'تمت الطباعة': 'Printed',
  'جزئي': 'Partial', 'قيد التجهيز': 'Preparing', 'جاهز للاستلام': 'Ready for Pickup', 'تم التسليم': 'Handed Off',
  'بحث': 'Search', 'ابحث بالاسم أو الهاتف': 'Search by name or phone', 'إضافة عميل جديد': 'Add New Customer',
  'اسم العميل': 'Customer Name', 'رقم الهاتف': 'Phone Number', 'رقم بديل': 'Alternate Number',
  'العناوين': 'Addresses', 'إضافة عنوان': 'Add Address', 'تعديل العنوان': 'Edit Address', 'حفظ العميل': 'Save Customer',
  'المنطقة': 'Area', 'القطعة': 'Block', 'الشارع': 'Street', 'الجادة': 'Avenue', 'المبنى': 'Building',
  'الدور': 'Floor', 'الشقة': 'Apartment', 'علامة مميزة': 'Landmark', 'العنوان الافتراضي': 'Default Address',
  'لا توجد نتائج': 'No Results', 'إعادة المحاولة': 'Retry', 'تفاصيل': 'Details', 'طباعة': 'Print',
  'تسليم': 'Hand Off', 'تحصيل': 'Collect Payment', 'فتح الوردية': 'Open Shift', 'إغلاق الوردية': 'Close Shift',
  'طابور المزامنة': 'Sync Queue', 'طابور الطباعة': 'Print Queue', 'إعادة إرسال': 'Retry', 'مراجعة': 'Review',
  'من الطلب الجديد حتى التسليم والتحصيل': 'From new order through handoff and payment', 'طلب استلام': 'Pickup Order',
  'رقم الطلب أو اسم العميل أو الهاتف…': 'Order number, customer, or phone…', 'الحالية': 'Current',
  'جاري التحميل…': 'Loading…', 'عميل الاستلام': 'Pickup Customer', 'تحصيل وتسليم': 'Collect & Hand Off',
  'بانتظار الكاشير': 'Waiting for Cashier', 'لا توجد طلبات في هذه الحالة': 'No orders in this status',
  'دفع مقسّم': 'Split Payment', 'هذا الطلب مدفوع بالفعل.': 'This order is already paid.',
  'لا توجد طريقة دفع مفعلة لهذا التابلت.': 'No payment method is enabled on this tablet.',
  'افتح الوردية أولًا قبل التحصيل.': 'Open the shift before collecting payment.',
  'تسجيل الدفع أوفلاين متوقف من إعدادات التابلت.': 'Offline payment is disabled in tablet settings.',
  'اختر صنفًا واحدًا على الأقل للدفع.': 'Select at least one item to pay.',
  'وزّع المبلغ كاملًا على طريقتين على الأقل.': 'Allocate the full amount across at least two methods.',
  'المبلغ المستلم أقل من إجمالي الفاتورة.': 'The received amount is less than the invoice total.',
  'تم تسجيل الدفع أوفلاين': 'Offline Payment Recorded', 'تم الدفع بنجاح': 'Payment Successful',
  'التحصيل محفوظ على التابلت وسيُرحّل مرة واحدة عند عودة الاتصال': 'Payment is saved on this tablet and will sync once when connection returns',
  'جاري الطباعة…': 'Printing…', 'العودة للطلبات': 'Back to Orders', 'اختر طريقة الدفع وراجع الإجمالي قبل التأكيد': 'Choose a payment method and review the total before confirming',
  'إجمالي الفاتورة': 'Invoice Total', 'دفع أصناف محددة': 'Pay Selected Items', 'إنشاء دفعة جزئية للأصناف المختارة': 'Create a partial payment for selected items',
  'نوع الخصم': 'Discount Type', 'بدون خصم': 'No Discount', 'نسبة مئوية': 'Percentage', 'قيمة ثابتة': 'Fixed Amount',
  'قيمة الخصم': 'Discount Value', 'المطلوب تحصيله': 'Amount Due', 'استخدم أي طريقتين أو أكثر من الطرق المفعلة': 'Use any two or more enabled methods',
  'ابحث عن طريقة دفع…': 'Search payment methods…', 'المبلغ المستلم': 'Amount Received', 'الباقي للعميل': 'Change Due',
  'الموزع': 'Allocated', 'جاري التحصيل…': 'Processing Payment…', 'مراجعة سريعة': 'Quick Review', 'رقم الطلب': 'Order Number',
  'الطريقة': 'Method', 'حالة الوردية': 'Shift Status',
  'السلة الأصلية تُفرغ فقط بعد نجاح الدفع الكامل. الدفع الجزئي أو الفشل لا يحذفان المسودة.': 'The source cart is cleared only after full payment succeeds. Partial payment or failure keeps the draft.',
  'الطلبات': 'Orders', 'الطلبات الحالية والمدفوعة وحالة المزامنة': 'Current and paid orders with sync status',
  'رقم الطلب أو العميل أو الطاولة…': 'Order number, customer, or table…', 'مستحقة': 'Due', 'مدفوعة': 'Paid',
  'طلبات أوفلاين تنتظر المزامنة': 'Offline Orders Awaiting Sync', 'طلب ودفع معلقان': 'Order & Payment Pending',
  'طلب معلق': 'Order Pending', 'جاري تحميل الطلبات…': 'Loading orders…', 'في طابور الطباعة': 'Queued for Printing',
  'تُطبع الآن': 'Printing Now', 'فشلت الطباعة': 'Printing Failed', 'الطباعة غير مؤكدة': 'Printing Unconfirmed',
  'نسخة مؤكدة': 'confirmed copy', 'عرض وتعديل': 'View & Edit', 'طلب دفع': 'Request Payment',
  'إعادة الفاتورة': 'Reprint Receipt', 'لا توجد طلبات مطابقة': 'No matching orders',
  'اكتب سبب إعادة طباعة المطبخ': 'Enter the reason for reprinting the kitchen order',
  'إعادة طباعة بطلب الجارسون': 'Reprint requested by waiter', 'تم إرسال KOT لإعادة الطباعة': 'KOT sent for reprinting',
  'تم إرسال طلب الدفع للكاشير': 'Payment request sent to cashier', 'تم تغيير وتوثيق طريقة الدفع بنجاح': 'Payment method changed and logged successfully',
  'تغيير طريقة الدفع': 'Change Payment Method', 'غير محددة': 'Not Specified', 'طريقة واحدة': 'Single Method',
  'تقسيم بالمبلغ': 'Split by Amount', 'تقسيم بالأصناف': 'Split by Items', 'سبب التغيير': 'Change Reason',
  'تصحيح اختيار طريقة الدفع': 'Correct payment method', 'طلب العميل': 'Customer request', 'تصحيح تسوية الكاشير': 'Correct cashier reconciliation',
  'خطأ في التقسيم السابق': 'Previous split error', 'سبب آخر': 'Other reason', 'ملاحظة إضافية': 'Additional Note',
  'اختياري، أو مطلوب عند اختيار سبب آخر': 'Optional, or required when Other reason is selected',
  'هذه العملية تحتاج اتصالًا مباشرًا، وتُحفظ باسم المستخدم والسبب في سجل التدقيق.': 'This action requires a live connection and is logged with the user and reason.',
  'تأكيد تغيير الدفع': 'Confirm Payment Change',
  'بحث مباشر بالاسم أو أي جزء من رقم الهاتف': 'Search by name or any part of the phone number', 'إضافة عميل': 'Add Customer',
  'اكتب حرفين على الأقل…': 'Type at least two characters…', 'لن تظهر قائمة «آخر العملاء»؛ النتائج تظهر فقط بعد البحث.': 'Recent customers are not shown; results appear only after you search.',
  'لا يوجد عميل مطابق': 'No matching customer', 'ابدأ بالبحث عن العميل': 'Start searching for a customer',
  'تعديل العميل': 'Edit Customer', 'عميل جديد': 'New Customer', 'عنوان جديد': 'New Address',
  'اختر العميل ثم عنوان التوصيل': 'Select the customer, then the delivery address', 'اكتب الاسم أو أي جزء من رقم الهاتف': 'Enter the name or any part of the phone number',
  'ابدأ بكتابة حرفين على الأقل. لا يتم عرض عملاء عشوائيين أو آخر 12 عميل.': 'Type at least two characters. Random or recent customers are not shown.',
  'تغيير': 'Change', 'عناوين العميل': 'Customer Addresses', 'افتراضي': 'Default', 'بدون شارع': 'No street',
  'إضافة أول عنوان': 'Add First Address', 'اختيار هذا العميل': 'Select This Customer', 'لم نجد عميلًا مطابقًا': 'No matching customer found',
  'اكتب اسم العميل أو رقم الهاتف للبحث': 'Enter a customer name or phone number to search', 'اسم العنوان': 'Address Label',
  'المنزل أو العمل': 'Home or work', 'ملاحظات': 'Notes', 'يظهر أولًا عند طلب التوصيل': 'Shown first for delivery orders',
  'حفظ العنوان': 'Save Address', 'المنزل': 'Home',
  'جديد': 'New', 'قيد الانتظار': 'Pending', 'مكتمل': 'Completed', 'ملغي': 'Cancelled', 'تم الإلغاء': 'Cancelled',
  'قيد التنفيذ': 'In Progress', 'مؤكد': 'Confirmed', 'تم التأكيد': 'Confirmed',
  'التحصيل والملخص اليومي للجارسون': 'Waiter collections and daily summary', 'بدأت الساعة': 'Started at',
  'لا توجد وردية مفتوحة': 'No open shift', 'ابدأ ورديتك': 'Start Your Shift', 'مدة الوردية': 'Shift Duration',
  'إجمالي التحصيل': 'Total Collected', 'عدد الطلبات': 'Order Count', 'مستحق من العملاء': 'Due from Customers',
  'تحصيل فعلي': 'Physical Collection', 'مع السائقين': 'With Drivers', 'طلبات الوردية': 'Shift Orders',
  'غير محدد': 'Unspecified', 'متبقي': 'Remaining', 'إنهاء وتسوية الوردية': 'Close & Reconcile Shift',
  'النقدي الفعلي عند الإغلاق': 'Actual Cash at Close', 'رصيد افتتاحي': 'Opening Float',
  'رقم دفعة جهاز كي نت': 'KNET Terminal Batch Number', 'ملاحظات التسوية': 'Reconciliation Notes',
  'فتح': 'open',
  'فحص سريع قبل بدء الوردية': 'Quick check before starting the shift', 'إعادة الفحص': 'Run Checks Again',
  'اتصال الإنترنت': 'Internet Connection', 'متاح': 'Available', 'لم يُفحص': 'Not Checked', 'الطابعة المباشرة': 'Direct Printer', 'الطابعات المباشرة': 'Direct Printers',
  'الطابعات': 'Printers', 'لم تُفحص أو لا توجد صلاحية': 'Not checked or permission unavailable', 'غير متصلة': 'Disconnected',
  'طابعة متاحة': 'printer available', 'تقارير الأعطال المحلية': 'Local Error Reports', 'لا توجد أخطاء معلقة': 'No pending errors',
  'التحديث اللحظي': 'Realtime Updates', 'يستخدم polling الاحتياطي': 'Using backup polling', 'polling الاحتياطي مفعّل': 'Backup polling enabled',
  'المنصة': 'Platform', 'إصدار التطبيق': 'App Version', 'السيرفر': 'Server', 'غير مضبوط': 'Not Configured',
  'المساعدة': 'Help', 'عند الإبلاغ عن مشكلة أرسل اسم التابلت، وقت المشكلة، ورقم الطلب فقط. لا ترسل كلمة المرور.': 'When reporting a problem, send only the tablet name, time, and order number. Never send the password.',
  'الطلبات والعمليات المحفوظة على هذا التابلت': 'Orders and operations saved on this tablet', 'مزامنة الآن': 'Sync Now',
  'السيرفر متاح': 'Server Available', 'لا يوجد اتصال بالسيرفر': 'No Server Connection', 'دفع أوفلاين': 'Offline Payment',
  'إنشاء طلب': 'Create Order', 'تعديل طلب': 'Update Order', 'محاولة': 'Attempt', 'بانتظار التنفيذ': 'Waiting to Run',
  'استخدام نسخة السيرفر': 'Use Server Version', 'الاحتفاظ بتعديل التابلت': 'Keep Tablet Changes', 'لا توجد عمليات معلقة': 'No Pending Operations',
  'طابور الطباعة المباشرة': 'Direct Print Queue', 'يعمل داخل الشبكة المحلية ولا يحتاج إلى الإنترنت': 'Works on the local network without internet',
  'إعادة المحاولة الآن': 'Retry Now', 'طلب محلي مؤقت': 'Temporary Local Order', 'بانتظار الطابعة': 'Waiting for Printer',
  'غير مؤكدة': 'Unconfirmed', 'تطبع الآن': 'Printing', 'معلقة': 'Pending', 'راجعت الورق — أعد': 'Paper Checked — Retry',
  'إعادة': 'Retry', 'لا توجد طباعات محلية معلقة': 'No Pending Local Prints',
  'تتحدث تلقائيًا أثناء تشغيل التطبيق': 'Updates automatically while the app is running', 'الطاولة تحتاج جارسون': 'Table needs a waiter',
  'موعد الاستلام': 'Pickup Time', 'لا توجد تنبيهات جديدة': 'No New Notifications', 'جاري التحديث…': 'Updating…', 'تحديث الآن': 'Update Now',
  'العمل محفوظ على التابلت': 'Work is saved on the tablet', 'عملية تحتاج مراجعة': 'operation needs review', 'عملية تنتظر المزامنة': 'operation awaiting sync',
  'أضف منتجًا واحدًا على الأقل': 'Add at least one product', 'إنشاء الطلبات دون إنترنت متوقف من إعدادات هذا التابلت': 'Offline order creation is disabled in this tablet settings',
  'الطلب قيد الحفظ بالفعل': 'This order is already being saved', 'لا يوجد اتصال بسيرفر': 'No server connection',
  'انتهت مهلة الاتصال بالسيرفر': 'Server connection timed out', 'تعذر الاتصال بالسيرفر. سيبقى العمل محفوظًا على التابلت.': 'Could not reach the server. Work remains saved on the tablet.',
  'تعذر تحميل المنتجات': 'Unable to load products', 'تعذر تحميل الطاولات': 'Unable to load tables', 'تعذر تحديث التنبيهات': 'Unable to update notifications',
  'رقم الطلب غير موجود': 'Order number is missing', 'ينتظر إرسال الطلب أولًا قبل إرساله للمطبخ': 'Waiting for the order to be created before sending it to the kitchen',
  'ينتظر إنشاء الطلب قبل تسجيل الدفع': 'Waiting for the order to be created before recording payment',
  'ينتظر إنشاء الطلب قبل إرسال الفاتورة للطباعة': 'Waiting for the order to be created before printing the receipt',
  'يوجد دفع محفوظ لهذا الطلب وينتظر المزامنة': 'A saved payment for this order is awaiting sync',
  'الطباعة المباشرة متاحة داخل تطبيق التابلت المثبت فقط': 'Direct printing is available only in the installed tablet app',
  'اختر طابعة Bluetooth مقترنة أولًا': 'Select a paired Bluetooth printer first', 'أدخل IP الطابعة، مثال 192.168.1.50': 'Enter the printer IP, for example 192.168.1.50',
  'عنوان الطابعة غير صالح': 'Invalid printer address', 'منفذ الطابعة غير صالح': 'Invalid printer port',
  'يجب أن يكون IP الطابعة داخل نفس الشبكة المحلية': 'The printer IP must be on the same local network',
  'انتهت مهلة الاتصال بالطابعة؛ راجع IP والشبكة': 'Printer connection timed out; check the IP and network',
  'الطابعة رفضت الاتصال؛ راجع المنفذ وغالبًا يكون 9100': 'Printer refused the connection; check the port, usually 9100',
  'الطابعة غير متاحة على الشبكة المحلية': 'Printer is unavailable on the local network', 'الطباعة المباشرة غير متاحة على هذا الجهاز': 'Direct printing is unavailable on this device',
  'فشل الاتصال بالطابعة المباشرة': 'Could not connect to the direct printer', 'اسمح للتطبيق باستخدام أجهزة Bluetooth': 'Allow the app to use Bluetooth devices',
  'اختبار الطباعة المباشرة': 'Direct Print Test', 'الاتصال ناجح': 'Connection Successful',
  'تعذر تسجيل الدخول': 'Unable to sign in', 'الوضع التجريبي غير متاح في نسخة الإنتاج': 'Demo mode is unavailable in production',
  'يجب إبقاء طريقة دفع واحدة على الأقل مفعلة.': 'At least one payment method must remain enabled.',
  'يجب تفعيل طريقة دفع واحدة على الأقل.': 'Enable at least one payment method.', 'تعذر تحميل الطابعات': 'Unable to load printers',
  'أدخل اسم الطابعة المحلية.': 'Enter a local printer name.', 'أدخل IP صحيحًا للطابعة المحلية.': 'Enter a valid local printer IP.',
  'حدد مهمة واحدة للطابعة على الأقل.': 'Select at least one task for the printer.', 'هذه الطابعة مضافة بالفعل بنفس IP والمنفذ.': 'This printer is already added with the same IP and port.',
  'أضف طابعة محلية مفعلة للفاتورة وحددها كطابعة رئيسية.': 'Add an active local receipt printer and select it as the primary printer.',
  'فشل اختبار الطابعة المحلية': 'Local printer test failed',
  'تعذر حفظ الإعدادات': 'Unable to save settings', 'تعذر تحميل طابعات Bluetooth': 'Unable to load Bluetooth printers',
  'إعادة كل إعدادات هذا التابلت للقيم الافتراضية؟': 'Reset all settings on this tablet to their defaults?',
  'سيظهر اختيار AirPrint عند طباعة فاتورة من iPad.': 'The AirPrint picker will appear when printing a receipt from iPad.',
  'اختر طابعة السيرفر أولًا': 'Select a server printer first', 'لا توجد فاتورة محفوظة للمعاينة بعد': 'No saved receipt is available to preview',
  'اسمح بفتح نافذة المعاينة من إعدادات الجهاز': 'Allow preview windows in device settings',
  'لتغيير السيرفر سجّل الخروج ثم أدخل الرابط الجديد؛ هذا يحمي جلسة الجهاز.': 'To change the server, sign out and enter the new URL. This protects the device session.',
  'يمكن إبقاء التوصيل والاستلام فقط كما هو مطلوب حاليًا.': 'You can keep only Delivery and Pickup enabled.',
  'أي طريقة جديدة يضيفها السيرفر ستظهر تلقائيًا حتى تقوم بإخفائها.': 'Any new server payment method appears automatically until you hide it.',
  'مفعلة ✓': 'Enabled ✓', 'نقدي سريع وكي نت سريع يظهران في السلة فقط إذا كانت الطريقة نفسها مفعلة هنا ومع تفعيل أزرار الدفع السريع في إعدادات نقطة البيع.': 'Quick Cash and Quick KNET appear in the cart only when the method and its POS quick button are both enabled.',
  'نقدي أو كي نت يُحفظ بمفتاح منع تكرار ثم يُرحّل بعد الطلب': 'Cash or KNET is stored with duplicate protection, then synced after the order',
  'الدفع الأوفلاين لا يعني تنفيذ عملية KNET البنكية لحظيًا؛ يسجل التحصيل على التابلت ويُرحّله للسيرفر عند الاتصال.': 'Offline payment does not run a live KNET bank transaction; it records collection on the tablet and syncs it to the server later.',
  'عن طريق جهاز الفرع — Print Agent': 'Branch Device — Print Agent', 'شبكة محلية TCP — مباشر من التابلت': 'Local TCP Network — Direct from Tablet',
  'Bluetooth — مباشر من تابلت Android': 'Bluetooth — Direct from Android Tablet', 'AirPrint على iPad — اختيار يدوي': 'AirPrint on iPad — Manual Selection',
  'التابلت يرسل مهمة الطباعة إلى Laravel، ويقوم Print Agent الموجود على كمبيوتر الفرع بطباعتها. يحتاج الوصول إلى السيرفر.': 'The tablet sends the print job to Laravel, and the branch computer Print Agent prints it. Server access is required.',
  'اتصال محلي مباشر: يعمل بدون إنترنت وبدون كمبيوتر، بشرط أن يكون التابلت والطابعة على نفس شبكة Wi‑Fi.': 'Direct local connection: works without internet or a computer when the tablet and printer share the same Wi-Fi network.',
  'IP الطابعة': 'Printer IP', 'ثوانٍ': 'seconds', 'يعمل بدون إنترنت وبدون كمبيوتر على Android. اقترن بالطابعة أولًا من إعدادات Bluetooth في التابلت.': 'Works without internet or a computer on Android. Pair the printer in the tablet Bluetooth settings first.',
  'طابعات هذا التابلت': 'Printers on This Tablet', 'إضافة طابعة': 'Add Printer', 'لم تتم إضافة طابعات محلية': 'No Local Printers Added',
  'أضف طابعة الفاتورة أو المطبخ أو المشروبات باستخدام IP مستقل لكل طابعة.': 'Add a receipt, kitchen, or beverage printer with a separate IP for each printer.',
  'فاتورة': 'Receipt', 'كل الأقسام': 'All Departments', 'مطبخ': 'Kitchen', 'تصنيف': 'category',
  'درج نقدية': 'Cash Drawer', 'اختبار': 'Test', 'جاري الاختبار…': 'Testing…', 'حذف الطابعة': 'Delete Printer',
  'اختر طابعة': 'Select a Printer', 'تُستخدم للفواتير وإعادة الطباعة والطباعة بعد الدفع.': 'Used for receipts, reprints, and printing after payment.',
  'إضافة طابعة محلية': 'Add Local Printer', 'تعديل الطابعة': 'Edit Printer', 'إعداد مستقل محفوظ على هذا التابلت': 'Independent setting saved on this tablet',
  'اسم الطابعة': 'Printer Name', 'مثال: مطبخ رئيسي': 'Example: Main Kitchen', 'الحالة': 'Status', 'متوقفة مؤقتًا': 'Temporarily Inactive',
  'طابعة بديلة عند التوقف': 'Fallback Printer', 'بدون طابعة بديلة': 'No Fallback Printer', 'مهام الطابعة': 'Printer Tasks',
  'فاتورة العميل وإعادة الطباعة': 'Customer receipt and reprints', 'طباعة KOT': 'Print KOT',
  'طلبات المطبخ أو المشروبات': 'Kitchen or beverage tickets', 'القسم': 'Department', 'المطبخ': 'Kitchen', 'المشروبات': 'Beverages',
  'التصنيفات الموجهة لهذه الطابعة': 'Categories Routed to This Printer', 'اتركها فارغة لطباعة كل الأصناف، أو حدد تصنيفات بعينها.': 'Leave empty to print all items, or select specific categories.',
  'الصوت عند الطباعة': 'Sound on Print', 'تشغيل صوت الطابعة': 'Enable Printer Sound', 'مفيد لطابعة المطبخ والمشروبات': 'Useful for kitchen and beverage printers',
  'نوع الأمر': 'Command Type', 'عدد المرات': 'Repeat Count', 'المدة': 'Duration', 'الدرج متصل بهذه الطابعة': 'Drawer Connected to This Printer',
  'يرسل أمر الفتح إلى منفذ الدرج في الطابعة': 'Sends the open command to the printer drawer port', 'نبضة التشغيل ms': 'ON Pulse (ms)', 'نبضة الإيقاف ms': 'OFF Pulse (ms)',
  'حفظ الطابعة': 'Save Printer', 'اختر طابعة الدرج': 'Select Drawer Printer',
  'الصوت ودرج النقدية يُضبطان بصورة مستقلة داخل كارت كل طابعة محلية.': 'Sound and cash drawer are configured independently on each local printer card.',
  'يعمل إذا كانت الطابعة تدعم Auto Cutter': 'Works when the printer supports Auto Cutter',
  'تنطبق على طريقة الطباعة المختارة؛ الأوفلاين يُحفظ في طابور آمن': 'Uses the selected print method; offline jobs are stored in a safe queue',
  'يطبع الفاتورة النهائية بعد نجاح التحصيل الكامل': 'Prints the final receipt after full payment succeeds',
  'AirPrint لا يحتاج Agent أو إنترنت، لكنه يعرض نافذة اختيار الطابعة والتأكيد على iPad.': 'AirPrint needs no agent or internet, but shows the printer picker and confirmation on iPad.',
  'متوقفة': 'Inactive', 'طباعة اختبار TCP': 'Test TCP Printing', 'طباعة اختبار Bluetooth': 'Test Bluetooth Printing',
  'اختبار طابعة جهاز الفرع': 'Test Branch Printer', 'طريقة اختبار AirPrint': 'How to Test AirPrint', 'معاينة آخر فاتورة': 'Preview Last Receipt',
  'اتصال السيرفر': 'Server Connection', 'متصل ✓': 'Connected ✓', '＋ طلب جديد': '＋ New Order', '↻ مزامنة الآن': '↻ Sync Now',
  'في المطبخ': 'In Kitchen', 'تم الدفع': 'Paid', 'جاهز': 'Ready',
  'الحالات الأوفلاين حسب آخر تحديث وسيتم التحقق عند عودة الاتصال': 'Offline statuses use the latest saved update and will be verified when connection returns',
  '＋ طلب استلام': '＋ Pickup Order', '＋ إضافة عميل': '＋ Add Customer',
  'إعدادات ثابتة لهذا الجهاز لا تتغير عند تبديل المستخدم': 'Device settings that remain unchanged when users switch',
  'فتح بواسطة المدير': 'Unlock as Manager', 'قفل': 'Lock', 'الإعدادات مقفلة للحماية.': 'Settings are locked for protection.',
  'يمكن للكاشير أو الجارسون مشاهدة القيم، وللتعديل أدخل كلمة مرور مدير النظام. كلمة المرور لا تُحفظ على التابلت.': 'Cashiers and waiters can view the values. Enter the system manager password to edit; the password is never stored on the tablet.',
  'تم فتح الإعدادات مؤقتًا بواسطة مدير النظام. ستظل القيم محفوظة على نفس التابلت لكل المستخدمين.': 'Settings are temporarily unlocked by the system manager. Values remain saved on this tablet for every user.',
  'فتح إعدادات التابلت': 'Unlock Tablet Settings',
  'أدخل نفس كلمة مرور مدير النظام أو صاحب المنشأة. لن يتم حفظها على الجهاز.': 'Enter the system manager or business owner password. It will not be stored on the device.',
  'كلمة مرور المدير': 'Manager Password', 'جاري التحقق…': 'Verifying…', 'فتح الإعدادات': 'Unlock Settings',
  'تعذر فتح الإعدادات': 'Unable to unlock settings',
  'طابعة الفاتورة الرئيسية': 'Primary Receipt Printer', 'تلقائي حسب إعداد الفرع': 'Automatic from Branch Settings',
  'توجيه KOT للمطبخ والمشروبات يظل مستقلًا حسب قواعد الأقسام.': 'Kitchen and beverage KOT routing remains independent according to department rules.',
  'درج النقدية وصوت الطابعة': 'Cash Drawer & Printer Sound', 'تفعيل درج النقدية على هذا التابلت': 'Enable Cash Drawer on This Tablet',
  'الطابعة نفسها يجب أن تكون مفعلة للدرج من إعدادات السيرفر.': 'The printer must also have its cash drawer enabled in server settings.',
  'طابعة درج النقدية': 'Cash Drawer Printer', 'أول طابعة درج مفعلة': 'First Enabled Drawer Printer',
  'فتح الدرج تلقائيًا مع الدفع النقدي': 'Open Drawer Automatically for Cash Payments',
  'لا يفتح مع KNET أو إعادة طباعة الفاتورة، وكل عملية فتح تُسجل للمراجعة.': 'It does not open for KNET or receipt reprints, and every open action is logged for review.',
  'صوت الطابعة يُضبط لكل طابعة من شاشة طابعات الفرع؛ يمكن تشغيله للمطبخ أو المشروبات أو الفاتورة بصورة مستقلة.': 'Printer sound is configured per printer in branch printer settings, independently for kitchen, beverage, and receipt printers.',
  'اختبار فتح درج النقدية': 'Test Cash Drawer', 'تم إرسال أمر اختبار الدرج إلى Print Agent': 'Cash drawer test sent to Print Agent',
  'تم فتح درج النقدية بنجاح': 'Cash drawer opened successfully', 'تعذر اختبار درج النقدية': 'Cash drawer test failed',
  'فتح درج النقدية': 'Open Cash Drawer', 'يتطلب تسجيل سبب الفتح': 'A reason must be recorded',
  'اكتب سبب الفتح اليدوي. سيتم تسجيل المستخدم والوقت والطابعة للمراجعة.': 'Enter the reason for manual opening. User, time, and printer will be logged for review.',
  'سبب الفتح': 'Reason for Opening', 'مثال: صرف مبلغ للعميل': 'Example: giving customer change', 'فتح الدرج': 'Open Drawer',
  'جاري الفتح…': 'Opening…', 'تعذر فتح درج النقدية': 'Unable to open the cash drawer',
  'فتح درج النقدية متوقف من إعدادات التابلت': 'Cash drawer opening is disabled in tablet settings',
  'فتح الدرج عن طريق Print Agent يحتاج اتصالًا بالسيرفر': 'Opening the drawer through Print Agent requires a server connection',
  'فتح الدرج عبر Bluetooth متاح على Android فقط': 'Bluetooth cash drawer opening is available on Android only',
  'لم يتم تحديد IP طابعة درج النقدية': 'Cash drawer printer IP is not configured',
};

const dynamicRules: Array<[RegExp, (...matches: string[]) => string]> = [
  [/^(\d+) طابعة محفوظة محليًا على الجهاز$/, count => `${count} printer(s) saved locally on this device`],
  [/^(\d+) تصنيف$/, count => `${count} categories`],
  [/^KOT · (.+)$/, department => `KOT · ${translateText(department, 'en')}`],
  [/^البديلة: (.+)$/, name => `Fallback: ${name}`],
  [/^(\d+) من (\d+) طابعة محلية متصلة$/, (connected, total) => `${connected} of ${total} local printers connected`],
  [/^تمت طباعة الاختبار على (.+) — (.+)$/, (name, address) => `Test printed on ${name} — ${address}`],
  [/^حذف الطابعة «(.+)» من هذا التابلت\؟$/, name => `Delete printer “${name}” from this tablet?`],
  [/^تم استخدام الطابعة البديلة بعد تعذر الاتصال بـ (.+)$/, name => `Fallback printer used after ${name} could not be reached`],
  [/^الإصدار (.+) متاح — مطلوب$/, version => `Version ${version} is available — required`],
  [/^الإصدار (.+) متاح$/, version => `Version ${version} is available`],
  [/^(\d+) أصناف$/, count => `${count} items`],
  [/^(\d+) طلب$/, count => `${count} orders`],
  [/^من (\d+) طاولة$/, count => `of ${count} tables`],
  [/^(\d+) ضيوف$/, count => `${count} guests`],
  [/^منذ (.+)$/, value => `Since ${translateText(value, 'en')}`],
  [/^الحجز (.+)$/, value => `Reserved ${translateText(value, 'en')}`],
  [/^طاولة (.+)$/, value => `Table ${value}`],
  [/^الكمية (\d+)$/, value => `Quantity ${value}`],
  [/^حتى (\d+)$/, value => `Up to ${value}`],
  [/^(\d+) من (\d+) مفعلة$/, (enabled, total) => `${enabled} of ${total} enabled`],
  [/^تمت إضافة (.+)$/, item => `${item} added`],
  [/^تعديل الطلب #(\d+)$/, id => `Edit Order #${id}`],
  [/^فاتورة (.+)$/, number => `Receipt ${number}`],
  [/^طلب مطبخ (.+)$/, number => `Kitchen Order ${number}`],
  [/^الجارسون: (.+)$/, name => `Waiter: ${name}`],
  [/^الرقم الضريبي: (.+)$/, number => `Tax No.: ${number}`],
  [/^تم حفظ الطلب رقم (\d+)$/, id => `Order #${id} saved`],
  [/^تم إرسال الطلب للمطبخ وإنشاء (\d+) مهمة KOT$/, count => `Sent to kitchen and created ${count} KOT job(s)`],
  [/^إلى (.+) — مهمة #(\d+)$/, (printer, id) => `to ${printer} — job #${id}`],
  [/^تحصيل الطلب #(\d+)$/, id => `Collect Order #${id}`],
  [/^تم تسجيل التحصيل للطلب #(\d+)$/, id => `Payment recorded for order #${id}`],
  [/^(\d+) معلقة · (\d+) تحتاج مراجعة$/, (pending, review) => `${pending} pending · ${review} need review`],
  [/^(\d+) معلقة · (\d+) مراجعة$/, (pending, review) => `${pending} pending · ${review} review`],
  [/^محاولة (\d+) · (.+)$/, (attempt, detail) => `Attempt ${attempt} · ${translateText(detail, 'en')}`],
  [/^نداء من (.+)$/, table => `Call from ${table}`],
  [/^طلب استلام (.+)$/, number => `Pickup Order ${number}`],
  [/^موعد الاستلام: (.+)$/, time => `Pickup time: ${time}`],
  [/^(\d+) س (\d+) د$/, (hours, minutes) => `${hours}h ${minutes}m`],
  [/^مدة الوردية (.+)$/, duration => `Shift duration ${translateText(duration, 'en')}`],
  [/^متبقي (.+)$/, amount => `Remaining ${amount}`],
  [/^(\d+) طابعة متاحة$/, count => `${count} printer(s) available`],
  [/^(\d+) تنتظر الإرسال$/, count => `${count} awaiting upload`],
  [/^حدث خطأ في السيرفر\. رقم التتبع: (.+)$/, id => `A server error occurred. Trace ID: ${id}`],
  [/^تعذر تنفيذ العملية \((\d+)\)$/, status => `Unable to complete the operation (${status})`],
  [/^عملية المزامنة غير مدعومة: (.+)$/, kind => `Unsupported sync operation: ${kind}`],
  [/^تمت الطباعة عبر Bluetooth على (.+)$/, printer => `Printed via Bluetooth on ${printer}`],
  [/^تمت الطباعة مباشرة على (.+)$/, printer => `Printed directly on ${printer}`],
  [/^تم إرسال اختبار إلى (.+) — مهمة #(\d+)$/, (printer, id) => `Test sent to ${printer} — job #${id}`],
  [/^(\d+) ثانية$/, seconds => `${seconds} seconds`],
  [/^(\d+) ثوانٍ$/, seconds => `${seconds} seconds`],
  [/^(\d+) نسخ$/, copies => `${copies} copies`],
  [/^(\d+) \/ (\d+) نسخة مؤكدة$/, (confirmed, requested) => `${confirmed} / ${requested} confirmed copy`],
  [/^(.+) د\.ك$/, amount => `${amount} KWD`],
  [/^أهلًا (.+)$/, name => `Welcome ${name}`],
  [/^(.+) · (.+)$/, (first, second) => `${translateText(first, 'en')} · ${translateText(second, 'en')}`],
];

const orderTypes: Record<Language, Record<OrderType, string>> = {
  ar: { dine_in: 'داخل المطعم', takeaway: 'تيك أواي', delivery: 'توصيل', pickup: 'استلام' },
  en: { dine_in: 'Dine In', takeaway: 'Takeaway', delivery: 'Delivery', pickup: 'Pickup' },
};

export function getUiLanguage(): Language { return activeLanguage; }
export function isRtlLanguage(language: Language = activeLanguage): boolean { return language === 'ar'; }
export function localeCode(language: Language = activeLanguage): string { return language === 'ar' ? 'ar-KW' : 'en-KW'; }
export function orderTypeLabel(type: OrderType, language: Language = activeLanguage): string { return orderTypes[language][type]; }

export function translateText(value: string, language: Language = activeLanguage): string {
  if (language === 'ar' || !value) return value;
  const whitespaceStart = value.match(/^\s*/)?.[0] ?? '';
  const whitespaceEnd = value.match(/\s*$/)?.[0] ?? '';
  const source = value.trim();
  if (!source) return value;
  const exact = translations[source];
  if (exact) return `${whitespaceStart}${exact}${whitespaceEnd}`;
  for (const [pattern, render] of dynamicRules) {
    const match = source.match(pattern);
    if (match) return `${whitespaceStart}${render(...match.slice(1))}${whitespaceEnd}`;
  }
  return value;
}

const textState = new WeakMap<Text, { original: string; translated: string }>();
const attributeState = new WeakMap<Element, Map<string, { original: string; translated: string }>>();
const translatedAttributes = ['placeholder', 'aria-label', 'title'] as const;

function translateTextNode(node: Text): void {
  const state = textState.get(node);
  let original = state?.original ?? node.data;
  if (state && node.data !== state.translated && node.data !== state.original) original = node.data;
  const translated = translateText(original);
  textState.set(node, { original, translated });
  if (node.data !== translated) node.data = translated;
}

function translateElement(element: Element): void {
  const tag = element.tagName.toLowerCase();
  if (tag === 'script' || tag === 'style') return;
  let states = attributeState.get(element);
  if (!states) { states = new Map(); attributeState.set(element, states); }
  for (const attribute of translatedAttributes) {
    if (!element.hasAttribute(attribute)) continue;
    const current = element.getAttribute(attribute) ?? '';
    const previous = states.get(attribute);
    const original = previous && (current === previous.original || current === previous.translated) ? previous.original : current;
    const translated = translateText(original);
    states.set(attribute, { original, translated });
    if (current !== translated) element.setAttribute(attribute, translated);
  }
  for (const child of Array.from(element.childNodes)) translateNode(child);
}

function translateNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
  else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node as Element);
}

export function setUiLanguage(language: Language): void {
  activeLanguage = language;
  document.documentElement.lang = language;
  document.documentElement.dir = isRtlLanguage(language) ? 'rtl' : 'ltr';
  if (document.body) translateElement(document.body);
  window.dispatchEvent(new CustomEvent('kwaiter:language-changed', { detail: { language } }));
}

export function installLocalization(): void {
  if (observer) return;
  observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateNode(record.target);
      else if (record.type === 'attributes') translateElement(record.target as Element);
      else for (const node of Array.from(record.addedNodes)) translateNode(node);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...translatedAttributes] });
  const nativeConfirm = window.confirm.bind(window);
  window.confirm = message => nativeConfirm(translateText(String(message)));
  const nativeAlert = window.alert.bind(window);
  window.alert = message => nativeAlert(translateText(String(message)));
  const nativePrompt = window.prompt.bind(window);
  window.prompt = (message, defaultValue) => nativePrompt(translateText(String(message)), defaultValue === undefined ? undefined : translateText(defaultValue));
}
