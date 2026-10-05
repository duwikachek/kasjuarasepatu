import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function renderLaporanStockPage(store) {
  const shop = store.getShop ? store.getShop() : { name: 'Kas Juara Sepatu', subName: 'Cengkareng Jakarta Barat' };
  const report = store.getRealtimeStockReport();
  const summary = report.summary;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-28" id="laporan-stock-page">
      ${renderHeader({
        title: 'Laporan Sisa Stock',
        badge: 'REAL-TIME',
        subtitle: 'Total Sisa Sepatu Belum Terjual',
        showBack: true,
        backRoute: 'laporan'
      })}

      <div class="flex flex-col w-full px-4 pt-3 gap-3.5">
        
        <!-- Live Real-Time Banner -->
        <section class="glass-card glass-sheen rounded-2xl p-3.5 flex items-center justify-between border border-emerald-500/30">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative flex items-center justify-center shrink-0">
              <span class="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 relative"></span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Real-Time Live Stock</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">AKTIF</span>
              </span>
              <span class="text-[11px] text-neutral-400 truncate mt-0.5">
                Sinkron otomatis saat transaksi atau belanja bertambah
              </span>
            </div>
          </div>
          <span id="stock-live-time" class="text-[11px] font-mono text-emerald-400 shrink-0 font-bold bg-neutral-900/60 px-2 py-1 rounded-lg border border-neutral-700/60">
            ${summary.lastUpdated}
          </span>
        </section>

        <!-- KPI 4 Cards: Sisa Pasang, Nilai Modal Aset, Potensi Omset, Potensi Laba -->
        <section class="grid grid-cols-2 gap-2.5">
          <!-- Card 1: Total Sisa Pasang -->
          <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col justify-between border-t-2 border-emerald-500">
            <div class="flex items-center justify-between text-neutral-400 text-xs">
              <span class="font-bold text-[11px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">inventory_2</span>
                Sisa Belum Terjual
              </span>
            </div>
            <div class="mt-2 mb-1">
              <div class="flex items-baseline gap-1">
                <span id="stat-total-sisa-pasang" class="text-2xl font-extrabold text-white font-tabular">${summary.totalSisaPasang}</span>
                <span class="text-xs font-bold text-emerald-400">Pasang</span>
              </div>
              <span id="stat-total-varian" class="text-[10px] text-neutral-400 block mt-0.5">${summary.totalVarianSisa} Model / Varian Tersedia</span>
            </div>
          </div>

          <!-- Card 2: Nilai Modal Aset Tertahan (HPP) -->
          <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col justify-between border-t-2 border-primary">
            <div class="flex items-center justify-between text-neutral-400 text-xs">
              <span class="font-bold text-[11px] uppercase tracking-wider text-primary flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                Modal Aset Stok
              </span>
            </div>
            <div class="mt-2 mb-1">
              <span id="stat-total-nilai-modal" class="text-lg font-bold text-white font-tabular block truncate">
                ${formatRupiah(summary.totalNilaiAsetModal)}
              </span>
              <span class="text-[10px] text-neutral-400 block mt-0.5">Uang modal tertahan di stok</span>
            </div>
          </div>

          <!-- Card 3: Potensi Omset Penjualan -->
          <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col justify-between border-t-2 border-cyan-500">
            <div class="flex items-center justify-between text-neutral-400 text-xs">
              <span class="font-bold text-[11px] uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">payments</span>
                Potensi Omset
              </span>
            </div>
            <div class="mt-2 mb-1">
              <span id="stat-total-potensi-omset" class="text-lg font-bold text-cyan-300 font-tabular block truncate">
                ${formatRupiah(summary.totalPotensiOmset)}
              </span>
              <span class="text-[10px] text-neutral-400 block mt-0.5">Jika seluruh sisa terjual</span>
            </div>
          </div>

          <!-- Card 4: Potensi Laba Kotor -->
          <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col justify-between border-t-2 border-amber-500">
            <div class="flex items-center justify-between text-neutral-400 text-xs">
              <span class="font-bold text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px]">trending_up</span>
                Potensi Laba
              </span>
            </div>
            <div class="mt-2 mb-1">
              <span id="stat-total-potensi-laba" class="text-lg font-bold text-amber-300 font-tabular block truncate">
                +${formatRupiah(summary.totalPotensiLaba)}
              </span>
              <span id="stat-avg-margin" class="text-[10px] text-amber-400/90 block mt-0.5">Rata-rata Margin: ~${summary.avgMarginPercent}%</span>
            </div>
          </div>
        </section>

        <!-- Condition & Health Breakdown Section -->
        <section class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-emerald-400">donut_large</span>
              Komposisi & Kesehatan Kondisi Stok
            </span>
            <span class="text-[10px] text-neutral-400">Total Masuk: <b class="text-neutral-200">${summary.totalMasukSemua} psg</b> • Terjual: <b class="text-emerald-400">${summary.totalTerjualSemua} psg</b></span>
          </div>

          <!-- Visual Multi-segment Progress Bar -->
          <div class="h-3 w-full bg-neutral-900 rounded-full overflow-hidden flex shadow-inner" id="stock-health-bar">
            <!-- Rendered dynamically -->
          </div>

          <!-- Legend Badges -->
          <div class="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div class="glass-panel rounded-xl p-2 flex flex-col items-center text-center">
              <span class="text-[10px] text-neutral-400 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Kondisi Bagus
              </span>
              <span id="stat-count-bagus" class="font-bold text-emerald-400 font-tabular mt-0.5 text-xs">${summary.countKondisiBagus} Pasang</span>
            </div>

            <div class="glass-panel rounded-xl p-2 flex flex-col items-center text-center">
              <span class="text-[10px] text-neutral-400 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-amber-400"></span> Kondisi Minus
              </span>
              <span id="stat-count-minus" class="font-bold text-amber-400 font-tabular mt-0.5 text-xs">${summary.countKondisiMinus} Pasang</span>
            </div>

            <div class="glass-panel rounded-xl p-2 flex flex-col items-center text-center">
              <span class="text-[10px] text-neutral-400 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span> Stok Menipis (&le;2)
              </span>
              <span id="stat-count-menipis" class="font-bold text-rose-400 font-tabular mt-0.5 text-xs">${summary.countStokMenipis} Model</span>
            </div>
          </div>
        </section>

        <!-- Search & Filter Controls -->
        <section class="flex flex-col gap-2.5">
          <!-- Search Bar -->
          <div class="relative w-full">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <span class="material-symbols-outlined text-[19px]">search</span>
            </div>
            <input 
              type="text" 
              id="stock-search-input"
              placeholder="Cari barcode, nama sepatu, suplier..." 
              class="glass-input w-full pl-10 pr-9 py-2.5 text-white font-body-md text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all placeholder:text-neutral-500"
            />
            <button type="button" id="btn-clear-search" class="hidden absolute right-2.5 top-2.5 text-neutral-400 hover:text-white p-0.5">
              <span class="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          </div>

          <!-- Filter Pills (Semua, Bagus, Minus, Menipis, Habis) -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" id="stock-filter-pills">
            <button type="button" data-filter="all" class="stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-dark text-white ring-1 ring-emerald-500/50">
              Semua Sisa (<span id="pill-count-all">${summary.totalVarianSisa}</span>)
            </button>
            <button type="button" data-filter="bagus" class="stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-chip-btn text-neutral-300">
              ✓ Bagus (<span id="pill-count-bagus">${summary.countKondisiBagus}</span>)
            </button>
            <button type="button" data-filter="minus" class="stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-chip-btn text-neutral-300">
              ⚠ Minus (<span id="pill-count-minus">${summary.countKondisiMinus}</span>)
            </button>
            <button type="button" data-filter="menipis" class="stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-chip-btn text-neutral-300">
              ⚡ Stok Menipis (&le;2)
            </button>
            <button type="button" data-filter="habis" class="stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-chip-btn text-neutral-300">
              Terjual Habis
            </button>
          </div>

          <!-- Sort Select Row -->
          <div class="flex items-center justify-between text-xs text-neutral-400 px-0.5">
            <span id="stock-items-count-label" class="font-semibold text-neutral-300">Menampilkan ${report.unsoldItems.length} model sepatu</span>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">sort</span>
              <select id="stock-sort-select" class="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option value="sisa-desc">Sisa Terbanyak</option>
                <option value="sisa-asc">Sisa Tersedikit</option>
                <option value="modal-desc">Modal Tertinggi</option>
                <option value="laba-desc">Potensi Untung Tertinggi</option>
                <option value="nama-asc">Nama A-Z</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Unsold Stock Items List Container -->
        <div id="stock-items-container" class="flex flex-col gap-2.5">
          <!-- Populated dynamically via JS -->
        </div>

        <!-- Action Bar: Print & Download Report -->
        <section class="grid grid-cols-2 gap-2.5 pt-2">
          <button 
            type="button" 
            id="btn-print-stock"
            class="glass-card glass-sheen h-12 rounded-xl text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[19px] text-emerald-400">print</span>
            <span>Cetak Slip Stok</span>
          </button>

          <button 
            type="button" 
            id="btn-export-csv"
            class="glass-card glass-sheen h-12 rounded-xl text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[19px] text-cyan-400">download</span>
            <span>Ekspor Data CSV</span>
          </button>
        </section>

      </div>
    </div>
  `;
}

export function initLaporanStockPage(router, store) {
  bindHeaderEvents(router);

  let currentFilter = 'all'; // 'all' | 'bagus' | 'minus' | 'menipis' | 'habis'
  let searchQuery = '';
  let currentSort = 'sisa-desc';

  function g(id) {
    return document.getElementById(id);
  }

  function updateDisplay() {
    const report = store.getRealtimeStockReport();
    const summary = report.summary;

    // Update Live Timestamp
    const elTime = g('stock-live-time');
    if (elTime) elTime.textContent = summary.lastUpdated;

    // Update Summary Stats
    const elSisa = g('stat-total-sisa-pasang');
    if (elSisa) elSisa.textContent = summary.totalSisaPasang;

    const elVarian = g('stat-total-varian');
    if (elVarian) elVarian.textContent = `${summary.totalVarianSisa} Model / Varian Tersedia`;

    const elModal = g('stat-total-nilai-modal');
    if (elModal) elModal.textContent = formatRupiah(summary.totalNilaiAsetModal);

    const elOmset = g('stat-total-potensi-omset');
    if (elOmset) elOmset.textContent = formatRupiah(summary.totalPotensiOmset);

    const elLaba = g('stat-total-potensi-laba');
    if (elLaba) elLaba.textContent = `+${formatRupiah(summary.totalPotensiLaba)}`;

    const elMargin = g('stat-avg-margin');
    if (elMargin) elMargin.textContent = `Rata-rata Margin: ~${summary.avgMarginPercent}%`;

    const elBagus = g('stat-count-bagus');
    if (elBagus) elBagus.textContent = `${summary.countKondisiBagus} Pasang`;

    const elMinus = g('stat-count-minus');
    if (elMinus) elMinus.textContent = `${summary.countKondisiMinus} Pasang`;

    const elMenipis = g('stat-count-menipis');
    if (elMenipis) elMenipis.textContent = `${summary.countStokMenipis} Model`;

    // Update Pill Badges
    const pAll = g('pill-count-all');
    if (pAll) pAll.textContent = summary.totalVarianSisa;
    const pBagus = g('pill-count-bagus');
    if (pBagus) pBagus.textContent = summary.countKondisiBagus;
    const pMinus = g('pill-count-minus');
    if (pMinus) pMinus.textContent = summary.countKondisiMinus;

    // Update Progress Bar
    const barEl = g('stock-health-bar');
    if (barEl) {
      const total = summary.totalSisaPasang || 1;
      const pctBagus = ((summary.countKondisiBagus / total) * 100).toFixed(1);
      const pctMinus = ((summary.countKondisiMinus / total) * 100).toFixed(1);

      if (summary.totalSisaPasang === 0) {
        barEl.innerHTML = `<div class="w-full h-full bg-neutral-800 text-[10px] text-neutral-500 flex items-center justify-center">Semua stok habis terjual</div>`;
      } else {
        barEl.innerHTML = `
          <div class="h-full bg-emerald-500 transition-all duration-300" style="width: ${pctBagus}%" title="Bagus: ${summary.countKondisiBagus} psg (${pctBagus}%)"></div>
          <div class="h-full bg-amber-500 transition-all duration-300" style="width: ${pctMinus}%" title="Minus: ${summary.countKondisiMinus} psg (${pctMinus}%)"></div>
        `;
      }
    }

    // Filter Items
    let items = report.items;

    if (currentFilter === 'all') {
      items = items.filter((it) => it.sisaStock > 0);
    } else if (currentFilter === 'bagus') {
      items = items.filter((it) => it.sisaStock > 0 && it.kondisi !== 'Minus');
    } else if (currentFilter === 'minus') {
      items = items.filter((it) => it.sisaStock > 0 && it.kondisi === 'Minus');
    } else if (currentFilter === 'menipis') {
      items = items.filter((it) => it.sisaStock > 0 && it.sisaStock <= 2);
    } else if (currentFilter === 'habis') {
      items = items.filter((it) => it.sisaStock === 0);
    }

    // Search Filter
    if (searchQuery) {
      items = items.filter((it) => {
        const q = searchQuery.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          it.barcode.toLowerCase().includes(q) ||
          (it.supplier && it.supplier.toLowerCase().includes(q)) ||
          (it.catatanMinus && it.catatanMinus.toLowerCase().includes(q))
        );
      });
    }

    // Sort Items
    items.sort((a, b) => {
      switch (currentSort) {
        case 'sisa-asc':
          return a.sisaStock - b.sisaStock;
        case 'modal-desc':
          return (b.sisaStock * b.buyPrice) - (a.sisaStock * a.buyPrice);
        case 'laba-desc':
          return b.potensiLaba - a.potensiLaba;
        case 'nama-asc':
          return a.name.localeCompare(b.name);
        case 'sisa-desc':
        default:
          return b.sisaStock - a.sisaStock;
      }
    });

    const countLabel = g('stock-items-count-label');
    if (countLabel) {
      countLabel.textContent = `Menampilkan ${items.length} model sepatu`;
    }

    // Render Cards
    const container = g('stock-items-container');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="glass-card rounded-2xl p-8 flex flex-col items-center gap-2 text-center text-neutral-400">
          <span class="material-symbols-outlined text-4xl text-neutral-600">inventory_2</span>
          <p class="font-bold text-sm text-neutral-300">Tidak ada sisa stok ditemukan</p>
          <p class="text-xs text-neutral-500">Coba ubah kata kunci pencarian atau ganti filter kategori.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item, idx) => {
      const isMinus = item.kondisi === 'Minus';
      const isMenipis = item.sisaStock > 0 && item.sisaStock <= 2;
      const isHabis = item.sisaStock === 0;

      let badgeStockClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      if (isHabis) {
        badgeStockClass = 'bg-neutral-800 text-neutral-500 border border-neutral-700';
      } else if (isMenipis) {
        badgeStockClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse';
      }

      return `
        <div class="glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all hover:border-neutral-600" data-stock-barcode="${item.barcode}">
          
          <!-- Top Row: Photo, Info, Sisa Qty Badge -->
          <div class="flex items-start gap-3">
            <!-- Thumbnail Photo -->
            <div class="w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700/60 shrink-0 relative flex items-center justify-center">
              ${item.photo ? `
                <img src="${item.photo}" alt="${item.name}" class="w-full h-full object-cover" />
              ` : `
                <span class="material-symbols-outlined text-[28px] text-neutral-600">roller_skating</span>
              `}
              ${isMinus ? `
                <span class="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-neutral-900" title="Minus"></span>
              ` : ''}
            </div>

            <!-- Details -->
            <div class="flex-1 min-w-0 flex flex-col">
              <div class="flex items-start justify-between gap-1">
                <h4 class="font-bold text-xs sm:text-sm text-white truncate leading-snug">${item.name}</h4>
                <!-- Sisa Badge -->
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-extrabold font-tabular ${badgeStockClass}">
                  ${isHabis ? 'Habis (0)' : `Sisa ${item.sisaStock} psg`}
                </span>
              </div>

              <!-- Barcode & Condition Row -->
              <div class="flex items-center gap-1.5 flex-wrap mt-1">
                <span class="font-mono text-[10px] text-neutral-300 bg-neutral-900/80 border border-neutral-700/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <span class="material-symbols-outlined text-[11px] text-emerald-400">qr_code</span>
                  <span>${item.barcode}</span>
                </span>

                ${isMinus ? `
                  <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <span class="material-symbols-outlined text-[11px]">warning</span>
                    <span>Minus: ${item.catatanMinus || 'Cacat Ringan'}</span>
                  </span>
                ` : `
                  <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                    <span>✓ Kondisi Bagus</span>
                  </span>
                `}
              </div>

              <!-- Supplier & Supply Date -->
              <div class="flex items-center gap-2 text-[10px] text-neutral-400 mt-1">
                <span class="truncate">${item.supplier || 'Suplier Umum'}</span>
                ${item.lastSupplyDate ? `<span>• Masuk: ${item.lastSupplyDate}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Bottom Metric Breakdown Strip -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 bg-neutral-900/40 rounded-xl p-2 text-xs">
            <div class="flex flex-col">
              <span class="text-[10px] text-neutral-400">Harga Modal</span>
              <span class="font-bold text-neutral-200 font-tabular">${formatRupiah(item.buyPrice)}</span>
              <span class="text-[9px] text-neutral-500">Aset: ${formatRupiah(item.totalNilaiBeli)}</span>
            </div>

            <div class="flex flex-col">
              <span class="text-[10px] text-neutral-400">Harga Jual</span>
              <span class="font-bold text-cyan-300 font-tabular">${formatRupiah(item.sellPrice)}</span>
              <span class="text-[9px] text-neutral-500">Omset: ${formatRupiah(item.totalNilaiJual)}</span>
            </div>

            <div class="flex flex-col">
              <span class="text-[10px] text-neutral-400">Potensi Untung</span>
              <span class="font-bold text-amber-300 font-tabular">+${formatRupiah(item.potensiLaba)}</span>
              <span class="text-[9px] text-emerald-400 font-semibold">Margin ~${item.marginPercent}%</span>
            </div>
          </div>

          <!-- Quick Cashier Action -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] text-neutral-400">
              Riwayat: Masuk <b class="text-neutral-200">${item.totalMasuk}</b> • Terjual <b class="text-emerald-400">${item.totalTerjual}</b>
            </span>

            ${item.sisaStock > 0 ? `
              <button 
                type="button" 
                class="btn-quick-sell px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1 active:scale-95 transition-all"
                data-barcode="${item.barcode}"
                data-name="${item.name}"
                data-price="${item.sellPrice}"
              >
                <span class="material-symbols-outlined text-[15px]">point_of_sale</span>
                <span>Jual di Kasir</span>
              </button>
            ` : `
              <span class="text-[10px] text-neutral-500 italic">Stok sudah habis</span>
            `}
          </div>

        </div>
      `;
    }).join('');

    // Bind Quick Sell Buttons
    container.querySelectorAll('.btn-quick-sell').forEach((btn) => {
      btn.addEventListener('click', () => {
        const barcode = btn.getAttribute('data-barcode');
        router.navigate('tambah-transaksi', {
          barcode,
          type: 'masuk'
        });
      });
    });
  }

  // Filter Pills click events
  document.querySelectorAll('.stock-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.stock-pill').forEach((b) => {
        b.className = 'stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-chip-btn text-neutral-300';
      });
      btn.className = 'stock-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all glass-dark text-white ring-1 ring-emerald-500/50';
      updateDisplay();
    });
  });

  // Search Input events
  const searchInput = g('stock-search-input');
  const btnClearSearch = g('btn-clear-search');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (btnClearSearch) {
        btnClearSearch.classList.toggle('hidden', !searchQuery);
      }
      updateDisplay();
    });
  }

  if (btnClearSearch && searchInput) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      btnClearSearch.classList.add('hidden');
      updateDisplay();
      searchInput.focus();
    });
  }

  // Sort Select event
  const sortSelect = g('stock-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      updateDisplay();
    });
  }

  // Print Stock Slip
  const btnPrint = g('btn-print-stock');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Export CSV
  const btnExport = g('btn-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const report = store.getRealtimeStockReport();
      const rows = [
        ['Barcode', 'Nama Sepatu', 'Kondisi', 'Catatan Minus', 'Total Masuk', 'Terjual', 'Sisa Stok (Psg)', 'Harga Beli (Modal)', 'Total Nilai Aset Modal', 'Harga Jual', 'Total Potensi Omset', 'Potensi Laba', 'Suplier', 'Tanggal Masuk']
      ];

      report.items.forEach((it) => {
        rows.push([
          `"${it.barcode}"`,
          `"${it.name.replace(/"/g, '""')}"`,
          `"${it.kondisi}"`,
          `"${(it.catatanMinus || '').replace(/"/g, '""')}"`,
          it.totalMasuk,
          it.totalTerjual,
          it.sisaStock,
          it.buyPrice,
          it.totalNilaiBeli,
          it.sellPrice,
          it.totalNilaiJual,
          it.potensiLaba,
          `"${(it.supplier || '').replace(/"/g, '""')}"`,
          `"${it.lastSupplyDate || ''}"`
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Laporan_Sisa_Stock_KasJuara_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Data sisa stock berhasil diunduh (CSV)', 'success');
    });
  }

  // Real-time listener: Otomatis perbarui tampilan saat state berubah (misal ada transaksi baru)
  const unsubscribe = store.subscribe(() => {
    updateDisplay();
  });

  // Cleanup subscription saat meninggalkan halaman
  window.addEventListener('hashchange', function onLeave() {
    if (!window.location.hash.includes('laporan-stock')) {
      unsubscribe();
      window.removeEventListener('hashchange', onLeave);
    }
  });

  // Initial render
  updateDisplay();
}
