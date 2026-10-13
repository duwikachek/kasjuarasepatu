import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function renderBarangMasukListPage(store, filterStatus = 'all', isAdmin = true) {
  const supplies = store.getSupplies();
  
  const stockReport = store.getRealtimeStockReport ? store.getRealtimeStockReport() : { summary: { totalSisaPasang: 0 } };
  const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalItems = supplies.reduce((sum, s) => sum + (Number(s.itemsCount) || 0), 0);
  const totalSisa = stockReport.summary.totalSisaPasang;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Belanja & Stock',
        badge: 'Stock Toko',
        subtitle: 'Daftar Belanja & Stock Sepatu'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-3">
        <!-- KPI Belanja & Sisa Stock Cards -->
        <section class="grid grid-cols-2 gap-2">
          <div class="glass-card glass-sheen rounded-lg p-2.5 flex flex-col justify-between">
            <span class="font-label-sm text-[11px] text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
              Total Belanja
            </span>
            <div class="mt-1.5">
              <span id="kpi-total-belanja" class="font-headline-sm text-sm font-bold text-primary block font-tabular">
                ${formatRupiah(totalBelanja)}
              </span>
              <span id="kpi-count-belanja" class="font-body-sm text-[10px] text-on-surface-variant mt-0.5 block">${supplies.length} Transaksi Belanja</span>
            </div>
          </div>

          <div class="glass-card glass-sheen rounded-lg p-2.5 flex flex-col justify-between border-t-2 border-emerald-500">
            <span class="font-label-sm text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-emerald-400">inventory_2</span>
              Sisa Stok Real-Time
            </span>
            <div class="mt-1.5">
              <span id="kpi-total-items" class="font-headline-sm text-sm font-bold text-white block font-tabular">
                ${totalSisa} Pasang
              </span>
              <span class="font-body-sm text-[10px] text-emerald-400/90 mt-0.5 block">Belum Terjual (${totalItems} Masuk)</span>
            </div>
          </div>
        </section>

        <!-- Action Buttons: Belanja Baru, Laporan Sisa Stock, Stock Opname -->
        <div class="grid grid-cols-2 gap-2">
          ${isAdmin ? `<button 
            type="button" 
            id="btn-goto-tambah-pasok"
            class="glass-primary glass-btn glass-sheen h-10 text-primary-btn rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] sm:text-xs active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[16px]">add_box</span>
            <span class="font-bold">+ Belanja Baru</span>
          </button>` : `<div class="h-10 rounded-lg glass-panel flex items-center justify-center gap-1 font-label-md text-[10px] text-on-surface-variant">
            <span class="material-symbols-outlined text-[13px]">visibility</span>
            <span>Mode Lihat Saja</span>
          </div>`}
          <button 
            type="button" 
            id="btn-goto-laporan-stock"
            class="glass-card glass-sheen h-10 border border-emerald-500/50 hover:border-emerald-500 rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] sm:text-xs text-emerald-300 active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[16px] text-emerald-400">analytics</span>
            <span class="font-bold">Laporan Sisa Stok</span>
          </button>
        </div>

        ${isAdmin ? `<button 
          type="button" 
          id="btn-goto-stock-opname"
          class="glass-card glass-sheen h-9 border border-neutral-700/60 hover:border-neutral-500 rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] text-neutral-300 active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-[14px] text-emerald-400">fact_check</span>
          <span>Stock Opname (Cek Fisik Sepatu)</span>
        </button>` : ''}

        <!-- Search Bar -->
        <div class="relative w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">search</span>
          </div>
          <input 
            type="text" 
            id="pasok-search-input"
            placeholder="Cari barcode, nama sepatu, suplier..." 
            class="glass-input w-full pl-9 pr-3 py-2 text-on-surface font-body-md text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
          />
        </div>

        <!-- Filter Segmented Tabs -->
        <div class="glass-track p-1 rounded-lg flex items-center gap-1">
          <button type="button" data-filter="all" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'all' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Semua
          </button>
          <button type="button" data-filter="lunas" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'lunas' ? 'glass-seg-active text-emerald-800 font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Lunas
          </button>
          <button type="button" data-filter="tempo" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'tempo' ? 'glass-seg-active text-amber-800 font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Tempo / Bon
          </button>
        </div>

        <!-- Invoices/Belanja List Container -->
        <div id="pasok-list-container" class="flex flex-col gap-2">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
}

export function initBarangMasukListPage(router, store, initialFilter = 'all', isAdmin = true) {
  bindHeaderEvents(router);

  let currentFilter = initialFilter;
  let searchQuery = '';
  // Nota yang sedang dibuka rinciannya (agar tetap terbuka saat pencarian/filter berubah)
  const expandedSupplies = new Set();

  const addBtn = document.getElementById('btn-goto-tambah-pasok');
  if (addBtn) {
    addBtn.addEventListener('click', () => router.navigate('tambah-pasok'));
  }

  const laporanStockBtn = document.getElementById('btn-goto-laporan-stock');
  if (laporanStockBtn) {
    laporanStockBtn.addEventListener('click', () => router.navigate('laporan-stock'));
  }

  const opnameBtn = document.getElementById('btn-goto-stock-opname');
  if (opnameBtn) {
    opnameBtn.addEventListener('click', () => router.navigate('stock-opname'));
  }

  const searchInput = document.getElementById('pasok-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderItems();
    });
  }

  document.querySelectorAll('.pasok-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.pasok-filter-btn').forEach((b) => {
        b.className = 'pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center';
      });
      btn.className = 'pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg glass-seg-active text-on-surface font-bold font-label-md text-xs transition-all text-center';
      renderItems();
    });
  });

  function updateKpi() {
    const supplies = store.getSupplies();
    const stockReport = store.getRealtimeStockReport ? store.getRealtimeStockReport() : { summary: { totalSisaPasang: 0 } };
    const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalSisa = stockReport.summary.totalSisaPasang;

    const elTotal = document.getElementById('kpi-total-belanja');
    const elCount = document.getElementById('kpi-count-belanja');
    const elItems = document.getElementById('kpi-total-items');

    if (elTotal) elTotal.textContent = formatRupiah(totalBelanja);
    if (elCount) elCount.textContent = `${supplies.length} Transaksi Belanja`;
    if (elItems) elItems.textContent = `${totalSisa} Pasang`;
  }

  function renderItems() {
    const container = document.getElementById('pasok-list-container');
    if (!container) return;

    let list = store.getSupplies();

    if (currentFilter !== 'all') {
      list = list.filter((s) => s.status === currentFilter);
    }

    if (searchQuery) {
      list = list.filter((s) => {
        return (
          s.invoiceNo.toLowerCase().includes(searchQuery) ||
          s.supplierName.toLowerCase().includes(searchQuery) ||
          (s.items && s.items.some((item) => 
            item.name.toLowerCase().includes(searchQuery) || 
            (item.barcode && item.barcode.toLowerCase().includes(searchQuery))
          ))
        );
      });
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center glass-card glass-sheen rounded-2xl text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">inventory_2</span>
          <p class="font-title-ledger text-sm font-semibold">Tidak ada data belanja / stock</p>
          <p class="font-body-sm text-xs mt-1">Coba ubah kata kunci atau catat belanja baru.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((supply) => {
      const isLunas = supply.status === 'lunas';
      const isOpen = expandedSupplies.has(supply.id);
      return `
        <div class="glass-card glass-sheen rounded-xl p-2.5 flex flex-col gap-1.5">
          <!-- Top Row: ID Belanja & Status Badge -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-[16px]">shopping_bag</span>
              <span class="font-title-ledger text-xs font-bold text-on-surface">${supply.invoiceNo}</span>
            </div>
            <span class="font-label-sm text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider glass-chip ${isLunas ? 'text-emerald-800' : 'text-amber-800'}">
              ${isLunas ? 'Lunas' : 'Tempo / Bon'}
            </span>
          </div>

          <!-- Supplier & Date -->
          <div class="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span class="font-semibold text-on-surface truncate">${supply.supplierName}</span>
            <span class="shrink-0 ml-2">${supply.date}</span>
          </div>

          <!-- Breakdown Toggle: klik untuk buka/tutup rincian barang nota ini -->
          <button
            type="button"
            class="pasok-breakdown-btn w-full flex items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-white/45 active:scale-[0.99] transition-all"
            data-target="detail-${supply.id}"
            data-supply-id="${supply.id}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="detail-${supply.id}"
          >
            <span class="flex items-center gap-1 min-w-0">
              <span class="material-symbols-outlined text-[14px] text-primary">receipt_long</span>
              <span class="font-bold text-primary">Breakdown</span>
              <span class="text-on-surface-variant truncate">• ${supply.itemsCount || 1} Pasang • ${supply.paymentMethod || 'Tunai'}</span>
            </span>
            <span class="flex items-center gap-1 shrink-0">
              <span class="text-on-surface-variant">Total:</span>
              <span class="font-currency-item text-xs font-bold text-primary font-tabular">${formatRupiah(supply.totalAmount)}</span>
              <span class="pasok-breakdown-chevron material-symbols-outlined text-[14px] text-on-surface-variant">${isOpen ? 'expand_less' : 'expand_more'}</span>
            </span>
          </button>

          <!-- Rincian Barang (tersembunyi sampai tombol Breakdown diklik) -->
          ${supply.items && supply.items.length > 0 ? `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} glass-panel rounded-xl p-2 flex flex-col gap-1.5 text-[11px]">
              ${supply.items.map((it) => `
                <div class="flex items-start gap-2">
                  ${it.photo ? `
                    <img src="${it.photo}" alt="Foto Sepatu" class="w-8 h-8 rounded-md object-cover border border-white/70 shrink-0" />
                  ` : ''}
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-semibold text-on-surface truncate text-[11px]">${it.qty}x ${it.name}</span>
                      <span class="font-bold font-tabular text-primary ml-2 text-[11px] shrink-0">${formatRupiah(it.buyPrice * it.qty)}</span>
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

                    ${it.catatanMinus ? `
                      <span class="text-[9px] text-amber-800 italic mt-0.5 block truncate">
                        Catatan: ${it.catatanMinus}
                      </span>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} text-[11px] text-on-surface-variant italic px-1 pt-1">Tidak ada rincian barang pada nota ini.</div>
          `}

          <!-- Action Buttons: + Tambah Barang, Edit & Hapus (Admin Only) -->
          ${isAdmin ? `
          <div class="flex items-center justify-end gap-1 pt-1 border-t border-white/45 flex-wrap">
              <button 
                type="button" 
                data-action="add-item-supply" 
                data-id="${supply.id}" 
                class="glass-primary glass-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-primary-btn text-[10px] font-semibold"
                title="Tambah barang belanja ke suplier ini"
              >
                <span class="material-symbols-outlined text-[12px]">add_circle</span>
                <span>+ Barang</span>
              </button>
              <button 
                type="button" 
                data-action="edit-supply" 
                data-id="${supply.id}" 
                class="glass-chip-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-primary text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">edit</span>
                <span>Edit</span>
              </button>
              <button 
                type="button" 
                data-action="delete-supply" 
                data-id="${supply.id}" 
                data-no="${supply.invoiceNo}" 
                class="glass-rose glass-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-rose-800 text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">delete</span>
                <span>Hapus</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Bind Add Item to Supply buttons
    container.querySelectorAll('[data-action="add-item-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        router.navigate('tambah-pasok', { appendSupplyId: id });
      });
    });

    // Bind Edit Supply buttons
    container.querySelectorAll('[data-action="edit-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        router.navigate('tambah-pasok', { editId: id });
      });
    });

    // Bind Delete Supply buttons
    container.querySelectorAll('[data-action="delete-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const invoiceNo = btn.getAttribute('data-no');
        if (confirm(`Hapus data belanja/stock ${invoiceNo}?\nData item dan riwayat belanja ini akan dihapus.`)) {
          store.deleteSupply(id);
          showToast(`Data belanja ${invoiceNo} berhasil dihapus!`, 'info');
          updateKpi();
          renderItems();
        }
      });
    });

    // Bind Breakdown toggle: buka/tutup rincian barang per nota belanja
    container.querySelectorAll('.pasok-breakdown-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const detail = targetId ? document.getElementById(targetId) : null;
        if (!detail) return;

        const nowHidden = detail.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', nowHidden ? 'false' : 'true');

        const chevron = btn.querySelector('.pasok-breakdown-chevron');
        if (chevron) chevron.textContent = nowHidden ? 'expand_more' : 'expand_less';

        const supplyId = btn.getAttribute('data-supply-id');
        if (supplyId) {
          if (nowHidden) expandedSupplies.delete(supplyId);
          else expandedSupplies.add(supplyId);
        }
      });
    });
  }

  renderItems();
}

