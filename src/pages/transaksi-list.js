import { formatRupiah, parseRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function renderTransaksiListPage(store, filterType = 'all') {
  const summary = store.getBalanceSummary();
  const transactions = store.getTransactions();

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

        <!-- Button Catat Transaksi Baru -->
        <button 
          type="button" 
          id="btn-goto-tambah-trx"
          class="glass-primary glass-btn glass-sheen w-full h-12 text-primary-btn rounded-xl flex items-center justify-center gap-2 font-label-md text-sm active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span class="font-bold">+ Catat Transaksi Baru</span>
        </button>

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

        <!-- Segmented Type Tabs (Semua / Masuk / Keluar) -->
        <div class="glass-track p-1 rounded-xl flex items-center gap-1">
          <button 
            type="button" 
            data-tab="all" 
            class="tab-btn flex-1 py-1.5 px-2 rounded-lg ${filterType === 'all' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Semua</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-on-surface text-[10px] font-bold">${transactions.length}</span>
          </button>
          <button 
            type="button" 
            data-tab="masuk" 
            class="tab-btn flex-1 py-1.5 px-2 rounded-lg ${filterType === 'masuk' ? 'glass-seg-active text-emerald-800 font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Kas Masuk</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-emerald-800 text-[10px] font-bold">${summary.countMasuk}</span>
          </button>
          <button 
            type="button" 
            data-tab="keluar" 
            class="tab-btn flex-1 py-1.5 px-2 rounded-lg ${filterType === 'keluar' ? 'glass-seg-active text-rose-800 font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>Kas Keluar</span>
            <span class="px-1.5 py-0.2 rounded-full glass-chip text-rose-800 text-[10px] font-bold">${summary.countKeluar}</span>
          </button>
        </div>

        <!-- Transaction List Stream -->
        <div id="trx-stream-container" class="flex flex-col gap-2.5">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
}

export function initTransaksiListPage(router, store, initialFilter = 'all') {
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

  let currentFilter = initialFilter;
  let searchQuery = '';
  // Transaksi yang sedang dibuka breakdown-nya (agar tetap terbuka saat pencarian/filter berubah)
  const expandedTrx = new Set();

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
    if (!container) return;

    let list = store.getTransactions();

    if (currentFilter !== 'all') {
      list = list.filter((t) => t.type === currentFilter);
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

    container.innerHTML = list.map((trx) => {
      const isMasuk = trx.type === 'masuk';
      const isOpen = expandedTrx.has(trx.id);
      return `
        <div class="glass-card glass-sheen rounded-xl p-3.5 flex flex-col gap-2 hover:border-white/80 transition-all">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              ${trx.photo ? `
                <img src="${trx.photo}" alt="Foto Sepatu" class="w-10 h-10 rounded-xl object-cover shrink-0 border border-surface-container-high shadow-sm" />
              ` : `
                <div class="w-10 h-10 rounded-xl ${isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[20px]">${isMasuk ? 'arrow_downward' : 'arrow_upward'}</span>
                </div>
              `}
              <div class="flex flex-col min-w-0">
                <span class="font-title-ledger text-sm font-bold text-on-surface truncate">${trx.title}</span>
                
                <!-- Metadata Badges: Buyer, Ongkir, Barcode -->
                <div class="flex items-center gap-1.5 text-on-surface-variant text-[11px] mt-0.5 flex-wrap">
                  ${trx.buyer ? `
                    <span class="px-1.5 py-0.2 rounded glass-chip text-on-secondary-fixed font-bold text-[10px] flex items-center gap-0.5">
                      <span class="material-symbols-outlined text-[11px]">person</span>
                      <span>${trx.buyer}</span>
                    </span>
                  ` : ''}

                  ${trx.ongkir ? `
                    <span class="px-1.5 py-0.2 rounded font-bold text-[10px] glass-chip ${trx.ongkir === 'FO' ? 'text-emerald-900' : (trx.ongkir === 'COD' ? 'text-amber-900' : 'text-orange-900')}">
                      ${trx.ongkir}
                    </span>
                  ` : ''}

                  ${trx.kondisi ? `
                    <span class="px-1.5 py-0.2 rounded font-bold text-[10px] glass-chip ${trx.kondisi === 'Minus' ? 'text-amber-800' : 'text-emerald-800'}">
                      ${trx.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
                    </span>
                  ` : ''}

                  ${!isMasuk && trx.category ? `
                    <span class="px-1.5 py-0.2 rounded glass-chip text-rose-900 font-bold text-[10px]">
                      ${trx.category}
                    </span>
                  ` : ''}

                  <span class="text-on-surface-variant/70 text-[10px]">${trx.date ? (() => { try { const d = new Date(trx.date + 'T00:00:00'); return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' \u2022 '; } catch(e) { return trx.date + ' \u2022 '; } })() : ''}${trx.time}</span>
                </div>

                ${trx.note ? `
                  <span class="text-[10px] text-on-surface-variant italic mt-0.5 block truncate">
                    Note: ${trx.note}
                  </span>
                ` : ''}
              </div>
            </div>

            <div class="flex flex-col items-end shrink-0 pl-1">
              <span class="font-currency-item text-sm font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">
                ${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}
              </span>
              <div class="flex items-center gap-1 mt-1">
                ${isMasuk ? `
                  <button
                    type="button"
                    data-add-item-trx="${trx.id}"
                    class="glass-emerald glass-btn inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-emerald-700 text-xs font-semibold"
                    title="Tambah Barang ke Transaksi Ini"
                  >
                    <span class="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                    <span>+ Barang</span>
                  </button>
                ` : ''}
                <button 
                  type="button" 
                  data-edit-trx="${trx.id}"
                  data-type="${trx.type}"
                  class="glass-chip-btn inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-primary text-xs font-semibold"
                  title="Edit Transaksi"
                >
                  <span class="material-symbols-outlined text-[14px]">edit</span>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  data-delete-trx="${trx.id}"
                  class="glass-rose glass-btn inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-rose-700 text-xs font-semibold"
                  title="Hapus Transaksi"
                >
                  <span class="material-symbols-outlined text-[14px]">delete</span>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Breakdown Toggle: klik untuk buka/tutup rincian sepatu terjual -->
          ${trx.items && trx.items.length > 0 ? `
            <button
              type="button"
              class="btn-toggle-items-breakdown w-full flex items-center justify-between gap-2 text-xs pt-2 border-t border-white/45 active:scale-[0.99] transition-all"
              data-target="breakdown-${trx.id}"
              data-trx-id="${trx.id}"
              aria-expanded="${isOpen ? 'true' : 'false'}"
              aria-controls="breakdown-${trx.id}"
            >
              <span class="flex items-center gap-1.5 min-w-0">
                <span class="material-symbols-outlined text-[16px] text-primary">receipt_long</span>
                <span class="font-bold text-primary">Breakdown</span>
                <span class="text-on-surface-variant truncate">• ${trx.items.length} Pasang • ${trx.paymentMethod || 'Tunai'}</span>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <span class="text-on-surface-variant">Total:</span>
                <span class="font-currency-item text-base font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}</span>
                <span class="chevron-icon material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}">expand_more</span>
              </span>
            </button>

            <!-- Rincian Sepatu Terjual (tersembunyi sampai tombol Breakdown diklik) -->
            <div id="breakdown-${trx.id}" class="trx-items-breakdown ${isOpen ? '' : 'hidden'} glass-panel rounded-xl p-2.5 flex flex-col gap-2 text-xs">
              ${trx.items.map((it) => `
                <div class="flex items-start gap-2.5">
                  ${it.photo ? `
                    <img src="${it.photo}" alt="Foto Sepatu" class="w-12 h-12 rounded-lg object-cover border border-white/70 shrink-0" />
                  ` : ''}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-on-surface truncate">${(Number(it.qty) || 1)}x ${it.name || 'Sepatu Tanpa Nama'}</span>
                      <span class="font-bold font-tabular text-primary ml-2">${formatRupiah((Number(it.price) || 0) * (Number(it.qty) || 1))}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                      ${it.barcode ? `
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded glass-chip text-on-surface text-[10px] font-mono font-bold">
                          <span class="material-symbols-outlined text-[12px] text-primary">qr_code</span>
                          <span>${it.barcode}</span>
                        </span>
                      ` : ''}
                      ${it.kondisi ? `
                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold glass-chip ${it.kondisi === 'Minus' ? 'text-amber-900' : 'text-emerald-900'}">
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
    }).join('');

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
    if (e.target && e.target.id === 'btn-close-add-item-modal') closeAddItemModal();
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

