import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

export function renderBarangMasukListPage(store, filterStatus = 'all') {
  const supplies = store.getSupplies();
  
  const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalItems = supplies.reduce((sum, s) => sum + (Number(s.itemsCount) || 0), 0);

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Belanja & Stock',
        badge: 'Stock Toko',
        subtitle: 'Daftar Belanja & Stock Sepatu'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-3.5">
        <!-- KPI Belanja Cards -->
        <section class="grid grid-cols-2 gap-2.5">
          <div class="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-surface-container-high flex flex-col justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary">local_shipping</span>
              Total Belanja
            </span>
            <div class="mt-2">
              <span id="kpi-total-belanja" class="font-headline-sm text-base font-bold text-primary block font-tabular">
                ${formatRupiah(totalBelanja)}
              </span>
              <span id="kpi-count-belanja" class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block">${supplies.length} Transaksi Belanja</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-surface-container-high flex flex-col justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
              Jumlah Stock
            </span>
            <div class="mt-2">
              <span id="kpi-total-items" class="font-headline-sm text-base font-bold text-primary block font-tabular">
                ${totalItems} Pasang
              </span>
              <span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block">Stock Masuk Toko</span>
            </div>
          </div>
        </section>

        <!-- Button Catat Belanja Baru -->
        <button 
          type="button" 
          id="btn-goto-tambah-pasok"
          class="w-full h-12 bg-primary-container text-primary-fixed rounded-xl flex items-center justify-center gap-2 font-label-md text-sm bevel-primary active:scale-[0.99] transition-all shadow-sm"
        >
          <span class="material-symbols-outlined text-[20px]">add_box</span>
          <span class="font-bold">+ Catat Belanja / Stock Baru</span>
        </button>

        <!-- Search Bar -->
        <div class="relative w-full">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input 
            type="text" 
            id="pasok-search-input"
            placeholder="Cari barcode, nama sepatu, suplier..." 
            class="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-sm rounded-xl shadow-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
          />
        </div>

        <!-- Filter Segmented Tabs -->
        <div class="bg-surface-container-low p-1 rounded-xl flex items-center gap-1 shadow-inner border border-surface-container-high/60">
          <button type="button" data-filter="all" class="pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg ${filterStatus === 'all' ? 'bg-surface-container-lowest text-on-surface shadow-sm font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
            Semua
          </button>
          <button type="button" data-filter="lunas" class="pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg ${filterStatus === 'lunas' ? 'bg-surface-container-lowest text-emerald-800 shadow-sm font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
            Lunas
          </button>
          <button type="button" data-filter="tempo" class="pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg ${filterStatus === 'tempo' ? 'bg-surface-container-lowest text-amber-800 shadow-sm font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
            Tempo / Bon
          </button>
        </div>

        <!-- Invoices/Belanja List Container -->
        <div id="pasok-list-container" class="flex flex-col gap-3">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
}

export function initBarangMasukListPage(router, store, initialFilter = 'all') {
  bindHeaderEvents(router);

  let currentFilter = initialFilter;
  let searchQuery = '';
  // Nota yang sedang dibuka rinciannya (agar tetap terbuka saat pencarian/filter berubah)
  const expandedSupplies = new Set();

  const addBtn = document.getElementById('btn-goto-tambah-pasok');
  if (addBtn) {
    addBtn.addEventListener('click', () => router.navigate('tambah-pasok'));
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
      btn.className = 'pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-bold font-label-md text-xs transition-all text-center';
      renderItems();
    });
  });

  function updateKpi() {
    const supplies = store.getSupplies();
    const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalItems = supplies.reduce((sum, s) => sum + (Number(s.itemsCount) || 0), 0);

    const elTotal = document.getElementById('kpi-total-belanja');
    const elCount = document.getElementById('kpi-count-belanja');
    const elItems = document.getElementById('kpi-total-items');

    if (elTotal) elTotal.textContent = formatRupiah(totalBelanja);
    if (elCount) elCount.textContent = `${supplies.length} Transaksi Belanja`;
    if (elItems) elItems.textContent = `${totalItems} Pasang`;
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
        <div class="p-8 text-center bg-surface-container-lowest rounded-2xl border border-surface-container-high text-on-surface-variant">
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
        <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container-high flex flex-col gap-2.5">
          <!-- Top Row: ID Belanja & Status Badge -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[18px]">shopping_bag</span>
              <span class="font-title-ledger text-sm font-bold text-on-surface">${supply.invoiceNo}</span>
            </div>
            <span class="font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isLunas ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}">
              ${isLunas ? 'Lunas' : 'Tempo / Bon'}
            </span>
          </div>

          <!-- Supplier & Date -->
          <div class="flex items-center justify-between text-xs text-on-surface-variant">
            <span class="font-semibold text-on-surface">${supply.supplierName}</span>
            <span>${supply.date}</span>
          </div>

          <!-- Breakdown Toggle: klik untuk buka/tutup rincian barang nota ini -->
          <button
            type="button"
            class="pasok-breakdown-btn w-full flex items-center justify-between gap-2 text-xs pt-2 border-t border-surface-container-high/60 active:scale-[0.99] transition-all"
            data-target="detail-${supply.id}"
            data-supply-id="${supply.id}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="detail-${supply.id}"
          >
            <span class="flex items-center gap-1.5 min-w-0">
              <span class="material-symbols-outlined text-[16px] text-primary">receipt_long</span>
              <span class="font-bold text-primary">Breakdown</span>
              <span class="text-on-surface-variant truncate">• ${supply.itemsCount || 1} Pasang • ${supply.paymentMethod || 'Tunai'}</span>
            </span>
            <span class="flex items-center gap-1 shrink-0">
              <span class="text-on-surface-variant">Total:</span>
              <span class="font-currency-item text-base font-bold text-primary font-tabular">${formatRupiah(supply.totalAmount)}</span>
              <span class="pasok-breakdown-chevron material-symbols-outlined text-[18px] text-on-surface-variant">${isOpen ? 'expand_less' : 'expand_more'}</span>
            </span>
          </button>

          <!-- Rincian Barang (tersembunyi sampai tombol Breakdown diklik) -->
          ${supply.items && supply.items.length > 0 ? `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} bg-surface-container-low/70 rounded-xl p-2.5 flex flex-col gap-2 text-xs">
              ${supply.items.map((it) => `
                <div class="flex items-start gap-2.5">
                  ${it.photo ? `
                    <img src="${it.photo}" alt="Foto Sepatu" class="w-12 h-12 rounded-lg object-cover border border-surface-container-high shrink-0" />
                  ` : ''}
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-on-surface truncate">${it.qty}x ${it.name}</span>
                      <span class="font-bold font-tabular text-primary ml-2">${formatRupiah(it.buyPrice * it.qty)}</span>
                    </div>

                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                      ${it.barcode ? `
                        <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-surface-container text-on-surface text-[10px] font-mono font-bold">
                          <span class="material-symbols-outlined text-[12px] text-primary">qr_code</span>
                          <span>${it.barcode}</span>
                        </span>
                      ` : ''}

                      ${it.kondisi ? `
                        <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${it.kondisi === 'Minus' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}">
                          ${it.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
                        </span>
                      ` : ''}
                    </div>

                    ${it.catatanMinus ? `
                      <span class="text-[10px] text-amber-800 italic mt-0.5 block truncate">
                        Catatan: ${it.catatanMinus}
                      </span>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} text-xs text-on-surface-variant italic px-1 pt-1">Tidak ada rincian barang pada nota ini.</div>
          `}

          <!-- Action Buttons: + Tambah Barang, Edit & Hapus -->
          <div class="flex items-center justify-end gap-2 pt-1 border-t border-surface-container-high/60 flex-wrap">
              <button 
                type="button" 
                data-action="add-item-supply" 
                data-id="${supply.id}" 
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-[#c94d22] text-white text-xs font-semibold active:scale-95 transition-all shadow-xs"
                title="Tambah barang belanja ke suplier ini"
              >
                <span class="material-symbols-outlined text-[15px]">add_circle</span>
                <span>+ Barang</span>
              </button>
              <button 
                type="button" 
                data-action="edit-supply" 
                data-id="${supply.id}" 
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold active:scale-95 transition-all shadow-xs"
              >
                <span class="material-symbols-outlined text-[15px]">edit</span>
                <span>Edit</span>
              </button>
              <button 
                type="button" 
                data-action="delete-supply" 
                data-id="${supply.id}" 
                data-no="${supply.invoiceNo}" 
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold active:scale-95 transition-all border border-rose-200 shadow-xs"
              >
                <span class="material-symbols-outlined text-[15px]">delete</span>
                <span>Hapus</span>
              </button>
            </div>
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

