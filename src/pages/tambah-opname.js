import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { playBeep, checkCameraSupport } from '../utils/barcode-scanner-config.js';

// ─── State lokal ──────────────────────────────────────────────────────────────
let _store = null;
let _router = null;
let _systemItems = [];       // item dari getAvailableProducts()
let _checkedBarcodes = new Set(); // barcode yang sudah ditemukan secara fisik
let _extraBarcodes = [];     // barcode fisik yang TIDAK ada di sistem
let _filterMode = 'all';     // 'all' | 'unchecked' | 'selisih'
let _qrScanner = null;
let _scannerOpen = false;
let _torchOn = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanBarcode(b) {
  return (b || '').toString().trim().toUpperCase();
}

function getStats() {
  const totalSystem = _systemItems.length;
  const totalPhysical = _checkedBarcodes.size;
  const kurang = _systemItems.filter((it) => !_checkedBarcodes.has(cleanBarcode(it.barcode))).length;
  const lebih = _extraBarcodes.length;
  const selisih = lebih - kurang;
  return { totalSystem, totalPhysical, kurang, lebih, selisih };
}

function getFilteredItems() {
  switch (_filterMode) {
    case 'unchecked':
      return _systemItems.filter((it) => !_checkedBarcodes.has(cleanBarcode(it.barcode)));
    case 'selisih':
      return _systemItems.filter((it) => !_checkedBarcodes.has(cleanBarcode(it.barcode)));
    default:
      return _systemItems;
  }
}

function renderItemRow(item, idx) {
  const bc = cleanBarcode(item.barcode);
  const found = _checkedBarcodes.has(bc);
  return `
    <div class="flex items-center gap-3 py-2.5 border-b border-neutral-800/50 last:border-0 opname-item-row" data-bc="${bc}">
      <button type="button"
        class="opname-check-btn w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90
               ${found ? 'bg-emerald-500 text-white shadow-emerald-500/30 shadow-md' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}"
        data-bc="${bc}">
        <span class="material-symbols-outlined text-[18px]">${found ? 'check' : 'square'}</span>
      </button>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold truncate ${found ? 'text-neutral-200' : 'text-white'}">${item.name || 'Tanpa Nama'}</p>
        <p class="text-xs text-neutral-500 mt-0.5 font-mono">${item.barcode || '-'}</p>
      </div>
      ${found
        ? `<span class="material-symbols-outlined text-[18px] text-emerald-400 shrink-0">check_circle</span>`
        : `<span class="material-symbols-outlined text-[18px] text-neutral-600 shrink-0">radio_button_unchecked</span>`
      }
    </div>
  `;
}

function renderExtraRows() {
  if (_extraBarcodes.length === 0) return '';
  return `
    <div class="mt-3 pt-3 border-t border-amber-500/20">
      <p class="text-amber-400 text-xs font-bold mb-2 flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">warning</span>
        Ditemukan fisik tapi tidak ada di sistem (${_extraBarcodes.length})
      </p>
      ${_extraBarcodes.map((bc) => `
        <div class="flex items-center gap-3 py-2 border-b border-neutral-800/40 last:border-0">
          <span class="material-symbols-outlined text-[18px] text-amber-400 shrink-0">add_circle</span>
          <span class="text-xs font-mono text-amber-300 flex-1">${bc}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Render utama ─────────────────────────────────────────────────────────────

export function renderTambahOpnamePage(store) {
  const available = store.getAvailableProducts();
  const today = new Date().toISOString().split('T')[0];

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-28">
      ${renderHeader({
        title: 'Stock Opname',
        badge: 'Baru',
        subtitle: 'Hitung Stok Fisik',
        showBack: true,
        backRoute: 'stock-opname'
      })}

      <div class="flex flex-col w-full px-4 pt-3 gap-3.5">

        <!-- Info Sesi -->
        <div class="glass-card rounded-xl p-4 flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-neutral-400 font-semibold">Tanggal Opname</label>
            <input type="date" id="opname-date" value="${today}"
              class="glass-input w-full px-3 py-2 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-neutral-400 font-semibold">Keterangan (opsional)</label>
            <input type="text" id="opname-notes" placeholder="Mis: Opname bulanan Oktober 2026"
              class="glass-input w-full px-3 py-2 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="glass-card rounded-xl p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-white">Progress Opname</span>
            <span id="opname-progress-text" class="text-xs text-primary font-bold font-tabular">0 / ${available.length}</span>
          </div>
          <div class="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div id="opname-progress-bar" class="h-full rounded-full bg-primary transition-all duration-300" style="width: 0%"></div>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-1">
            <div class="flex flex-col items-center p-2 rounded-lg bg-neutral-900/50">
              <span id="stat-system" class="text-base font-bold text-primary font-tabular">${available.length}</span>
              <span class="text-[10px] text-neutral-500">Sistem</span>
            </div>
            <div class="flex flex-col items-center p-2 rounded-lg bg-neutral-900/50">
              <span id="stat-found" class="text-base font-bold text-emerald-400 font-tabular">0</span>
              <span class="text-[10px] text-neutral-500">Ditemukan</span>
            </div>
            <div class="flex flex-col items-center p-2 rounded-lg bg-neutral-900/50">
              <span id="stat-missing" class="text-base font-bold text-rose-400 font-tabular">${available.length}</span>
              <span class="text-[10px] text-neutral-500">Belum Cek</span>
            </div>
          </div>
        </div>

        <!-- Scan Barcode CTA -->
        <button type="button" id="btn-buka-scanner-opname"
          class="glass-primary glass-btn w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.99] transition-all">
          <span class="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          Scan Barcode untuk Cek Fisik
        </button>

        <!-- Filter Tabs -->
        <div class="glass-track p-1 rounded-xl flex items-center gap-1">
          <button type="button" data-opname-filter="all"
            class="opname-filter-btn flex-1 py-1.5 px-2 rounded-lg glass-seg-active text-on-surface font-bold font-label-md text-xs transition-all text-center">
            Semua
          </button>
          <button type="button" data-opname-filter="unchecked"
            class="opname-filter-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center">
            Belum Cek
          </button>
          <button type="button" data-opname-filter="selisih"
            class="opname-filter-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center">
            Selisih
          </button>
        </div>

        <!-- Search -->
        <div class="relative w-full">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input type="text" id="opname-search" placeholder="Cari barcode atau nama sepatu..."
            class="glass-input w-full pl-10 pr-4 py-2.5 text-on-surface text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>

        <!-- Daftar Item -->
        <div id="opname-items-container" class="glass-card rounded-xl px-3 py-1 flex flex-col">
          ${available.length === 0
            ? `<div class="flex flex-col items-center gap-2 py-8 text-center">
                <span class="material-symbols-outlined text-[40px] text-neutral-600">inventory_2</span>
                <p class="text-neutral-400 text-sm">Tidak ada stok tersedia di sistem.</p>
              </div>`
            : available.map((it, i) => renderItemRow(it, i)).join('')
          }
          <div id="opname-extra-section"></div>
        </div>

      </div>

      <!-- Sticky Footer: Selesaikan -->
      <div class="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-neutral-800 px-4 pt-3 pb-safe-bottom pb-6 z-30" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));">
        <button type="button" id="btn-selesaikan-opname"
          class="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-emerald-500/30 shadow-lg">
          <span class="material-symbols-outlined text-[20px]">task_alt</span>
          Selesaikan & Simpan Opname
        </button>
      </div>

    </div>

    <!-- Modal Scanner Opname -->
    <div id="opname-scanner-modal" class="hidden fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      <div class="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3">
        <div>
          <h2 class="text-white font-bold text-base">Scan Stok Fisik</h2>
          <p class="text-neutral-400 text-xs">Arahkan ke barcode setiap sepatu</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" id="btn-opname-torch" class="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all">
            <span class="material-symbols-outlined text-[20px]">flashlight_on</span>
          </button>
          <button type="button" id="btn-opname-close-scanner" class="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      <!-- Viewfinder dengan fokus optimal untuk opname -->
      <div class="w-full flex-1 flex flex-col items-center justify-center px-4 py-2">
        <div class="relative isolate w-full h-full max-h-[50vh] rounded-3xl overflow-hidden border-3 border-emerald-400 shadow-2xl bg-black" style="box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);">
          <div id="opname-qr-reader" class="w-full h-full"></div>
          
          <!-- Overlay: Sudut bidik + Garis panduan -->
          <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <!-- Sudut keempat penjuru (corner brackets) -->
            <div class="absolute left-3 top-3 w-8 h-8 border-l-4 border-t-4 border-emerald-300 rounded-tl-lg opacity-80"></div>
            <div class="absolute right-3 top-3 w-8 h-8 border-r-4 border-t-4 border-emerald-300 rounded-tr-lg opacity-80"></div>
            <div class="absolute left-3 bottom-3 w-8 h-8 border-l-4 border-b-4 border-emerald-300 rounded-bl-lg opacity-80"></div>
            <div class="absolute right-3 bottom-3 w-8 h-8 border-r-4 border-b-4 border-emerald-300 rounded-br-lg opacity-80"></div>
            
            <!-- Garis horizontal center dengan animasi scanning -->
            <div class="absolute inset-x-8 top-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/50" style="transform: translateY(-50%); animation: scan 2s ease-in-out infinite;"></div>
            
            <!-- Area terang di tengah untuk fokus -->
            <div class="absolute top-1/2 left-1/2 w-48 h-20 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-emerald-300/40 rounded-lg opacity-50"></div>
          </div>
          
          <!-- Vignette (tepi gelap) untuk fokus ke tengah -->
          <div class="absolute inset-0 z-5 pointer-events-none bg-gradient-to-r from-black/30 via-transparent to-black/30"></div>
        </div>
      </div>

      <div class="px-4 py-4 flex flex-col gap-2">
        <p id="opname-scanner-status" class="text-sm text-white/90 text-center font-medium">🔍 Arahkan barcode ke tengah kotak</p>
        <div id="opname-last-scanned" class="hidden text-center">
          <p class="text-xs text-neutral-500">Terakhir scan:</p>
          <p id="opname-last-scanned-text" class="text-emerald-400 font-bold font-mono text-sm"></p>
        </div>
        <button type="button" id="btn-opname-done-scan"
          class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-1">
          <span class="material-symbols-outlined text-[18px]">done_all</span>
          Selesai Scan
        </button>
      </div>
    </div>
  `;
}

// ─── Update UI ────────────────────────────────────────────────────────────────

function updateStats() {
  const stats = getStats();
  const pct = _systemItems.length > 0 ? Math.round((_checkedBarcodes.size / _systemItems.length) * 100) : 0;

  const bar = document.getElementById('opname-progress-bar');
  if (bar) bar.style.width = pct + '%';

  const txt = document.getElementById('opname-progress-text');
  if (txt) txt.textContent = `${_checkedBarcodes.size} / ${_systemItems.length}`;

  const found = document.getElementById('stat-found');
  if (found) found.textContent = _checkedBarcodes.size;

  const missing = document.getElementById('stat-missing');
  if (missing) missing.textContent = stats.kurang;
}

function updateItemsList(searchQuery = '') {
  const container = document.getElementById('opname-items-container');
  if (!container) return;

  const filtered = getFilteredItems().filter((it) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (it.name || '').toLowerCase().includes(q) || cleanBarcode(it.barcode).includes(q.toUpperCase());
  });

  const itemsHtml = filtered.map((it, i) => renderItemRow(it, i)).join('');
  const extraHtml = renderExtraRows();

  container.innerHTML = itemsHtml
    ? `${itemsHtml}<div id="opname-extra-section">${extraHtml}</div>`
    : `<div class="flex flex-col items-center gap-2 py-8 text-center">
         <span class="material-symbols-outlined text-[40px] text-neutral-600">search_off</span>
         <p class="text-neutral-400 text-sm">Tidak ada item yang cocok.</p>
       </div>
       <div id="opname-extra-section">${extraHtml}</div>`;

  // Re-bind check buttons
  container.querySelectorAll('.opname-check-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bc = btn.getAttribute('data-bc');
      toggleCheck(bc);
    });
  });
}

function toggleCheck(bc) {
  if (!bc) return;
  if (_checkedBarcodes.has(bc)) {
    _checkedBarcodes.delete(bc);
  } else {
    _checkedBarcodes.add(bc);
  }
  updateStats();
  updateItemsList(document.getElementById('opname-search')?.value || '');
}

function markFoundFromScan(rawBarcode) {
  const bc = cleanBarcode(rawBarcode);

  // Cek apakah ada di sistem
  const inSystem = _systemItems.some((it) => cleanBarcode(it.barcode) === bc);

  if (inSystem) {
    if (!_checkedBarcodes.has(bc)) {
      _checkedBarcodes.add(bc);
      updateStats();
      updateItemsList(document.getElementById('opname-search')?.value || '');
    }
  } else {
    // Barcode tidak dikenal — catat sebagai extra
    if (!_extraBarcodes.includes(bc)) {
      _extraBarcodes.push(bc);
      showToast(`Barcode ${bc} tidak ada di sistem. Dicatat sebagai stok lebih.`, 'warning', 3000);
      updateItemsList();
    }
  }

  // Update last scanned UI
  const lastEl = document.getElementById('opname-last-scanned');
  const lastTxt = document.getElementById('opname-last-scanned-text');
  if (lastEl) lastEl.classList.remove('hidden');
  if (lastTxt) lastTxt.textContent = rawBarcode;
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

function openOpnameScanner() {
  const modal = document.getElementById('opname-scanner-modal');
  if (!modal) return;

  const support = checkCameraSupport();
  if (!support.ok) {
    showToast(support.reason, 'error', 4000);
    return;
  }

  modal.classList.remove('hidden');
  _scannerOpen = true;
  _torchOn = false;
  const torchBtn = document.getElementById('btn-opname-torch');
  if (torchBtn) torchBtn.classList.remove('bg-amber-500/70');

  const formats = [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.QR_CODE
  ];

  const config = { fps: 15, qrbox: { width: 280, height: 140 } };

  let lastScanned = '';
  let lastScannedTime = 0;

  const onSuccess = (text) => {
    const now = Date.now();
    if (text === lastScanned && now - lastScannedTime < 1500) return;
    lastScanned = text;
    lastScannedTime = now;

    playBeep('success');
    markFoundFromScan(text.trim());
  };

  const tryStart = (constraint, label) => {
    if (_qrScanner) {
      try { _qrScanner.clear(); } catch (_) {}
      _qrScanner = null;
    }
    const sc = new Html5Qrcode('opname-qr-reader', { formatsToSupport: formats, verbose: false });
    _qrScanner = sc;
    return sc.start(constraint, config, onSuccess, () => {})
      .catch((err) => {
        try { sc.clear(); } catch (_) {}
        if (_qrScanner === sc) _qrScanner = null;
        throw err;
      });
  };

  tryStart({ facingMode: { ideal: 'environment' } }, 'env ideal')
    .catch(() => tryStart({ facingMode: 'environment' }, 'env exact'))
    .catch(() => tryStart({ facingMode: 'user' }, 'user'))
    .catch(() => {
      showToast('Kamera tidak dapat diakses.', 'error', 3500);
      closeOpnameScanner();
    });
}

function closeOpnameScanner() {
  const modal = document.getElementById('opname-scanner-modal');
  if (modal) modal.classList.add('hidden');
  _scannerOpen = false;

  if (_qrScanner) {
    try {
      if (_qrScanner.isScanning) _qrScanner.stop().catch(() => {});
    } catch (_) {}
    try { _qrScanner.clear(); } catch (_) {}
    _qrScanner = null;
  }
}

async function toggleOpnameTorch() {
  try {
    const video = document.querySelector('#opname-qr-reader video');
    if (!video || !video.srcObject) return;
    const track = video.srcObject.getVideoTracks()[0];
    if (!track) return;
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (!caps.torch) { showToast('Perangkat tidak mendukung senter', 'info', 2000); return; }
    _torchOn = !_torchOn;
    await track.applyConstraints({ advanced: [{ torch: _torchOn }] });
    const btn = document.getElementById('btn-opname-torch');
    if (btn) btn.classList.toggle('bg-amber-500/70', _torchOn);
  } catch (_) {}
}

// ─── Simpan ───────────────────────────────────────────────────────────────────

function selesaikanOpname() {
  const dateEl = document.getElementById('opname-date');
  const notesEl = document.getElementById('opname-notes');
  const stats = getStats();

  const record = {
    date: dateEl ? dateEl.value : new Date().toISOString().split('T')[0],
    notes: notesEl ? notesEl.value.trim() || 'Opname Stok' : 'Opname Stok',
    status: 'selesai',
    summary: {
      totalSystem: stats.totalSystem,
      totalPhysical: stats.totalPhysical,
      kurang: stats.kurang,
      lebih: stats.lebih,
      selisih: stats.selisih
    },
    items: _systemItems.map((it) => {
      const bc = cleanBarcode(it.barcode);
      const found = _checkedBarcodes.has(bc);
      return {
        barcode: it.barcode,
        name: it.name,
        systemStatus: 'ada',
        physicalFound: found,
        selisih: found ? 0 : -1
      };
    }),
    extraItems: _extraBarcodes.map((bc) => ({
      barcode: bc,
      systemStatus: 'tidak_ada',
      physicalFound: true,
      selisih: 1
    }))
  };

  _store.addOpnameRecord(record);

  const msg = stats.selisih === 0
    ? `✅ Opname selesai! Stok cocok semua (${stats.totalSystem} item).`
    : `📋 Opname selesai. Selisih: ${stats.kurang} kurang, ${stats.lebih} lebih.`;

  showToast(msg, stats.selisih === 0 ? 'success' : 'warning', 4000);
  _router.navigate('detail-opname', { id: _store.getOpnameRecords()[0]?.id });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTambahOpnamePage(router, store) {
  _store = store;
  _router = router;
  _systemItems = store.getAvailableProducts();
  _checkedBarcodes = new Set();
  _extraBarcodes = [];
  _filterMode = 'all';

  bindHeaderEvents(router);

  // Filter tabs
  document.querySelectorAll('.opname-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      _filterMode = btn.getAttribute('data-opname-filter') || 'all';
      document.querySelectorAll('.opname-filter-btn').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('glass-seg-active', active);
        b.classList.toggle('text-on-surface', active);
        b.classList.toggle('font-bold', active);
        b.classList.toggle('text-on-surface-variant', !active);
      });
      updateItemsList(document.getElementById('opname-search')?.value || '');
    });
  });

  // Search
  const searchEl = document.getElementById('opname-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => updateItemsList(searchEl.value));
  }

  // Check buttons (initial render)
  document.querySelectorAll('.opname-check-btn').forEach((btn) => {
    btn.addEventListener('click', () => toggleCheck(btn.getAttribute('data-bc')));
  });

  // Scanner modal
  const btnBuka = document.getElementById('btn-buka-scanner-opname');
  if (btnBuka) btnBuka.addEventListener('click', openOpnameScanner);

  const btnClose = document.getElementById('btn-opname-close-scanner');
  if (btnClose) btnClose.addEventListener('click', closeOpnameScanner);

  const btnDone = document.getElementById('btn-opname-done-scan');
  if (btnDone) btnDone.addEventListener('click', closeOpnameScanner);

  const btnTorch = document.getElementById('btn-opname-torch');
  if (btnTorch) btnTorch.addEventListener('click', toggleOpnameTorch);

  // Selesaikan
  const btnSelesai = document.getElementById('btn-selesaikan-opname');
  if (btnSelesai) {
    btnSelesai.addEventListener('click', () => {
      if (_systemItems.length === 0) {
        showToast('Tidak ada stok di sistem untuk di-opname.', 'warning');
        return;
      }
      selesaikanOpname();
    });
  }
}
