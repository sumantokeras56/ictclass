// ── UTILS (V13) ───────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJSONParse(str, fallback) {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) return parsed;
    return fallback;
  } catch(e) { return fallback; }
}

// ── INSTRUMENT CONFIG ──────────────────────────────────────────────
const instruments = {
  forex: {
    name: 'Forex Standard (non-JPY)',
    desc: '1 lot = 100,000 units. Pip = 0.0001. Pip value ~$10/lot.',
    pipMultiplier: 10000,
    pipValueDefault: 10,
    unit: 'lot',
    chips: ['EURUSD','GBPUSD','AUDUSD','XAUUSD','GBPJPY (gunakan JPY)'],
    slLabel: 'SL Pips',
    tpLabel: 'TP Pips',
    sizeLabel: 'Lot Size',
    pipLabel: 'Pip Value (USD per lot per pip)'
  },
  jpyfx: {
    name: 'JPY Pairs (USDJPY, GBPJPY, dll)',
    desc: '1 lot = 100,000 units. Pip = 0.01. Pip value ~$7.6/lot (varies).',
    pipMultiplier: 100,
    pipValueDefault: 7.6,
    unit: 'lot',
    chips: ['USDJPY','GBPJPY','EURJPY','AUDJPY'],
    slLabel: 'SL Pips',
    tpLabel: 'TP Pips',
    sizeLabel: 'Lot Size',
    pipLabel: 'Pip Value (USD per lot per pip)'
  },
  nq: {
    name: 'NQ — E-mini Nasdaq-100 Futures',
    desc: 'Tick = 0.25 poin. Tick value = $5. Full contract = $20/poin.',
    pipMultiplier: 4, // 1 point = 4 ticks
    pipValueDefault: 5,
    tickSize: 1, // after ×4 multiplier, min unit = 1 tick
    unit: 'contract',
    chips: ['Tick: 0.25 poin','$5 per tick','$20 per poin','Micro MNQ = 1/10'],
    slLabel: 'SL Ticks',
    tpLabel: 'TP Ticks',
    sizeLabel: 'Contracts',
    pipLabel: 'Tick Value (USD per contract per tick = $5)'
  },
  es: {
    name: 'ES — E-mini S&P 500 Futures',
    desc: 'Tick = 0.25 poin. Tick value = $12.5. Full contract = $50/poin.',
    pipMultiplier: 4,
    pipValueDefault: 12.5,
    tickSize: 1,
    unit: 'contract',
    chips: ['Tick: 0.25 poin','$12.5 per tick','$50 per poin','Micro MES = 1/10'],
    slLabel: 'SL Ticks',
    tpLabel: 'TP Ticks',
    sizeLabel: 'Contracts',
    pipLabel: 'Tick Value (USD per contract per tick = $12.5)'
  },
  ym: {
    name: 'YM — E-mini Dow Jones Futures',
    desc: 'Tick = 1 poin. Tick value = $5. Full contract = $5/poin.',
    pipMultiplier: 1,
    pipValueDefault: 5,
    tickSize: 1,
    unit: 'contract',
    chips: ['Tick: 1 poin','$5 per tick','$5 per poin','Micro MYM = 1/10'],
    slLabel: 'SL Points',
    tpLabel: 'TP Points',
    sizeLabel: 'Contracts',
    pipLabel: 'Tick Value (USD per contract per tick = $5)'
  },
  custom: {
    name: 'Custom Instrument',
    desc: 'Masukkan pip/tick value secara manual sesuai instrumen.',
    pipMultiplier: 10000,
    pipValueDefault: 10,
    unit: 'lot',
    chips: ['Masukkan pip value manual'],
    slLabel: 'SL Distance',
    tpLabel: 'TP Distance',
    sizeLabel: 'Position Size',
    pipLabel: 'Tick/Pip Value (USD per unit)'
  }
};

let currentInstrument = 'forex';

function setInstrument(key, btn) {
  currentInstrument = key;
  document.querySelectorAll('.inst-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const inst = instruments[key];
  document.getElementById('instrName').textContent = inst.name;
  document.getElementById('instrDesc').textContent = inst.desc;
  document.getElementById('pipValue').value = inst.pipValueDefault;
  document.getElementById('pipValLabel').textContent = inst.pipLabel;
  document.getElementById('slLabel').textContent = inst.slLabel;
  document.getElementById('tpLabel').textContent = inst.tpLabel;
  document.getElementById('sizeLabel').textContent = inst.sizeLabel;
  // Update placeholder hints
  if (key === 'nq') { document.getElementById('entryPrice').placeholder = '17000.00'; document.getElementById('slPrice').placeholder = '16980.00'; document.getElementById('tpPrice').placeholder = '17040.00'; }
  else if (key === 'es') { document.getElementById('entryPrice').placeholder = '5300.00'; document.getElementById('slPrice').placeholder = '5290.00'; document.getElementById('tpPrice').placeholder = '5320.00'; }
  else if (key === 'ym') { document.getElementById('entryPrice').placeholder = '39500'; document.getElementById('slPrice').placeholder = '39400'; document.getElementById('tpPrice').placeholder = '39700'; }
  else { document.getElementById('entryPrice').placeholder = '1.08500'; document.getElementById('slPrice').placeholder = '1.08300'; document.getElementById('tpPrice').placeholder = '1.08900'; }

  const chips = document.getElementById('instrChips');
  chips.innerHTML = inst.chips.map(c => `<span class="pill pill-gold">${escapeHtml(c)}</span>`).join('');
  document.getElementById('instrInfo').classList.add('show');
  clearCalculator(); // V13: langsung di sini, tidak perlu override window.setInstrument
}

// ── CALCULATE ─────────────────────────────────────────────────────
function calculate() {
  const inst = instruments[currentInstrument];
  const balance = parseFloat(document.getElementById('balance').value) || 0;
  const riskPct = parseFloat(document.getElementById('riskPct').value) || 1;
  const entry = parseFloat(document.getElementById('entryPrice').value) || 0;
  const sl = parseFloat(document.getElementById('slPrice').value) || 0;
  const tp = parseFloat(document.getElementById('tpPrice').value) || 0;
  const tickVal = parseFloat(document.getElementById('pipValue').value) || inst.pipValueDefault;

  if (!entry || !sl || !tp) { alert('Isi Entry, SL, dan TP terlebih dahulu'); return; }

  const riskAmt = balance * (riskPct / 100);
  const slDiff = Math.abs(entry - sl);
  const tpDiff = Math.abs(tp - entry);

  // For futures, ticks = diff * pipMultiplier
  // For forex, pips = diff * 10000 (or 100 for JPY)
  let slUnits = Math.round(slDiff * inst.pipMultiplier * 100) / 100;
  let tpUnits = Math.round(tpDiff * inst.pipMultiplier * 100) / 100;

  // Round to tick size for futures instruments
  if (inst.unit === 'contract' && inst.tickSize) {
    slUnits = Math.round(slUnits / inst.tickSize) * inst.tickSize;
    tpUnits = Math.round(tpUnits / inst.tickSize) * inst.tickSize;
    slUnits = Math.round(slUnits * 100) / 100;
    tpUnits = Math.round(tpUnits * 100) / 100;
  }

  const posSize = slUnits > 0 ? (riskAmt / (slUnits * tickVal)) : 0;
  const potProfit = posSize * tpUnits * tickVal;
  const rr = slUnits > 0 ? (tpUnits / slUnits) : 0;

  const unitLabel = inst.unit === 'contract' ? ' kontr.' : ' lot';
  const distLabel = inst.unit === 'contract' ? '' : ' pip';

  document.getElementById('riskAmount').textContent = '$' + riskAmt.toFixed(2);
  document.getElementById('slPips').textContent = slUnits.toFixed(inst.unit === 'contract' ? 2 : 0) + distLabel;
  document.getElementById('tpPips').textContent = tpUnits.toFixed(inst.unit === 'contract' ? 2 : 0) + distLabel;
  document.getElementById('lotSize').textContent = posSize.toFixed(2) + unitLabel;
  document.getElementById('potProfit').textContent = '$' + potProfit.toFixed(2);
  document.getElementById('rrRatio').textContent = '1:' + rr.toFixed(2);

  const rrEl = document.getElementById('rrRatio');
  const barFill = document.getElementById('rrBar');
  const verdict = document.getElementById('rrVerdict');
  const barPct = Math.min((rr / 5) * 100, 100);
  barFill.style.width = barPct + '%';

  if (rr >= 3) {
    rrEl.style.color = 'var(--green)';
    barFill.style.background = 'var(--green)';
    verdict.className = 'rr-verdict rr-good';
    verdict.textContent = '✓ Excellent Setup — RR ' + rr.toFixed(2) + ':1 sangat layak dieksekusi';
  } else if (rr >= 2) {
    rrEl.style.color = 'var(--gold-glow)';
    barFill.style.background = 'var(--gold)';
    verdict.className = 'rr-verdict rr-good';
    verdict.textContent = '✓ Valid ICT Setup — RR ' + rr.toFixed(2) + ':1 memenuhi minimum 1:2';
  } else {
    rrEl.style.color = 'var(--red)';
    barFill.style.background = 'var(--red)';
    verdict.className = 'rr-verdict rr-bad';
    verdict.textContent = '✗ Di bawah minimum ICT — RR ' + rr.toFixed(2) + ':1 tidak direkomendasikan';
  }
  document.getElementById('calcResult').classList.add('show');
}

// ── HELP TOGGLE ───────────────────────────────────────────────────
function toggleHelp() {
  const toggle = document.getElementById('helpToggle');
  const content = document.getElementById('helpContent');
  toggle.classList.toggle('open');
  content.classList.toggle('show');
}

function saveChecklist() {
  const checked = [...document.querySelectorAll('.check-item.checked')].map(el => el.querySelector('.check-text').innerText.trim());
  localStorage.setItem('ict-checklist', JSON.stringify(checked));
}

function loadChecklist() {
  try {
    const saved = safeJSONParse(localStorage.getItem('ict-checklist'), []);
    document.querySelectorAll('.check-item').forEach(el => {
      const txt = el.querySelector('.check-text');
      if (txt && saved.includes(txt.innerText.trim())) el.classList.add('checked');
    });
    updateProgress();
  } catch(e) {}
}

// ── CHECKLIST ─────────────────────────────────────────────────────
function showTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.getElementById('tab-' + name).classList.add('active');
  if (el) { el.classList.add('active'); el.setAttribute('aria-selected','true'); }
  // v14.1.3: close sidebar on mobile after tab switch
  if (!_isDesktop() && _sidebarOpen) toggleSidebar();
}

function toggleCheck(el) {
  el.classList.toggle('checked');
  el.setAttribute('aria-checked', el.classList.contains('checked') ? 'true' : 'false');
  updateProgress();
  saveChecklist();
}

function updateProgress() {
  const items = document.querySelectorAll('.check-item');
  const checked = document.querySelectorAll('.check-item.checked');
  const total = items.length;
  const done = checked.length;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressCount').textContent = done + ' / ' + total;

  const vm = document.getElementById('verdictMsg');
  if (done === total) {
    vm.style.color = 'var(--green)';
    vm.textContent = '✓ Semua checklist terpenuhi — Setup Valid untuk dieksekusi!';
  } else {
    const critical = document.querySelectorAll('.check-critical');
    const criticalChecked = document.querySelectorAll('.check-critical.checked');
    if (criticalChecked.length === critical.length && done >= 10) {
      vm.style.color = 'var(--gold)';
      vm.textContent = '⚡ Item kritis terpenuhi — Pertimbangkan entry dengan hati-hati';
    } else {
      vm.style.color = 'var(--text-muted)';
      vm.textContent = done + ' dari ' + total + ' item terpenuhi';
    }
  }
}

function resetChecklist() {
  document.querySelectorAll('.check-item').forEach(i => i.classList.remove('checked'));
  updateProgress();
  document.getElementById('verdictMsg').textContent = '';
  localStorage.removeItem('ict-checklist');
}

// ── LIVE CLOCK (UTC–4 = NY, UTC+0 = London, UTC+7 = WIB) ─────────
// V14: Timezone akurat via Intl.DateTimeFormat (otomatis EDT/EST)
const sessions = [
  { name: 'ASIA SESSION',  startH: 20, startM: 0,  endH: 3,  endM: 0,  color: 'var(--blue)',   pbC1:'#3a7bd5',pbC2:'#5B9BD5', kzId: null },
  { name: 'LONDON KZ',     startH: 3,  startM: 0,  endH: 8,  endM: 30, color: 'var(--gold)',   pbC1:'#8A6E30',pbC2:'#C9A84C', kzId: 'kz-london' },
  { name: 'NEW YORK KZ',   startH: 8,  startM: 30, endH: 16, endM: 0,  color: 'var(--green)',  pbC1:'#1a7a44',pbC2:'#2ECC71', kzId: 'kz-ny' },
  { name: 'NY PM SESSION', startH: 13, startM: 0,  endH: 16, endM: 0,  color: 'var(--purple)', pbC1:'#6a3a9f',pbC2:'#9B59B6', kzId: 'kz-nypm' }
];

// ── V14: FOMC SCHEDULE 2026 ───────────────────────────────────────
const FOMC_DATES_2026 = [
  '2026-01-28','2026-03-18','2026-05-06','2026-06-17',
  '2026-07-29','2026-09-16','2026-10-28','2026-12-09'
];

// ── V14.1.1: HIGH IMPACT NEWS ARRAY (Akurat 2026) ─────────────────
// Semua tanggal dalam format YYYY-MM-DD, waktu dalam NY timezone
const HIGH_IMPACT_NEWS = [
  // ── NFP 2026 (First Friday each month, 08:30 NY) ──
  { name:'NFP', date:'2026-01-09', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-02-06', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-03-06', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-04-03', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-05-01', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-06-05', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-07-03', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-08-07', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-09-04', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-10-02', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-11-06', time:'08:30', currency:'USD', impact:'high' },
  { name:'NFP', date:'2026-12-04', time:'08:30', currency:'USD', impact:'high' },
  // ── CPI 2026 (~pertengahan bulan, 08:30 NY) ──
  { name:'CPI', date:'2026-01-14', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-02-12', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-03-12', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-04-14', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-05-13', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-06-12', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-07-15', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-08-13', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-09-15', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-10-14', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-11-13', time:'08:30', currency:'USD', impact:'high' },
  { name:'CPI', date:'2026-12-15', time:'08:30', currency:'USD', impact:'high' },
  // ── FOMC 2026 (14:00 NY) ──
  { name:'FOMC', date:'2026-01-28', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-03-18', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-05-06', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-06-17', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-07-29', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-09-16', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-10-28', time:'14:00', currency:'USD', impact:'high' },
  { name:'FOMC', date:'2026-12-09', time:'14:00', currency:'USD', impact:'high' },
];

// Helper: Get next event from HIGH_IMPACT_NEWS array for a given type
// Returns seconds until that event, or fallback if past all 2026 dates
function getNextFromArray(eventType, ny) {
  // v14.1.5: timezone-safe — semua perbandingan pakai UTC timestamp
  // "now" dalam NY = epoch ms saat ini
  const nowMs = Date.now();

  const filtered = HIGH_IMPACT_NEWS.filter(e => e.name === eventType);
  for (const ev of filtered) {
    const [h, m] = ev.time.split(':').map(Number);
    const [ey, emo, ed] = ev.date.split('-').map(Number);
    // Bangun event timestamp: tanggal NY midnight (UTC) + offset NY + jam event
    // Pakai Intl untuk cari UTC offset NY pada hari itu (akurat DST)
    // Trick: buat Date di UTC midnight, lalu cari selisih ke NY midnight
    const evUTCMidnight = Date.UTC(ey, emo - 1, ed); // UTC midnight
    // Tentukan offset NY pada hari itu (pakai formatter)
    const evDateObj = new Date(evUTCMidnight + 12 * 3600000); // noon UTC agar tidak ambigu DST
    const evNYParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(evDateObj);
    const evNYHour = parseInt(evNYParts.find(p => p.type === 'hour')?.value || '12');
    // Offset NY dari UTC noon: evNYHour - 12 (EDT=-4, EST=-5)
    const nyOffsetHours = evNYHour - 12; // negatif, e.g. -4 for EDT
    // NY midnight = UTC midnight - nyOffsetHours
    const evNYMidnightMs = evUTCMidnight + (-nyOffsetHours) * 3600000;
    const evMs = evNYMidnightMs + (h * 3600 + m * 60) * 1000;
    const diffSec = Math.round((evMs - nowMs) / 1000);
    if (diffSec > -300) return Math.max(0, diffSec); // masih relevan (300s grace)
  }
  // Fallback jika semua tanggal 2026 sudah lewat
  if (eventType === 'NFP') {
    let mo = ny.month, yr = ny.year;
    mo++; if (mo > 12) { mo = 1; yr++; }
    const day = getFirstFridayOfMonth(yr, mo);
    const evUTC = Date.UTC(yr, mo - 1, day);
    return Math.max(1, Math.round((evUTC + (4 * 3600 + 8 * 3600 + 30 * 60) * 1000 - nowMs) / 1000));
  }
  if (eventType === 'CPI') {
    let mo = ny.month, yr = ny.year;
    mo++; if (mo > 12) { mo = 1; yr++; }
    const evUTC = Date.UTC(yr, mo - 1, 14);
    return Math.max(1, Math.round((evUTC + (4 * 3600 + 8 * 3600 + 30 * 60) * 1000 - nowMs) / 1000));
  }
  if (eventType === 'FOMC') { return 42 * 86400; }
  return 7 * 86400;
}

// ── V14: AUDIO ALERT ──────────────────────────────────────────────
// ── BROWSER NOTIFICATION SYSTEM (v14.1.5) ────────────────────────
let _notifEnabled = false;
let _alertedSessions = new Set(); // session start dedup
let _alertedEvents   = new Set(); // news event dedup

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠️ Browser Anda tidak mendukung notifikasi');
    return;
  }
  Notification.requestPermission().then(perm => {
    _notifEnabled = perm === 'granted';
    updateNotifUI();
    if (_notifEnabled) {
      showToast('✅ Notifikasi sesi trading diaktifkan!');
      localStorage.setItem('ict-notif', '1');
      // Test notification
      new Notification('ICT Masterclass', {
        body: '🔔 Notifikasi sesi trading aktif!',
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>'
      });
    } else {
      showToast('❌ Izin notifikasi ditolak');
      localStorage.setItem('ict-notif', '0');
    }
  });
}

function updateNotifUI() {
  const badge = document.getElementById('notifStatusBadge');
  const btn   = document.getElementById('notifEnableBtn');
  if (badge) {
    badge.textContent = _notifEnabled ? 'ON' : 'OFF';
    badge.style.background = _notifEnabled ? 'rgba(46,204,113,0.15)' : 'var(--dark4)';
    badge.style.color = _notifEnabled ? 'var(--green)' : 'var(--text-muted)';
    badge.style.border = _notifEnabled ? '1px solid rgba(46,204,113,0.3)' : 'none';
  }
  if (btn) {
    btn.textContent = _notifEnabled ? '✅ Notifikasi Aktif' : '🔔 Aktifkan Notifikasi';
    btn.style.borderColor = _notifEnabled ? 'rgba(46,204,113,0.4)' : 'var(--border)';
    btn.style.color = _notifEnabled ? 'var(--green)' : 'var(--text-dim)';
  }
}

function sendSessionNotif(sessionName, message) {
  if (!_notifEnabled || Notification.permission !== 'granted') return;
  try {
    new Notification('ICT Masterclass — ' + sessionName, {
      body: message,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>',
      tag: sessionName // prevent duplicate notifs
    });
  } catch(e) {}
}

function sendNewsNotif(eventName, minLeft) {
  if (!_notifEnabled || Notification.permission !== 'granted') return;
  let msg;
  if (minLeft >= 15) {
    msg = '⏰ ' + eventName + ' dalam 15 menit — bersiap, hindari entry baru!';
  } else if (minLeft > 0) {
    msg = '⚠️ ' + eventName + ' dalam ' + minLeft + ' menit — JANGAN entry baru!';
  } else {
    msg = '🔴 ' + eventName + ' baru saja dirilis — tunggu settle 10-15 mnt';
  }
  try {
    new Notification('ICT — HIGH IMPACT NEWS ⚠️', {
      body: msg,
      tag: 'news-' + eventName + '-' + minLeft,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚠️</text></svg>'
    });
  } catch(e) {}
}

function inSession(h, m, s) {
  const t = h * 60 + m;
  const start = s.startH * 60 + s.startM;
  const end = s.endH * 60 + s.endM;
  if (s.startH > s.endH) { return t >= start || t < end; }
  return t >= start && t < end;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Ambil waktu NY secara akurat (otomatis EDT/EST via Intl)
function getNYTime(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, day: '2-digit', month: '2-digit', year: 'numeric'
  }).formatToParts(now);
  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0');
  return {
    h: get('hour'), m: get('minute'), s: get('second'),
    day: get('day'), month: get('month'), year: get('year'),
    dayOfWeek: new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay()
  };
}

// ── V14.1.5: MARKET OPEN/CLOSE HELPERS ─────────────────────────
// Market hours: Sunday 18:00 NY → Friday 17:00 NY
function isMarketOpen(ny) {
  const dow = ny.dayOfWeek; // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const nyNowSec = ny.h * 3600 + ny.m * 60 + ny.s;
  if (dow === 6) return false;                       // Sabtu: selalu tutup
  if (dow === 0) return nyNowSec >= 18 * 3600;      // Minggu: buka 18:00
  if (dow === 5) return nyNowSec < 17 * 3600;       // Jumat: tutup 17:00
  return true;                                       // Senin-Kamis: selalu buka
}

// Hitung detik ke market open berikutnya (Sunday 18:00 NY) — real timestamp
function secToNextMarketOpen(ny) {
  if (isMarketOpen(ny)) return 0;
  const nowMs = Date.now();
  const dow = ny.dayOfWeek;

  // Cari hari Minggu berikutnya
  let daysToSun = (7 - dow) % 7; // 0=Sun sudah
  if (dow === 0) daysToSun = 0;  // sudah Minggu tapi sebelum 18:00

  // Bangun timestamp Minggu 18:00 NY secara akurat
  const targetDateUTC = Date.UTC(ny.year, ny.month - 1, ny.day + daysToSun);
  const midObj = new Date(targetDateUTC + 12 * 3600000);
  const midParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', hour12: false
  }).formatToParts(midObj);
  const midNYH = parseInt(midParts.find(p => p.type === 'hour')?.value || '12');
  const nyOffset = midNYH - 12;
  const targetMs = targetDateUTC + (-nyOffset) * 3600000 + 18 * 3600000; // 18:00 NY
  return Math.max(0, Math.round((targetMs - nowMs) / 1000));
}

// Hitung detik ke market close (Friday 17:00 NY) — real timestamp
function secToMarketClose(ny) {
  if (!isMarketOpen(ny)) return 0;
  const nowMs = Date.now();
  const dow = ny.dayOfWeek;
  const daysToFri = (5 - dow + 7) % 7 || (dow === 5 ? 0 : 7);

  const targetDateUTC = Date.UTC(ny.year, ny.month - 1, ny.day + daysToFri);
  const midObj = new Date(targetDateUTC + 12 * 3600000);
  const midParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', hour12: false
  }).formatToParts(midObj);
  const midNYH = parseInt(midParts.find(p => p.type === 'hour')?.value || '12');
  const nyOffset = midNYH - 12;
  const targetMs = targetDateUTC + (-nyOffset) * 3600000 + 17 * 3600000; // 17:00 NY
  return Math.max(0, Math.round((targetMs - nowMs) / 1000));
}

// ── V14.1.5: getNextEventCountdown — real timestamp, timezone-safe ──
// Returns { days, hours, mins, secs, totalSecs }
function getNextEventCountdown(eventType, ny) {
  if (!ny) ny = getNYTime(new Date());
  const nowMs = Date.now();

  // Helper: detik ke event weekday berikutnya di NY (pakai real timestamp)
  function nextWeekdayNY(targetWday, hour, minute) {
    const nyNowSec = ny.h * 3600 + ny.m * 60 + ny.s;
    const targetSec = hour * 3600 + minute * 60;
    const today = ny.dayOfWeek;
    let daysAhead = (targetWday - today + 7) % 7;
    if (daysAhead === 0 && nyNowSec >= targetSec) daysAhead = 7;
    // Bangun timestamp event di NY secara akurat
    const nowNY = new Date(nowMs);
    // Temukan tanggal target: tambah daysAhead hari ke tanggal NY hari ini
    const targetDateUTC = Date.UTC(ny.year, ny.month - 1, ny.day + daysAhead);
    // Temukan offset NY pada hari target
    const midObj = new Date(targetDateUTC + 12 * 3600000);
    const midParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', hour12: false
    }).formatToParts(midObj);
    const midNYH = parseInt(midParts.find(p => p.type === 'hour')?.value || '12');
    const nyOffset = midNYH - 12; // e.g. EDT=-4, EST=-5
    const targetMs = targetDateUTC + (-nyOffset) * 3600000 + (hour * 3600 + minute * 60) * 1000;
    return Math.max(0, Math.round((targetMs - nowMs) / 1000));
  }

  if (eventType === 'NFP')     return secsToDHMS(getNextFromArray('NFP', ny));
  if (eventType === 'CPI')     return secsToDHMS(getNextFromArray('CPI', ny));
  if (eventType === 'FOMC')    return secsToDHMS(getNextFromArray('FOMC', ny));
  if (eventType === 'JOBLESS') return secsToDHMS(nextWeekdayNY(4, 8, 30));  // Kamis 08:30 NY
  if (eventType === 'COT')     return secsToDHMS(nextWeekdayNY(5, 15, 30)); // Jumat 15:30 NY

  return secsToDHMS(0);
}

function secsToDHMS(totalSecs) {
  totalSecs = Math.max(0, Math.floor(totalSecs));
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;
  return { days, hours, mins, secs, totalSecs };
}

function fmtCountdown(c, compact) {
  if (c.totalSecs <= 0) return compact ? '🔴 NOW' : '🔴 SEDANG BERLANGSUNG';
  if (compact) {
    if (c.days > 0) return `${c.days}h ${pad(c.hours)}j`;
    return `${pad(c.hours)}:${pad(c.mins)}:${pad(c.secs)}`;
  }
  if (c.days > 0) return `${c.days}h ${c.hours}j ${c.mins}m`;
  if (c.hours > 0) return `${c.hours}j ${c.mins}m ${c.secs}d`;
  return `${c.mins}m ${c.secs}d`;
}

// ── V14: UPDATE EVENT COUNTDOWN GRID ────────────────────────────
const eventDefs = [
  { id:'evt-nfp',   type:'NFP',     name:'Non-Farm Payrolls', label:'NFP', icon:'📊', schedule:'Jumat Pertama / Bln · 08:30 NY' },
  { id:'evt-cpi',   type:'CPI',     name:'CPI Report',        label:'CPI', icon:'💹', schedule:'~12 / Bln · 08:30 NY' },
  { id:'evt-fomc',  type:'FOMC',    name:'FOMC Rate Decision', label:'FOMC',icon:'🏦', schedule:'8× / Tahun · 14:00 NY' },
  { id:'evt-job',   type:'JOBLESS', name:'Initial Jobless Claims', label:'CLAIMS', icon:'📋', schedule:'Setiap Kamis · 08:30 NY' },
  { id:'evt-cot',   type:'COT',     name:'COT Report Release', label:'COT', icon:'📈', schedule:'Setiap Jumat · 15:30 NY' }
];

function renderEventCountdownGrid() {
  const grid = document.getElementById('eventCountdownGrid');
  if (!grid) return;
  grid.innerHTML = eventDefs.map(ev => `
    <div class="event-card" id="${ev.id}">
      <div class="event-card-badge badge-high">HIGH</div>
      <div class="event-card-label">${ev.label}</div>
      <div class="event-card-name">${ev.icon} ${ev.name}</div>
      <div class="event-card-countdown" id="${ev.id}-cd">--</div>
      <div class="event-card-sub">${ev.schedule}</div>
    </div>`).join('');
}

function updateEventCountdowns(ny) {
  eventDefs.forEach(ev => {
    const el = document.getElementById(ev.id + '-cd');
    const card = document.getElementById(ev.id);
    if (!el || !card) return;
    const c = getNextEventCountdown(ev.type, ny);
    el.textContent = fmtCountdown(c);
    // Style card by urgency
    card.classList.remove('imminent','today');
    if (c.totalSecs <= 3600)         card.classList.add('imminent'); // < 1 hour
    else if (c.days === 0)            card.classList.add('today');    // today

    // Notifikasi: 15 menit dan 5 menit sebelum event (v14.1.5)
    if (c.totalSecs > 0 && c.days === 0 && c.hours === 0) {
      const mins = c.mins;
      const evName = ev.label || ev.type || 'High Impact News';
      // 15 menit warning
      if (mins === 15) {
        const key15 = ev.type + '-15-' + ny.day + '-' + ny.month;
        if (!_alertedEvents.has(key15)) {
          _alertedEvents.add(key15);
          sendNewsNotif(evName, 15);
        }
      }
      // 5 menit warning
      if (mins <= 5 && mins > 0) {
        const key5 = ev.type + '-5-' + ny.day + '-' + ny.month;
        if (!_alertedEvents.has(key5)) {
          _alertedEvents.add(key5);
          sendNewsNotif(evName, mins);
        }
      }
    }
  });
}

// ── V14.1.1: MARKET STATUS CARD — Simplified + Weekend Detection ──
function updateMarketStatusCard(ny, activeSession) {
  const card  = document.getElementById('marketStatusCard');
  const dot   = document.getElementById('statusDotBig');
  const label = document.getElementById('statusMainLabel');
  const reason= document.getElementById('statusReason');
  const sub   = document.getElementById('statusSub');
  const rec   = document.getElementById('statusRecommend');
  if (!card) return;

  let statusClass, labelText, reasonText, subText, recText, recClass;

  if (!isMarketOpen(ny)) {
    // Market tutup — hitung countdown ke Minggu 18:00 NY
    const totalSecToOpen = secToNextMarketOpen(ny);
    const h = Math.floor(totalSecToOpen / 3600);
    const m = Math.floor((totalSecToOpen % 3600) / 60);
    const s = totalSecToOpen % 60;
    const countdownStr = pad(h) + ':' + pad(m) + ':' + pad(s);
    const openDay = ny.dayOfWeek === 5 ? 'Minggu' : (ny.dayOfWeek === 6 ? 'Minggu' : 'Minggu');

    statusClass = 'weekend-closed';
    labelText   = '🔴 MARKET CLOSED';
    reasonText  = 'Pasar Forex tutup — buka kembali Minggu 18:00 NY (' + countdownStr + ' lagi)';
    subText     = 'Forex buka Minggu 18:00 NY, tutup Jumat 17:00 NY. Gunakan waktu ini untuk analisis HTF & journaling.';
    recText     = '🚫 JANGAN TRADE';
    recClass    = 'rec-avoid';
  } else {
    // ── Weekday: check news proximity first ──
    const newsWarning = checkNewsProximity(ny);

    if (newsWarning.isNear) {
      statusClass = 'news-risk';
      labelText   = '🔴 NEWS RISK';
      reasonText  = newsWarning.eventName + (newsWarning.minLeft > 0 ? ` — ${newsWarning.minLeft} menit lagi` : ' — baru dirilis');
      subText     = 'Hindari masuk posisi baru. Tunggu setelah release + 10-15 mnt settle.';
      recText     = '⚠️ AVOID TRADING NOW';
      recClass    = 'rec-avoid';
    } else if (activeSession) {
      if (activeSession.name === 'NEW YORK KZ' || activeSession.name === 'LONDON KZ') {
        statusClass = 'liquid';
        labelText   = '🟢 LIQUID';
        reasonText  = activeSession.name + ' aktif';
        subText     = 'Kill Zone aktif · Setup ICT valid · Volume & Spread optimal';
        recText     = '✅ RECOMMENDED TO TRADE';
        recClass    = 'rec-trade';
      } else if (activeSession.name === 'ASIA SESSION') {
        statusClass = 'illiquid';
        labelText   = '🔴 ILLIQUID';
        reasonText  = 'Asia Session — Low Volume';
        subText     = 'Spread lebar · Noise tinggi · Tunggu London atau NY Kill Zone';
        recText     = '🚫 AVOID TRADING';
        recClass    = 'rec-avoid';
      } else {
        statusClass = 'volatile';
        labelText   = '🟡 VOLATILE';
        reasonText  = activeSession.name;
        subText     = 'Perhatikan volume dan spread sebelum entry';
        recText     = '⚠️ TRADE WITH CAUTION';
        recClass    = 'rec-caution';
      }
    } else {
      const nyTotalMin = ny.h * 60 + ny.m;
      const isPreNY = nyTotalMin >= 7 * 60 && nyTotalMin < 8 * 60 + 30;
      if (isPreNY) {
        statusClass = 'volatile';
        labelText   = '🟡 PRE-MARKET';
        reasonText  = 'Pre-NY — Menunggu NY Open (08:30)';
        subText     = 'Bias HTF bisa dibaca. Jangan entry sebelum Kill Zone buka.';
        recText     = '⏳ WAIT FOR KILL ZONE';
        recClass    = 'rec-caution';
      } else {
        statusClass = 'illiquid';
        labelText   = '🔴 OFF HOURS';
        reasonText  = 'Di luar semua Kill Zone aktif';
        subText     = 'Pasar tidak liquid · Tidak ada setup ICT valid di luar Kill Zone';
        recText     = '🚫 AVOID TRADING';
        recClass    = 'rec-avoid';
      }
    }
  }

  // Remove pulse animation (simplified — hanya tambah jika news-risk)
  card.className = 'market-status-card ' + statusClass;
  if (label)  label.textContent  = labelText;
  if (reason) reason.textContent = reasonText;
  if (sub)    sub.textContent    = subText;
  if (rec) {
    rec.textContent  = recText;
    rec.className    = 'status-recommend ' + recClass;
  }
}

// ── V14.1.1: NEWS PROXIMITY CHECK — uses HIGH_IMPACT_NEWS + Jobless ─
function checkNewsProximity(ny) {
  const nyMin = ny.h * 60 + ny.m;
  const todayStr = `${ny.year}-${String(ny.month).padStart(2,'0')}-${String(ny.day).padStart(2,'0')}`;

  const newsWindows = [];

  // Check HIGH_IMPACT_NEWS for today's events
  HIGH_IMPACT_NEWS.forEach(ev => {
    if (ev.date === todayStr) {
      const [h, m] = ev.time.split(':').map(Number);
      newsWindows.push({ name: `${ev.name} ${ev.currency}`, h, m });
    }
  });

  // Jobless Claims every Thursday (not in array — weekly recurring)
  if (ny.dayOfWeek === 4) {
    // Only add if not already in array (avoid duplicate)
    const alreadyHasJobless = newsWindows.some(nw => nw.name.includes('Jobless'));
    if (!alreadyHasJobless) {
      newsWindows.push({ name: 'Initial Jobless Claims', h: 8, m: 30 });
    }
  }

  // COT release every Friday 15:30 — low market impact, skip

  for (const nw of newsWindows) {
    const targetMin = nw.h * 60 + nw.m;
    const diff = targetMin - nyMin;
    if (diff >= 0 && diff <= 20) {
      return { isNear: true, eventName: nw.name, minLeft: diff };
    }
    if (diff < 0 && diff >= -10) {
      return { isNear: true, eventName: nw.name + ' (baru rilis)', minLeft: 0 };
    }
  }
  return { isNear: false };
}

function getFirstFridayOfMonth(year, month) {
  for (let d = 1; d <= 7; d++) {
    if (new Date(year, month - 1, d).getDay() === 5) return d;
  }
  return 1;
}

// ── V14.1.1: SESSION PROGRESS BAR — Fixed + Weekend Support ──────
function updateSessionProgressBar(ny, activeSession) {
  const fill   = document.getElementById('progBarFill');
  const name   = document.getElementById('progSessionName');
  const timeEl = document.getElementById('progSessionTime');
  const start  = document.getElementById('progBarStart');
  const endEl  = document.getElementById('progBarEnd');
  const pct    = document.getElementById('progBarPct');
  if (!fill) return;

  const nyTotalSec = ny.h * 3600 + ny.m * 60 + ny.s;
  // ── Market closed: countdown to Sunday 18:00 NY open ───────────
  if (!isMarketOpen(ny)) {
    const totalSecToOpen = secToNextMarketOpen(ny);
    // Progress across the 47h weekend (Fri 17:00 → Sun 18:00 = 49h = 176400s)
    const weekendTotal = 49 * 3600;
    const elapsed = Math.max(0, weekendTotal - totalSecToOpen);
    const pctVal  = Math.min(100, (elapsed / weekendTotal) * 100);
    const h = Math.floor(totalSecToOpen / 3600);
    const m = Math.floor((totalSecToOpen % 3600) / 60);
    const s = totalSecToOpen % 60;

    fill.style.width = pctVal.toFixed(1) + '%';
    fill.style.setProperty('--pb-c1', '#5A3A6E');
    fill.style.setProperty('--pb-c2', '#7E4A99');
    if (name)   name.textContent   = '🔴 MARKET CLOSED';
    if (timeEl) timeEl.textContent = 'Buka dalam ' + pad(h) + ':' + pad(m) + ':' + pad(s);
    if (start)  start.textContent  = 'Jumat 17:00 NY';
    if (endEl)  endEl.textContent  = 'Minggu 18:00 NY';
    if (pct)    pct.textContent    = pctVal.toFixed(0) + '%';
    return;
  }

  // ── Active session ─────────────────────────────────────────────
  if (activeSession) {
    const sSec = activeSession.startH * 3600 + activeSession.startM * 60;
    const eSec = activeSession.endH   * 3600 + activeSession.endM   * 60;
    let dur, prog;

    if (activeSession.startH > activeSession.endH) {
      // Overnight session (Asia: starts 20:00, ends 03:00)
      const totalDur = (86400 - sSec) + eSec;
      prog = nyTotalSec >= sSec ? nyTotalSec - sSec : (86400 - sSec) + nyTotalSec;
      dur  = totalDur;
    } else {
      dur  = eSec - sSec;
      prog = Math.max(0, nyTotalSec - sSec);
    }

    const pctVal = Math.min(100, Math.max(0, (prog / dur) * 100));
    const remSec = Math.max(0, dur - prog);
    const remH = Math.floor(remSec / 3600), remM = Math.floor((remSec % 3600) / 60), remS = remSec % 60;

    fill.style.width = pctVal.toFixed(1) + '%';
    fill.style.setProperty('--pb-c1', activeSession.pbC1);
    fill.style.setProperty('--pb-c2', activeSession.pbC2);
    if (name)   name.textContent  = '🟢 ' + activeSession.name + ' AKTIF';
    if (timeEl) timeEl.textContent = `sisa ${pad(remH)}:${pad(remM)}:${pad(remS)}`;
    if (start)  start.textContent  = `${pad(activeSession.startH)}:${pad(activeSession.startM)} NY`;
    if (endEl)  endEl.textContent  = `${pad(activeSession.endH)}:${pad(activeSession.endM)} NY`;
    if (pct)    pct.textContent    = pctVal.toFixed(0) + '%';
    return;
  }

  // ── Off hours: countdown to next session ──────────────────────
  const next = getNextSessionInfo(nyTotalSec, ny);
  if (!next) return;

  // Use fixed gapSec based on actual inter-session gap for accuracy
  const remSec = next.remSec;
  // Progress: show as "filling up" toward the next session open
  // Gap window = remSec + some reference window (cap at 8h for sanity)
  const refWindow = Math.min(next.gapSec, 8 * 3600);
  const elapsed   = Math.max(0, refWindow - remSec);
  const pctVal    = Math.min(100, Math.max(0, (elapsed / refWindow) * 100));

  const h = Math.floor(remSec / 3600), m = Math.floor((remSec % 3600) / 60), s = remSec % 60;

  fill.style.width = pctVal.toFixed(1) + '%';
  fill.style.setProperty('--pb-c1', next.session.pbC1);
  fill.style.setProperty('--pb-c2', next.session.pbC2);
  if (name)   name.textContent  = '⏳ Menunggu ' + next.session.name;
  if (timeEl) timeEl.textContent = `buka dalam ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (start)  start.textContent  = 'sekarang';
  if (endEl)  endEl.textContent  = `${pad(next.session.startH)}:${pad(next.session.startM)} NY`;
  if (pct)    pct.textContent    = pctVal.toFixed(0) + '% menuju buka';
}

function getNextSessionInfo(nyTotalSec, ny) {
  // v14.1.5: pakai real timestamp untuk akurasi lintas hari
  if (!ny) ny = getNYTime(new Date());
  const nowMs = Date.now();

  function nyTargetMs(daysOffset, hour, minute) {
    const targetDateUTC = Date.UTC(ny.year, ny.month - 1, ny.day + daysOffset);
    const midObj = new Date(targetDateUTC + 12 * 3600000);
    const midParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', hour12: false
    }).formatToParts(midObj);
    const midNYH = parseInt(midParts.find(p => p.type === 'hour')?.value || '12');
    const nyOffset = midNYH - 12;
    return targetDateUTC + (-nyOffset) * 3600000 + (hour * 3600 + minute * 60) * 1000;
  }

  const tradeSessions = [sessions[0], sessions[1], sessions[2], sessions[3]];
  let best = null, bestRemMs = Infinity;

  for (const s of tradeSessions) {
    let tMs = nyTargetMs(0, s.startH, s.startM);
    if (tMs <= nowMs) tMs = nyTargetMs(1, s.startH, s.startM);
    const remMs = tMs - nowMs;
    if (remMs < bestRemMs) { bestRemMs = remMs; best = s; }
  }

  if (!best) return null;
  return { session: best, remSec: Math.round(bestRemMs / 1000), gapSec: 7200 };
}

// ── V14: KILL ZONE LIVE HIGHLIGHT ───────────────────────────────
function updateKillZoneHighlight(ny) {
  const kzIds = ['kz-london','kz-ny','kz-nypm','kz-asia','kz-london-sb','kz-ny-sb'];
  kzIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('kz-live');
    const liveBadge = el.querySelector('.kz-live-badge');
    if (liveBadge) liveBadge.remove();
  });

  // Map session → possible kz card ids
  const sessionKZMap = {
    'LONDON KZ':     ['kz-london','kz-london-sb'],
    'NEW YORK KZ':   ['kz-ny','kz-ny-sb'],
    'NY PM SESSION': ['kz-nypm'],
    'ASIA SESSION':  ['kz-asia']
  };

  for (const s of sessions) {
    if (inSession(ny.h, ny.m, s)) {
      const ids = sessionKZMap[s.name] || [];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('kz-live');
        if (!el.querySelector('.kz-live-badge')) {
          const badge = document.createElement('div');
          badge.className = 'kz-live-badge';
          badge.textContent = '● LIVE';
          el.querySelector('.kz-body')?.appendChild(badge);
        }
      });
      // Notification: session start alert (once per session open)
      // Notifikasi sesi — dedup via localStorage + memory Set (v14.1.5)
      const alertKey = 'sess-' + s.name + '-' + ny.day + '-' + ny.month + '-' + ny.year;
      if (!_alertedSessions.has(alertKey) && ny.m === s.startM && ny.h === s.startH) {
        // Double-check via localStorage to avoid duplicate on page reload
        if (!localStorage.getItem('ict-notif-' + alertKey)) {
          _alertedSessions.add(alertKey);
          localStorage.setItem('ict-notif-' + alertKey, '1');
          // Auto-cleanup old keys (keep last 20 entries only)
          const lsKeys = Object.keys(localStorage).filter(k => k.startsWith('ict-notif-sess-'));
          if (lsKeys.length > 20) lsKeys.slice(0, lsKeys.length - 20).forEach(k => localStorage.removeItem(k));
          sendSessionNotif(s.name, '🟢 ' + s.name + ' baru dibuka! Periksa setup ICT Anda.');
        } else {
          _alertedSessions.add(alertKey); // sync memory with localStorage
        }
      }
    }
  }
}

function updateClock() {
  const now = new Date();

  // Semua jam pakai Intl.DateTimeFormat — akurat, otomatis DST, tidak bergantung timezone user
  function getTZ(tz) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(now);
    const g = t => parseInt(parts.find(p => p.type === t)?.value || '0');
    return { h: g('hour'), m: g('minute'), s: g('second') };
  }

  const ny  = getNYTime(now);                    // NY (America/New_York)
  const lon = getTZ('Europe/London');            // London (auto DST)
  const wib = getTZ('Asia/Jakarta');             // WIB (UTC+7, fixed)

  const elNY  = document.getElementById('clock-ny');
  const elLon = document.getElementById('clock-lon');
  const elWib = document.getElementById('clock-wib');
  if (elNY)  elNY.textContent  = pad(ny.h)  + ':' + pad(ny.m)  + ':' + pad(ny.s);
  if (elLon) elLon.textContent = pad(lon.h) + ':' + pad(lon.m) + ':' + pad(lon.s);
  if (elWib) elWib.textContent = pad(wib.h) + ':' + pad(wib.m) + ':' + pad(wib.s);

  // Update NY date
  const dateEl = document.getElementById('date-ny');
  if (dateEl) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    dateEl.textContent = `${days[ny.dayOfWeek]} ${months[ny.month - 1]} ${ny.day}`;
  }

  // Session detection (v14.1.5: use isMarketOpen)
  let activeSession = null;
  const marketOpen = isMarketOpen(ny);
  if (marketOpen) {
    for (const s of sessions) {
      if (inSession(ny.h, ny.m, s)) { activeSession = s; break; }
    }
  }
  const sessionEl = document.getElementById('session-label');
  if (sessionEl) {
    if (!marketOpen) {
      sessionEl.textContent = 'CLOSED';
      sessionEl.style.color = 'var(--red)';
    } else if (activeSession) {
      sessionEl.textContent = activeSession.name;
      sessionEl.style.color = activeSession.color;
    } else {
      sessionEl.textContent = 'OFF HOURS';
      sessionEl.style.color = 'var(--text-muted)';
    }
  }

  // WIB market open countdown (v14.1.5)
  updateWIBMarketCountdown();

  // COT countdown
  const cotCountdownEl = document.getElementById('cot-countdown');
  if (cotCountdownEl) cotCountdownEl.textContent = getCOTCountdown(ny);

  // COT status panel (update once per minute)
  if (!updateClock._lastStatusMin || updateClock._lastStatusMin !== ny.m) {
    updateCOTStatusPanel(ny);
    updateClock._lastStatusMin = ny.m;
  }

  // V14: Session progress bar
  updateSessionProgressBar(ny, activeSession);

  // V14: Market status card (update every 5s via tick flag)
  updateMarketStatusCard(ny, activeSession);

  // V14: Event countdowns (every second)
  updateEventCountdowns(ny);

  // V14: Kill Zone highlight (every second) — skip on weekend
  if (marketOpen) updateKillZoneHighlight(ny);

  // ── Market session countdowns — always run (v14.1.5 fix)
  updateMarketCountdownsInner(ny);
}

// Market countdowns — v14.1.5: semua pakai real UTC timestamp
function updateMarketCountdownsInner(ny) {
  const targets = [
    { element: 'countdownLondon',  targetHour: 3,  targetMin: 0  },
    { element: 'countdownNY',      targetHour: 8,  targetMin: 30 },
    { element: 'countdownNYClose', targetHour: 16, targetMin: 0  },
    { element: 'countdownTokyo',   targetHour: 19, targetMin: 0  }
  ];

  const nowMs = Date.now();

  // Helper: bangun timestamp NY untuk jam tertentu di tanggal offset dari hari ini NY
  function nyTargetMs(daysOffset, hour, minute) {
    const targetDateUTC = Date.UTC(ny.year, ny.month - 1, ny.day + daysOffset);
    const midObj = new Date(targetDateUTC + 12 * 3600000);
    const midParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', hour12: false
    }).formatToParts(midObj);
    const midNYH = parseInt(midParts.find(p => p.type === 'hour')?.value || '12');
    const nyOffset = midNYH - 12; // EDT=-4, EST=-5
    return targetDateUTC + (-nyOffset) * 3600000 + (hour * 3600 + minute * 60) * 1000;
  }

  targets.forEach(t => {
    let tMs = nyTargetMs(0, t.targetHour, t.targetMin); // coba hari ini NY
    if (tMs <= nowMs) tMs = nyTargetMs(1, t.targetHour, t.targetMin); // besok
    // Jika masih di weekend (market tutup) dan target sudah hari depan tapi
    // market belum buka, tambah hari lagi sampai setelah market open
    // (Market tidak buka sebelum Sun 18:00, jadi London/NY Senin pagi sudah benar)
    const diffSec = Math.round((tMs - nowMs) / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    const el = document.getElementById(t.element);
    if (el) el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  });
}

// ── V14.1.5: WIB MARKET COUNTDOWN — real UTC timestamp ───────────
// WIB open: Senin 05:00 WIB = Minggu 22:00 UTC = Minggu 18:00 NY (EDT)
// WIB close: Sabtu 04:00 WIB = Jumat 21:00 UTC = Jumat 17:00 NY (EDT)
function updateWIBMarketCountdown() {
  const el   = document.getElementById('wib-market-status');
  const cdEl = document.getElementById('wib-market-countdown');
  if (!el && !cdEl) return;

  const nowMs = Date.now();

  // Cukup gunakan NY market open/close — WIB adalah turunannya
  // Market open = Sunday 18:00 NY = Monday 05:00 WIB
  // Market close = Friday 17:00 NY = Saturday 04:00 WIB
  // Jadi: pakai NY helpers + konversi ke WIB display
  const ny = getNYTime(new Date());
  const wibOpen = isMarketOpen(ny);

  let label, countdown;
  if (wibOpen) {
    // Hitung ke market close via real timestamp
    const secClose = secToMarketClose(ny);
    const ch = Math.floor(secClose / 3600);
    const cm = Math.floor((secClose % 3600) / 60);
    const cs = secClose % 60;
    label    = '🟢 PASAR BUKA';
    countdown = 'Tutup dalam ' + pad(ch) + ':' + pad(cm) + ':' + pad(cs);
  } else {
    const secOpen = secToNextMarketOpen(ny);
    const ch = Math.floor(secOpen / 3600);
    const cm = Math.floor((secOpen % 3600) / 60);
    const cs = secOpen % 60;
    label    = '🔴 PASAR TUTUP';
    countdown = 'Buka dalam ' + pad(ch) + ':' + pad(cm) + ':' + pad(cs);
  }

  if (el)   el.textContent  = label;
  if (cdEl) cdEl.textContent = countdown;
}

// ── MASTER TIMER — robust, self-healing (v14.1.5) ────────────────
let _masterTimer = null;
let _lastTickTime = 0;
const TICK_INTERVAL = 1000;

function safeUpdateClock() {
  try { updateClock(); } catch(e) { console.warn('[ICT] Clock error:', e); }
}

function startMasterTimer() {
  if (_masterTimer) { clearInterval(_masterTimer); _masterTimer = null; }
  safeUpdateClock();
  _lastTickTime = Date.now();
  _masterTimer = setInterval(() => {
    _lastTickTime = Date.now();
    safeUpdateClock();
  }, TICK_INTERVAL);
}
startMasterTimer();

// Saat tab aktif kembali: restart timer (browser throttles inactive tabs)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Tab became visible — restart to avoid stale clock
    startMasterTimer();
  }
  // Tidak stop saat hidden — biar notifikasi tetap jalan
});

// Watchdog: jika tick lebih dari 3 detik terlambat, restart
setInterval(() => {
  if (_lastTickTime && Date.now() - _lastTickTime > 3000) {
    console.warn('[ICT] Timer drift detected — restarting');
    startMasterTimer();
  }
}, 5000);

// ==================== COT ANALYZER (COPY-PASTE VERSION) ====================
const cotInstruments = [
  { name:'E-MINI S&P 500',      symbol:'ES',   target:'5500',  support:'5300',  searchTerms: ['E-MINI S&P 500', 'S&P 500', 'E-MINI S&P'] },
  { name:'NASDAQ-100',          symbol:'NQ',   target:'19800', support:'19000', searchTerms: ['NASDAQ-100', 'NASDAQ 100', 'NASDAQ'] },
  { name:'EURO FX',             symbol:'EUR',  target:'1.0950',support:'1.0700',searchTerms: ['EURO FX', 'EURO', 'EUR'] },
  { name:'BRITISH POUND',       symbol:'GBP',  target:'1.2750',support:'1.2450',searchTerms: ['BRITISH POUND', 'POUND', 'GBP'] },
  { name:'JAPANESE YEN',        symbol:'JPY',  target:'145',   support:'150',   searchTerms: ['JAPANESE YEN', 'YEN', 'JPY'] },
  { name:'AUSTRALIAN DOLLAR',   symbol:'AUD',  target:'0.6650',support:'0.6450',searchTerms: ['AUSTRALIAN DOLLAR', 'AUD', 'AUSTRALIAN'] },
  { name:'CANADIAN DOLLAR',     symbol:'CAD',  target:'0.7350',support:'0.7150',searchTerms: ['CANADIAN DOLLAR', 'CAD', 'CANADIAN'] },
  { name:'SWISS FRANC',         symbol:'CHF',  target:'1.1250',support:'1.0950',searchTerms: ['SWISS FRANC', 'SWISS', 'CHF'] },
  { name:'NEW ZEALAND DOLLAR',  symbol:'NZD',  target:'0.6050',support:'0.5850',searchTerms: ['NEW ZEALAND DOLLAR', 'NZ DOLLAR', 'NZD', 'NEW ZEALAND'] }
];

// ── COT SIMPLE EXPLANATION (Bahasa Awam) ──────────────────────────
function getSimpleExplanation(symbol, isBullish, netCommercial, target, support) {
  const absNet = Math.abs(netCommercial).toLocaleString();
  if (isBullish) {
    return `📈 <strong style="color:var(--green)">${symbol} diprediksi NAIK minggu depan.</strong><br>
            Bank dan hedge fund (pemain besar) sedang mengumpulkan posisi beli sebesar <strong>${absNet} kontrak</strong>.
            Artinya, mereka yakin harga akan naik. Target terdekat: <strong>${target}</strong>.<br>
            Harga diperkirakan tidak akan turun di bawah <strong>${support}</strong>.<br><br>
            📌 <em>Tips ICT:</em> Cari momen beli saat harga koreksi turun (di area Discount) dan masuk saat Kill Zone (NY Open atau London Open).`;
  } else {
    return `📉 <strong style="color:var(--red)">${symbol} diprediksi TURUN minggu depan.</strong><br>
            Bank dan hedge fund (pemain besar) sedang mengambil posisi jual sebesar <strong>${absNet} kontrak</strong>.
            Artinya, mereka yakin harga akan turun. Target terdekat: <strong>${support}</strong>.<br>
            Harga diperkirakan tidak akan naik di atas <strong>${target}</strong>.<br><br>
            📌 <em>Tips ICT:</em> Cari momen jual saat harga koreksi naik (di area Premium) dan masuk saat Kill Zone (NY Open atau London Open).`;
  }
}

function toggleExplanation(id) {
  const el = document.getElementById(id);
  if (el) {
    const isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    const btn = el.previousElementSibling;
    if (btn) btn.textContent = isHidden ? '📖 Sembunyikan Penjelasan' : '📖 Baca Penjelasan (Bahasa Awam)';
  }
}

function displayCOTResults(results, totalRows) {
  const container = document.getElementById('cotResults');
  const found = results.filter(r => r.data);

  if (!found.length) {
    container.innerHTML = '<div style="background:rgba(231,76,60,0.1);padding:20px;border-radius:8px;color:var(--red);text-align:center;">⚠ Tidak ada instrumen yang cocok ditemukan di CSV.<br><span style="font-size:12px;color:var(--text-muted);">File berisi ' + totalRows + ' baris. Pastikan menggunakan fut_disagg.csv dari CFTC.</span></div>';
    return;
  }

  let html = `<div>
    <div style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--gold-dim);text-transform:uppercase;margin-bottom:16px;">
      📈 HASIL ANALISIS COT — ${found.length} / ${results.length} INSTRUMEN DITEMUKAN
      <span style="color:var(--text-muted);font-size:10px;margin-left:12px;">(dari ${totalRows.toLocaleString()} total baris data)</span>
    </div>`;

  for (const r of results) {
    if (!r.data) {
      html += `<div class="cot-result-card" style="opacity:0.45;">
        <div class="cot-instr-title">${escapeHtml(r.symbol)} — ${escapeHtml(r.name)}</div>
        <div style="color:var(--text-muted);padding:4px 0;font-size:13px;">⚠ Tidak ditemukan di CSV</div>
      </div>`;
      continue;
    }

    const d = r.data;
    const isBullish   = d.netCommercial > 0;
    const absNet      = Math.abs(d.netCommercial);
    const stars       = absNet > 100000 ? '⭐⭐⭐⭐' : absNet > 50000 ? '⭐⭐⭐' : absNet > 20000 ? '⭐⭐' : '⭐';
    const sentiment   = (isBullish ? 'BULLISH ' : 'BEARISH ') + stars;
    const sentClass   = isBullish ? 'sentiment-bullish' : 'sentiment-bearish';
    const maxPos      = Math.max(d.commLong, d.commShort, 1);
    const longPct     = Math.min((d.commLong / maxPos) * 50, 50);
    const shortPct    = Math.min((d.commShort / maxPos) * 50, 50);
    const contraSpec  = (d.netNonCommercial > 0 && !isBullish) || (d.netNonCommercial < 0 && isBullish);
    const safeSymbol  = escapeHtml(r.symbol);
    const safeName    = escapeHtml(r.name);
    const safeTarget  = escapeHtml(r.target);
    const safeSupport = escapeHtml(r.support);
    const safeDate    = escapeHtml(d.date);
    const expectation = isBullish
      ? `Commercial net LONG <strong style="color:var(--green)">+${absNet.toLocaleString()}</strong> contracts. Smart Money akumulasi posisi beli → Bias <span style="color:var(--green)">Bullish</span> untuk ${safeSymbol}. Target area: ${safeTarget}. Support: ${safeSupport}.`
      : `Commercial net SHORT <strong style="color:var(--red)">-${absNet.toLocaleString()}</strong> contracts. Smart Money distribusi / hedging → Bias <span style="color:var(--red)">Bearish</span> untuk ${safeSymbol}. Target area: ${safeSupport}. Resistance: ${safeTarget}.`;

    html += `
    <div class="cot-result-card">
      <div class="cot-instr-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span>${safeSymbol} — ${safeName}</span>
        <span class="cot-sentiment ${sentClass}">📊 ${sentiment}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">🏦 Commercial (Bank/Hedge Fund)</div>
          <div style="font-size:13px;color:var(--text-dim);">Long: <strong style="color:var(--green)">${d.commLong.toLocaleString()}</strong> &nbsp;|&nbsp; Short: <strong style="color:var(--red)">${d.commShort.toLocaleString()}</strong></div>
          <div class="cot-net-bar">
            <div class="cot-net-fill-long" style="width:${longPct}%;"></div>
            <div class="cot-net-fill-short" style="width:${shortPct}%;"></div>
          </div>
          <div style="font-size:14px;"><strong style="color:${isBullish?'var(--green)':'var(--red)'}">Net: ${isBullish?'+':'-'}${absNet.toLocaleString()} ${isBullish?'LONG':'SHORT'}</strong></div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">🐂 Non-Commercial (Spekulan)</div>
          <div style="font-size:13px;color:var(--text-dim);">Long: <strong>${d.nonCommLong.toLocaleString()}</strong> &nbsp;|&nbsp; Short: <strong>${d.nonCommShort.toLocaleString()}</strong></div>
          <div style="margin-top:8px;font-size:13px;"><strong style="color:${d.netNonCommercial>0?'var(--green)':'var(--red)'}">Net: ${d.netNonCommercial>0?'+':''}${d.netNonCommercial.toLocaleString()}</strong></div>
          <div style="font-size:11px;margin-top:4px;color:${contraSpec?'var(--orange)':'var(--text-muted)'};">
            ${contraSpec ? '⚠ Spekulan contra Smart Money' : '✓ Spekulan searah Smart Money'}
          </div>
        </div>
      </div>
      <div style="padding:12px;background:var(--dark4);border-radius:6px;border-left:3px solid ${isBullish?'var(--green)':'var(--red)'};">
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--gold-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🔮 ICT Bias & Ekspektasi</div>
        <p style="font-size:13px;color:var(--text-dim);line-height:1.6;">${expectation}</p>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;">Periode data COT: ${safeDate}</div>
      </div>
      <div style="margin-top:12px;">
        <button class="action-btn" onclick="toggleExplanation('exp-${safeSymbol}')" style="font-size:10px;padding:4px 10px;">📖 Baca Penjelasan (Bahasa Awam)</button>
        <div id="exp-${safeSymbol}" style="display:none;margin-top:10px;padding:14px;background:var(--dark4);border-radius:6px;font-size:13px;color:var(--text-dim);line-height:1.8;border-left:3px solid ${isBullish?'var(--green)':'var(--red)'};">
          ${getSimpleExplanation(safeSymbol, isBullish, d.netCommercial, safeTarget, safeSupport)}
        </div>
      </div>
    </div>`;
  }

  html += `<div style="margin-top:16px;padding:14px 18px;background:rgba(201,168,76,0.08);border-radius:6px;border:1px solid var(--border);font-size:12px;color:var(--text-muted);">
    ⚠ <strong style="color:var(--gold)">Disclaimer:</strong> COT report memiliki lag ~3 hari (rilis Jumat untuk posisi Selasa). Gunakan sebagai <em>konfirmasi bias HTF</em>, bukan sinyal entry tunggal. Selalu kombinasikan dengan analisis ICT: AMD Cycle, PD Arrays, dan Kill Zone.
  </div></div>`;

  container.innerHTML = html;
}

// ── INSTRUMENT MATCH HELPER (searchTerms-aware) ───────────────────
function matchInstrument(key, inst) {
  if (key.includes(inst.name)) return true;
  if (inst.searchTerms && inst.searchTerms.some(term => key.includes(term))) return true;
  return false;
}

// ── COT PARSER: Monospace Text (format CFTC legacy copy-paste) ────
// Handles the classic "Commitments of Traders" fixed-width report text
function parseMonospaceTextCOT(text) {
  const lines = text.split(/\r?\n/);
  const parsedInstruments = {};
  let currentName = null;

  // Extract report date from header (e.g. "April 07, 2026" or "APRIL 07, 2026")
  const dateMatch = text.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i
  );
  const reportDate = dateMatch ? dateMatch[0] : 'N/A';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // ── Detect instrument name block ──────────────────────────────
    // CFTC monospace: instrument name is on its own line (or with exchange), often ALL CAPS
    // Common patterns:
    //   "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE"
    //   "NASDAQ-100 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE"
    //   "GOLD - COMMODITY EXCHANGE INC."
    const knownExchanges = [
      'CHICAGO MERCANTILE EXCHANGE', 'CHICAGO BOARD OF TRADE',
      'COMMODITY EXCHANGE INC', 'NEW YORK MERCANTILE EXCHANGE',
      'ICE FUTURES U.S.'
    ];
    const isInstrumentLine = knownExchanges.some(ex => trimmed.toUpperCase().includes(ex));
    if (isInstrumentLine) {
      // Strip the exchange name to get clean instrument name
      let name = trimmed.toUpperCase();
      knownExchanges.forEach(ex => { name = name.replace(ex, '').replace(/-\s*$/, '').trim(); });
      if (name.length > 3) currentName = name;
      continue;
    }

    // Some formats have instrument name on line before "Code-XXXXX"
    if (/Code-\d+/i.test(trimmed) && currentName === null) {
      // Try the line above
      const prevLine = (lines[i - 1] || '').trim().toUpperCase();
      if (prevLine.length > 5 && !/^\d/.test(prevLine)) currentName = prevLine;
      continue;
    }

    // ── Detect the "All" data row (positions for all trader categories) ───
    // Format: "All    123,456  234,567  12,345  456,789  345,678  ..."
    if (currentName && /^All\b/i.test(trimmed)) {
      // Extract all numbers from the line
      const nums = [];
      const numRe = /[\d,]+/g;
      let m;
      while ((m = numRe.exec(trimmed)) !== null) {
        const n = parseFloat(m[0].replace(/,/g, ''));
        if (!isNaN(n) && n > 0) nums.push(n);
      }

      // CFTC monospace "All" row column order (Disaggregated / Legacy):
      // OI | NComm_Long | NComm_Short | NComm_Spread | Comm_Long | Comm_Short | Total_Long | Total_Short | NonRep_Long | NonRep_Short
      if (nums.length >= 6) {
        const nonCommLong  = nums[1] || 0;
        const nonCommShort = nums[2] || 0;
        const commLong     = nums[4] || 0;
        const commShort    = nums[5] || 0;

        if (commLong > 0 || commShort > 0) {
          parsedInstruments[currentName] = { commLong, commShort, nonCommLong, nonCommShort, date: reportDate };
        }
      }
      currentName = null; // reset — ready for next instrument
      continue;
    }

    // Also handle "Old" / "Other" sub-rows: skip them, we only want "All"
    if (/^(?:Old|Other)\b/i.test(trimmed)) continue;
  }

  const totalRows = Object.keys(parsedInstruments).length;
  if (totalRows === 0) {
    throw new Error(
      'Tidak ada data berhasil di-parse dari format teks monospace. ' +
      'Tips: Pastikan Anda copy-paste seluruh halaman laporan CFTC (bukan hanya sebagian). ' +
      'Atau gunakan format CSV dari fut_disagg.zip.'
    );
  }

  const data = cotInstruments.map(inst => {
    const matchKey = Object.keys(parsedInstruments).find(k => matchInstrument(k, inst));
    if (!matchKey) return { ...inst, data: null };
    const d = parsedInstruments[matchKey];
    return {
      ...inst,
      data: {
        commLong: d.commLong, commShort: d.commShort,
        netCommercial: d.commLong - d.commShort,
        nonCommLong: d.nonCommLong, nonCommShort: d.nonCommShort,
        netNonCommercial: d.nonCommLong - d.nonCommShort,
        date: d.date
      }
    };
  });

  return { data, totalRows };
}

// ── COT COUNTDOWN (V14: pakai ny object dari Intl, akurat EDT/EST, format D:H:M:S) ─
function getCOTCountdown(ny) {
  if (!ny) ny = getNYTime(new Date());
  const c = getNextEventCountdown('COT', ny);
  if (c.totalSecs <= 0) return '🔴 LIVE';
  if (c.days > 0) return `${c.days}d ${pad(c.hours)}h`;
  return `${pad(c.hours)}:${pad(c.mins)}:${pad(c.secs)}`;
}

// ── COT STATUS PANEL (V14: pakai getNextEventCountdown untuk presisi) ─
function updateCOTStatusPanel(ny) {
  const statusText = document.getElementById('cotStatusText');
  const statusDetail = document.getElementById('cotStatusDetail');
  if (!statusText || !statusDetail) return;

  if (!ny) ny = getNYTime(new Date());
  const day = ny.dayOfWeek;
  const h = ny.h, m = ny.m;

  const isFriday = day === 5;
  const isReleasedToday = isFriday && (h > 15 || (h === 15 && m >= 30));
  const isReleaseTime = isFriday && h === 15 && m >= 25 && m <= 45;

  let statusMsg, detailMsg, detailClass;

  if (isReleaseTime) {
    statusMsg = '🔴 COT sedang dirilis sekarang!';
    detailMsg = 'CFTC sedang merilis data COT minggu ini. Refresh halaman CFTC dan paste segera untuk bias mingguan terbaru.';
    detailClass = 'critical';
  } else if (isReleasedToday) {
    statusMsg = '✅ COT minggu ini sudah dirilis';
    detailMsg = 'Data COT hari Selasa sudah tersedia sejak tadi. Download fut_disagg.csv dari CFTC dan analisis sekarang untuk bias minggu depan.';
    detailClass = 'good';
  } else if (isFriday) {
    const c = getNextEventCountdown('COT', ny);
    statusMsg = `⏳ COT rilis hari ini — ${fmtCountdown(c)} lagi (15:30 NY)`;
    detailMsg = 'Siapkan halaman CFTC. Setelah rilis, download fut_disagg.csv dan paste di sini untuk analisis bias.';
    detailClass = 'warning';
  } else {
    const c = getNextEventCountdown('COT', ny);
    statusMsg = `📅 COT rilis berikutnya: ${fmtCountdown(c)} lagi (Jumat 15:30 NY)`;
    detailMsg = 'Data yang tersedia adalah posisi hari Selasa minggu lalu. Tetap valid untuk bias HTF — lag 3 hari wajar.';
    detailClass = 'good';
  }

  statusText.textContent = statusMsg;
  statusDetail.textContent = detailMsg;
  statusDetail.className = `status-update ${detailClass}`;
}




function clearCalculator() {
  document.getElementById('entryPrice').value = '';
  document.getElementById('slPrice').value = '';
  document.getElementById('tpPrice').value = '';
  document.getElementById('calcResult').classList.remove('show');
  document.getElementById('riskAmount').textContent = '—';
  document.getElementById('slPips').textContent = '—';
  document.getElementById('tpPips').textContent = '—';
  document.getElementById('lotSize').textContent = '—';
  document.getElementById('potProfit').textContent = '—';
  document.getElementById('rrRatio').textContent = '—';
  document.getElementById('rrBar').style.width = '0%';
  const verdict = document.getElementById('rrVerdict');
  verdict.className = 'rr-verdict';
  verdict.textContent = '';
}

// V13: setInstrument sudah include clearCalculator langsung (tidak perlu override)

function loadFromURL() {
  const p = new URLSearchParams(location.search);
  if (!p.has('inst') && !p.has('entry')) return;

  const key = p.get('inst');
  if (key && instruments[key]) {
    const btn = [...document.querySelectorAll('.inst-btn')].find(b => b.getAttribute('onclick')?.includes(`'${key}'`));
    if (btn) setInstrument(key, btn); // V13: pakai setInstrument langsung
  }
  if (p.get('bal'))   document.getElementById('balance').value = p.get('bal');
  if (p.get('risk'))  document.getElementById('riskPct').value = p.get('risk');
  if (p.get('entry')) document.getElementById('entryPrice').value = p.get('entry');
  if (p.get('sl'))    document.getElementById('slPrice').value = p.get('sl');
  if (p.get('tp'))    document.getElementById('tpPrice').value = p.get('tp');
  if (p.get('pip'))   document.getElementById('pipValue').value = p.get('pip');

  if (p.get('entry') && p.get('sl') && p.get('tp')) {
    setTimeout(() => {
      showTab('calculator', document.querySelector('.nav-tab:nth-child(11)'));
      calculate();
    }, 150);
  }
}

// ── EXPORT CHECKLIST PDF (DIPERBAIKI) ─────────────────────────────
function exportChecklist() {
  const items = document.querySelectorAll('.check-item');
  const total = items.length;
  const done = document.querySelectorAll('.check-item.checked').length;
  const date = new Date();
  const formattedDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pct = Math.round((done / total) * 100);

  let rows = '';
  items.forEach(item => {
    const checked = item.classList.contains('checked');
    const text = item.querySelector('.check-text')?.innerText || '';
    const note = item.querySelector('.check-note')?.innerText || '';
    const critical = item.classList.contains('check-critical');
    rows += `<tr style="background:${checked ? '#f0f0f0' : 'transparent'}">
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;width:28px;text-align:center;font-size:16px;">${checked ? '✓' : '☐'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;">
        <span style="color:${checked ? '#888' : (critical ? '#B8860B' : '#111')};${checked ? 'text-decoration:line-through;' : ''}">${text}</span>
        ${note ? `<div style="font-size:11px;color:#666;margin-top:3px;">${note}</div>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #ddd;width:80px;text-align:center;">${critical ? '<span style="background:#f0e6d2;color:#B8860B;font-size:10px;padding:2px 6px;border-radius:2px;">KRITIS</span>' : ''}</td>
    </tr>`;
  });

  const badgeHtml = done === total
    ? '<span style="background:#2ECC71;color:white;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold;">✓ LENGKAP — Siap Eksekusi</span>'
    : pct >= 70
      ? '<span style="background:#C9A84C;color:#111;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold;">⚡ Sebagian Besar Terpenuhi</span>'
      : '<span style="background:#E74C3C;color:white;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:bold;">⚠ Perlu Review Ulang</span>';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>ICT Checklist Export</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#fff; color:#111; font-family:'Courier New',monospace; padding:40px; max-width:900px; margin:0 auto; line-height:1.5; }
  h1 { font-size:28px; letter-spacing:4px; color:#C9A84C; border-bottom:2px solid #C9A84C; display:inline-block; padding-bottom:4px; margin-bottom:4px; }
  .sub { font-size:12px; color:#555; letter-spacing:2px; text-transform:uppercase; margin:8px 0 24px; }
  .meta-info { background:#f5f5f5; padding:12px 16px; border-radius:6px; margin-bottom:16px; font-size:13px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .progress-section { background:#f9f9f9; padding:12px 16px; border-radius:6px; margin-bottom:24px; border:1px solid #eee; }
  .progress-bar-bg { background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden; margin-top:8px; }
  .progress-bar-fill { background:#C9A84C; width:${pct}%; height:100%; border-radius:4px; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; padding:10px 12px; background:#f0f0f0; font-size:11px; letter-spacing:1px; text-transform:uppercase; border-bottom:1px solid #ddd; }
  .footer { margin-top:32px; font-size:11px; color:#888; border-top:1px solid #ddd; padding-top:16px; text-align:center; }
  @media print {
    body { padding:20px; }
    .meta-info, .progress-bar-fill, .badge-complete, .badge-partial {
      -webkit-print-color-adjust:exact; print-color-adjust:exact;
    }
  }
</style>
</head><body>
  <h1>ICT TRADE CHECKLIST</h1>
  <div class="sub">ICT Masterclass — 8AM Strategy &amp; Universal Confluence</div>
  <div class="meta-info">
    <span>📅 ${formattedDate}</span>
    <span>⏰ ${formattedTime}</span>
    <span>📋 ${done}/${total} item terpenuhi (${pct}%)</span>
    <span>${badgeHtml}</span>
  </div>
  <div class="progress-section">
    <div style="font-size:12px;font-weight:bold;">Progress Checklist: ${done}/${total} (${pct}%)</div>
    <div class="progress-bar-bg"><div class="progress-bar-fill"></div></div>
  </div>
  <table>
    <thead><tr><th style="width:40px;"></th><th>Item Checklist</th><th style="width:80px;">Prioritas</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <strong>ICT MASTERCLASS — TRADE CHECKLIST</strong><br>
    Generated from ICT Masterclass HTML v13 · ${formattedDate} ${formattedTime}<br>
    Pastikan semua item kritis (KRITIS) tercentang sebelum mengeksekusi trade.
  </div>
</body></html>`;

  // V13: Ganti document.write() dengan Blob URL (tidak deprecated)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk domain ini.'); URL.revokeObjectURL(url); return; }
  // Cleanup URL setelah window terbuka
  setTimeout(() => { URL.revokeObjectURL(url); win.print(); }, 600);
}

// ── DARK/LIGHT MODE ───────────────────────────────────────────────
// ── BACK TO TOP ───────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = document.getElementById('backToTop');
  if (btn) btn.style.opacity = window.scrollY > 300 ? '1' : '0';
});

// ── GLOSSARY TOOLTIPS (V13: cegah nested replacement) ────────────
function initTooltips() {
  const glossaryTerms = {
    'FVG': 'Fair Value Gap — celah harga yang ditinggalkan oleh displacement candle',
    'OB': 'Order Block — candle terakhir berlawanan sebelum displacement impulsif',
    'BOS': 'Break of Structure — konfirmasi trend berlanjut saat HH/LL baru ditembus',
    'CHoCH': 'Change of Character — sinyal awal perubahan trend, belum konfirmasi reversal',
    'MSS': 'Market Structure Shift — konfirmasi reversal dengan displacement candle',
    'AMD': 'Accumulation-Manipulation-Distribution — tiga fase siklus harian institusional',
    'HTF': 'Higher Time Frame — timeframe lebih besar (Daily, Weekly, Monthly)',
    'LTF': 'Lower Time Frame — timeframe lebih kecil (5M, 15M, 1H untuk eksekusi)',
    'PDH': 'Previous Day High — high hari sebelumnya, level likuiditas utama',
    'PDL': 'Previous Day Low — low hari sebelumnya, level likuiditas utama',
    'SMT': 'Smart Money Technique — divergence antara dua instrumen terkorelasi',
    'OTE': 'Optimal Trade Entry — zona Fibonacci 62%–79% untuk entry presisi',
    'IPDA': 'Interbank Price Delivery Algorithm — konsep algoritma pengiriman harga antarbank',
    'SSL': 'Sell Side Liquidity — stop loss buyer yang terkumpul di bawah swing lows',
    'BSL': 'Buy Side Liquidity — stop loss seller yang terkumpul di atas swing highs',
    'MMXM': 'Market Maker Model — pola 4 fase: konsolidasi, false break, retrace, distribusi',
    'EQL': 'Equal Lows — dua atau lebih low yang berada di level yang sama, target likuiditas',
    'EQH': 'Equal Highs — dua atau lebih high di level yang sama, target likuiditas'
  };

  document.querySelectorAll('.card p, .card ul li, .tl-content p, .step-text').forEach(el => {
    // V13: skip jika elemen sudah mengandung glossary-term (cegah double wrap)
    if (el.querySelector('.glossary-term')) return;
    let html = el.innerHTML;
    Object.entries(glossaryTerms).forEach(([term, def]) => {
      // Skip jika term sudah di dalam tag HTML atau sudah dibungkus glossary-term
      const re = new RegExp(`\\b(${term})\\b(?![^<]*>)(?![^<]*glossary)`, 'g');
      const safedef = escapeHtml(def);
      html = html.replace(re, `<span class="glossary-term" tabindex="0" aria-label="${safedef}">$1<span class="glossary-tip">${safedef}</span></span>`);
    });
    el.innerHTML = html;
  });
}

// ── EXPORT COT RESULTS TO PDF ─────────────────────────────────────
function exportCOTResults() {
  const resultsDiv = document.getElementById('cotResults');
  if (!resultsDiv || !resultsDiv.innerHTML.trim() || resultsDiv.innerHTML.includes('Tidak ada instrumen')) {
    alert('Tidak ada hasil analisis COT untuk diekspor.');
    return;
  }

  const date = new Date();
  const formattedDate = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const clone = resultsDiv.cloneNode(true);
  clone.querySelectorAll('button, .action-btn, .calc-btn').forEach(el => el.remove());

  const cards = clone.querySelectorAll('.cot-result-card');
  let cardsHtml = '';
  cards.forEach(card => { cardsHtml += card.outerHTML; });

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>COT Analysis Report</title>
<style>
  body { background: #0A0A0B; color: #E8E6DF; font-family: monospace; padding: 40px; max-width: 1000px; margin: 0 auto; }
  h1 { color: #C9A84C; border-bottom: 2px solid #C9A84C; display: inline-block; }
  .meta-info { background: #18181D; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; border: 1px solid rgba(201,168,76,0.3); }
  .cot-result-card { background: #111114; border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
  .cot-instr-title { color: #F0D07A; border-bottom: 1px solid rgba(201,168,76,0.3); padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  .sentiment-bullish { background: rgba(46,204,113,0.2); color: #2ECC71; border: 1px solid #2ECC71; display: inline-block; padding: 4px 12px; border-radius: 20px; }
  .sentiment-bearish { background: rgba(231,76,60,0.2); color: #E74C3C; border: 1px solid #E74C3C; display: inline-block; padding: 4px 12px; border-radius: 20px; }
  .cot-net-bar { height: 24px; background: #222228; border-radius: 4px; overflow: hidden; margin: 12px 0; }
  .cot-net-fill-long { background: #2ECC71; height: 100%; float: left; }
  .cot-net-fill-short { background: #E74C3C; height: 100%; float: right; }
  .footer { margin-top: 32px; font-size: 11px; color: #5A5856; border-top: 1px solid rgba(201,168,76,0.3); padding-top: 16px; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
  <h1>COT REPORT ANALYSIS</h1>
  <div class="meta-info">
    <span>📅 ${formattedDate}</span>
    <span>⏰ ${formattedTime}</span>
    <span>📊 ${cards.length} Instrumen</span>
    <span>🔬 Rizky Saputra · ICT SMC Researcher</span>
  </div>
  ${cardsHtml}
  <div class="footer">
    Report by Rizky Saputra · ICT Masterclass<br>
    Data Source: CFTC Commitment of Traders Report
  </div>
</body></html>`;

  // V13: Blob URL, bukan document.write()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up.'); URL.revokeObjectURL(url); return; }
  setTimeout(() => { URL.revokeObjectURL(url); win.print(); }, 600);
}

// ==================== TRADING JOURNAL (localStorage) ====================
let journalEntries = [];

function loadJournal() {
  journalEntries = safeJSONParse(localStorage.getItem('ict-journal'), []);
  renderJournal();
}

function saveJournal() {
  localStorage.setItem('ict-journal', JSON.stringify(journalEntries));
  renderJournal();
}

function renderJournal() {
  const tbody = document.getElementById('journalBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const stats = { total: 0, wins: 0, totalRR: 0, profitFactorNumerator: 0, profitFactorDenominator: 0 };
  
  journalEntries.slice().reverse().forEach((entry, idx) => {
    const originalIdx = journalEntries.length - 1 - idx;
    const row = tbody.insertRow();
    const date = new Date(entry.date).toLocaleDateString('id-ID');
    const sideIcon = entry.side === 'long' ? '📈' : '📉';
    const resultClass = entry.result === 'win' ? 'style="color:var(--green);"' : entry.result === 'loss' ? 'style="color:var(--red);"' : '';
    const resultText = entry.result === 'win' ? '✅ WIN' : entry.result === 'loss' ? '❌ LOSS' : '⏳ Pending';
    // V13: escapeHtml untuk semua field dari user input
    row.innerHTML = `
      <td style="font-size:11px;">${escapeHtml(date)}</td>
      <td><strong>${escapeHtml(String(entry.symbol).toUpperCase())}</strong></td>
      <td>${sideIcon} ${escapeHtml(String(entry.side).toUpperCase())}</td>
      <td>${escapeHtml(String(entry.entry))}</td>
      <td>${escapeHtml(String(entry.sl))}</td>
      <td>${escapeHtml(String(entry.tp))}</td>
      <td>1:${escapeHtml(String(entry.rr))}</td>
      <td ${resultClass}>${resultText}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(entry.note || '-')}</td>
      <td><button class="action-btn" onclick="deleteJournalEntry(${originalIdx})" style="padding:4px 8px;font-size:10px;">🗑</button></td>
    `;
    
    stats.total++;
    if (entry.result === 'win') stats.wins++;
    if (entry.result === 'win' || entry.result === 'loss') {
      stats.totalRR += entry.rr;
      if (entry.result === 'win') stats.profitFactorNumerator += entry.rr;
      else stats.profitFactorDenominator += entry.rr;
    }
  });
  
  const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
  const avgRR = stats.total > 0 ? (stats.totalRR / stats.total).toFixed(2) : 0;
  const profitFactor = stats.profitFactorDenominator > 0 ? (stats.profitFactorNumerator / stats.profitFactorDenominator).toFixed(2) : stats.profitFactorNumerator > 0 ? '∞' : '0';
  
  const statTotal = document.getElementById('statTotal');
  const statWinRate = document.getElementById('statWinRate');
  const statProfitFactor = document.getElementById('statProfitFactor');
  const statAvgRR = document.getElementById('statAvgRR');
  if (statTotal) statTotal.textContent = stats.total;
  if (statWinRate) statWinRate.textContent = winRate + '%';
  if (statProfitFactor) statProfitFactor.textContent = profitFactor;
  if (statAvgRR) statAvgRR.textContent = avgRR;
}

function addJournalEntry() {
  const symbol = document.getElementById('journalSymbol')?.value.trim();
  const side = document.getElementById('journalSide')?.value;
  const entry = parseFloat(document.getElementById('journalEntry')?.value);
  const sl = parseFloat(document.getElementById('journalSL')?.value);
  const tp = parseFloat(document.getElementById('journalTP')?.value);
  const rr = parseFloat(document.getElementById('journalRr')?.value);
  const result = document.getElementById('journalResult')?.value;
  const note = document.getElementById('journalNote')?.value.trim();
  
  if (!symbol) { alert('Isi Symbol terlebih dahulu'); return; }
  if (isNaN(entry) || isNaN(sl) || isNaN(tp)) { alert('Isi Entry, SL, TP dengan angka valid'); return; }
  if (isNaN(rr) || rr <= 0) { alert('Isi R:R dengan angka positif (contoh: 2 untuk 1:2)'); return; }
  
  journalEntries.unshift({
    date: new Date().toISOString(),
    symbol, side, entry, sl, tp, rr, result, note: note || ''
  });
  
  saveJournal();
  ['journalSymbol', 'journalEntry', 'journalSL', 'journalTP', 'journalRr', 'journalNote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (document.getElementById('journalResult')) document.getElementById('journalResult').value = 'pending';
  alert('Trade berhasil ditambahkan!');
}

function deleteJournalEntry(index) {
  journalEntries.splice(index, 1);
  saveJournal();
}

function clearJournal() {
  if (confirm('Hapus SEMUA data trading journal? Tindakan ini tidak bisa dibatalkan.')) {
    journalEntries = [];
    saveJournal();
  }
}

function exportJournalCSV() {
  if (journalEntries.length === 0) { alert('Tidak ada data journal untuk diekspor'); return; }
  // V13: Proper CSV escaping — wrap field dalam tanda kutip, escape internal quotes
  const csvEscape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  let csv = 'Tanggal,Symbol,Side,Entry,SL,TP,R:R,Result,Catatan\n';
  journalEntries.forEach(e => {
    csv += [
      csvEscape(new Date(e.date).toLocaleDateString('id-ID')),
      csvEscape(e.symbol),
      csvEscape(e.side),
      csvEscape(e.entry),
      csvEscape(e.sl),
      csvEscape(e.tp),
      csvEscape(e.rr),
      csvEscape(e.result),
      csvEscape(e.note)
    ].join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM untuk Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ict_journal_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJournalPDF() {
  const tbody = document.getElementById('journalBody');
  if (!tbody || tbody.children.length === 0) {
    alert('Tidak ada data journal untuk diekspor');
    return;
  }

  const date = new Date();
  const formattedDate = date.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const formattedTime = date.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

  const stats = {
    total:        document.getElementById('statTotal')?.textContent        || '0',
    winRate:      document.getElementById('statWinRate')?.textContent      || '0%',
    profitFactor: document.getElementById('statProfitFactor')?.textContent || '0',
    avgRR:        document.getElementById('statAvgRR')?.textContent        || '0'
  };

  let rows = '';
  for (let i = 0; i < tbody.children.length; i++) {
    const row = tbody.children[i];
    const cells = row.querySelectorAll('td');
    if (cells.length >= 9) {
      const result = cells[7].textContent.trim();
      const isWin  = result.toUpperCase().includes('WIN') || result.toUpperCase().includes('TP');
      rows += `<tr style="background:${isWin ? 'rgba(46,204,113,0.07)' : 'rgba(231,76,60,0.07)'};">
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);font-size:12px;">${cells[0].textContent}</td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);"><strong style="color:#F0D07A;">${cells[1].textContent}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);color:${cells[2].textContent.toUpperCase().includes('BUY')?'#2ECC71':'#E74C3C'};">${cells[2].textContent}</td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);">${cells[3].textContent}</td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);">${cells[4].textContent}</td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);">${cells[5].textContent}</td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);"><strong>${cells[6].textContent}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);"><strong style="color:${isWin?'#2ECC71':'#E74C3C'};">${result}</strong></td>
        <td style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);font-size:11px;color:#9A9890;">${cells[8].textContent}</td>
      </tr>`;
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>ICT Trading Journal Export</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0A0A0B; color:#E8E6DF; font-family:'Courier New',monospace; padding:40px; max-width:1200px; margin:0 auto; }
  h1 { color:#C9A84C; letter-spacing:4px; border-bottom:2px solid #C9A84C; display:inline-block; padding-bottom:4px; margin-bottom:6px; font-size:26px; }
  .sub { font-size:12px; color:#5A5856; letter-spacing:2px; text-transform:uppercase; margin-bottom:20px; }
  .meta { background:#111114; padding:12px 16px; border-radius:6px; margin-bottom:16px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; border:1px solid rgba(201,168,76,0.3); font-size:13px; }
  .stats { background:#18181D; padding:14px 16px; border-radius:6px; margin-bottom:20px; display:flex; gap:24px; flex-wrap:wrap; border:1px solid rgba(201,168,76,0.2); }
  .stat-item { font-size:13px; }
  .stat-item strong { color:#C9A84C; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; padding:10px; background:#222228; color:#C9A84C; border-bottom:1px solid rgba(201,168,76,0.5); font-size:11px; letter-spacing:1px; text-transform:uppercase; }
  .footer { margin-top:28px; font-size:11px; color:#5A5856; border-top:1px solid rgba(201,168,76,0.2); padding-top:14px; text-align:center; line-height:1.8; }
  .watermark { color:#8A6E30; font-size:10px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
  <h1>ICT TRADING JOURNAL</h1>
  <div class="sub">ICT Masterclass — Personal Trade Log</div>
  <div class="meta">
    <span>📅 ${formattedDate}</span>
    <span>⏰ ${formattedTime}</span>
    <span>🔬 Rizky Saputra · ICT SMC Researcher</span>
  </div>
  <div class="stats">
    <div class="stat-item">📊 Total Trades: <strong>${stats.total}</strong></div>
    <div class="stat-item">✅ Win Rate: <strong>${stats.winRate}</strong></div>
    <div class="stat-item">💰 Profit Factor: <strong>${stats.profitFactor}</strong></div>
    <div class="stat-item">📈 Avg R:R: <strong>${stats.avgRR}</strong></div>
  </div>
  <table>
    <thead><tr>
      <th>Tanggal</th><th>Symbol</th><th>Side</th><th>Entry</th>
      <th>SL</th><th>TP</th><th>R:R</th><th>Result</th><th>Catatan</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <strong style="color:#C9A84C;">ICT MASTERCLASS — TRADING JOURNAL</strong><br>
    Generated by Rizky Saputra · ICT SMC Researcher · ${formattedDate} ${formattedTime}<br>
    <span class="watermark">© Rizky Saputra · ICT Masterclass HTML · Data disimpan secara lokal di browser Anda</span>
  </div>
</body></html>`;

  // V13: Blob URL, bukan document.write()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk domain ini.'); URL.revokeObjectURL(url); return; }
  setTimeout(() => { URL.revokeObjectURL(url); win.print(); }, 600);
}

// ==================== ECONOMIC CALENDAR (Static Data) ====================
const economicEvents = [
  { time: '08:30 NY', currency: 'USD', event: 'Non-Farm Payrolls (NFP)', impact: 'high', day: 'Jumat pertama setiap bulan' },
  { time: '08:30 NY', currency: 'USD', event: 'CPI (Consumer Price Index)', impact: 'high', day: 'Bulanan (pertengahan bulan)' },
  { time: '14:00 NY', currency: 'USD', event: 'FOMC Rate Decision', impact: 'high', day: '8x/tahun' },
  { time: '08:30 NY', currency: 'USD', event: 'Initial Jobless Claims', impact: 'high', day: 'Setiap Kamis' },
  { time: '10:00 NY', currency: 'USD', event: 'ISM Manufacturing PMI', impact: 'high', day: 'Bulanan' },
  { time: '04:00 NY', currency: 'EUR', event: 'German CPI / ECB Press Conference', impact: 'high', day: 'Bulanan' },
  { time: '04:30 NY', currency: 'GBP', event: 'BOE Rate Decision', impact: 'high', day: '8x/tahun' },
  { time: '19:00 NY', currency: 'JPY', event: 'Tokyo CPI / BOJ Policy', impact: 'high', day: 'Bulanan' },
  { time: '20:30 NY', currency: 'CAD', event: 'BOC Rate Decision', impact: 'high', day: '8x/tahun' },
  { time: '21:30 NY', currency: 'AUD', event: 'RBA Rate Decision', impact: 'high', day: '8x/tahun' }
];

function renderEconomicCalendar() {
  const container = document.getElementById('econEventsList');
  if (!container) return;
  container.innerHTML = economicEvents.map(e => `
    <div class="econ-event">
      <div class="econ-time">⏰ ${e.time}</div>
      <div class="econ-currency">${e.currency}</div>
      <div style="flex:1;"><strong>${e.event}</strong><br><span style="font-size:10px;color:var(--text-muted);">${e.day}</span></div>
      <div class="econ-impact ${e.impact}">🔴 HIGH IMPACT</div>
    </div>
  `).join('');
}

// ── EXTRACT COT FROM TXT (Hanya format monospace CFTC) ────────────
function extractCOTFromTXT() {
  const fileInput = document.getElementById('cotTxtInput');
  if (!fileInput.files || !fileInput.files[0]) {
    alert('Pilih file TXT terlebih dahulu');
    return;
  }

  const file = fileInput.files[0];

  if (file.size === 0) {
    alert('File kosong (0 byte). Pastikan file tidak rusak.');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert('Ukuran file terlalu besar (maks 20MB). Untuk file tahunan, ekstrak dan ambil bagian yang diperlukan saja.');
    return;
  }

  document.getElementById('cotLoading').style.display = 'block';
  document.getElementById('cotResults').innerHTML = '';

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const text = e.target.result;

      if (!text.trim()) {
        throw new Error('File kosong atau tidak berisi teks.');
      }

      // Validasi konten COT
      if (!text.includes('Commitments of Traders') && !text.includes('Non-Commercial') && !text.includes('Commercial')) {
        throw new Error('File tidak mengandung data COT. Pastikan Anda copy dari halaman CFTC Legacy Report (Long Format).');
      }

      // Parse langsung dengan parser monospace
      const results = parseMonospaceTextCOT(text);
      displayCOTResults(results.data, results.totalRows);

    } catch (err) {
      document.getElementById('cotResults').innerHTML = `
        <div style="background:rgba(231,76,60,0.1);padding:20px;border-radius:8px;color:var(--red);text-align:center;">
          ❌ <strong>Error:</strong> ${err.message}<br>
          <span style="font-size:12px;color:var(--text-muted);margin-top:8px;display:block;">
            Tips: Pastikan file TXT berisi laporan COT dari halaman CFTC Legacy Report (Long Format).
          </span>
        </div>`;
    } finally {
      document.getElementById('cotLoading').style.display = 'none';
    }
  };

  reader.onerror = function() {
    document.getElementById('cotResults').innerHTML = `
      <div style="background:rgba(231,76,60,0.1);padding:20px;border-radius:8px;color:var(--red);text-align:center;">
        ❌ Gagal membaca file. Pastikan file tidak rusak.
      </div>`;
    document.getElementById('cotLoading').style.display = 'none';
  };

  reader.readAsText(file, 'UTF-8');
}

// ── INIT ──────────────────────────────────────────────────────────
setInstrument('forex', document.querySelector('.inst-btn.active'));
document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
const firstTab = document.getElementById('tab-foundational');
if (firstTab) firstTab.classList.add('active');

loadChecklist();
loadFromURL();
loadJournal();
renderEconomicCalendar();
renderEventCountdownGrid();
initTooltips();

// ══════════════════════════════════════════════════════════════════
// V14.1.2 — SIDEBAR, MODALS, LANGUAGE, TOAST
// ══════════════════════════════════════════════════════════════════

// ── TRANSLATIONS ─────────────────────────────────────────────────

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────
let _sidebarOpen = false;
const _isDesktop = () => window.innerWidth >= 900;

function toggleSidebar() {
  _sidebarOpen = !_sidebarOpen;
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (_sidebarOpen) {
    sb.classList.add('open');
    if (!_isDesktop()) {
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.add('sidebar-open-desktop');
    }
  } else {
    sb.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    document.body.classList.remove('sidebar-open-desktop');
  }
}

// Auto-open on desktop
if (_isDesktop()) {
  _sidebarOpen = true;
  document.getElementById('sidebar').classList.add('open');
  document.body.classList.add('sidebar-open-desktop');
}

window.addEventListener('resize', () => {
  if (_isDesktop() && _sidebarOpen) {
    document.getElementById('sidebar-overlay').classList.remove('show');
    document.body.style.overflow = '';
    document.body.classList.add('sidebar-open-desktop');
  } else if (!_isDesktop()) {
    document.body.classList.remove('sidebar-open-desktop');
  }
});

// ── MODAL SYSTEM ──────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  document.body.style.overflow = 'hidden';
  // Populate special modals
  if (id === 'modalFAQ') renderFAQ();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
  // Only restore scroll if no other modals are open
  if (!document.querySelector('.modal-overlay.show')) {
    document.body.style.overflow = '';
  }
}

function closeModalOutside(event, id) {
  if (event.target.id === id) closeModal(id);
}

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
    if (!document.querySelector('.modal-overlay.show')) document.body.style.overflow = '';
  }
});

// ── TOAST NOTIFICATION ────────────────────────────────────────────
function showToast(msg, duration) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('show'), duration || 2800);
}

// ── QUICK TRADE SAVE ──────────────────────────────────────────────
function quickTradeSave() {
  const symbol = document.getElementById('qt-symbol')?.value.trim();
  const side   = document.getElementById('qt-side')?.value;
  const entry  = parseFloat(document.getElementById('qt-entry')?.value);
  const sl     = parseFloat(document.getElementById('qt-sl')?.value);
  const tp     = parseFloat(document.getElementById('qt-tp')?.value);
  const rr     = parseFloat(document.getElementById('qt-rr')?.value);
  const result = document.getElementById('qt-result')?.value;
  const note   = document.getElementById('qt-note')?.value.trim() || '';

  if (!symbol || isNaN(entry) || isNaN(sl) || isNaN(tp) || isNaN(rr) || rr <= 0) {
    showToast('❌ Isi semua field wajib');
    return;
  }

  journalEntries.unshift({
    date: new Date().toISOString(),
    symbol, side, entry, sl, tp, rr, result, note
  });
  saveJournal();

  // Clear form
  ['qt-symbol','qt-entry','qt-sl','qt-tp','qt-rr','qt-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const qtResult = document.getElementById('qt-result');
  if (qtResult) qtResult.value = 'pending';

  closeModal('modalQuickTrade');
  showToast('✅ Trade tersimpan!');
}

// ── DAILY BIAS HELPER ─────────────────────────────────────────────
function showDailyBiasModal() {
  openModal('modalDailyBias');
  const container = document.getElementById('biasContent');
  if (!container) return;

  const ny = getNYTime(new Date());
  // Determine active session (v14.1.5: use isMarketOpen)
  const marketOpenNow = isMarketOpen(ny);
  let activeSession = null;
  if (marketOpenNow) {
    for (const s of sessions) {
      if (inSession(ny.h, ny.m, s)) { activeSession = s; break; }
    }
  }

  const newsProx = checkNewsProximity(ny);

  // Bias logic
  let biasType, biasClass, emoji, reason, recText;

  if (!marketOpenNow) {
    biasType = 'TUNGGU'; biasClass = 'wait'; emoji = '⏳';
    const secOpen = secToNextMarketOpen(ny);
    const bh = Math.floor(secOpen/3600), bm = Math.floor((secOpen%3600)/60);
    reason = 'Market Forex tutup. Buka kembali Minggu 18:00 NY / Senin 05:00 WIB (' + pad(bh) + ':' + pad(bm) + ' lagi).';
    recText = '📋 Gunakan waktu ini untuk review chart HTF dan persiapkan rencana trading.';
  } else if (newsProx.isNear) {
    biasType = 'TUNGGU'; biasClass = 'wait'; emoji = '⚠️';
    reason = `${newsProx.eventName} ${newsProx.minLeft > 0 ? `dalam ${newsProx.minLeft} menit` : 'baru saja rilis'}. Volatilitas tinggi — hindari entry baru.`;
    recText = '⏳ Tunggu 10–15 menit setelah rilis news sebelum entry.';
  } else if (activeSession) {
    if (activeSession.name === 'LONDON KZ' || activeSession.name === 'NEW YORK KZ') {
      // Active kill zone = potentially tradeable — show neutral bias with context
      biasType = 'BULLISH'; biasClass = 'bullish'; emoji = '✅';
      reason = `${activeSession.name} aktif. Tidak ada news proximity. Kondisi optimal untuk setup ICT.`;
      recText = '🎯 Analisis PD Array + OB di LTF untuk konfirmasi entry. Gunakan HTF bias sebagai filter.';
    } else {
      biasType = 'TUNGGU'; biasClass = 'wait'; emoji = '🟡';
      reason = `${activeSession.name} — volume rendah atau volatilitas tidak optimal untuk setup ICT.`;
      recText = '⏳ Tunggu London atau NY Kill Zone untuk setup yang lebih valid.';
    }
  } else {
    const nyTotalMin = ny.h * 60 + ny.m;
    const isPreNY = nyTotalMin >= 7 * 60 && nyTotalMin < 8 * 60 + 30;
    if (isPreNY) {
      biasType = 'TUNGGU'; biasClass = 'wait'; emoji = '⏰';
      reason = 'Pre-NY Session — Kill Zone belum buka. Baca bias dari HTF sekarang.';
      recText = '📊 Analisis Monthly/Weekly/Daily untuk bias hari ini sebelum 08:30.';
    } else {
      biasType = 'TUNGGU'; biasClass = 'wait'; emoji = '🔴';
      reason = 'Di luar Kill Zone aktif. Pasar tidak liquid — tidak ada setup ICT valid.';
      recText = '🚫 Jangan trade. Tunggu sesi berikutnya.';
    }
  }

  // Current time display
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const timeStr = `${pad(ny.h)}:${pad(ny.m)} NY · ${days[ny.dayOfWeek]} ${months[ny.month-1]} ${ny.day}`;

  // Next event countdown
  const nextNFP  = getNextEventCountdown('NFP', ny);
  const nextFOMC = getNextEventCountdown('FOMC', ny);
  const nextJobless = getNextEventCountdown('JOBLESS', ny);

  const evtRows = [
    { n: 'NFP',      c: nextNFP   },
    { n: 'FOMC',     c: nextFOMC  },
    { n: 'Jobless',  c: nextJobless }
  ].map(e => {
    const d = e.c.days > 0 ? `${e.c.days}d ${pad(e.c.hours)}h` : `${pad(e.c.hours)}:${pad(e.c.mins)}:${pad(e.c.secs)}`;
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;font-family:'DM Mono',monospace;">
      <span style="color:var(--text-muted);">${e.n}</span>
      <span style="color:var(--gold);">${d}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text-muted);text-align:center;margin-bottom:12px;">${timeStr}</div>
    <div class="bias-result-box ${biasClass} bias-${biasClass}">
      <div class="bias-label">${emoji} ${biasType}</div>
      <div class="bias-detail">${reason}</div>
    </div>
    <div style="background:var(--dark4);border-radius:6px;padding:12px 14px;font-size:13px;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      ${recText}
    </div>
    <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold-dim);margin-bottom:8px;">Countdown Events</div>
    ${evtRows}
    <div style="margin-top:12px;font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace;">
      ⚠️ Bias ini bersifat otomatis berdasarkan waktu & sesi. Selalu konfirmasi dengan analisis HTF pribadi.
    </div>`;
}

// ── FAQ RENDER ────────────────────────────────────────────────────
const _faqs = [
  ['Apa itu FVG?', 'Fair Value Gap adalah celah (gap) antara 3 candle berurutan yang terbentuk akibat displacement/imbalance. Harga cenderung kembali mengisi FVG sebelum melanjutkan arah utama. ICT menyebutnya sebagai zona "discount" atau "premium" bergantung konteks.'],
  ['Apa itu Order Block?', 'Order Block adalah candle terakhir yang berlawanan arah sebelum terjadi displacement signifikan. Contoh: candle bearish terakhir sebelum rally besar ke atas = bullish OB. Ini mewakili zona order institusi yang belum tereksekusi.'],
  ['Apa itu AMD Cycle?', 'Accumulation → Manipulation → Distribution. Tiga fase pergerakan institusional dalam setiap sesi. Asia = Accumulation (range sempit), London = Manipulation (false break), New York = Distribution (trending menuju target).'],
  ['Kapan waktu terbaik trading?', 'London Kill Zone (03:00–08:30 NY) dan New York Kill Zone (08:30–16:00 NY). ICT menyebut ini sebagai "optimal trade entry" windows. Hindari trading di luar Kill Zone — noise lebih tinggi, setup kurang valid.'],
  ['Apa itu COT Report?', 'Commitment of Traders — laporan mingguan dari CFTC yang menunjukkan posisi institusi (Commercial), spekulan (Non-Commercial), dan retail. Dirilis setiap Jumat 15:30 NY untuk posisi hari Selasa. Digunakan untuk konfirmasi bias HTF.'],
  ['Cara pakai COT Analyzer?', 'Buka halaman CFTC Legacy Report di browser, copy-paste seluruh teks halaman, lalu paste ke kolom di tab COT Analyzer. Sistem akan mem-parse data dan menampilkan Net Position Commercial vs Non-Commercial untuk setiap instrumen utama.'],
];

function renderFAQ() {
  const container = document.getElementById('faqList');
  if (!container) return;
  const faqs = _faqs;

  container.innerHTML = faqs.map((item, i) => `
    <div class="faq-item" id="faq-item-${i}">
      <button class="faq-q" onclick="toggleFAQ(${i})">
        <span>${item[0]}</span>
        <span class="faq-q-arrow">▼</span>
      </button>
      <div class="faq-a">${item[1]}</div>
    </div>`).join('');
}

function toggleFAQ(idx) {
  const item = document.getElementById(`faq-item-${idx}`);
  if (!item) return;
  item.classList.toggle('open');
}

// ── NAVIGATION HELPERS ────────────────────────────────────────────
function goToTab(tabName) {
  // Find the tab button and click it
  const tabEl = document.querySelector(`.nav-tab[onclick*="showTab('${tabName}'"]`);
  if (tabEl) {
    showTab(tabName, tabEl);
    tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  // Close sidebar on mobile after navigation
  if (!_isDesktop() && _sidebarOpen) toggleSidebar();
  // Scroll to top of content
  setTimeout(() => {
    const section = document.getElementById('tab-' + tabName);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function scrollToFooter() {
  const footer = document.querySelector('.footer');
  if (footer) footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  if (!_isDesktop() && _sidebarOpen) toggleSidebar();
}

// ── UPDATED TOGGLE FUNCTIONS (sidebar-aware) ──────────────────────
// Override toggleTheme to also sync sidebar toggle
const _origToggleTheme = toggleTheme;
// Patch: we redefine toggleTheme to keep sidebar toggle in sync
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem('ict-theme', isLight ? 'light' : 'dark');
  // Sync sidebar toggle
  const sbToggle = document.getElementById('themeToggleSB');
  if (sbToggle) sbToggle.checked = isLight;
}

// Override toggleAudioAlert to sync sidebar toggle
// toggleAudioAlert removed in v14.1.5 — replaced by Browser Notifications

// ── LOAD PERSISTED STATE (v14.1.2) ────────────────────────────────
// Theme
if (localStorage.getItem('ict-theme') === 'light') {
  document.body.classList.add('light-mode');
  const sbToggle = document.getElementById('themeToggleSB');
  if (sbToggle) sbToggle.checked = true;
}

// Notification permission (v14.1.5)
if (localStorage.getItem('ict-notif') === '1' && Notification.permission === 'granted') {
  _notifEnabled = true;
}
updateNotifUI();

// Audio
// Audio persist removed in v14.1.5


// Language

