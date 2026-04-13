# ICT Masterclass v14.1.5

> Inner Circle Trader — Smart Money Concepts Reference Guide

## Struktur Proyek

```
/ict-masterclass
├── index.html              ← Entry point utama (buka ini di browser)
├── /assets
│   ├── /images
│   ├── /icons
│   └── /fonts
├── /css
│   ├── base.css            ← Reset, :root CSS variables, body
│   ├── layout.css          ← Hero, nav-tabs, sidebar layout, clock-bar
│   ├── components.css      ← Cards, checklist, calculator, COT, journal, dll
│   ├── utilities.css       ← Scrollbar, back-to-top, glossary, print, responsive
│   └── themes.css          ← Light mode overrides
├── /js
│   ├── main.js             ← SEMUA JavaScript (2304 baris, 100% original)
│   ├── /core               ← Stubs (referensi ke main.js)
│   ├── /modules            ← Stubs (referensi ke main.js)
│   ├── /features           ← Stubs (referensi ke main.js)
│   └── /init               ← Stubs (referensi ke main.js)
├── /components
│   ├── sidebar.html        ← Sidebar drawer HTML
│   ├── modal.html          ← Quick Trade + Daily Bias + FAQ modals
│   ├── navbar.html         ← Clock bar + nav tabs
│   └── footer.html         ← Footer credit bar
├── /data
│   ├── dummy.json
│   └── config.json
└── README.md
```

## Cara Penggunaan

Buka `index.html` langsung di browser — tidak perlu server/build step.

## Arsitektur

- **CSS** sudah dipisahkan ke 5 file terpisah (`css/*.css`)
- **JS** dikompilasi ke satu file `js/main.js` (identik dengan original)
- File stub di `/js/core`, `/js/modules`, dll tersedia sebagai placeholder
  untuk split lebih lanjut saat kamu siap mengerjakan dependency order

## Dependency Order JS (untuk split mendatang)

```
1. utils.js       — escapeHtml, safeJSONParse
2. state.js       — INSTRUMENTS, currentInstrument, setInstrument
3. clock.js       — _notifEnabled, updateNotifUI, startMasterTimer
4. sidebar.js     — _sidebarOpen, _isDesktop, toggleSidebar
5. notification.js— showToast
6. tabs.js        — showTab, goToTab, toggleTheme (butuh sidebar vars)
7. theme.js       — (kosong, toggleTheme ada di tabs.js)
8. navigation.js  — initTooltips, back-to-top (butuh escapeHtml)
9. modal.js       — openModal, closeModal
10. calculator.js — calculate, saveChecklist, loadChecklist
11. checklist.js  — toggleCheck, exportChecklist (butuh saveChecklist)
12. cot.js        — parseCOT, updateCOTStatusPanel, loadFromURL
13. journal.js    — journalEntries, loadJournal, saveJournal
14. calendar.js   — renderEconomicCalendar
15. storage.js    — localStorage restore (butuh semua di atas)
16. initApp.js    — bootstrap, quickTradeSave, renderFAQ (terakhir)
```

## Versi

- **v14.1.5** — Current (April 2026)
- Dibuat oleh: Rizky Saputra · ICT SMC Researcher
