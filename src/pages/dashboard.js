import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import logoJuara from '../assets/logo-juara.png';

export function renderDashboardPage(store) {
  const shop = store.getShop();
  const summary = store.getBalanceSummary();
  const recentTransactions = store.getTransactions().slice(0, 4);
  // Data ringan — tidak memerlukan kalkulasi berat
  const shipSummary = store.getShipmentSummary ? store.getShipmentSummary() : {};
  const invSummary = store.getInvestorSummary ? store.getInvestorSummary() : {};
  // Gunakan cache stock report bila ada, hindari kalkulasi berat di main thread saat render
  const cachedReport = store._stockReportCache;
  const stockReport = cachedReport || { summary: { totalSisaPasang: '...' } };
  const lowStockItems = cachedReport && store.getLowStockItems ? store.getLowStockItems() : [];

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: shop.name,
        badge: 'Sepatu',
        subtitle: shop.subName || 'Buku Kas Utama'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-4">
        <!-- Greeting & Status -->
        <section class="flex items-center justify-between pt-1">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5 mb-0.5 text-on-surface-variant">
              <span class="material-symbols-outlined text-primary text-[15px]">calendar_today</span>
              <span class="font-label-sm text-[11px] uppercase tracking-wide">${todayStr}</span>
            </div>
            <h1 class="font-headline-md text-xl font-bold text-on-surface truncate">
              Halo, ${shop.owner || 'Pak Hendra'}
            </h1>
            <span class="font-body-sm text-xs text-on-surface-variant flex items-center gap-1">
              Pemilik • ${shop.name}
            </span>
          </div>

          <div class="flex flex-col items-end shrink-0 gap-1">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span class="font-label-sm text-xs text-on-surface font-semibold">Toko Buka</span>
            </div>
            <span class="font-label-sm text-[10px] text-on-surface-variant">Bismillahirrahmanirrahim</span>
          </div>
        </section>

        <!-- Main Ledger Card (Glassmorphism + Logo Watermark) -->
        <section class="glass-dark glass-sheen rounded-2xl text-surface-container-lowest p-4 relative overflow-hidden isolate">
          <!-- Lapisan sinematik: gradasi + watermark logo penuh (dekoratif, di bawah konten) -->
          <div class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-tr from-black/45 via-black/15 to-white/10"></div>
          <img
            src="${logoJuara}"
            alt=""
            aria-hidden="true"
            class="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 max-w-[85%] opacity-[0.22] -z-10"
          />
          <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-on-tertiary-container/15 pointer-events-none"></div>
          <div class="absolute top-0 left-0 right-0 h-1 bg-on-tertiary-container/80"></div>
          
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">menu_book</span>
              <span class="font-label-md text-xs text-primary-fixed-dim tracking-wider uppercase font-semibold">Saldo Kas Toko</span>
            </div>
            <button 
              type="button" 
              id="toggle-balance-btn" 
              class="text-primary-fixed-dim hover:text-surface-bright active:scale-95 transition-transform"
              aria-label="Sembunyikan Saldo"
            >
              <span class="material-symbols-outlined text-[20px]" id="toggle-balance-icon">visibility</span>
            </button>
          </div>

          <!-- Balance Value -->
          <div class="flex items-baseline gap-2 my-1">
            <span class="font-currency-display text-2xl sm:text-[28px] text-surface-bright font-bold tracking-tight font-tabular" id="balance-value" data-real="${formatRupiah(summary.currentBalance)}">
              ${formatRupiah(summary.currentBalance)}
            </span>
            <span class="font-label-sm text-xs text-tertiary-fixed-dim font-normal">IDR</span>
          </div>
          <p class="font-body-sm text-[11px] text-primary-fixed-dim/80 mb-3">Tercatat di pembukuan lokal hari ini</p>

          <!-- Sub Stats -->
          <div class="grid grid-cols-2 gap-2 pt-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5">
            <!-- Pemasukan -->
            <div class="flex flex-col min-w-0 pr-2 border-r border-surface-container-high/20">
              <div class="flex items-center gap-1 text-emerald-300 mb-0.5">
                <span class="material-symbols-outlined text-[15px]">arrow_downward</span>
                <span class="font-label-sm text-[11px] uppercase font-bold">Pemasukan</span>
              </div>
              <span class="font-currency-item text-sm font-bold text-surface-bright truncate font-tabular">
                +${formatRupiah(summary.totalMasuk, '')}
              </span>
              <span class="font-label-sm text-[10px] text-primary-fixed-dim/90 mt-0.5">${summary.countMasuk} Transaksi</span>
            </div>

            <!-- Pengeluaran -->
            <div class="flex flex-col min-w-0 pl-2">
              <div class="flex items-center gap-1 text-rose-300 mb-0.5">
                <span class="material-symbols-outlined text-[15px]">arrow_upward</span>
                <span class="font-label-sm text-[11px] uppercase font-bold">Pengeluaran</span>
              </div>
              <span class="font-currency-item text-sm font-bold text-surface-bright truncate font-tabular">
                -${formatRupiah(summary.totalKeluar, '')}
              </span>
              <span class="font-label-sm text-[10px] text-primary-fixed-dim/90 mt-0.5">${summary.countKeluar} Transaksi</span>
            </div>
          </div>
        </section>

        <!-- Quick Action Buttons -->
        <section class="grid grid-cols-2 gap-2.5">
          <button 
            type="button" 
            data-action="tambah-masuk"
            class="glass-primary glass-btn glass-sheen relative overflow-hidden h-14 rounded-xl text-primary-btn font-label-md text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span class="material-symbols-outlined text-[20px]">add_circle</span>
            <span>+ Kas Masuk</span>
          </button>

          <button 
            type="button" 
            data-action="tambah-keluar"
            class="glass-rose glass-btn glass-sheen relative overflow-hidden h-14 rounded-xl text-primary font-label-md text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span class="material-symbols-outlined text-[20px]">remove_circle</span>
            <span>- Kas Keluar</span>
          </button>

          <button 
            type="button" 
            data-action="tambah-pasok"
            class="glass-neutral glass-btn glass-sheen relative overflow-hidden h-12 rounded-xl text-on-surface font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <span class="material-symbols-outlined text-[18px] text-primary">inventory_2</span>
            <span>+ Belanja Stock Sepatu</span>
          </button>

          <button 
            type="button" 
            data-action="lihat-pengiriman"
            class="glass-neutral glass-btn glass-sheen relative overflow-hidden h-12 rounded-xl text-on-surface font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <span class="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
            <span>Kelola Pengiriman</span>
          </button>

          <button 
            type="button" 
            data-action="lihat-laporan-stock"
            class="glass-neutral glass-btn glass-sheen relative overflow-hidden col-span-2 h-11 rounded-xl text-on-surface font-label-md text-xs font-semibold flex items-center justify-between px-3.5 active:scale-[0.98]"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[19px] text-cyan-400">inventory_2</span>
              <span>Laporan Sisa Stock (Real Time)</span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-cyan-300">
              <span data-stock-badge class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-tabular">${stockReport.summary.totalSisaPasang} Pasang Sisa</span>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </div>
          </button>

          <button 
            type="button" 
            data-action="lihat-opname"
            class="glass-neutral glass-btn glass-sheen relative overflow-hidden col-span-2 h-11 rounded-xl text-on-surface font-label-md text-xs font-semibold flex items-center justify-between px-3.5 active:scale-[0.98]"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[19px] text-emerald-400">fact_check</span>
              <span>Stock Opname (Cek Fisik Sepatu)</span>
            </div>
            <div class="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
              <span>Buka</span>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </div>
          </button>

          <button 
            type="button" 
            data-action="lihat-investor"
            class="glass-amber glass-btn glass-sheen relative overflow-hidden col-span-2 h-11 rounded-xl text-amber-950 font-label-md text-xs font-bold flex items-center justify-between px-3.5 active:scale-[0.98]"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[19px] text-amber-700">account_balance_wallet</span>
              <span>Kelola Investor & Modal Usaha</span>
            </div>
            <div class="flex items-center gap-1 text-[11px] text-amber-800">
              <span class="bg-white/50 text-amber-900 border border-white/60 px-2 py-0.5 rounded-full text-[10px] font-bold">${invSummary.countAktif || 0} Aktif</span>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </div>
          </button>
        </section>

        <!-- Google Sheets Quick Sync Bar -->
        <section class="glass-card glass-sheen relative overflow-hidden rounded-xl p-2.5 px-3 flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-emerald-100/70 border border-white/60 text-emerald-800 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[17px]">table_chart</span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-on-surface truncate">Google Spreadsheet</span>
                ${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>' : ''}
              </div>
              <span class="text-[10px] text-on-surface-variant truncate" id="dash-sheets-sync-status">
                ${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().lastSync) ? `Sinkron: ${store.getGoogleSheetsConfig().lastSync}` : ((store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? 'Siap disinkronkan' : 'Belum dihubungkan')}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            id="dash-btn-quick-sync"
            class="px-2.5 py-1.5 rounded-lg ${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300' : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-surface-container-high'} text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shrink-0"
          >
            <span class="material-symbols-outlined text-[14px]" id="dash-quick-sync-icon">sync</span>
            <span id="dash-quick-sync-text">${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? 'Sinkron' : 'Hubungkan'}</span>
          </button>
        </section>

        <!-- Smart Alerts (Stok Kritis & Pengiriman Aktif) -->
        <section class="flex flex-col gap-2">
          ${lowStockItems.length > 0 ? `
            <div class="glass-amber glass-sheen relative overflow-hidden rounded-xl p-3 flex items-start gap-2.5">
              <span class="material-symbols-outlined text-amber-700 text-[20px] shrink-0 mt-0.5">warning</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-xs font-bold text-amber-900">Perhatian: Stok Menipis</span>
                  <span class="font-label-sm text-[10px] bg-white/55 border border-white/60 text-amber-900 px-1.5 py-0.5 rounded font-bold">${lowStockItems.length} Produk</span>
                </div>
                <p class="font-body-sm text-xs text-amber-800 mt-0.5">
                  ${lowStockItems.map((c) => `${c.name} (sisa ${c.stock})`).join(', ')}. Segera agendakan belanja stock!
                </p>
              </div>
            </div>
          ` : ''}

          ${(shipSummary.countKemas + shipSummary.countKirim) > 0 ? `
            <div class="glass-blue glass-sheen relative overflow-hidden rounded-xl p-3 flex items-start gap-2.5">
              <span class="material-symbols-outlined text-blue-700 text-[20px] shrink-0 mt-0.5">local_shipping</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="font-label-md text-xs font-bold text-blue-900">Paket Dalam Proses</span>
                  <button type="button" data-nav="pengiriman" class="font-label-sm text-[11px] text-blue-700 font-semibold hover:underline">Kelola</button>
                </div>
                <p class="font-body-sm text-xs text-blue-800 mt-0.5">
                  ${shipSummary.countKemas || 0} paket sedang dikemas, ${shipSummary.countKirim || 0} paket dalam perjalanan.
                </p>
              </div>
            </div>
          ` : ''}
        </section>

        <!-- Riwayat Transaksi Terkini -->
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between pt-1">
            <h2 class="font-headline-sm text-base font-bold text-on-surface">Catatan Buku Kas Terkini</h2>
            <button type="button" data-nav="transaksi" class="font-label-sm text-xs text-on-tertiary-container font-semibold hover:underline">
              Lihat Semua
            </button>
          </div>

          <div class="glass-card glass-sheen relative overflow-hidden rounded-2xl divide-y divide-white/50">
            ${recentTransactions.length === 0 ? `
              <div class="p-6 text-center text-on-surface-variant text-sm">Belum ada transaksi tercatat.</div>
            ` : recentTransactions.map((trx) => {
              const isMasuk = trx.type === 'masuk';
              return `
                <div class="glass-row flex items-center justify-between p-3.5 transition-colors">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl ${isMasuk ? 'bg-emerald-100/70 text-emerald-800' : 'bg-rose-100/70 text-rose-800'} border border-white/60 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[20px]">${isMasuk ? 'point_of_sale' : 'shopping_bag'}</span>
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-title-ledger text-sm font-semibold text-on-surface truncate">${trx.title}</span>
                      <div class="flex items-center gap-1.5 text-on-surface-variant text-[11px] mt-0.5">
                        <span class="truncate">${trx.category}</span>
                        <span>•</span>
                        <span class="shrink-0">${trx.time}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end shrink-0 pl-2">
                    <span class="font-currency-item text-sm font-bold ${isMasuk ? 'text-emerald-700' : 'text-rose-700'} font-tabular">
                      ${isMasuk ? '+' : '-'}${formatRupiah(trx.amount, '')}
                    </span>
                    <span class="font-label-sm text-[10px] text-on-surface-variant">${trx.paymentMethod || 'Tunai'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <button 
            type="button" 
            data-nav="transaksi"
            class="glass-neutral glass-btn glass-sheen relative overflow-hidden w-full py-3 px-4 rounded-xl text-primary font-label-md text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] mt-1"
          >
            <span class="material-symbols-outlined text-[18px]">history_edu</span>
            <span>Buka Buku Kas Selengkapnya</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </section>
      </div>
    </div>
  `;
}

export function initDashboardPage(router, store) {
  bindHeaderEvents(router);

  // Hitung laporan stok di background (idle callback) agar render awal tidak tertunda
  const updateStockBadge = () => {
    const badge = document.querySelector('[data-stock-badge]');
    if (!badge) return;
    try {
      const report = store.getRealtimeStockReport ? store.getRealtimeStockReport() : null;
      if (report) {
        badge.textContent = `${report.summary.totalSisaPasang} Pasang Sisa`;
      }
    } catch (e) { /* abaikan */ }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(updateStockBadge, { timeout: 2000 });
  } else {
    setTimeout(updateStockBadge, 300);
  }

  // Quick Action navigation
  const btnMasuk = document.querySelector('[data-action="tambah-masuk"]');
  if (btnMasuk) {
    btnMasuk.addEventListener('click', () => router.navigate('tambah-transaksi', { type: 'masuk' }));
  }

  const btnKeluar = document.querySelector('[data-action="tambah-keluar"]');
  if (btnKeluar) {
    btnKeluar.addEventListener('click', () => router.navigate('tambah-transaksi', { type: 'keluar' }));
  }

  const btnPasok = document.querySelector('[data-action="tambah-pasok"]');
  if (btnPasok) {
    btnPasok.addEventListener('click', () => router.navigate('tambah-pasok'));
  }

  const btnPengiriman = document.querySelector('[data-action="lihat-pengiriman"]');
  if (btnPengiriman) {
    btnPengiriman.addEventListener('click', () => router.navigate('pengiriman'));
  }

  const btnStockReport = document.querySelector('[data-action="lihat-laporan-stock"]');
  if (btnStockReport) {
    btnStockReport.addEventListener('click', () => router.navigate('laporan-stock'));
  }

  const btnOpname = document.querySelector('[data-action="lihat-opname"]');
  if (btnOpname) {
    btnOpname.addEventListener('click', () => router.navigate('stock-opname'));
  }

  const btnInvestor = document.querySelector('[data-action="lihat-investor"]');
  if (btnInvestor) {
    btnInvestor.addEventListener('click', () => router.navigate('investor'));
  }

  // Toggle Balance Visibility
  const toggleBtn = document.getElementById('toggle-balance-btn');
  const balanceVal = document.getElementById('balance-value');
  const toggleIcon = document.getElementById('toggle-balance-icon');
  let isHidden = false;

  if (toggleBtn && balanceVal && toggleIcon) {
    toggleBtn.addEventListener('click', () => {
      isHidden = !isHidden;
      if (isHidden) {
        balanceVal.textContent = 'Rp ••••••••';
        toggleIcon.textContent = 'visibility_off';
      } else {
        balanceVal.textContent = balanceVal.getAttribute('data-real');
        toggleIcon.textContent = 'visibility';
      }
    });
  }

  // Quick Google Sheets Sync button
  const btnQuickSync = document.getElementById('dash-btn-quick-sync');
  const iconQuickSync = document.getElementById('dash-quick-sync-icon');
  const textQuickSync = document.getElementById('dash-quick-sync-text');
  const statusQuickSync = document.getElementById('dash-sheets-sync-status');

  if (btnQuickSync) {
    btnQuickSync.addEventListener('click', async () => {
      const cfg = store.getGoogleSheetsConfig ? store.getGoogleSheetsConfig() : {};
      if (!cfg.spreadsheetId) {
        showToast('Buka Pengaturan untuk menghubungkan Google Sheets.', 'info');
        router.navigate('pengaturan');
        return;
      }

      btnQuickSync.disabled = true;
      if (iconQuickSync) iconQuickSync.classList.add('animate-spin');
      if (textQuickSync) textQuickSync.textContent = 'Menyinkronkan...';

      try {
        const { syncAllToGoogleSheets } = await import('../services/googleSheets.js');
        const res = await syncAllToGoogleSheets(store);
        if (statusQuickSync) statusQuickSync.textContent = `Sinkron: ${res.syncTime}`;
        showToast(`Sinkronisasi Google Sheets sukses! (${res.counts.transactions} transaksi)`, 'success');
      } catch (err) {
        console.error(err);
        showToast(`Gagal sinkron: ${err.message}`, 'error', 4000);
      } finally {
        btnQuickSync.disabled = false;
        if (iconQuickSync) iconQuickSync.classList.remove('animate-spin');
        if (textQuickSync) textQuickSync.textContent = 'Sinkron';
      }
    });
  }
}
