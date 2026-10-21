import { formatRupiah, parseRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { Html5Qrcode } from 'html5-qrcode';
import {
  buildScannerConfig1D,
  enhanceVideoElement,
  describeCameraError,
  playBeep
} from '../utils/barcode-scanner-config.js';

export function renderTransaksiListPage(store, filterType = 'all', isAdmin = true) {
  const summary = store.getBalanceSummary();
  const transactions = store.getTransactions();
  const paymentStats = store.getPaymentVerificationStats ? store.getPaymentVerificationStats() : null;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Buku Transaksi',
        badge: 'Harian',
        subtitle: 'Catatan Pemasukan & Pengeluaran'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-3.5">
        <!-- KPI Summary Cards -->
        <section class="grid grid-cols-2 gap-2.5">
          <!-- Masuk -->
          <div class="glass-emerald glass-sheen rounded-xl p-3 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-label-sm text-xs text-emerald-900 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-emerald-700">arrow_downward</span>
                Masuk
              </span>
              <span id="kpi-trx-count-masuk" class="font-label-sm text-[10px] text-on-surface-variant glass-chip px-1.5 py-0.5 rounded-full">${summary.countMasuk} Trx</span>
            </div>
            <div class="mt-2">
              <span id="kpi-trx-total-masuk" class="font-headline-sm text-base font-bold text-emerald-800 block font-tabular font-bold">+${formatRupiah(summary.totalMasuk, '')}</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block truncate">Penjualan & Piutang</span>
            </div>
          </div>

          <!-- Keluar -->
          <div class="glass-rose glass-sheen rounded-xl p-3 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-label-sm text-xs text-rose-950 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px] text-rose-700">arrow_upward</span>
                Keluar
              </span>
              <span id="kpi-trx-count-keluar" class="font-label-sm text-[10px] text-on-surface-variant glass-chip px-1.5 py-0.5 rounded-full">${summary.countKeluar} Trx</span>
            </div>
            <div class="mt-2">
              <span id="kpi-trx-total-keluar" class="font-headline-sm text-base font-bold text-rose-800 block font-tabular font-bold">-${formatRupiah(summary.totalKeluar, '')}</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block truncate">Operasional & Belanja</span>
            </div>
          </div>
        </section>

        <!-- Button Catat Transaksi Baru (Admin only) -->
        ${isAdmin ? `<button 
          type="button" 
          id="btn-goto-tambah-trx"
          class="glass-primary glass-btn glass-sheen w-full h-12 text-primary-btn rounded-xl flex items-center justify-center gap-2 font-label-md text-sm active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span class="font-bold">+ Catat Transaksi Baru</span>
        </button>` : `<div class="w-full h-9 rounded-xl glass-panel flex items-center justify-center gap-1.5 text-on-surface-variant font-label-md text-xs">
          <span class="material-symbols-outlined text-[15px]">visibility</span>
          <span>Mode Lihat Saja — Atasan tidak bisa menambah transaksi</span>
        </div>`}

        <!-- Search Bar -->
        <div class="relative w-full">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input 
            type="text" 
            id="trx-search-input"
            placeholder="Cari transaksi, nota, produk..." 
            class="glass-input w-full pl-10 pr-4 py-2.5 text-on-surface font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
          />
        </div>

        <!-- Segmented Type Tabs (Semua / Masuk / Keluar / Perlu Cek) -->
        <div class="glass-track p-1 rounded-xl flex items-center gap-1 overflow-x-auto">
          <button 
            type="button" 
            data-tab="all" 
            class="tab-btn flex-none py-1.5 px-2.5 rounded-lg ${filterType === 'all' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>Semua</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-on-surface text-[10px] font-bold">${transactions.length}</span>
          </button>
          <button 
            type="button" 
            data-tab="masuk" 
            class="tab-btn flex-none py-1.5 px-2.5 rounded-lg ${filterType === 'masuk' ? 'glass-seg-active text-emerald-800 font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>Kas Masuk</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-emerald-800 text-[10px] font-bold">${summary.countMasuk}</span>
          </button>
          <button 
            type="button" 
            data-tab="keluar" 
            class="tab-btn flex-none py-1.5 px-2.5 rounded-lg ${filterType === 'keluar' ? 'glass-seg-active text-rose-800 font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>Kas Keluar</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-rose-800 text-[10px] font-bold">${summary.countKeluar}</span>
          </button>
          ${paymentStats && paymentStats.pending.count > 0 ? `
          <button 
            type="button" 
            data-tab="pending" 
            class="tab-btn flex-none py-1.5 px-2.5 rounded-lg ${filterType === 'pending' ? 'glass-seg-active text-amber-800 font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span class="material-symbols-outlined text-[14px]">warning</span>
            <span>Perlu Cek</span>
            <span class="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-900 text-[10px] font-bold animate-pulse">${paymentStats.pending.count}</span>
          </button>
          ` : ''}
        </div>

        <!-- Bulk Verification Bar (hanya muncul di tab pending) -->
        <div id="bulk-verification-bar" class="${filterType === 'pending' ? '' : 'hidden'} glass-amber glass-sheen rounded-xl p-2.5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="select-all-checkbox"
              class="w-4 h-4 rounded border-2 border-amber-700 text-amber-700 focus:ring-amber-500 cursor-pointer"
            />
            <label for="select-all-checkbox" class="text-xs font-bold text-amber-900 cursor-pointer">
              Pilih Semua (<span id="selected-count">0</span>)
            </label>
          </div>
          <div class="flex items-center gap-1.5">
            <button 
              type="button" 
              id="bulk-verify-btn"
              class="glass-emerald glass-btn px-2.5 py-1 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              <span class="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Tandai Terverifikasi</span>
            </button>
            <button 
              type="button" 
              id="bulk-problematic-btn"
              class="glass-rose glass-btn px-2.5 py-1 rounded-lg text-rose-800 text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              <span class="material-symbols-outlined text-[14px]">error</span>
              <span>Ada Kendala</span>
            </button>
          </div>
        </div>

        <!-- Transaction List Stream -->
        <div id="trx-stream-container" class="flex flex-col gap-2.5">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
}



export function initTransaksiListPage(router, store, initialFilter = 'all', isAdmin = true) {
  bindHeaderEvents(router);

  // Add-Item bottom sheet state
  let addItemTargetTrxId = null;

  // Inject add-item bottom sheet modal into phone frame
  const phoneFrame = document.getElementById('phone-frame') || document.body;
  let modal = document.getElementById('add-item-modal');
  if (modal && modal.parentElement !== phoneFrame) {
    modal.remove();
    modal = null;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-item-modal';
    modal.className = 'hidden absolute inset-0 z-50 flex items-end justify-center overflow-hidden';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" id="add-item-modal-backdrop"></div>
      <div class="relative w-full max-w-[430px] glass-sheet rounded-t-3xl p-4 pb-6 flex flex-col gap-3.5 max-h-[88%] overflow-y-auto z-10 animate-in fade-in slide-in-from-bottom duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/55 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full glass-chip text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[19px]">add_shopping_cart</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-sm font-bold text-on-surface">Tambah Barang ke Transaksi</h3>
              <p id="add-item-modal-subtitle" class="text-[11px] text-on-surface-variant font-medium">Tambah barang susulan ke nota</p>
            </div>
          </div>
          <button type="button" id="btn-close-add-item-modal" class="p-1.5 rounded-full glass-chip-btn text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form Fields -->
        <div class="flex flex-col gap-3">
          <!-- Barcode & Stock Dropdown -->
          <div class="flex flex-col gap-1 relative modal-stock-dropdown-wrapper">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[16px]">qr_code</span>
                <span>Pilih Sepatu dari Stok / Barcode</span>
              </label>
              <span class="text-[10px] text-primary font-semibold">Tersedia di toko</span>
            </div>

            <div class="relative flex items-center gap-1.5">
              <div class="relative flex-1">
                <input 
                  type="text" 
                  id="add-item-barcode" 
                  placeholder="Ketik barcode atau pilih dari stok..." 
                  class="glass-input w-full px-3.5 pr-8 py-2.5 rounded-xl text-on-surface font-mono text-xs focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
                  autocomplete="off"
                />
                <button 
                  type="button" 
                  id="btn-toggle-modal-stock"
                  class="absolute right-2 top-2 text-on-surface-variant hover:text-primary transition-all p-0.5 rounded active:scale-95" 
                  title="Tampilkan daftar sepatu di stok yang belum terjual"
                >
                  <span class="material-symbols-outlined text-[20px] pointer-events-none">arrow_drop_down</span>
                </button>
              </div>
              <button 
                type="button" 
                id="btn-modal-scan-barcode"
                class="glass-primary glass-btn glass-sheen w-12 h-10 rounded-xl flex items-center justify-center shrink-0 text-primary-btn active:scale-95 transition-all"
                title="Scan Barcode dengan Kamera"
              >
                <span class="material-symbols-outlined text-[20px]">qr_code_scanner</span>
              </button>
            </div>

            <!-- DROPDOWN POPUP LIST SEPATU DI STOK -->
            <div 
              id="modal-stock-dropdown-popup" 
              class="hidden absolute left-0 right-0 top-full mt-1.5 z-40 max-h-52 overflow-y-auto glass-sheet rounded-2xl p-1 flex flex-col gap-1 transition-all"
            >
            </div>

            <!-- Warning Barcode Dobel di Modal Tambah Barang -->
            <div id="add-item-barcode-warning" class="hidden text-xs font-medium text-rose-800 glass-rose rounded-xl p-2 flex items-start gap-1.5 transition-all">
              <span class="material-symbols-outlined text-rose-600 text-base leading-none shrink-0 mt-0.5">warning</span>
              <span id="add-item-warning-text" class="leading-snug flex-1"></span>
            </div>

            <!-- Info Produk Terdeteksi -->
            <div id="add-item-product-info" class="hidden flex items-center gap-2.5 glass-emerald rounded-xl p-2.5">
              <div id="add-item-product-photo-box" class="w-9 h-9 rounded-lg bg-white/50 text-emerald-800 flex items-center justify-center shrink-0 overflow-hidden hidden">
              </div>
              <div class="flex-1 min-w-0">
                <span id="add-item-product-name" class="font-bold text-xs text-emerald-950 truncate block">-</span>
                <span id="add-item-product-barcode-label" class="text-[10px] font-mono text-emerald-700 block">-</span>
              </div>
              <span id="add-item-product-kondisi" class="ml-auto shrink-0 text-[10px] font-bold glass-chip text-emerald-800 px-1.5 py-0.2 rounded-full">✓ Bagus</span>
            </div>
          </div>

          <!-- Harga Jual -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[16px]">payments</span>
                <span>Harga Jual Barang Tambahan (Rp)</span>
              </label>
              <span class="text-[10px] text-on-surface-variant font-medium">Bisa disesuaikan</span>
            </div>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-xs text-on-surface-variant font-bold">Rp</span>
              <input 
                type="text" 
                id="add-item-price" 
                inputmode="numeric" 
                placeholder="0" 
                class="glass-input w-full pl-9 pr-3 py-2.5 rounded-xl text-on-surface font-bold text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-on-tertiary-container" 
              />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2 pt-1">
          <button type="button" id="btn-confirm-add-item" class="glass-primary glass-btn glass-sheen w-full h-12 text-primary-btn rounded-xl font-label-md text-sm font-bold flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[19px]">check_circle</span>
            <span>Simpan Tambahan Barang</span>
          </button>
          <button type="button" id="btn-open-full-edit-from-modal" class="w-full py-1.5 text-center text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Buka di Lembar Transaksi Lengkap</span>
          </button>
        </div>
      </div>
    `;
    phoneFrame.appendChild(modal);
  }

  // ====== BARCODE SCANNER MODAL (untuk tambah barang) ======
  let scannerModal = document.getElementById('add-item-scanner-modal');
  if (scannerModal && scannerModal.parentElement !== phoneFrame) {
    scannerModal.remove();
    scannerModal = null;
  }

  if (!scannerModal) {
    scannerModal = document.createElement('div');
    scannerModal.id = 'add-item-scanner-modal';
    scannerModal.className = 'hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-start p-3 pt-safe';
    scannerModal.innerHTML = `
      <!-- Top Bar -->
      <div class="w-full max-w-[400px] flex items-center justify-between text-white pt-3 px-2 shrink-0">
        <button type="button" id="btn-close-modal-scanner" class="p-2 rounded-full hover:bg-white/10 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[24px]">close</span>
        </button>
        <h3 class="font-headline-sm text-base font-bold">Scan Barcode Sepatu</h3>
        <div class="w-10"></div>
      </div>

      <div class="flex-1 w-full max-w-[400px] flex flex-col items-center justify-center gap-4 py-4">
        <div class="w-full flex flex-col gap-3">
          <!-- Container Camera Preview -->
          <div class="relative isolate w-full h-56 sm:h-64 rounded-3xl overflow-hidden border-3 border-emerald-400 shadow-2xl bg-black" style="box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);">
            <div id="modal-qr-reader" class="w-full h-full"></div>
            
            <!-- Overlay: Sudut bidik + Garis panduan -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:rgba(52,211,153,0.9);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:rgba(52,211,153,0.4);stop-opacity:1" />
                </linearGradient>
              </defs>
              <!-- Sudut Kiri Atas -->
              <path d="M 20,20 L 20,30 M 20,20 L 30,20" stroke="url(#cornerGrad)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <!-- Sudut Kanan Atas -->
              <path d="M 80,20 L 80,30 M 80,20 L 70,20" stroke="url(#cornerGrad)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <!-- Sudut Kiri Bawah -->
              <path d="M 20,80 L 20,70 M 20,80 L 30,80" stroke="url(#cornerGrad)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <!-- Sudut Kanan Bawah -->
              <path d="M 80,80 L 80,70 M 80,80 L 70,80" stroke="url(#cornerGrad)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <!-- Garis horizontal tengah -->
              <line x1="25" y1="50" x2="75" y2="50" stroke="rgba(52,211,153,0.5)" stroke-width="0.8" stroke-dasharray="2,2">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
              </line>
            </svg>
          </div>

          <!-- Status message -->
          <div id="modal-scanner-status" class="glass-sheet rounded-2xl p-3 flex items-start gap-2.5 text-white">
            <span class="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">info</span>
            <span id="modal-scanner-status-text" class="text-sm leading-snug">Geser barcode ke dalam kotak sampai terkunci</span>
          </div>

          <!-- Last scanned (hidden initially) -->
          <div id="modal-scanner-last-read" class="hidden glass-emerald rounded-2xl p-3 flex items-center gap-2.5">
            <span class="material-symbols-outlined text-emerald-800 text-[20px] shrink-0">check_circle</span>
            <div class="flex-1 min-w-0">
              <span class="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block">Terdeteksi</span>
              <span id="modal-scanner-last-code" class="text-sm font-mono font-bold text-emerald-950 truncate block">-</span>
            </div>
          </div>
        </div>

        <!-- Scanner Controls -->
        <div class="w-full flex items-center justify-center gap-3 px-4">
          <button type="button" id="btn-modal-scanner-torch" class="p-3 rounded-full glass-chip hover:glass-sheen transition-all active:scale-95 text-white" title="Nyalakan/Matikan Flash">
            <span class="material-symbols-outlined text-[24px]">flashlight_off</span>
          </button>
          <button type="button" id="btn-modal-scanner-zoom" class="p-3 rounded-full glass-chip hover:glass-sheen transition-all active:scale-95 text-white" title="Zoom Kamera">
            <span class="material-symbols-outlined text-[24px]">zoom_in</span>
          </button>
          <button type="button" id="btn-modal-scanner-switch-cam" class="p-3 rounded-full glass-chip hover:glass-sheen transition-all active:scale-95 text-white" title="Ganti Kamera">
            <span class="material-symbols-outlined text-[24px]">flip_camera_android</span>
          </button>
        </div>

        <!-- Retry button (initially hidden) -->
        <button type="button" id="btn-modal-scanner-retry" class="hidden glass-amber glass-btn glass-sheen px-6 py-3 rounded-xl text-amber-900 font-bold text-sm flex items-center gap-2 active:scale-95 transition-all">
          <span class="material-symbols-outlined text-[20px]">refresh</span>
          <span>Coba Lagi</span>
        </button>

        <!-- Cancel button -->
        <button type="button" id="btn-cancel-modal-scanner" class="text-white/70 hover:text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-white/10 transition-all active:scale-95">
          Batal
        </button>
      </div>
    `;
    phoneFrame.appendChild(scannerModal);
  }

  // ====== SCANNER LOGIC FOR ADD-ITEM MODAL ======
  let modalHtml5Scanner = null;
  let modalScannerStarted = false;
  let modalTorchOn = false;
  let modalScannerZoom = 1;
  let modalUseFrontCamera = false;
  let isProcessingModalScan = false;

  function setModalScannerStatus(message, type = 'info') {
    const statusEl = document.getElementById('modal-scanner-status');
    const textEl = document.getElementById('modal-scanner-status-text');
    if (!statusEl || !textEl) return;

    statusEl.className = 'glass-sheet rounded-2xl p-3 flex items-start gap-2.5 text-white';
    const iconEl = statusEl.querySelector('.material-symbols-outlined');
    
    if (type === 'error') {
      statusEl.classList.add('!bg-rose-500/20', 'border', 'border-rose-500/50');
      if (iconEl) {
        iconEl.textContent = 'error';
        iconEl.className = 'material-symbols-outlined text-rose-400 text-[20px] shrink-0 mt-0.5';
      }
    } else if (type === 'success') {
      statusEl.classList.add('!bg-emerald-500/20', 'border', 'border-emerald-500/50');
      if (iconEl) {
        iconEl.textContent = 'check_circle';
        iconEl.className = 'material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5';
      }
    } else {
      if (iconEl) {
        iconEl.textContent = 'info';
        iconEl.className = 'material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5';
      }
    }
    
    textEl.textContent = message;
  }

  function showModalScannerRetryButton(show) {
    const btn = document.getElementById('btn-modal-scanner-retry');
    if (btn) btn.classList.toggle('hidden', !show);
  }

  async function applyModalTorch(on) {
    try {
      const video = document.querySelector('#modal-qr-reader video');
      if (!video || !video.srcObject) return;
      const track = video.srcObject.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: on }] });
        modalTorchOn = on;
        const btn = document.getElementById('btn-modal-scanner-torch');
        if (btn) {
          const icon = btn.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = on ? 'flashlight_on' : 'flashlight_off';
        }
      }
    } catch (err) {
      console.warn('[modal-scanner] torch error:', err);
    }
  }

  function cycleModalZoom() {
    const steps = [1, 1.5, 2, 2.5, 3];
    const idx = steps.indexOf(modalScannerZoom);
    modalScannerZoom = steps[(idx + 1) % steps.length];
    try {
      const video = document.querySelector('#modal-qr-reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          track.applyConstraints({ advanced: [{ zoom: modalScannerZoom }] });
        }
      }
    } catch (err) {
      console.warn('[modal-scanner] zoom error:', err);
    }
  }

  function switchModalCamera() {
    modalUseFrontCamera = !modalUseFrontCamera;
    closeModalScanner();
    setTimeout(() => openModalScanner(), 100);
  }

  function openModalScanner() {
    if (!scannerModal) return;
    scannerModal.classList.remove('hidden');
    isProcessingModalScan = false;
    setModalScannerStatus('Geser barcode ke dalam kotak sampai terkunci', 'info');
    showModalScannerRetryButton(false);
    
    const scanDebouncer = (() => {
      let lastTime = 0;
      const cooldown = 1500;
      return {
        shouldProcess(code) {
          const now = Date.now();
          if (now - lastTime < cooldown) return false;
          lastTime = now;
          return true;
        },
        lock() { lastTime = Date.now() + 5000; }
      };
    })();

    const onSuccess = (decodedText) => {
      if (isProcessingModalScan) return;
      if (!scanDebouncer.shouldProcess(decodedText)) return;
      
      isProcessingModalScan = true;
      playBeep();
      
      const lastReadEl = document.getElementById('modal-scanner-last-read');
      const lastCodeEl = document.getElementById('modal-scanner-last-code');
      if (lastReadEl && lastCodeEl) {
        lastCodeEl.textContent = decodedText;
        lastReadEl.classList.remove('hidden');
      }
      
      setModalScannerStatus(`Barcode terdeteksi: ${decodedText}`, 'success');
      
      // Set barcode ke input field di modal add-item
      const barcodeInput = document.getElementById('add-item-barcode');
      if (barcodeInput) {
        barcodeInput.value = decodedText;
        // Trigger input event untuk validasi
        const event = new Event('input', { bubbles: true });
        barcodeInput.dispatchEvent(event);
      }
      
      // Close scanner setelah 500ms
      setTimeout(() => {
        closeModalScanner();
        showToast('Barcode berhasil dipindai', 'success');
      }, 500);
    };

    const onError = () => {
      // Silent - scanning errors are normal
    };

    const afterStart = () => {
      modalScannerStarted = true;
      enhanceVideoElement('modal-qr-reader');
      applyModalTorch(false);
      setModalScannerStatus('Geser barcode ke dalam kotak sampai terkunci', 'info');
      showModalScannerRetryButton(false);
    };

    const tryStart = (cameraConstraint, config, label) => {
      if (modalHtml5Scanner) {
        try { modalHtml5Scanner.clear(); } catch (_) {}
        modalHtml5Scanner = null;
      }
      const scanner = new Html5Qrcode('modal-qr-reader', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      });
      modalHtml5Scanner = scanner;
      return scanner.start(cameraConstraint, config, onSuccess, onError)
        .then(() => { afterStart(); })
        .catch((err) => {
          console.warn(`[modal-scanner] gagal start (${label}):`, err);
          try { scanner.clear(); } catch (_) {}
          if (modalHtml5Scanner === scanner) modalHtml5Scanner = null;
          throw err;
        });
    };

    const baseConfig = buildScannerConfig1D();
    const facing = modalUseFrontCamera ? 'user' : 'environment';

    tryStart({ facingMode: { ideal: facing } }, baseConfig, 'facingMode ideal')
      .catch(() => tryStart({ facingMode: facing }, { ...baseConfig, fps: 15 }, 'facingMode exact'))
      .catch(() => tryStart({ facingMode: 'environment' }, { ...baseConfig, fps: 10 }, 'environment fallback'))
      .catch(() => tryStart({ facingMode: 'user' }, { ...baseConfig, fps: 10 }, 'user fallback'))
      .catch((err) => {
        console.error('[modal-scanner] kamera tidak dapat dibuka:', err);
        setModalScannerStatus(describeCameraError(err), 'error');
        showModalScannerRetryButton(true);
      });
  }

  function closeModalScanner() {
    isProcessingModalScan = true;
    
    if (!scannerModal) return;
    scannerModal.classList.add('hidden');
    applyModalTorch(false);

    // Stop camera tracks
    try {
      const video = document.querySelector('#modal-qr-reader video');
      if (video && video.srcObject) {
        const stream = video.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) {}
          });
        }
        video.srcObject = null;
      }
    } catch (_) {}

    const oldScanner = modalHtml5Scanner;
    modalHtml5Scanner = null;
    if (oldScanner) {
      try {
        const isScanning = typeof oldScanner.isScanning === 'boolean'
          ? oldScanner.isScanning
          : (oldScanner.getState && oldScanner.getState() === 2);

        if (isScanning) {
          oldScanner.stop()
            .then(() => { try { oldScanner.clear(); } catch (_) {} })
            .catch(() => { try { oldScanner.clear(); } catch (_) {} });
        } else {
          try { oldScanner.clear(); } catch (_) {}
        }
      } catch (_) {
        try { oldScanner.clear(); } catch (_) {}
      }
    }

    modalScannerStarted = false;
    showModalScannerRetryButton(false);
    setModalScannerStatus('Geser barcode ke dalam kotak sampai terkunci', 'info');
    const lastRead = document.getElementById('modal-scanner-last-read');
    if (lastRead) lastRead.classList.add('hidden');
  }

  // Bind scanner modal controls
  const btnModalScanBarcode = document.getElementById('btn-modal-scan-barcode');
  const btnCloseModalScanner = document.getElementById('btn-close-modal-scanner');
  const btnCancelModalScanner = document.getElementById('btn-cancel-modal-scanner');
  const btnModalScannerTorch = document.getElementById('btn-modal-scanner-torch');
  const btnModalScannerZoom = document.getElementById('btn-modal-scanner-zoom');
  const btnModalScannerSwitch = document.getElementById('btn-modal-scanner-switch-cam');
  const btnModalScannerRetry = document.getElementById('btn-modal-scanner-retry');

  if (btnModalScanBarcode) btnModalScanBarcode.addEventListener('click', openModalScanner);
  if (btnCloseModalScanner) btnCloseModalScanner.addEventListener('click', closeModalScanner);
  if (btnCancelModalScanner) btnCancelModalScanner.addEventListener('click', closeModalScanner);
  if (btnModalScannerTorch) btnModalScannerTorch.addEventListener('click', () => applyModalTorch(!modalTorchOn));
  if (btnModalScannerZoom) btnModalScannerZoom.addEventListener('click', cycleModalZoom);
  if (btnModalScannerSwitch) btnModalScannerSwitch.addEventListener('click', switchModalCamera);
  if (btnModalScannerRetry) {
    btnModalScannerRetry.addEventListener('click', () => {
      const old = modalHtml5Scanner;
      modalHtml5Scanner = null;
      if (old) {
        old.stop()
          .then(() => { try { old.clear(); } catch (_) {} })
          .catch(() => {})
          .then(() => openModalScanner());
      } else {
        openModalScanner();
      }
    });
  }

  let currentFilter = initialFilter;
  let searchQuery = '';
  // Transaksi yang sedang dibuka breakdown-nya (agar tetap terbuka saat pencarian/filter berubah)
  const expandedTrx = new Set();

  // ============= RENDERING FUNCTIONS (inside initTransaksiListPage scope) =============

  function renderSingleTransaction(trx) {
    const isMasuk = trx.type === 'masuk';
    const isOpen = expandedTrx.has(trx.id);
    // SEMUA transaksi masuk perlu verifikasi (kecuali investor)
    const isInvestor = ['Dana Investor', 'Bagi Hasil Investor', 'Bagi Hasil Pengelola', 'Pengembalian Modal Investor'].includes(trx.category) || 
                      trx.sourceType === 'investor' || 
                      trx.sourceType === 'investor_payout';
    const needsVerification = isMasuk && !isInvestor;
    const verificationStatus = trx.paymentVerification ? trx.paymentVerification.status : null;
    const showCheckbox = currentFilter === 'pending' && needsVerification && verificationStatus === 'pending';
    
    return `
      <div class="glass-card glass-sheen rounded-xl p-2.5 flex flex-col gap-2 hover:border-white/80 transition-all ${verificationStatus === 'problematic' ? 'border-l-4 border-rose-500' : (verificationStatus === 'verified' ? 'border-l-4 border-emerald-500' : '')}">
        <!-- Header: Icon + Title + Amount -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-2 min-w-0 flex-1">
            ${showCheckbox ? `
              <input 
                type="checkbox" 
                class="verify-checkbox w-4 h-4 rounded border-2 border-amber-700 text-amber-700 focus:ring-amber-500 cursor-pointer mt-0.5 shrink-0"
                data-trx-id="${trx.id}"
              />
            ` : ''}
            ${trx.photo ? `
              <img src="${trx.photo}" alt="Foto" class="w-8 h-8 rounded-lg object-cover shrink-0 border border-surface-container-high shadow-xs" />
            ` : `
              <div class="w-8 h-8 rounded-lg ${isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[16px]">${isMasuk ? 'arrow_downward' : 'arrow_upward'}</span>
              </div>
            `}
            <div class="flex flex-col min-w-0 flex-1">
              <span class="font-title-ledger text-xs font-bold text-on-surface truncate">${trx.title}</span>
              <span class="text-[9px] text-on-surface-variant/70">${trx.date ? (() => { try { const d = new Date(trx.date + 'T00:00:00'); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' • '; } catch(e) { return trx.date + ' • '; } })() : ''}${trx.time}</span>
            </div>
          </div>

          <div class="flex flex-col items-end shrink-0">
            <span class="font-currency-item text-xs font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">
              ${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}
            </span>
          </div>
        </div>

        <!-- Badge Row: Status, Buyer, Ongkir, Kondisi, Category -->
        <div class="flex items-center gap-1 flex-wrap">
          ${verificationStatus ? `
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[9px] ${
              verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 
              verificationStatus === 'problematic' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 
              'bg-amber-100 text-amber-800 border border-amber-300'
            }">
              <span class="material-symbols-outlined text-[10px]">${
                verificationStatus === 'verified' ? 'check_circle' : 
                verificationStatus === 'problematic' ? 'error' : 
                'schedule'
              }</span>
              <span>${
                verificationStatus === 'verified' ? 'Terverifikasi' : 
                verificationStatus === 'problematic' ? 'Kendala' : 
                'Perlu Cek'
              }</span>
            </span>
          ` : ''}
          
          ${trx.buyer ? `
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md glass-chip text-on-secondary-fixed font-bold text-[9px]">
              <span class="material-symbols-outlined text-[10px]">person</span>
              <span>${trx.buyer}</span>
            </span>
          ` : ''}

          ${trx.ongkir ? `
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-[9px] glass-chip ${trx.ongkir === 'FO' ? 'text-emerald-900' : (trx.ongkir === 'COD' ? 'text-amber-900' : 'text-orange-900')}">
              ${trx.ongkir}
            </span>
          ` : ''}

          ${trx.kondisi ? `
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md font-bold text-[9px] glass-chip ${trx.kondisi === 'Minus' ? 'text-amber-800' : 'text-emerald-800'}">
              ${trx.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
            </span>
          ` : ''}

          ${!isMasuk && trx.category ? `
            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md glass-chip text-rose-900 font-bold text-[9px]">
              ${trx.category}
            </span>
          ` : ''}
        </div>

        <!-- Notes Section -->
        ${trx.paymentVerification && trx.paymentVerification.notes ? `
          <div class="text-[9px] text-rose-700 italic px-2 py-1 bg-rose-50/50 rounded">
            💬 ${trx.paymentVerification.notes}
          </div>
        ` : ''}

        ${trx.note ? `
          <div class="text-[9px] text-on-surface-variant italic px-2 py-1 bg-surface-container/30 rounded">
            📝 ${trx.note}
          </div>
        ` : ''}

        <!-- Action Buttons Row -->
        ${(['Dana Investor', 'Bagi Hasil Investor', 'Bagi Hasil Pengelola', 'Pengembalian Modal Investor'].includes(trx.category) || trx.sourceType === 'investor' || trx.sourceType === 'investor_payout') ? `
          <div class="flex items-center justify-center gap-1 pt-1.5 border-t border-white/30">
            <span class="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-amber-100/80 text-amber-800 text-[10px] font-semibold border border-amber-300/60">
              <span class="material-symbols-outlined text-[12px]">handshake</span>
              <span>🔒 Dikelola di Menu Investor</span>
            </span>
          </div>
        ` : isAdmin ? `
          <div class="flex flex-col gap-1.5 pt-1.5 border-t border-white/30">
            ${needsVerification ? `
              <!-- Verification Buttons -->
              <div class="flex items-center gap-1">
                ${verificationStatus === 'pending' || !verificationStatus ? `
                  <button
                    type="button"
                    data-verify-trx="${trx.id}"
                    data-action="verified"
                    class="glass-emerald glass-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-emerald-700 text-[10px] font-semibold"
                  >
                    <span class="material-symbols-outlined text-[12px]">check_circle</span>
                    <span>Sudah di Mutasi</span>
                  </button>
                  <button
                    type="button"
                    data-verify-trx="${trx.id}"
                    data-action="problematic"
                    class="glass-rose glass-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-rose-700 text-[10px] font-semibold"
                  >
                    <span class="material-symbols-outlined text-[12px]">error</span>
                    <span>Ada Kendala</span>
                  </button>
                ` : `
                  <button
                    type="button"
                    data-reset-verify="${trx.id}"
                    class="glass-amber glass-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-amber-700 text-[10px] font-semibold"
                  >
                    <span class="material-symbols-outlined text-[12px]">refresh</span>
                    <span>Reset Verifikasi</span>
                  </button>
                `}
              </div>
            ` : ''}
            
            <!-- Standard Action Buttons -->
            <div class="flex items-center gap-1">
              ${isMasuk ? `
                <button
                  type="button"
                  data-add-item-trx="${trx.id}"
                  class="glass-emerald glass-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-emerald-700 text-[10px] font-semibold"
                >
                  <span class="material-symbols-outlined text-[12px]">add_shopping_cart</span>
                  <span>+ Barang</span>
                </button>
              ` : ''}
              <button 
                type="button" 
                data-edit-trx="${trx.id}"
                data-type="${trx.type}"
                class="glass-chip-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-primary text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">edit</span>
                <span>Edit</span>
              </button>
              <button 
                type="button" 
                data-delete-trx="${trx.id}"
                class="glass-rose glass-btn flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-md text-rose-700 text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">delete</span>
                <span>Hapus</span>
              </button>
            </div>
          </div>
        ` : `
          <div class="flex items-center justify-center gap-1 pt-1.5 border-t border-white/30">
            <span class="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-on-surface-variant text-[9px]">
              <span class="material-symbols-outlined text-[10px]">lock</span>
              <span>Mode Lihat Saja (Read-only)</span>
            </span>
          </div>
        `}

        ${trx.items && trx.items.length > 0 ? `
          <button
            type="button"
            class="btn-toggle-items-breakdown w-full flex items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-white/45 active:scale-[0.99] transition-all"
            data-target="breakdown-${trx.id}"
            data-trx-id="${trx.id}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="breakdown-${trx.id}"
          >
            <span class="flex items-center gap-1 min-w-0">
              <span class="material-symbols-outlined text-[14px] text-primary">receipt_long</span>
              <span class="font-bold text-primary">Breakdown</span>
              <span class="text-on-surface-variant truncate">• ${trx.items.length} Pasang • ${trx.paymentMethod || 'Tunai'}</span>
            </span>
            <span class="flex items-center gap-1 shrink-0">
              <span class="text-on-surface-variant">Total:</span>
              <span class="font-currency-item text-xs font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}</span>
              <span class="chevron-icon material-symbols-outlined text-[14px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}">expand_more</span>
            </span>
          </button>

          <div id="breakdown-${trx.id}" class="trx-items-breakdown ${isOpen ? '' : 'hidden'} glass-panel rounded-xl p-2 flex flex-col gap-1.5 text-[11px]">
            ${trx.items.map((it) => `
              <div class="flex items-start gap-2">
                ${it.photo ? `
                  <img src="${it.photo}" alt="Foto Sepatu" class="w-8 h-8 rounded-md object-cover border border-white/70 shrink-0" />
                ` : ''}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-on-surface truncate text-[11px]">${(Number(it.qty) || 1)}x ${it.name || 'Sepatu Tanpa Nama'}</span>
                    <span class="font-bold font-tabular text-primary ml-2 text-[11px] shrink-0">${formatRupiah((Number(it.price) || 0) * (Number(it.qty) || 1))}</span>
                  </div>
                  <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                    ${it.barcode ? `
                      <span class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded glass-chip text-on-surface text-[9px] font-mono font-bold">
                        <span class="material-symbols-outlined text-[10px] text-primary">qr_code</span>
                        <span>${it.barcode}</span>
                      </span>
                    ` : ''}
                    ${it.kondisi ? `
                      <span class="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold glass-chip ${it.kondisi === 'Minus' ? 'text-amber-900' : 'text-emerald-900'}">
                        ${it.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderGroupedTransactions(nota, transactions) {
    const isMasuk = transactions[0].type === 'masuk';
    const totalAmount = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const isGroupOpen = expandedTrx.has(`group-${nota}`);
    
    return `
      <div class="glass-card glass-sheen rounded-xl p-2.5 flex flex-col gap-1.5 border-l-4 ${isMasuk ? 'border-emerald-500' : 'border-rose-500'}">
        <button
          type="button"
          class="btn-toggle-group w-full flex items-center justify-between gap-2"
          data-group-nota="${nota}"
          aria-expanded="${isGroupOpen ? 'true' : 'false'}"
        >
          <div class="flex items-start gap-2 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-lg ${isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[16px]">folder_open</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-title-ledger text-xs font-bold text-on-surface">${nota}</span>
              <span class="text-[10px] text-on-surface-variant font-medium">${transactions.length} transaksi • ${transactions[0].date || ''} • ${transactions[0].time || ''}</span>
            </div>
          </div>

          <div class="flex flex-col items-end shrink-0">
            <span class="font-currency-item text-xs font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">
              ${isMasuk ? '+' : '-'}${formatRupiah(totalAmount, '')}
            </span>
            <span class="chevron-icon material-symbols-outlined text-[14px] text-on-surface-variant transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}">expand_more</span>
          </div>
        </button>

        <div id="group-${nota}" class="group-transactions ${isGroupOpen ? '' : 'hidden'} flex flex-col gap-1.5 border-t border-white/45 pt-1.5">
          ${transactions.map((trx) => `
            <div class="glass-panel rounded-lg p-2 flex flex-col gap-1">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-1.5 min-w-0 flex-1">
                  <div class="w-6 h-6 rounded ${isMasuk ? 'bg-emerald-500/20 text-emerald-700' : 'bg-rose-500/20 text-rose-700'} flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[12px]">${isMasuk ? 'arrow_downward' : 'arrow_upward'}</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-title-ledger text-[11px] font-bold text-on-surface truncate">${trx.title}</span>
                    <span class="text-[9px] text-on-surface-variant">${trx.date || ''} • ${trx.time || ''}</span>
                  </div>
                </div>
                <span class="font-currency-item text-[11px] font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular shrink-0">
                  ${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}
                </span>
              </div>
              <div class="flex items-center gap-1 mt-1">
                ${(['Dana Investor', 'Bagi Hasil Investor', 'Bagi Hasil Pengelola', 'Pengembalian Modal Investor'].includes(trx.category) || trx.sourceType === 'investor' || trx.sourceType === 'investor_payout') ? `
                  <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 text-[9px] font-semibold border border-amber-300/60">
                    <span class="material-symbols-outlined text-[10px]">handshake</span>
                    <span>Menu Investasi</span>
                  </span>
                ` : isAdmin ? `<button 
                  type="button" 
                  data-edit-trx="${trx.id}"
                  data-type="${trx.type}"
                  class="glass-chip-btn inline-flex items-center gap-0.5 px-1.5 py-0.3 rounded text-primary text-[9px] font-semibold"
                >
                  <span class="material-symbols-outlined text-[11px]">edit</span>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-delete-trx="${trx.id}"
                  class="glass-rose glass-btn inline-flex items-center gap-0.5 px-1.5 py-0.3 rounded text-rose-700 text-[9px] font-semibold"
                >
                  <span class="material-symbols-outlined text-[11px]">delete</span>
                  <span>Hapus</span>
                </button>` : `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-on-surface-variant text-[9px]">
                  <span class="material-symbols-outlined text-[10px]">lock</span>
                  <span>Read-only</span>
                </span>`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const gotoAddBtn = document.getElementById('btn-goto-tambah-trx');
  if (gotoAddBtn) {
    gotoAddBtn.addEventListener('click', () => router.navigate('tambah-transaksi'));
  }

  const searchInput = document.getElementById('trx-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderItems();
    });
  }

  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => {
        b.className = 'tab-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5';
      });
      btn.className = 'tab-btn flex-1 py-1.5 px-2 rounded-lg glass-seg-active text-on-surface font-bold font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5';
      renderItems();
    });
  });

  function renderItems() {
    const container = document.getElementById('trx-stream-container');
    const bulkBar = document.getElementById('bulk-verification-bar');
    if (!container) return;

    let list = store.getTransactions();

    if (currentFilter === 'pending') {
      // Filter hanya kas masuk yang perlu dicek (status pending)
      list = list.filter((t) => {
        if (t.type !== 'masuk') return false;
        
        // Skip investor
        const isInvestor = t.category === 'Dana Investor' || 
                          t.category === 'Investasi Modal' ||
                          t.sourceType === 'investor';
        if (isInvestor) return false;
        
        return t.paymentVerification && t.paymentVerification.status === 'pending';
      });
    } else if (currentFilter !== 'all') {
      list = list.filter((t) => t.type === currentFilter);
    }

    // Show/hide bulk verification bar
    if (bulkBar) {
      bulkBar.classList.toggle('hidden', currentFilter !== 'pending');
    }

    if (searchQuery) {
      list = list.filter((t) => {
        return (
          t.title.toLowerCase().includes(searchQuery) ||
          t.category.toLowerCase().includes(searchQuery) ||
          (t.nota && t.nota.toLowerCase().includes(searchQuery)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(searchQuery))
        );
      });
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center glass-card glass-sheen rounded-2xl text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">content_paste_off</span>
          <p class="font-title-ledger text-sm font-semibold">Tidak ada transaksi ditemukan</p>
          <p class="font-body-sm text-xs mt-1">Coba ubah kata kunci pencarian atau tab filter.</p>
        </div>
      `;
      return;
    }

    // Group transactions by nota (faktur) — inklusif: semua nota di-group,
    // termasuk nota dari belanja barang masuk (contoh: BALL01-788).
    const groupedByNota = new Map();

    list.forEach((trx) => {
      if (trx.nota) {
        if (!groupedByNota.has(trx.nota)) {
          groupedByNota.set(trx.nota, []);
        }
        groupedByNota.get(trx.nota).push(trx);
      } else {
        // Transaksi tanpa nota — buat key unik agar tetap ditampilkan
        const key = '__solo__' + trx.id;
        groupedByNota.set(key, [trx]);
      }
    });

    // Render semua grup: jika hanya 1 transaksi tampilkan biasa, jika >1 tampilkan dropdown
    const groupedHTML = Array.from(groupedByNota.entries()).map(([nota, transactions]) => {
      if (transactions.length === 1) {
        // Single transaction - render normally
        return renderSingleTransaction(transactions[0]);
      } else {
        // Multiple transactions with same nota - render as collapsible group
        return renderGroupedTransactions(nota, transactions);
      }
    }).join('');

    container.innerHTML = groupedHTML;

    // Bind Toggle Group buttons (for grouped transactions by nota)
    container.querySelectorAll('.btn-toggle-group').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nota = btn.getAttribute('data-group-nota');
        const groupEl = document.getElementById(`group-${nota}`);
        if (!groupEl) return;
        const isHidden = groupEl.classList.contains('hidden');
        if (isHidden) {
          groupEl.classList.remove('hidden');
          btn.querySelector('.chevron-icon')?.classList.add('rotate-180');
        } else {
          groupEl.classList.add('hidden');
          btn.querySelector('.chevron-icon')?.classList.remove('rotate-180');
        }
        btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');

        const groupKey = `group-${nota}`;
        if (isHidden) expandedTrx.add(groupKey);
        else expandedTrx.delete(groupKey);
      });
    });

    // Bind Toggle Items Breakdown buttons
    container.querySelectorAll('.btn-toggle-items-breakdown').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const breakdownEl = document.getElementById(targetId);
        if (!breakdownEl) return;
        const isHidden = breakdownEl.classList.contains('hidden');
        if (isHidden) {
          breakdownEl.classList.remove('hidden');
          container.querySelectorAll(`[data-target="${targetId}"] .chevron-icon`).forEach((ch) => ch.classList.add('rotate-180'));
        } else {
          breakdownEl.classList.add('hidden');
          container.querySelectorAll(`[data-target="${targetId}"] .chevron-icon`).forEach((ch) => ch.classList.remove('rotate-180'));
        }
        btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');

        const trxId = btn.getAttribute('data-trx-id');
        if (trxId) {
          if (isHidden) expandedTrx.add(trxId);
          else expandedTrx.delete(trxId);
        }
      });
    });

    // Bind Add-Item buttons (only masuk)
    container.querySelectorAll('[data-add-item-trx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addItemTargetTrxId = btn.getAttribute('data-add-item-trx');
        const trx = store.getTransactionById(addItemTargetTrxId);
        const subtitle = document.getElementById('add-item-modal-subtitle');
        if (subtitle && trx) subtitle.textContent = (trx.buyer ? trx.buyer + ' • ' : '') + (trx.nota || addItemTargetTrxId);
        // Reset fields
        const bcInput = document.getElementById('add-item-barcode');
        const priceInput = document.getElementById('add-item-price');
        const productInfo = document.getElementById('add-item-product-info');
        if (bcInput) bcInput.value = '';
        if (priceInput) priceInput.value = '';
        if (productInfo) productInfo.classList.add('hidden');
        const modal = document.getElementById('add-item-modal');
        if (modal) modal.classList.remove('hidden');
      });
    });

    // Bind Edit buttons
    container.querySelectorAll('[data-edit-trx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-edit-trx');
        const type = btn.getAttribute('data-type');
        router.navigate('tambah-transaksi', { editId: id, type: type });
      });
    });

    // Bind Delete buttons
    container.querySelectorAll('[data-delete-trx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-trx');
        if (confirm('Hapus transaksi ini dari buku kas?\nSaldo kas akan disesuaikan kembali.')) {
          store.deleteTransaction(id);
          showToast('Transaksi berhasil dihapus!', 'info');
          updateKpiDisplay();
          renderItems();
        }
      });
    });

    // Bind Payment Verification buttons
    container.querySelectorAll('[data-verify-trx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-verify-trx');
        const action = btn.getAttribute('data-action');
        
        if (action === 'verified') {
          const adminName = store.getShop ? store.getShop().owner || 'Admin' : 'Admin';
          store.verifyPayment(id, 'verified', '', adminName);
          showToast('✓ Transfer berhasil ditandai terverifikasi di mutasi!', 'success');
        } else if (action === 'problematic') {
          const notes = prompt('Catatan kendala (opsional):\nContoh: Belum masuk, jumlah tidak sesuai, dll.');
          if (notes !== null) {
            const adminName = store.getShop ? store.getShop().owner || 'Admin' : 'Admin';
            store.verifyPayment(id, 'problematic', notes || 'Ada kendala pembayaran', adminName);
            showToast('⚠️ Transfer ditandai bermasalah!', 'info');
          }
        }
        
        updateKpiDisplay();
        renderItems();
      });
    });

    // Bind Reset Verification buttons
    container.querySelectorAll('[data-reset-verify]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-reset-verify');
        if (confirm('Reset status verifikasi kembali ke "Perlu Cek"?')) {
          store.resetPaymentVerification(id);
          showToast('Status verifikasi direset!', 'info');
          updateKpiDisplay();
          renderItems();
        }
      });
    });

    // Bind Checkboxes for bulk selection
    const checkboxes = container.querySelectorAll('.verify-checkbox');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const selectedCountEl = document.getElementById('selected-count');
    const bulkVerifyBtn = document.getElementById('bulk-verify-btn');
    const bulkProblematicBtn = document.getElementById('bulk-problematic-btn');

    function updateBulkSelection() {
      const selected = Array.from(checkboxes).filter(cb => cb.checked);
      const selectedIds = selected.map(cb => cb.getAttribute('data-trx-id'));
      
      if (selectedCountEl) selectedCountEl.textContent = selected.length;
      if (bulkVerifyBtn) bulkVerifyBtn.disabled = selected.length === 0;
      if (bulkProblematicBtn) bulkProblematicBtn.disabled = selected.length === 0;
      if (selectAllCheckbox) selectAllCheckbox.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
      
      return selectedIds;
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateBulkSelection);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkSelection();
      });
    }

    if (bulkVerifyBtn) {
      bulkVerifyBtn.addEventListener('click', () => {
        const selectedIds = updateBulkSelection();
        if (selectedIds.length === 0) return;
        
        if (confirm(`Tandai ${selectedIds.length} transfer sebagai terverifikasi di mutasi?`)) {
          const adminName = store.getShop ? store.getShop().owner || 'Admin' : 'Admin';
          const count = store.bulkVerifyPayments(selectedIds, 'verified', adminName);
          showToast(`✓ ${count} transfer berhasil diverifikasi!`, 'success');
          updateKpiDisplay();
          renderItems();
        }
      });
    }

    if (bulkProblematicBtn) {
      bulkProblematicBtn.addEventListener('click', () => {
        const selectedIds = updateBulkSelection();
        if (selectedIds.length === 0) return;
        
        const notes = prompt(`Tandai ${selectedIds.length} transfer sebagai bermasalah.\n\nCatatan kendala (opsional):`);
        if (notes !== null) {
          const adminName = store.getShop ? store.getShop().owner || 'Admin' : 'Admin';
          selectedIds.forEach(id => {
            store.verifyPayment(id, 'problematic', notes || 'Ada kendala pembayaran', adminName);
          });
          showToast(`⚠️ ${selectedIds.length} transfer ditandai bermasalah!`, 'info');
          updateKpiDisplay();
          renderItems();
        }
      });
    }
  }

  function updateKpiDisplay() {
    const summary = store.getBalanceSummary();
    const elMasuk = document.getElementById('kpi-trx-total-masuk');
    const elCountMasuk = document.getElementById('kpi-trx-count-masuk');
    const elKeluar = document.getElementById('kpi-trx-total-keluar');
    const elCountKeluar = document.getElementById('kpi-trx-count-keluar');

    if (elMasuk) elMasuk.textContent = `+${formatRupiah(summary.totalMasuk, '')}`;
    if (elCountMasuk) elCountMasuk.textContent = `${summary.countMasuk} Trx`;
    if (elKeluar) elKeluar.textContent = `-${formatRupiah(summary.totalKeluar, '')}`;
    if (elCountKeluar) elCountKeluar.textContent = `${summary.countKeluar} Trx`;
  }

  // ====== ADD-ITEM MODAL LOGIC ======
  function closeAddItemModal() {
    const modal = document.getElementById('add-item-modal');
    if (modal) modal.classList.add('hidden');
    const popup = document.getElementById('modal-stock-dropdown-popup');
    if (popup) popup.classList.add('hidden');
    addItemTargetTrxId = null;
  }

  function populateModalStockDropdown(searchQuery = '') {
    const popup = document.getElementById('modal-stock-dropdown-popup');
    if (!popup) return;

    // Filter keluar sepatu yang sudah terjual atau yang sudah ada di transaksi target
    const currentTrx = store.getTransactionById(addItemTargetTrxId);
    const existingBarcodes = new Set();
    if (currentTrx) {
      if (currentTrx.barcode) existingBarcodes.add(currentTrx.barcode.trim().toUpperCase());
      if (currentTrx.items) {
        currentTrx.items.forEach((it) => {
          if (it.barcode) existingBarcodes.add(it.barcode.trim().toUpperCase());
        });
      }
    }

    const available = store.getAvailableProducts(addItemTargetTrxId).filter((p) => {
      return !existingBarcodes.has(p.barcode.toString().trim().toUpperCase());
    });

    const query = (searchQuery || '').trim().toLowerCase();
    const filtered = query
      ? available.filter((p) => (p.name && p.name.toLowerCase().includes(query)) || (p.barcode && p.barcode.toLowerCase().includes(query)))
      : available;

    if (filtered.length === 0) {
      popup.innerHTML = `
        <div class="p-3 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
          <span class="material-symbols-outlined text-lg text-on-surface-variant/50">inventory_2</span>
          <span class="font-semibold text-on-surface">${query ? 'Tidak ada sepatu di stok cocok dengan "' + searchQuery + '"' : 'Belum ada stok sepatu dengan barcode'}</span>
          ${!query ? '<span class="text-[10px] text-on-surface-variant/70 leading-relaxed">Tambahkan sepatu melalui menu<br/><strong class="text-primary">+ Tambah Barang Masuk</strong></span>' : ''}
        </div>
      `;
      popup.classList.remove('hidden');
      return;
    }

    popup.innerHTML = `
      <div class="px-2.5 py-1.5 flex items-center justify-between border-b border-white/45 text-[10px] font-bold text-primary glass-panel bg-white/40 rounded-t-xl">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[13px]">inventory_2</span>
          <span>Stok Tersedia (${filtered.length} Sepatu)</span>
        </span>
        <span class="text-[9px] text-on-surface-variant font-normal">Pilih untuk auto-fill</span>
      </div>
      <div class="flex flex-col gap-0.5 py-1">
        ${filtered.map((p) => `
          <button 
            type="button" 
            class="btn-select-modal-stock w-full text-left p-2 rounded-xl glass-row flex items-center gap-2 transition-all active:scale-[0.99]" 
            data-barcode="${p.barcode}"
          >
            ${p.photo ? `
              <img src="${p.photo}" class="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/70" alt="Foto" />
            ` : ''}
            <div class="flex-1 min-w-0 flex flex-col">
              <span class="font-bold text-xs text-on-surface truncate">${p.name || 'Sepatu Tanpa Nama'}</span>
              <div class="flex items-center gap-1 text-[9px] text-on-surface-variant">
                <span class="font-mono font-bold glass-chip px-1 rounded text-primary">${p.barcode}</span>
                ${p.kondisi === 'Minus' ? '<span class="text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">Minus</span>' : '<span class="text-emerald-700 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">Bagus</span>'}
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-bold text-xs text-emerald-800 font-tabular block">
                ${p.sellPrice ? 'Rp ' + formatRupiah(p.sellPrice, '') : (p.buyPrice ? 'Rp ' + formatRupiah(p.buyPrice, '') : '-')}
              </span>
            </div>
          </button>
        `).join('')}
      </div>
    `;

    popup.classList.remove('hidden');

    popup.querySelectorAll('.btn-select-modal-stock').forEach((itemBtn) => {
      itemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedBarcode = itemBtn.getAttribute('data-barcode');
        const inputBarcode = document.getElementById('add-item-barcode');
        if (inputBarcode) {
          inputBarcode.value = selectedBarcode;
          inputBarcode.dispatchEvent(new Event('input', { bubbles: true }));
        }
        popup.classList.add('hidden');
      });
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'add-item-modal-backdrop') closeAddItemModal();
    if (e.target && (e.target.id === 'btn-close-add-item-modal' || e.target.closest('#btn-close-add-item-modal'))) closeAddItemModal();
    if (e.target && (e.target.id === 'btn-open-full-edit-from-modal' || e.target.closest('#btn-open-full-edit-from-modal'))) {
      const targetId = addItemTargetTrxId;
      closeAddItemModal();
      if (targetId) {
        router.navigate('tambah-transaksi', { editId: targetId, type: 'masuk', autoAddNewItem: true });
      }
    }
    if (e.target && (e.target.id === 'btn-toggle-modal-stock' || e.target.closest('#btn-toggle-modal-stock'))) {
      e.preventDefault();
      e.stopPropagation();
      const popup = document.getElementById('modal-stock-dropdown-popup');
      const bcInput = document.getElementById('add-item-barcode');
      if (popup) {
        if (popup.classList.contains('hidden')) {
          populateModalStockDropdown(bcInput ? bcInput.value.trim() : '');
          if (bcInput) bcInput.focus();
        } else {
          popup.classList.add('hidden');
        }
      }
    } else if (!e.target.closest('.modal-stock-dropdown-wrapper')) {
      const popup = document.getElementById('modal-stock-dropdown-popup');
      if (popup) popup.classList.add('hidden');
    }
  });

  // Helper validasi barcode untuk modal tambah barang
  function checkModalBarcodeConflict(barcode, targetTrxId) {
    if (!barcode || !barcode.trim() || barcode.trim().length < 2) return null;
    const clean = barcode.trim().toUpperCase();

    // 1. Cek apakah barcode sudah ada di dalam transaksi ini
    const trx = store.getTransactionById(targetTrxId);
    if (trx) {
      if (trx.barcode && trx.barcode.toString().trim().toUpperCase() === clean) {
        return `Peringatan: Barcode "${clean}" sudah ada di dalam transaksi ini!`;
      }
      if (trx.items && Array.isArray(trx.items)) {
        const found = trx.items.find((it) => it.barcode && it.barcode.toString().trim().toUpperCase() === clean);
        if (found) {
          return `Peringatan: Barcode "${clean}" sudah ada pada sepatu "${found.name || 'lain'}" di transaksi ini!`;
        }
      }
    }

    // 2. Cek apakah barcode sudah pernah terjual di transaksi lain
    const soldTrx = store.findSoldTransactionByBarcode(clean, targetTrxId);
    if (soldTrx) {
      const buyerInfo = soldTrx.buyer ? `ke ${soldTrx.buyer}` : '';
      const notaInfo = soldTrx.nota || 'transaksi lain';
      return `Peringatan: Sepatu dengan barcode "${clean}" SUDAH PERNAH TERJUAL pada ${notaInfo} ${buyerInfo}!`;
    }

    return null;
  }

  // Barcode lookup in modal
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'add-item-barcode') {
      const code = e.target.value.trim();
      const productInfo = document.getElementById('add-item-product-info');
      const nameEl = document.getElementById('add-item-product-name');
      const bcLabel = document.getElementById('add-item-product-barcode-label');
      const photoBox = document.getElementById('add-item-product-photo-box');
      const kondisiEl = document.getElementById('add-item-product-kondisi');
      const priceInput = document.getElementById('add-item-price');
      const warnBox = document.getElementById('add-item-barcode-warning');
      const warnText = document.getElementById('add-item-warning-text');
      const bcInput = e.target;

      populateModalStockDropdown(code);

      const conflictMsg = checkModalBarcodeConflict(code, addItemTargetTrxId);
      if (conflictMsg) {
        if (warnText) warnText.textContent = conflictMsg;
        if (warnBox) warnBox.classList.remove('hidden');
        if (productInfo) productInfo.classList.add('hidden');
        bcInput.classList.add('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
        bcInput.classList.remove('border-surface-container-high');
        return;
      } else {
        if (warnBox) warnBox.classList.add('hidden');
        bcInput.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
        bcInput.classList.add('border-surface-container-high');
      }

      if (code.length >= 2) {
        const prod = store.getProductByBarcode(code);
        if (prod && productInfo && nameEl) {
          nameEl.textContent = prod.name;
          if (bcLabel) bcLabel.textContent = prod.barcode;
          if (kondisiEl) {
            kondisiEl.textContent = prod.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus';
            kondisiEl.className = prod.kondisi === 'Minus'
              ? 'ml-auto shrink-0 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full'
              : 'ml-auto shrink-0 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full';
          }
          if (photoBox) {
            if (prod.photo) {
              photoBox.innerHTML = `<img src="${prod.photo}" class="w-full h-full object-cover" />`;
              photoBox.classList.remove('hidden');
            } else {
              photoBox.innerHTML = '';
              photoBox.classList.add('hidden');
            }
          }
          const finalPrice = prod.sellPrice || (prod.buyPrice ? Math.round(Number(prod.buyPrice) * 1.35) : 0);
          if (priceInput && finalPrice > 0) priceInput.value = formatRupiah(finalPrice, '');
          productInfo.classList.remove('hidden');
        } else if (productInfo) {
          productInfo.classList.add('hidden');
        }
      } else if (productInfo) {
        productInfo.classList.add('hidden');
      }
    }
    if (e.target && e.target.id === 'add-item-price') {
      const raw = parseRupiah(e.target.value);
      e.target.value = formatRupiah(raw, '');
    }
  });

  // Confirm add item
  document.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'btn-confirm-add-item' || e.target.closest('#btn-confirm-add-item'))) {
      if (!addItemTargetTrxId) return;
      const priceInput = document.getElementById('add-item-price');
      const bcInput = document.getElementById('add-item-barcode');
      const barcode = bcInput ? bcInput.value.trim() : '';

      // Validasi anti barcode dobel
      if (barcode) {
        const conflictMsg = checkModalBarcodeConflict(barcode, addItemTargetTrxId);
        if (conflictMsg) {
          showToast(conflictMsg, 'error', 4500);
          if (bcInput) bcInput.focus();
          return;
        }
      }

      const price = parseRupiah(priceInput ? priceInput.value : '0');
      if (price <= 0) { showToast('Masukkan harga jual barang tambahan', 'error'); return; }
      let prod = barcode ? store.getProductByBarcode(barcode) : null;

      const trx = store.getTransactionById(addItemTargetTrxId);
      if (!trx) { showToast('Transaksi tidak ditemukan', 'error'); return; }

      const newItem = { barcode: barcode || null, name: prod ? prod.name : null, kondisi: prod ? prod.kondisi : 'Bagus', price: price, photo: prod ? prod.photo : null };
      const existingItems = trx.items && trx.items.length > 0 ? [...trx.items] : [{ barcode: trx.barcode || null, name: trx.productName || null, kondisi: trx.kondisi || 'Bagus', price: trx.amount || 0, photo: trx.photo || null }];
      const updatedItems = [...existingItems, newItem];
      const newTotal = updatedItems.reduce((s, it) => s + (Number(it.price) || 0), 0);
      const newTitle = trx.buyer ? (trx.buyer + ' • ' + updatedItems.length + ' pasang sepatu') : (updatedItems.length + ' pasang sepatu');

      store.updateTransaction(addItemTargetTrxId, { items: updatedItems, amount: newTotal, itemCount: updatedItems.length, title: newTitle });
      showToast('Barang berhasil ditambahkan! Total: +' + formatRupiah(newTotal, ''), 'success');
      closeAddItemModal();
      updateKpiDisplay();
      renderItems();
    }
  });

  renderItems();
}

