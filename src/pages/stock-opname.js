import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badgeSelisih(selisih) {
  if (selisih === 0) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
      <span class="material-symbols-outlined text-[13px]">check_circle</span> Cocok
    </span>`;
  } else if (selisih < 0) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-bold">
      <span class="material-symbols-outlined text-[13px]">remove_circle</span> Kurang ${Math.abs(selisih)}
    </span>`;
  } else {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold">
      <span class="material-symbols-outlined text-[13px]">add_circle</span> Lebih ${selisih}
    </span>`;
  }
}

function renderOpnameCard(record) {
  const selisih = record.summary ? record.summary.selisih : 0;
  const isDraft = record.status === 'draft';

  return `
    <div class="glass-card glass-sheen rounded-xl p-4 flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-all"
         data-opname-id="${record.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex flex-col min-w-0">
          <span class="text-white font-bold text-sm truncate">${record.notes || 'Opname Stok'}</span>
          <span class="text-neutral-400 text-xs mt-0.5">${formatTanggal(record.date)}</span>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          ${isDraft
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-bold">Draft</span>`
            : badgeSelisih(selisih)
          }
        </div>
      </div>

      <div class="flex items-center gap-3 pt-1 border-t border-neutral-800/60">
        <div class="flex items-center gap-1.5 text-neutral-400 text-xs">
          <span class="material-symbols-outlined text-[14px] text-primary">inventory_2</span>
          <span>Sistem: <b class="text-neutral-300">${record.summary ? record.summary.totalSystem : '-'}</b></span>
        </div>
        <div class="flex items-center gap-1.5 text-neutral-400 text-xs">
          <span class="material-symbols-outlined text-[14px] text-emerald-400">fact_check</span>
          <span>Fisik: <b class="text-neutral-300">${record.summary ? record.summary.totalPhysical : '-'}</b></span>
        </div>
        <div class="ml-auto">
          <span class="material-symbols-outlined text-[18px] text-neutral-600">chevron_right</span>
        </div>
      </div>
    </div>
  `;
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderStockOpnamePage(store) {
  const records = store.getOpnameRecords();
  const available = store.getAvailableProducts();
  const stockSystem = available.length;

  const totalOpname = records.length;
  const lastRecord = records[0] || null;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Stock Opname',
        badge: 'Fisik',
        subtitle: 'Hitung & Verifikasi Stok Fisik',
        showBack: true,
        backRoute: 'pasok'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-3.5">

        <!-- KPI Cards -->
        <section class="grid grid-cols-2 gap-2.5">
          <div class="glass-card glass-sheen rounded-xl p-3 flex flex-col justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
              Stok Sistem
            </span>
            <div class="mt-2">
              <span class="font-headline-sm text-base font-bold text-primary block font-tabular">${stockSystem} Pasang</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block">Belum terjual</span>
            </div>
          </div>

          <div class="glass-card glass-sheen rounded-xl p-3 flex flex-col justify-between">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-emerald-400">fact_check</span>
              Total Opname
            </span>
            <div class="mt-2">
              <span class="font-headline-sm text-base font-bold text-emerald-400 block font-tabular">${totalOpname}x</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5 block">
                ${lastRecord ? 'Terakhir: ' + formatTanggal(lastRecord.date) : 'Belum ada riwayat'}
              </span>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <button
          type="button"
          id="btn-mulai-opname"
          class="glass-primary glass-btn glass-sheen w-full h-12 text-primary-btn rounded-xl flex items-center justify-center gap-2 font-label-md text-sm active:scale-[0.99]"
        >
          <span class="material-symbols-outlined text-[20px]">add_task</span>
          <span class="font-bold">+ Mulai Opname Baru</span>
        </button>

        <!-- Riwayat -->
        <div class="flex items-center justify-between">
          <span class="text-white font-bold text-sm">Riwayat Opname</span>
          <span class="text-neutral-400 text-xs">${totalOpname} sesi</span>
        </div>

        ${records.length === 0 ? `
          <div class="glass-card rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <span class="material-symbols-outlined text-[48px] text-neutral-600">manage_search</span>
            <p class="text-neutral-400 text-sm">Belum ada riwayat opname.</p>
            <p class="text-neutral-500 text-xs">Mulai opname pertama untuk memverifikasi stok fisik toko.</p>
          </div>
        ` : `
          <div class="flex flex-col gap-2.5" id="opname-list">
            ${records.map(renderOpnameCard).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initStockOpnamePage(router, store) {
  bindHeaderEvents(router);

  // Tombol mulai opname baru
  const btnMulai = document.getElementById('btn-mulai-opname');
  if (btnMulai) {
    btnMulai.addEventListener('click', () => {
      router.navigate('tambah-opname');
    });
  }

  // Klik card riwayat → buka detail
  document.querySelectorAll('[data-opname-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-opname-id');
      router.navigate('detail-opname', { id });
    });
  });
}
