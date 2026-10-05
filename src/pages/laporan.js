import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

// Helper: Menghitung jumlah sepatu laku dari sebuah transaksi
function getShoeCountFromTransaction(t) {
  if (t.type !== 'masuk') return 0;
  if (t.category === 'Dana Investor' || t.category === 'Investasi Modal' || t.category === 'Pelunasan Piutang') return 0;

  if (t.items && Array.isArray(t.items) && t.items.length > 0) {
    return t.items.length;
  }
  if (t.itemCount && Number(t.itemCount) > 0) {
    return Number(t.itemCount);
  }

  const title = (t.title || '').toLowerCase();
  const matchPasang = title.match(/(\d+)\s*(?:pasang|psg)/);
  if (matchPasang) return parseInt(matchPasang[1], 10);
  const matchX = title.match(/(\d+)\s*x\s*(?:sepatu|sandal)/);
  if (matchX) return parseInt(matchX[1], 10);

  if (title.includes('cleaner') && !title.includes('sepatu')) return 0;
  if (
    t.category &&
    (t.category.toLowerCase().includes('penjualan') ||
      t.category.toLowerCase().includes('kasir') ||
      t.category.toLowerCase().includes('grosir'))
  ) {
    return 1;
  }
  return 0;
}

// Helper: Mengurai daftar detail sepatu laku dari transaksi
function extractSoldShoesList(transactions) {
  const list = [];
  transactions.forEach((t) => {
    if (t.type !== 'masuk') return;
    if (t.category === 'Dana Investor' || t.category === 'Investasi Modal' || t.category === 'Pelunasan Piutang') return;

    if (t.items && Array.isArray(t.items) && t.items.length > 0) {
      t.items.forEach((it, idx) => {
        list.push({
          id: `${t.id}-item-${idx}`,
          trxId: t.id,
          date: t.date,
          time: t.time,
          nota: t.nota,
          buyer: t.buyer || '-',
          name: it.name || t.productName || t.title || 'Sepatu',
          barcode: it.barcode || t.barcode || '-',
          kondisi: it.kondisi || t.kondisi || 'Bagus',
          price: Number(it.price) || Math.round(Number(t.amount) / t.items.length) || 0,
          photo: it.photo || t.photo || null
        });
      });
    } else {
      const count = getShoeCountFromTransaction(t);
      if (count > 0) {
        const unitPrice = Math.round((Number(t.amount) || 0) / count);
        for (let i = 0; i < count; i++) {
          list.push({
            id: `${t.id}-${i}`,
            trxId: t.id,
            date: t.date,
            time: t.time,
            nota: t.nota,
            buyer: t.buyer || '-',
            name: t.productName || t.title || 'Sepatu',
            barcode: t.barcode || '-',
            kondisi: t.kondisi || 'Bagus',
            price: unitPrice,
            photo: t.photo || null
          });
        }
      }
    }
  });
  return list;
}

// Helper: Filter transaksi berdasarkan periode (Hari, 7 Hari, Bulan Ini, Semua, Tanggal, Pilih Bulan)
function filterTransactionsByPeriod(transactions, period, customDate = null, customMonth = null) {
  if (!period || period === 'semua') return transactions;

  // Mode: filter by specific date
  if (period === 'tanggal' && customDate) {
    return transactions.filter((t) => t.date === customDate);
  }

  // Mode: filter by specific month (format: YYYY-MM)
  if (period === 'pilih-bulan' && customMonth) {
    return transactions.filter((t) => t.date && t.date.startsWith(customMonth));
  }

  // Tentukan tanggal referensi (mendukung data demo dan data live)
  const todayStr = new Date().toISOString().split('T')[0];
  const hasToday = transactions.some((t) => t.date === todayStr);

  let refDate = new Date();
  if (!hasToday) {
    let maxDate = null;
    transactions.forEach((t) => {
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
    });
    if (maxDate) refDate = maxDate;
  }

  const refDateStr = refDate.toISOString().split('T')[0];

  if (period === 'hari') {
    return transactions.filter((t) => t.date === refDateStr);
  }

  if (period === 'minggu') {
    const past7 = new Date(refDate);
    past7.setDate(refDate.getDate() - 7);
    const past7Str = past7.toISOString().split('T')[0];
    return transactions.filter((t) => t.date >= past7Str && t.date <= refDateStr);
  }

  if (period === 'bulan') {
    const monthPrefix = refDateStr.slice(0, 7);
    return transactions.filter((t) => t.date && t.date.startsWith(monthPrefix));
  }

  return transactions;
}

const CATEGORY_COLORS = [
  { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-50', border: 'border-rose-200' },
  { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' },
  { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50', border: 'border-indigo-200' },
  { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' },
  { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50', border: 'border-teal-200' },
  { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200' }
];

export function renderLaporanPage(store, period = 'bulan') {
  const supplies = store.getSupplies();
  const totalBelanja = supplies.reduce((s, item) => s + (Number(item.totalAmount) || 0), 0);
  const totalItems = supplies.reduce((s, item) => s + (Number(item.itemsCount) || 0), 0);

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Laporan Keuangan',
        badge: 'REKAP',
        subtitle: 'Buku Kas & Analisa Usaha'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-24 gap-4">
        <!-- Period Switcher Row 1 -->
        <div class="flex flex-col gap-2">
          <div class="glass-track p-1 rounded-xl flex items-center gap-1">
            <button type="button" data-period="hari" class="period-btn flex-1 py-1.5 px-2 rounded-lg ${period === 'hari' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
              Hari Ini
            </button>
            <button type="button" data-period="minggu" class="period-btn flex-1 py-1.5 px-2 rounded-lg ${period === 'minggu' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
              7 Hari
            </button>
            <button type="button" data-period="bulan" class="period-btn flex-1 py-1.5 px-2 rounded-lg ${period === 'bulan' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
              Bulan Ini
            </button>
            <button type="button" data-period="semua" class="period-btn flex-1 py-1.5 px-2 rounded-lg ${period === 'semua' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-xs transition-all text-center">
              Semua
            </button>
          </div>

          <!-- Period Switcher Row 2: Custom date/month pickers -->
          <div class="flex items-center gap-2">
            <button type="button" data-period="tanggal"
              class="period-btn glass-chip-btn flex-1 py-1.5 px-3 rounded-xl text-on-surface-variant font-label-md text-xs flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[15px]">calendar_today</span>
              <span id="btn-tanggal-label">Pilih Tanggal</span>
            </button>
            <button type="button" data-period="pilih-bulan"
              class="period-btn glass-chip-btn flex-1 py-1.5 px-3 rounded-xl text-on-surface-variant font-label-md text-xs flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[15px]">calendar_month</span>
              <span id="btn-bulan-label">Pilih Bulan</span>
            </button>
          </div>

          <!-- Date Picker Panel (hidden by default) -->
          <div id="date-picker-panel" class="hidden glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-on-surface flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                Pilih Tanggal Laporan
              </span>
              <button type="button" id="btn-close-date-panel" class="text-on-surface-variant hover:text-on-surface transition-all active:scale-95">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <input type="date" id="input-custom-date"
              class="glass-input w-full px-3 py-2 rounded-xl text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              value="${new Date().toISOString().split('T')[0]}"
            />
            <button type="button" id="btn-apply-date"
              class="glass-primary glass-btn glass-sheen w-full py-2 rounded-xl text-primary-btn font-label-md text-xs font-bold flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
              Tampilkan Laporan Tanggal Ini
            </button>
          </div>

          <!-- Month Picker Panel (hidden by default) -->
          <div id="month-picker-panel" class="hidden glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-on-surface flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                Pilih Bulan & Tahun Laporan
              </span>
              <button type="button" id="btn-close-month-panel" class="text-on-surface-variant hover:text-on-surface transition-all active:scale-95">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <input type="month" id="input-custom-month"
              class="glass-input w-full px-3 py-2 rounded-xl text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              value="${new Date().toISOString().slice(0, 7)}"
            />
            <button type="button" id="btn-apply-month"
              class="glass-primary glass-btn glass-sheen w-full py-2 rounded-xl text-primary-btn font-label-md text-xs font-bold flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
              Tampilkan Laporan Bulan Ini
            </button>
          </div>
        </div>

        <!-- Dynamic Financial Overview Section -->
        <div id="laporan-dynamic-hero"></div>

        <!-- FITUR 1: Laporan Total Jumlah Sepatu Laku -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3" id="section-sepatu-laku">
          <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-emerald-500/10 pointer-events-none"></div>
          
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-on-surface">Laporan Sepatu Laku</h3>
              <p class="text-[11px] text-on-surface-variant">Total pasang & nominal penjualan sepatu</p>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full glass-emerald text-emerald-900 text-[10px] font-bold">
              Terjual
            </span>
          </div>

          <!-- Total Pasang & Omset Grid -->
          <div class="grid grid-cols-2 gap-2.5 mt-1">
            <div class="glass-emerald rounded-xl p-3 flex flex-col justify-between">
              <span class="text-[10px] text-emerald-900 font-bold uppercase tracking-wider">Total Sepatu Laku</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span id="stat-total-sepatu-laku" class="text-2xl font-extrabold text-emerald-950 font-tabular">0</span>
                <span class="text-xs font-bold text-emerald-800">Pasang</span>
              </div>
              <span id="stat-count-trx-sepatu" class="text-[10px] text-emerald-800 mt-0.5">0 Transaksi Penjualan</span>
            </div>

            <div class="glass-panel rounded-xl p-3 flex flex-col justify-between">
              <span class="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Omset Sepatu</span>
              <div class="mt-1">
                <span id="stat-omset-sepatu" class="text-base font-bold text-primary font-tabular truncate block">+Rp 0</span>
              </div>
              <span id="stat-avg-price-sepatu" class="text-[10px] text-on-surface-variant mt-0.5">Rata-rata: Rp 0/psg</span>
            </div>
          </div>

          <!-- Tombol Buka/Tutup Rincian Sepatu Laku -->
          <button type="button" id="btn-toggle-sepatu-list"
            class="glass-chip-btn w-full py-2 px-3 rounded-xl text-on-surface text-xs font-bold flex items-center justify-between active:scale-[0.99] mt-0.5">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-emerald-700">list_alt</span>
              <span id="btn-toggle-sepatu-label">Lihat Rincian Sepatu Laku</span>
            </div>
            <span class="material-symbols-outlined text-[18px] transition-transform duration-200" id="icon-toggle-sepatu">expand_more</span>
          </button>

          <!-- Container Daftar Sepatu Laku (Collapsible) -->
          <div id="container-daftar-sepatu-laku" class="hidden flex flex-col gap-2 pt-1 border-t border-white/45"></div>
        </section>

        <!-- FITUR 2: Laporan Total Sisa Stock Yang Belum Terjual (Real Time) -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" id="section-sisa-stock">
          <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-cyan-500/10 pointer-events-none"></div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">inventory_2</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-on-surface">Laporan Sisa Stock (Real Time)</h3>
                <p class="text-[11px] text-on-surface-variant">Sisa sepatu belum terjual & modal aset toko</p>
              </div>
            </div>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live
            </span>
          </div>

          <!-- Total Sisa Pasang & Nilai Aset Modal Grid -->
          <div class="grid grid-cols-2 gap-2.5 mt-1">
            <div class="glass-card rounded-xl p-3 flex flex-col justify-between border border-emerald-500/30">
              <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Total Sisa Stok</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span id="stat-sisa-total-pasang" class="text-2xl font-extrabold text-white font-tabular">0</span>
                <span class="text-xs font-bold text-emerald-400">Pasang</span>
              </div>
              <span id="stat-sisa-total-varian" class="text-[10px] text-neutral-400 mt-0.5">0 Model Tersedia</span>
            </div>

            <div class="glass-panel rounded-xl p-3 flex flex-col justify-between border border-neutral-700/60">
              <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Nilai Modal Aset</span>
              <div class="mt-1">
                <span id="stat-sisa-nilai-modal" class="text-base font-bold text-primary font-tabular truncate block">Rp 0</span>
              </div>
              <span class="text-[10px] text-neutral-400 mt-0.5">Modal beli tertahan</span>
            </div>

            <div class="glass-panel rounded-xl p-3 flex flex-col justify-between border border-neutral-700/60">
              <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Potensi Omset</span>
              <div class="mt-1">
                <span id="stat-sisa-potensi-omset" class="text-sm font-bold text-cyan-300 font-tabular truncate block">Rp 0</span>
              </div>
              <span class="text-[10px] text-neutral-400 mt-0.5">Jika laku semua</span>
            </div>

            <div class="glass-panel rounded-xl p-3 flex flex-col justify-between border border-neutral-700/60">
              <span class="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Potensi Laba</span>
              <div class="mt-1">
                <span id="stat-sisa-potensi-laba" class="text-sm font-bold text-amber-300 font-tabular truncate block">+Rp 0</span>
              </div>
              <span id="stat-sisa-margin" class="text-[10px] text-amber-400/90 mt-0.5">Margin: ~0%</span>
            </div>
          </div>

          <!-- Quick Condition Breakdown Badges -->
          <div class="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-neutral-800/80">
            <span class="text-neutral-400 text-[10px] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span id="stat-sisa-bagus">0 Bagus</span>
            </span>
            <span class="text-neutral-400 text-[10px] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span id="stat-sisa-minus">0 Minus</span>
            </span>
            <span class="text-neutral-400 text-[10px] flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span id="stat-sisa-menipis">0 Menipis</span>
            </span>
            <button type="button" id="btn-goto-laporan-stock-detail" class="text-emerald-400 font-bold text-[11px] hover:underline flex items-center gap-0.5 ml-auto">
              <span>Slip Detail</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          <!-- Tombol Buka/Tutup Rincian Sisa Stock -->
          <button type="button" id="btn-toggle-sisa-stock"
            class="glass-chip-btn w-full py-2 px-3 rounded-xl text-on-surface text-xs font-bold flex items-center justify-between active:scale-[0.99] mt-0.5">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-cyan-400">format_list_bulleted</span>
              <span id="btn-toggle-sisa-label">Lihat Rincian Sisa Stock</span>
            </div>
            <span class="material-symbols-outlined text-[18px] transition-transform duration-200" id="icon-toggle-sisa">expand_more</span>
          </button>

          <!-- Container Daftar Sisa Stock (Collapsible) -->
          <div id="container-daftar-sisa-stock" class="hidden flex flex-col gap-2 pt-1 border-t border-white/45"></div>
        </section>

        <!-- FITUR 3: Filter Total Pengeluaran Berdasarkan Kategori -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3" id="section-kategori-pengeluaran">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-9 h-9 rounded-xl glass-rose text-rose-700 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">category</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-on-surface">Pengeluaran per Kategori</h3>
                <p class="text-[11px] text-on-surface-variant">Filter & analisa biaya operasional toko</p>
              </div>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full glass-rose text-rose-900 text-[10px] font-bold">
              Kas Keluar
            </span>
          </div>

          <!-- Horizontal Filter Kategori Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar" id="expense-category-filters">
            <!-- Populated via JS -->
          </div>

          <!-- Highlight Kategori Terpilih -->
          <div class="glass-rose rounded-xl p-3 flex items-center justify-between" id="expense-category-highlight">
            <div class="flex flex-col min-w-0 pr-2">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" id="selected-cat-dot"></span>
                <span class="font-bold text-xs text-rose-950 truncate" id="selected-cat-name">Semua Kategori</span>
              </div>
              <span class="text-[10px] text-rose-700 mt-0.5" id="selected-cat-meta">0 transaksi pengeluaran</span>
            </div>
            <div class="flex flex-col items-end shrink-0">
              <span class="text-base font-extrabold text-rose-800 font-tabular" id="selected-cat-total">-Rp 0</span>
              <span class="text-[10px] font-semibold text-rose-700" id="selected-cat-percent">100% total biaya</span>
            </div>
          </div>

          <!-- Visual Bar Breakdown Proporsi Biaya -->
          <div class="flex flex-col gap-1.5 mt-0.5">
            <div class="h-2.5 w-full glass-panel bg-white/35 rounded-full overflow-hidden flex" id="expense-progress-bar">
              <!-- Colored segments populated by JS -->
            </div>
            <div class="flex items-center justify-between text-[10px] text-on-surface-variant">
              <span>Proporsi Beban Pengeluaran</span>
              <span id="expense-total-label" class="font-bold text-rose-800 font-tabular">Total: -Rp 0</span>
            </div>
          </div>

          <!-- Daftar Rincian Transaksi Pengeluaran Sesuai Filter -->
          <div class="flex flex-col gap-2 pt-2 border-t border-white/45">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-on-surface">Rincian Transaksi Pengeluaran</span>
              <span class="text-[10px] text-on-surface-variant" id="expense-list-count">0 catatan</span>
            </div>
            <div id="expense-transaction-list" class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
              <!-- Populated via JS -->
            </div>
          </div>
        </section>

        <!-- SVG Visual Arus Kas 7 Hari -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
              <h3 class="font-title-ledger text-sm font-bold text-on-surface">Tren Arus Kas 7 Hari</h3>
            </div>
            <div class="flex items-center gap-3 text-[10px] text-on-surface-variant font-semibold">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-600"></span> Masuk</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Keluar</span>
            </div>
          </div>

          <!-- Interactive Bar Chart Visual -->
          <div class="h-36 w-full flex items-end justify-between gap-2 pt-4 px-1 pb-1">
            ${[
              { day: 'Sen', m: 85, k: 30 },
              { day: 'Sel', m: 60, k: 45 },
              { day: 'Rab', m: 95, k: 25 },
              { day: 'Kam', m: 40, k: 70 },
              { day: 'Jum', m: 110, k: 50 },
              { day: 'Sab', m: 130, k: 40 },
              { day: 'Min', m: 100, k: 35 }
            ]
              .map(
                (bar) => `
              <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div class="w-full flex items-end justify-center gap-1 h-24">
                  <div class="w-2.5 rounded-t-sm bg-emerald-600 hover:opacity-80 transition-all" style="height: ${bar.m * 0.7}px;" title="Masuk"></div>
                  <div class="w-2.5 rounded-t-sm bg-rose-500 hover:opacity-80 transition-all" style="height: ${bar.k * 0.7}px;" title="Keluar"></div>
                </div>
                <span class="font-label-sm text-[10px] text-on-surface-variant font-semibold mt-1">${bar.day}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </section>

        <!-- Rekapitulasi Belanja Stock -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-title-ledger text-sm font-bold text-on-surface">Rekap Pengadaan (Stock Sepatu)</h3>
            <span class="font-label-sm text-[10px] px-2 py-0.5 rounded-full glass-chip text-on-secondary-fixed font-bold">${supplies.length} Belanja</span>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-1">
            <div class="glass-panel rounded-xl p-2.5 flex flex-col">
              <span class="text-[10px] text-on-surface-variant">Total Belanja Stock</span>
              <span class="font-bold text-sm text-primary font-tabular mt-0.5">${formatRupiah(totalBelanja)}</span>
            </div>
            <div class="glass-panel rounded-xl p-2.5 flex flex-col">
              <span class="text-[10px] text-on-surface-variant">Total Sepatu Masuk</span>
              <span class="font-bold text-sm text-primary font-tabular mt-0.5">${totalItems} Pasang</span>
            </div>
          </div>
        </section>

        <!-- Export & Share Button -->
        <button 
          type="button" 
          id="btn-cetak-laporan"
          class="glass-neutral glass-btn glass-sheen w-full py-3.5 px-4 rounded-xl text-primary font-label-md text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-[18px]">print</span>
          <span>Unduh Rekap Laporan Kas</span>
        </button>
      </div>
    </div>
  `;
}

export function initLaporanPage(router, store, initialPeriod = 'bulan') {
  bindHeaderEvents(router);

  let currentPeriod = initialPeriod;
  let selectedExpenseCategory = 'all';
  let isSepatuListExpanded = false;
  let isSisaStockExpanded = false;
  let customDate = new Date().toISOString().split('T')[0];
  let customMonth = new Date().toISOString().slice(0, 7);

  function g(id) {
    return document.getElementById(id);
  }

  // Helper: format label tanggal
  function formatDateLabel(dateStr) {
    if (!dateStr) return 'Pilih Tanggal';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Helper: format label bulan
  function formatMonthLabel(monthStr) {
    if (!monthStr) return 'Pilih Bulan';
    const [y, m] = monthStr.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  // Get period description for hero label
  function getPeriodDesc() {
    if (currentPeriod === 'tanggal') return formatDateLabel(customDate);
    if (currentPeriod === 'pilih-bulan') return formatMonthLabel(customMonth);
    if (currentPeriod === 'hari') return 'HARI INI';
    if (currentPeriod === 'minggu') return '7 HARI';
    if (currentPeriod === 'bulan') return 'BULAN INI';
    return 'SEMUA';
  }

  function updatePage() {
    const allTrxs = store.getTransactions();
    const periodTrxs = filterTransactionsByPeriod(allTrxs, currentPeriod, customDate, customMonth);

    // 1. Hitung Hero Net Profit
    let totalMasuk = 0;
    let totalKeluar = 0;
    periodTrxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'masuk') totalMasuk += amt;
      else totalKeluar += amt;
    });
    const netProfit = totalMasuk - totalKeluar;

    const heroEl = g('laporan-dynamic-hero');
    if (heroEl) {
      heroEl.innerHTML = `
        <section class="glass-dark glass-sheen rounded-2xl p-4 text-surface-container-lowest">
          <div class="flex items-center justify-between mb-1">
            <span class="font-label-md text-xs text-primary-fixed-dim tracking-wider uppercase font-semibold">
              Surplus / Arus Kas Bersih
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full glass-chip ${netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'} text-[10px] font-semibold">
              ${netProfit >= 0 ? 'Arus Kas Positif' : 'Arus Kas Defisit'}
            </span>
          </div>

          <div class="flex items-baseline gap-2 my-1">
            <span class="font-currency-display text-3xl text-surface-bright font-bold tracking-tight font-tabular">
              ${netProfit >= 0 ? '+' : ''}${formatRupiah(netProfit)}
            </span>
          </div>
          <p class="font-body-sm text-[11px] text-primary-fixed-dim/80 mb-3">Selisih total kas masuk dikurangi kas keluar (${getPeriodDesc()})</p>

          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/20">
            <div class="flex flex-col">
              <span class="text-[10px] text-emerald-300 font-bold uppercase">Total Kas Masuk</span>
              <span class="font-bold text-sm text-surface-bright font-tabular">+${formatRupiah(totalMasuk, '')}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-rose-300 font-bold uppercase">Total Kas Keluar</span>
              <span class="font-bold text-sm text-surface-bright font-tabular">-${formatRupiah(totalKeluar, '')}</span>
            </div>
          </div>
        </section>
      `;
    }

    // 2. FITUR 1: Laporan Sepatu Laku
    const soldShoes = extractSoldShoesList(periodTrxs);
    const totalShoesCount = soldShoes.length;
    const totalShoesOmset = soldShoes.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    const avgShoesPrice = totalShoesCount > 0 ? Math.round(totalShoesOmset / totalShoesCount) : 0;
    const countTrxWithShoes = new Set(soldShoes.map((it) => it.trxId)).size;

    const elTotalSepatu = g('stat-total-sepatu-laku');
    if (elTotalSepatu) elTotalSepatu.textContent = totalShoesCount;

    const elCountTrx = g('stat-count-trx-sepatu');
    if (elCountTrx) elCountTrx.textContent = `${countTrxWithShoes} Transaksi Penjualan`;

    const elOmset = g('stat-omset-sepatu');
    if (elOmset) elOmset.textContent = `+${formatRupiah(totalShoesOmset)}`;

    const elAvg = g('stat-avg-price-sepatu');
    if (elAvg) elAvg.textContent = `Rata-rata: ${formatRupiah(avgShoesPrice)}/psg`;

    const elToggleLabel = g('btn-toggle-sepatu-label');
    if (elToggleLabel) {
      elToggleLabel.textContent = isSepatuListExpanded
        ? 'Tutup Rincian Sepatu Laku'
        : `Lihat Rincian Sepatu Laku (${totalShoesCount} Pasang)`;
    }

    const containerShoesList = g('container-daftar-sepatu-laku');
    if (containerShoesList) {
      if (totalShoesCount === 0) {
        containerShoesList.innerHTML = `
          <div class="py-4 text-center text-xs text-on-surface-variant glass-panel rounded-xl">
            Belum ada penjualan sepatu pada periode ini.
          </div>
        `;
      } else {
        containerShoesList.innerHTML = soldShoes
          .map(
            (shoe, idx) => `
          <div class="glass-panel rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg glass-emerald text-emerald-900 flex items-center justify-center shrink-0 font-bold text-xs">
                ${idx + 1}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs text-on-surface truncate">${shoe.name}</span>
                <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant flex-wrap mt-0.5">
                  <span class="font-mono glass-chip px-1 py-0.2 rounded">${shoe.barcode}</span>
                  <span>${shoe.date}</span>
                  ${shoe.kondisi === 'Minus' ? '<span class="text-amber-700 font-bold">⚠ Minus</span>' : '<span class="text-emerald-700 font-semibold">✓ Bagus</span>'}
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end shrink-0">
              <span class="font-bold text-xs text-emerald-800 font-tabular">+${formatRupiah(shoe.price, '')}</span>
              <span class="text-[9px] text-on-surface-variant truncate max-w-[80px]">${shoe.nota || shoe.buyer}</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // 3. FITUR 2: Laporan Total Sisa Stock Yang Belum Terjual (Real Time)
    const stockReport = store.getRealtimeStockReport();
    const stockSummary = stockReport.summary;

    const elSisaPasang = g('stat-sisa-total-pasang');
    if (elSisaPasang) elSisaPasang.textContent = stockSummary.totalSisaPasang;

    const elSisaVarian = g('stat-sisa-total-varian');
    if (elSisaVarian) elSisaVarian.textContent = `${stockSummary.totalVarianSisa} Model Tersedia`;

    const elSisaModal = g('stat-sisa-nilai-modal');
    if (elSisaModal) elSisaModal.textContent = formatRupiah(stockSummary.totalNilaiAsetModal);

    const elSisaOmset = g('stat-sisa-potensi-omset');
    if (elSisaOmset) elSisaOmset.textContent = formatRupiah(stockSummary.totalPotensiOmset);

    const elSisaLaba = g('stat-sisa-potensi-laba');
    if (elSisaLaba) elSisaLaba.textContent = `+${formatRupiah(stockSummary.totalPotensiLaba)}`;

    const elSisaMargin = g('stat-sisa-margin');
    if (elSisaMargin) elSisaMargin.textContent = `Margin: ~${stockSummary.avgMarginPercent}%`;

    const elSisaBagus = g('stat-sisa-bagus');
    if (elSisaBagus) elSisaBagus.textContent = `${stockSummary.countKondisiBagus} Bagus`;

    const elSisaMinus = g('stat-sisa-minus');
    if (elSisaMinus) elSisaMinus.textContent = `${stockSummary.countKondisiMinus} Minus`;

    const elSisaMenipis = g('stat-sisa-menipis');
    if (elSisaMenipis) elSisaMenipis.textContent = `${stockSummary.countStokMenipis} Menipis`;

    const elToggleSisaLabel = g('btn-toggle-sisa-label');
    if (elToggleSisaLabel) {
      elToggleSisaLabel.textContent = isSisaStockExpanded
        ? 'Tutup Rincian Sisa Stock'
        : `Lihat Rincian Sisa Stock (${stockSummary.totalSisaPasang} Pasang)`;
    }

    const containerSisaList = g('container-daftar-sisa-stock');
    if (containerSisaList) {
      if (stockReport.unsoldItems.length === 0) {
        containerSisaList.innerHTML = `
          <div class="py-4 text-center text-xs text-on-surface-variant glass-panel rounded-xl">
            Tidak ada sisa stock sepatu (seluruh stok telah terjual).
          </div>
        `;
      } else {
        containerSisaList.innerHTML = stockReport.unsoldItems
          .map(
            (item, idx) => `
          <div class="glass-panel rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-lg ${item.kondisi === 'Minus' ? 'glass-amber text-amber-900' : 'glass-emerald text-emerald-900'} flex items-center justify-center shrink-0 font-bold text-xs">
                ${idx + 1}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-xs text-on-surface truncate">${item.name}</span>
                <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant flex-wrap mt-0.5">
                  <span class="font-mono glass-chip px-1 py-0.2 rounded">${item.barcode}</span>
                  <span class="font-bold ${item.sisaStock <= 2 ? 'text-rose-600' : 'text-emerald-700'}">Sisa: ${item.sisaStock} psg</span>
                  ${item.kondisi === 'Minus' ? `<span class="text-amber-700 font-bold">⚠ ${item.catatanMinus || 'Minus'}</span>` : '<span class="text-emerald-700 font-semibold">✓ Bagus</span>'}
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end shrink-0">
              <span class="font-bold text-xs text-primary font-tabular">Modal: ${formatRupiah(item.buyPrice, '')}</span>
              <span class="text-[9px] text-on-surface-variant">Jual: ${formatRupiah(item.sellPrice, '')}</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // 4. FITUR 3: Filter Total Pengeluaran Berdasarkan Kategori
    const expenseTrxs = periodTrxs.filter((t) => t.type === 'keluar');
    const categoryTotals = {};
    const categoryCounts = {};

    expenseTrxs.forEach((t) => {
      const cat = (t.category || 'Biaya Lainnya').trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryKeys = Object.keys(categoryTotals).sort(
      (a, b) => categoryTotals[b] - categoryTotals[a]
    );

    // Filter pills
    const filterPillsContainer = g('expense-category-filters');
    if (filterPillsContainer) {
      const pills = [
        {
          key: 'all',
          label: 'Semua Kategori',
          total: totalKeluar,
          count: expenseTrxs.length
        },
        ...categoryKeys.map((cat) => ({
          key: cat,
          label: cat,
          total: categoryTotals[cat],
          count: categoryCounts[cat]
        }))
      ];

      filterPillsContainer.innerHTML = pills
        .map((p) => {
          const isActive = selectedExpenseCategory === p.key;
          return `
          <button type="button" data-cat="${p.key}"
            class="expense-cat-pill shrink-0 px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              isActive
                ? 'glass-dark text-surface-bright'
                : 'glass-chip-btn text-on-surface-variant'
            }">
            <span>${p.label}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-tabular glass-chip ${
              isActive ? 'text-surface-bright' : 'text-on-surface-variant'
            }">
              ${formatRupiah(p.total, '')}
            </span>
          </button>
        `;
        })
        .join('');

      // Bind click on category pills
      filterPillsContainer.querySelectorAll('[data-cat]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedExpenseCategory = btn.getAttribute('data-cat');
          updatePage();
        });
      });
    }

    // Detail Highlight Kategori Terpilih
    let activeCatTotal = totalKeluar;
    let activeCatCount = expenseTrxs.length;
    let activeCatName = 'Semua Kategori';

    if (selectedExpenseCategory !== 'all') {
      activeCatTotal = categoryTotals[selectedExpenseCategory] || 0;
      activeCatCount = categoryCounts[selectedExpenseCategory] || 0;
      activeCatName = selectedExpenseCategory;
    }

    const pct = totalKeluar > 0 ? ((activeCatTotal / totalKeluar) * 100).toFixed(1) : '0';

    const elCatName = g('selected-cat-name');
    if (elCatName) elCatName.textContent = activeCatName;

    const elCatMeta = g('selected-cat-meta');
    if (elCatMeta) elCatMeta.textContent = `${activeCatCount} transaksi pengeluaran`;

    const elCatTotal = g('selected-cat-total');
    if (elCatTotal) elCatTotal.textContent = `-${formatRupiah(activeCatTotal)}`;

    const elCatPercent = g('selected-cat-percent');
    if (elCatPercent) {
      elCatPercent.textContent =
        selectedExpenseCategory === 'all'
          ? '100% total biaya'
          : `${pct}% dari total biaya (${formatRupiah(totalKeluar, '')})`;
    }

    // Visual Progress Bar Breakdown
    const barEl = g('expense-progress-bar');
    if (barEl) {
      if (totalKeluar === 0) {
        barEl.innerHTML = `<div class="w-full h-full bg-white/40"></div>`;
      } else {
        barEl.innerHTML = categoryKeys
          .map((cat, idx) => {
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            const w = ((categoryTotals[cat] / totalKeluar) * 100).toFixed(1);
            return `<div class="h-full ${color.bg}" style="width: ${w}%" title="${cat}: ${formatRupiah(categoryTotals[cat])} (${w}%)"></div>`;
          })
          .join('');
      }
    }

    const elTotalExpLabel = g('expense-total-label');
    if (elTotalExpLabel) {
      elTotalExpLabel.textContent = `Total Biaya: -${formatRupiah(totalKeluar)}`;
    }

    // Rincian Daftar Transaksi Pengeluaran yang Terfilter
    const filteredExpenseList =
      selectedExpenseCategory === 'all'
        ? expenseTrxs
        : expenseTrxs.filter((t) => (t.category || '').trim() === selectedExpenseCategory);

    const elExpCount = g('expense-list-count');
    if (elExpCount) {
      elExpCount.textContent = `${filteredExpenseList.length} transaksi`;
    }

    const listEl = g('expense-transaction-list');
    if (listEl) {
      if (filteredExpenseList.length === 0) {
        listEl.innerHTML = `
          <div class="py-4 text-center text-xs text-on-surface-variant glass-panel rounded-xl">
            Tidak ada pengeluaran pada kategori ini untuk periode terpilih.
          </div>
        `;
      } else {
        listEl.innerHTML = filteredExpenseList
          .map((t) => {
            return `
            <div class="glass-panel glass-row rounded-xl p-3 flex items-start justify-between gap-2 transition-all">
              <div class="flex items-start gap-2.5 min-w-0">
                <div class="w-8 h-8 rounded-lg glass-rose text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span class="material-symbols-outlined text-[16px]">arrow_upward</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-xs text-on-surface truncate">${t.title || t.keterangan || t.category}</span>
                  <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant flex-wrap mt-0.5">
                    <span class="px-1.5 py-0.2 rounded font-bold glass-rose text-rose-800 text-[9px]">${t.category}</span>
                    <span>${t.date} ${t.time || ''}</span>
                    <span class="text-on-surface-variant/80">• ${t.paymentMethod || 'Tunai'}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end shrink-0">
                <span class="font-bold text-xs text-rose-800 font-tabular">-${formatRupiah(t.amount, '')}</span>
                <span class="text-[9px] text-on-surface-variant">${t.nota || ''}</span>
              </div>
            </div>
          `;
          })
          .join('');
      }
    }
  }

  // Toggle dropdown sepatu laku
  const btnToggleSepatu = g('btn-toggle-sepatu-list');
  const containerSepatu = g('container-daftar-sepatu-laku');
  const iconToggleSepatu = g('icon-toggle-sepatu');

  if (btnToggleSepatu && containerSepatu) {
    btnToggleSepatu.addEventListener('click', () => {
      isSepatuListExpanded = !isSepatuListExpanded;
      if (isSepatuListExpanded) {
        containerSepatu.classList.remove('hidden');
        if (iconToggleSepatu) iconToggleSepatu.style.transform = 'rotate(180deg)';
      } else {
        containerSepatu.classList.add('hidden');
        if (iconToggleSepatu) iconToggleSepatu.style.transform = 'rotate(0deg)';
      }
      const elToggleLabel = g('btn-toggle-sepatu-label');
      if (elToggleLabel) {
        const elSepatu = g('stat-total-sepatu-laku');
        const count = elSepatu ? elSepatu.textContent : '';
        elToggleLabel.textContent = isSepatuListExpanded
          ? 'Tutup Rincian Sepatu Laku'
          : `Lihat Rincian Sepatu Laku (${count} Pasang)`;
      }
    });
  }

  // Toggle dropdown sisa stock
  const btnToggleSisa = g('btn-toggle-sisa-stock');
  const containerSisa = g('container-daftar-sisa-stock');
  const iconToggleSisa = g('icon-toggle-sisa');

  if (btnToggleSisa && containerSisa) {
    btnToggleSisa.addEventListener('click', () => {
      isSisaStockExpanded = !isSisaStockExpanded;
      if (isSisaStockExpanded) {
        containerSisa.classList.remove('hidden');
        if (iconToggleSisa) iconToggleSisa.style.transform = 'rotate(180deg)';
      } else {
        containerSisa.classList.add('hidden');
        if (iconToggleSisa) iconToggleSisa.style.transform = 'rotate(0deg)';
      }
      const elToggleSisaLabel = g('btn-toggle-sisa-label');
      if (elToggleSisaLabel) {
        const elPasang = g('stat-sisa-total-pasang');
        const count = elPasang ? elPasang.textContent : '';
        elToggleSisaLabel.textContent = isSisaStockExpanded
          ? 'Tutup Rincian Sisa Stock'
          : `Lihat Rincian Sisa Stock (${count} Pasang)`;
      }
    });
  }

  // Button goto dedicated laporan stock detail
  const btnGotoStock = g('btn-goto-laporan-stock-detail');
  if (btnGotoStock) {
    btnGotoStock.addEventListener('click', () => {
      router.navigate('laporan-stock');
    });
  }

  // ── Period switch buttons (rows 1 & 2) ──
  const ACTIVE_ROW1 = 'period-btn flex-1 py-1.5 px-2 rounded-lg glass-seg-active text-on-surface font-bold font-label-md text-xs transition-all text-center';
  const IDLE_ROW1   = 'period-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center';
  const ACTIVE_ROW2 = 'period-btn glass-primary flex-1 py-1.5 px-3 rounded-xl text-primary-btn font-label-md text-xs flex items-center justify-center gap-1.5';
  const IDLE_ROW2   = 'period-btn glass-chip-btn flex-1 py-1.5 px-3 rounded-xl text-on-surface-variant font-label-md text-xs flex items-center justify-center gap-1.5';

  const row2Periods = ['tanggal', 'pilih-bulan'];

  function syncPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach((b) => {
      const p = b.getAttribute('data-period');
      const isRow2 = row2Periods.includes(p);
      if (p === currentPeriod) {
        b.className = isRow2 ? ACTIVE_ROW2 : ACTIVE_ROW1;
      } else {
        b.className = isRow2 ? IDLE_ROW2 : IDLE_ROW1;
      }
    });
  }

  function showPanel(which) {
    const datePanel  = g('date-picker-panel');
    const monthPanel = g('month-picker-panel');
    if (datePanel)  datePanel.classList.toggle('hidden',  which !== 'tanggal');
    if (monthPanel) monthPanel.classList.toggle('hidden', which !== 'pilih-bulan');
  }

  document.querySelectorAll('.period-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-period');
      // For date/month pickers, just show panel without triggering updatePage yet
      if (p === 'tanggal') {
        currentPeriod = 'tanggal';
        syncPeriodButtons();
        showPanel('tanggal');
        return;
      }
      if (p === 'pilih-bulan') {
        currentPeriod = 'pilih-bulan';
        syncPeriodButtons();
        showPanel('pilih-bulan');
        return;
      }
      // Standard period
      currentPeriod = p;
      syncPeriodButtons();
      showPanel(null);
      selectedExpenseCategory = 'all';
      updatePage();
      showToast(`Periode: ${btn.textContent.trim()}`, 'info', 1200);
    });
  });

  // ── Date picker apply ──
  const btnApplyDate = g('btn-apply-date');
  if (btnApplyDate) {
    btnApplyDate.addEventListener('click', () => {
      const inp = g('input-custom-date');
      if (!inp || !inp.value) { showToast('Pilih tanggal dulu', 'error'); return; }
      customDate = inp.value;
      showPanel(null);
      // Update button label
      const lbl = g('btn-tanggal-label');
      if (lbl) lbl.textContent = formatDateLabel(customDate);
      selectedExpenseCategory = 'all';
      updatePage();
      showToast(`Laporan: ${formatDateLabel(customDate)}`, 'success', 2000);
    });
  }

  const btnCloseDatePanel = g('btn-close-date-panel');
  if (btnCloseDatePanel) {
    btnCloseDatePanel.addEventListener('click', () => showPanel(null));
  }

  // ── Month picker apply ──
  const btnApplyMonth = g('btn-apply-month');
  if (btnApplyMonth) {
    btnApplyMonth.addEventListener('click', () => {
      const inp = g('input-custom-month');
      if (!inp || !inp.value) { showToast('Pilih bulan dulu', 'error'); return; }
      customMonth = inp.value;
      showPanel(null);
      // Update button label
      const lbl = g('btn-bulan-label');
      if (lbl) lbl.textContent = formatMonthLabel(customMonth);
      selectedExpenseCategory = 'all';
      updatePage();
      showToast(`Laporan: ${formatMonthLabel(customMonth)}`, 'success', 2000);
    });
  }

  const btnCloseMonthPanel = g('btn-close-month-panel');
  if (btnCloseMonthPanel) {
    btnCloseMonthPanel.addEventListener('click', () => showPanel(null));
  }

  // Print button
  const btnPrint = g('btn-cetak-laporan');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // First render
  syncPeriodButtons();
  updatePage();

  // Real-time listener: Otomatis perbarui laporan saat transaksi atau belanja berubah
  const unsubscribe = store.subscribe(() => {
    updatePage();
  });

  window.addEventListener('hashchange', function onLeaveLaporan() {
    if (!window.location.hash.includes('laporan')) {
      unsubscribe();
      window.removeEventListener('hashchange', onLeaveLaporan);
    }
  });
}
