<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number; strokeWidth?: number }>(), { size: 20, strokeWidth: 1.8 });
</script>

<template>
  <svg class="app-icon" :class="{ 'app-icon-back': name === 'back' }" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'home'"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></template>
    <template v-else-if="name === 'tables'"><path d="M4 9h16M7 9v11m10-11v11M3 20h18"/><path d="M6 4h12v5H6z"/></template>
    <template v-else-if="name === 'table-top'"><rect x="6.5" y="6.5" width="11" height="11" rx="2.4"/><path d="M9 3h6M9 21h6M3 9v6M21 9v6M8 3v3.5M16 3v3.5M8 17.5V21M16 17.5V21M3 8h3.5M3 16h3.5M17.5 8H21M17.5 16H21"/></template>
    <template v-else-if="name === 'pos'"><path d="M6 3h12v4H6zM5 7h14v14H5z"/><path d="M8 11h8M8 15h2m3 0h3m-8 3h2m3 0h3"/></template>
    <template v-else-if="name === 'receipt'"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6m-6 4h6m-6 4h4"/></template>
    <template v-else-if="name === 'more'"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></template>
    <template v-else-if="name === 'pickup'"><path d="M6 3h12v18H6zM9 7h6m-6 4h6"/><path d="m9 16 2 2 4-4"/></template>
    <template v-else-if="name === 'users'"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></template>
    <template v-else-if="name === 'shift'"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></template>
    <template v-else-if="name === 'settings'"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></template>
    <template v-else-if="name === 'save'"><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></template>
    <template v-else-if="name === 'back'"><path d="m9 18 6-6-6-6"/></template>
    <template v-else-if="name === 'cloud-check'"><path d="M17.5 19H7a5 5 0 1 1 1.4-9.8A6 6 0 0 1 20 11a4 4 0 0 1-2.5 8Z"/><path d="m9 14 2 2 4-4"/></template>
    <template v-else-if="name === 'download'"><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M5 21h14"/></template>
    <template v-else-if="name === 'check'"><path d="m5 12 4 4L19 6"/></template>
    <template v-else-if="name === 'dine-in'"><path d="M4 10h16M7 10v10m10-10v10M5 20h14"/><path d="M8 4h8v6H8z"/></template>
    <template v-else-if="name === 'takeaway'"><path d="M6 8h12l-1 13H7zM9 8V6a3 3 0 0 1 6 0v2"/></template>
    <template v-else-if="name === 'delivery'"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 18h5l2-7h3l3 4v3h-1M4 16V8h8v10M4 11h8"/></template>
    <template v-else-if="name === 'user'"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></template>
    <template v-else-if="name === 'pin'"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></template>
    <template v-else-if="name === 'chevron-up'"><path d="m6 15 6-6 6 6"/></template>
    <template v-else-if="name === 'chevron-down'"><path d="m6 9 6 6 6-6"/></template>
    <template v-else-if="name === 'search'"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></template>
    <template v-else-if="name === 'cart'"><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.4 11h10.8l2-7H6"/></template>
    <template v-else-if="name === 'plus'"><path d="M12 5v14M5 12h14"/></template>
    <template v-else-if="name === 'minus'"><path d="M5 12h14"/></template>
    <template v-else-if="name === 'trash'"><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7"/><path d="M10 11v6m4-6v6"/></template>
    <template v-else-if="name === 'edit'"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14 7 3 3"/></template>
    <template v-else-if="name === 'cash'"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9H6v1m11-1h1v1M7 15H6v-1m11 1h1v-1"/></template>
    <template v-else-if="name === 'card'"><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M7 6h10v5H7zm1 9h2m3 0h3m-8 3h2m3 0h3"/></template>
    <template v-else-if="name === 'cheque'"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h5m-5 4h10m0-4h.01"/></template>
    <template v-else-if="name === 'bank'"><path d="m3 9 9-5 9 5M5 10h14M6 10v8m4-8v8m4-8v8m4-8v8M4 20h16"/></template>
    <template v-else-if="name === 'link'"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></template>
    <template v-else-if="name === 'wallet'"><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12v3"/><path d="M15 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/></template>
    <template v-else-if="name === 'transfer'"><path d="M5 7h13m0 0-3-3m3 3-3 3M19 17H6m0 0 3 3m-3-3 3-3"/></template>
    <template v-else-if="name === 'merge'"><path d="M6 4v4c0 3 2 4 6 4h6m0 0-3-3m3 3-3 3M6 20v-4c0-2 1-3 3-4"/></template>
    <template v-else-if="name === 'split'"><path d="M6 4v4c0 3 2 4 6 4h6m0 0-3-3m3 3-3 3M6 20v-4c0-2 1-3 3-4M12 12c3 0 4 2 4 5v3"/></template>
    <template v-else-if="name === 'sliders'"><path d="M4 7h10m4 0h2M4 17h2m4 0h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></template>
    <template v-else-if="name === 'chef'"><path d="M6 10a4 4 0 0 1 3-6 4 4 0 0 1 6 0 4 4 0 0 1 3 6v9H6Z"/><path d="M8 15h8m-8 4h8"/></template>
    <template v-else-if="name === 'close'"><path d="M6 6l12 12M18 6 6 18"/></template>
    <template v-else-if="name === 'star'"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></template>
    <template v-else-if="name === 'image'"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/></template>
    <template v-else-if="name === 'sync'"><path d="M20 7h-5V2M4 17h5v5"/><path d="M18 18a8 8 0 0 1-13-2M6 6a8 8 0 0 1 13 2"/></template>
    <template v-else-if="name === 'clock'"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></template>
    <template v-else-if="name === 'calendar'"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></template>
    <template v-else-if="name === 'bell'"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></template>
    <template v-else-if="name === 'warning'"><path d="M12 3 2.5 20h19Z"/><path d="M12 9v5m0 3h.01"/></template>
    <template v-else-if="name === 'wifi-off'"><path d="M2 8.8A16 16 0 0 1 5.7 7M8.5 5.2A16 16 0 0 1 22 8.8M5 12.8a11 11 0 0 1 5-2.5m3.5.2a11 11 0 0 1 5.5 2.3M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/></template>
    <template v-else-if="name === 'printer'"><path d="M6 9V3h12v6M6 18H4V9h16v9h-2"/><path d="M6 14h12v7H6z"/></template>
    <template v-else-if="name === 'lock'"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></template>
    <template v-else><circle cx="12" cy="12" r="9"/></template>
  </svg>
</template>
