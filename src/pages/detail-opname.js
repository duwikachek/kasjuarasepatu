import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderResultItem(item) {
  if (item.physicalFound) {
    return `
      <div class="flex items-center gap-3 py-2.5 border-b border-neutral-800/40 last:border-0">
        <span class="material-symbols-outlined text-[18px] text-emerald-400 shrink-0">check_circle</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-neutral-200 truncate">${item.name || 'Tanpa Nama'}</p>
          <p class="text-xs text-neutral-600 font-mono">${item.barcode || '-'}</p>
        </div>
        <span class="text-xs text-emerald-400 font-bold shrink-0">Cocok</span>
      </div>
    `;
  } else {
    return `
      <div class="flex items-center gap-3 py-2.5 border-b border-neutral-800/40 last:border-0">
        <span class="material-symbols-outlined text-[18px] text-rose-400 shrink-0">remove_circle</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-white truncate">${item.name || 'Tanpa Nama'}</p>
          <p class="text-xs text-neutral-600 font-mono">${item.barcode || '-'}</p>
        </div>
        <span class="text-xs text-rose-400 font-bold shrink-0">Tidak ada</span>
      </div>
    `;
  }
}

function renderExtraItem(item) {
  return `
    <div class="flex items-center gap-3 py-2.5 border-b border-neutral-800/40 last:border-0">
      <span class="material-symbols-outlined text-[18px] text-amber-400 shrink-0">add_circle</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-mono text-amber-300">${item.barcode}</p>
        <p class="text-[11px] text-neutral-500 mt-0.5">Tidak terdaftar di sistem</p>
      </div>
      <span class="text-xs text-amber-400 font-bold shrink-0">Stok Lebih</span>
    </div>
  `;
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderDetailOpnamePage(store, params = {}) {
  const records = store.getOpnameRecords();
  const record = records.find((r) => r.id === params.id) || records[0] || null;

  if (!record) {
    return `
      <div class="page-fade-in flex-1 flex flex-col w-full bg-surface">
        ${renderHeader({ title: 'Detail Opname', showBack: true, backRoute: 'stock-opname' })}
        <div class="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
          <span class="material-symbols-outlined text-[48px] text-neutral-600">search_off</span>
          <p class="text-neutral-400 text-sm">Data opname tidak ditemukan.</p>
          <button type="button" data-nav="stock-opname" class="mt-2 px-4 py-2 rounded-xl bg-neutral-800 text-white text-sm">Kembali</button>
        </div>
      </div>
    `;
  }

  const { summary, items = [], extraItems = [] } = record;
  const selisih = summary ? summary.selisih : 0;
  const missingItems = items.filter((it) => !it.physicalFound);
  const foundItems = items.filter((it) => it.physicalFound);

  let statusColor = 'text-emerald-400';
  let statusBg = 'bg-emerald-500/10 border-emerald-500/30';
  let statusIcon = 'check_circle';
  let statusText = 'COCOK — Stok aman!';

  if (selisih < 0) {
    statusColor = 'text-rose-400';
    statusBg = 'bg-rose-500/10 border-rose-500/30';
    statusIcon = 'warning';
    statusText = `SELISIH KURANG — ${Math.abs(selisih)} item tidak ditemukan`;
  } else if (selisih > 0) {
    statusColor = 'text-amber-400';
    statusBg = 'bg-amber-500/10 border-amber-500/30';
    statusIcon = 'info';
    statusText = `SELISIH LEBIH — ${selisih} item tidak terdaftar`;
  }

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-8">
      ${renderHeader({
        title: 'Detail Opname',
        badge: formatTanggal(record.date),
        subtitle: record.notes || 'Opname Stok',
        showBack: true,
        backRoute: 'stock-opname'
      })}

      <div class="flex flex-col w-full px-4 pt-3 gap-3.5">

        <!-- Status Banner -->
        <div class="rounded-xl border p-4 flex items-center gap-3 ${statusBg}">
          <span class="material-symbols-outlined text-[28px] ${statusColor}">${statusIcon}</span>
          <div>
            <p class="text-sm font-bold ${statusColor}">${statusText}</p>
            <p class="text-xs text-neutral-400 mt-0.5">${formatTanggal(record.date)} · ${record.notes || ''}</p>
          </div>
        </div>

        <!-- Ringkasan Angka -->
        <div class="grid grid-cols-3 gap-2">
          <div class="glass-card rounded-xl p-3 flex flex-col items-center gap-1">
            <span class="text-xl font-bold text-primary font-tabular">${summary ? summary.totalSystem : '-'}</span>
            <span class="text-[10px] text-neutral-400 text-center">Stok Sistem</span>
          </div>
          <div class="glass-card rounded-xl p-3 flex flex-col items-center gap-1">
            <span class="text-xl font-bold text-emerald-400 font-tabular">${summary ? summary.totalPhysical : '-'}</span>
            <span class="text-[10px] text-neutral-400 text-center">Ditemukan</span>
          </div>
          <div class="glass-card rounded-xl p-3 flex flex-col items-center gap-1">
            <span class="text-xl font-bold ${selisih === 0 ? 'text-emerald-400' : 'text-rose-400'} font-tabular">
              ${selisih >= 0 ? '+' : ''}${selisih}
            </span>
            <span class="text-[10px] text-neutral-400 text-center">Selisih</span>
          </div>
        </div>

        <!-- Hapus Opname ini -->
        <div class="flex gap-2">
          <button type="button" id="btn-delete-opname"
            class="flex-1 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-all">
            <span class="material-symbols-outlined text-[16px]">delete</span>
            Hapus Riwayat
          </button>
          <button type="button" id="btn-share-opname"
            class="flex-1 h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-[0.98] transition-all">
            <span class="material-symbols-outlined text-[16px]">share</span>
            Salin Laporan
          </button>
        </div>

        ${missingItems.length > 0 ? `
          <!-- Item Tidak Ditemukan -->
          <div>
            <p class="text-sm font-bold text-rose-400 mb-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">remove_circle</span>
              Tidak Ditemukan Fisik (${missingItems.length})
            </p>
            <div class="glass-card rounded-xl px-3 py-1">
              ${missingItems.map(renderResultItem).join('')}
            </div>
          </div>
        ` : ''}

        ${extraItems.length > 0 ? `
          <!-- Item Lebih -->
          <div>
            <p class="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">add_circle</span>
              Stok Lebih / Tidak Terdaftar (${extraItems.length})
            </p>
            <div class="glass-card rounded-xl px-3 py-1">
              ${extraItems.map(renderExtraItem).join('')}
            </div>
          </div>
        ` : ''}

        ${foundItems.length > 0 ? `
          <!-- Item Cocok (Collapsible) -->
          <div>
            <button type="button" id="btn-toggle-found" class="w-full flex items-center justify-between py-2">
              <p class="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                Ditemukan & Cocok (${foundItems.length})
              </p>
              <span class="material-symbols-outlined text-[20px] text-neutral-500 transition-transform" id="found-chevron">expand_more</span>
            </button>
            <div id="found-items-list" class="glass-card rounded-xl px-3 py-1 hidden">
              ${foundItems.map(renderResultItem).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initDetailOpnamePage(router, store, params = {}) {
  bindHeaderEvents(router);

  // Toggle daftar cocok
  const btnToggle = document.getElementById('btn-toggle-found');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      const list = document.getElementById('found-items-list');
      const chevron = document.getElementById('found-chevron');
      if (list) list.classList.toggle('hidden');
      if (chevron) chevron.style.transform = list && !list.classList.contains('hidden') ? 'rotate(180deg)' : '';
    });
  }

  // Hapus opname
  const btnDelete = document.getElementById('btn-delete-opname');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      const confirmed = window.confirm('Hapus riwayat opname ini?');
      if (!confirmed) return;
      store.deleteOpnameRecord(params.id);
      showToast('Riwayat opname dihapus.', 'info');
      router.navigate('stock-opname');
    });
  }

  // Salin laporan
  const btnShare = document.getElementById('btn-share-opname');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const records = store.getOpnameRecords();
      const record = records.find((r) => r.id === params.id) || records[0];
      if (!record) return;

      const { summary, items = [], extraItems = [] } = record;
      const missing = items.filter((it) => !it.physicalFound);

      let text = `📦 LAPORAN STOCK OPNAME\n`;
      text += `Tanggal: ${formatTanggal(record.date)}\n`;
      text += `Keterangan: ${record.notes || '-'}\n\n`;
      text += `Stok Sistem : ${summary?.totalSystem ?? '-'} item\n`;
      text += `Ditemukan   : ${summary?.totalPhysical ?? '-'} item\n`;
      text += `Selisih     : ${summary?.selisih ?? 0}\n\n`;

      if (missing.length > 0) {
        text += `❌ TIDAK DITEMUKAN (${missing.length}):\n`;
        missing.forEach((it) => {
          text += `  - ${it.barcode} ${it.name ? '| ' + it.name : ''}\n`;
        });
        text += '\n';
      }

      if (extraItems.length > 0) {
        text += `⚠️ STOK LEBIH (${extraItems.length}):\n`;
        extraItems.forEach((it) => {
          text += `  + ${it.barcode}\n`;
        });
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          showToast('Laporan disalin ke clipboard!', 'success');
        }).catch(() => {
          showToast('Gagal menyalin. Coba lagi.', 'error');
        });
      } else {
        showToast('Browser tidak mendukung clipboard.', 'warning');
      }
    });
  }
}
