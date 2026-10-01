import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

function statusBadge(status) {
  if (status === 'lunas') return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
  if (status === 'macet') return 'bg-rose-100 text-rose-800 border border-rose-300';
  return 'bg-blue-100 text-blue-800 border border-blue-300';
}
function statusLabel(status) {
  if (status === 'lunas') return 'Lunas';
  if (status === 'macet') return 'Macet';
  return 'Aktif';
}

function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return d;
  }
}

function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

export function renderInvestorPage(store) {
  const summary = store.getInvestorSummary ? store.getInvestorSummary() : {};
  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Investor & Modal',
        badge: 'MODAL',
        subtitle: 'Pencatatan Investor & Cicilan',
        showBack: true,
        backRoute: 'dashboard'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-24 gap-4">

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-primary-container rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm relative overflow-hidden">
            <div class="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-on-primary-container/10"></div>
            <span class="material-symbols-outlined text-on-primary-container/70 text-[18px]">account_balance_wallet</span>
            <span class="font-bold text-lg text-surface-bright font-tabular">${formatRupiah(summary.totalInvested || 0, '')}</span>
            <span class="text-[10px] text-primary-fixed-dim font-semibold uppercase tracking-wide">Total Diinvestasi</span>
          </div>
          <div class="bg-surface-container-lowest rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm border border-surface-container-high">
            <span class="material-symbols-outlined text-rose-600 text-[18px]">payments</span>
            <span class="font-bold text-lg text-rose-700 font-tabular">${formatRupiah(summary.totalOutstanding || 0, '')}</span>
            <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide">Sisa Kewajiban</span>
          </div>
          <div class="bg-surface-container-lowest rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm border border-surface-container-high">
            <span class="material-symbols-outlined text-blue-600 text-[18px]">people</span>
            <span class="font-bold text-lg text-blue-700 font-tabular">${summary.countAktif || 0}</span>
            <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide">Investor Aktif</span>
          </div>
          <div class="bg-surface-container-lowest rounded-2xl p-3.5 flex flex-col gap-1 shadow-sm border border-surface-container-high">
            <span class="material-symbols-outlined text-amber-600 text-[18px]">event_upcoming</span>
            <span class="font-bold text-lg text-amber-700 font-tabular">${formatRupiah(summary.totalCicilan || 0, '')}</span>
            <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide">Cicilan / Bulan</span>
          </div>
        </div>

        <!-- Action Button -->
        <button type="button" id="btn-tambah-investor"
          class="w-full h-12 py-3 bg-[#E05A2B] hover:bg-[#c94d22] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 bevel-accent active:scale-[0.98] transition-all shadow-md">
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span>+ Tambah Investor Baru</span>
        </button>

        <!-- View Controls & Header -->
        <div class="flex items-center justify-between pt-1">
          <div>
            <h3 class="text-sm font-bold text-on-surface">Data Investor</h3>
            <p class="text-[11px] text-on-surface-variant">Kolom lengkap rincian investasi</p>
          </div>
          <div class="inline-flex p-0.5 rounded-lg bg-surface-container border border-surface-container-high text-xs">
            <button type="button" id="toggle-view-table"
              class="px-2.5 py-1 rounded-md font-bold transition-all bg-surface-container-lowest text-primary shadow-xs">
              <span class="material-symbols-outlined text-[15px] align-middle mr-0.5">table_chart</span> Tabel
            </button>
            <button type="button" id="toggle-view-cards"
              class="px-2.5 py-1 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface">
              <span class="material-symbols-outlined text-[15px] align-middle mr-0.5">view_agenda</span> Kartu
            </button>
          </div>
        </div>

        <!-- Investor Content Container (Table & Card Views) -->
        <div id="investor-view-container" class="flex flex-col gap-3"></div>
      </div>

      <!-- Modal Tambah/Edit Investor -->
      <div id="investor-modal" class="hidden absolute inset-0 z-50 flex items-end justify-center overflow-hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" id="investor-modal-backdrop"></div>
        <div class="relative w-full max-w-[430px] bg-surface rounded-t-3xl shadow-2xl p-4 pb-6 flex flex-col gap-3 max-h-[92%] overflow-y-auto z-10">
          <div class="flex items-center justify-between border-b border-surface-container-high/60 pb-3 mb-1">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
              <div>
                <h3 class="font-bold text-sm text-on-surface" id="investor-modal-title">Tambah Investor</h3>
                <p class="text-[11px] text-on-surface-variant">Dana otomatis masuk sebagai Kas Pemasukan</p>
              </div>
            </div>
            <button id="btn-close-investor-modal" class="p-1.5 rounded-full bg-surface-container text-on-surface-variant active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <input type="hidden" id="investor-edit-id" value="" />

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">person</span> Nama Investor
              </label>
              <input type="text" id="inv-name" placeholder="Nama investor / pihak pemberi modal..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">calendar_today</span> Tanggal Masuk
              </label>
              <input type="date" id="inv-date"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">event_upcoming</span> Jatuh Tempo
              </label>
              <input type="date" id="inv-due-date"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
            </div>

            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">payments</span> Total Investasi (Rp)
              </label>
              <input type="number" id="inv-amount" placeholder="0" min="0"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">schedule</span> Tenor (Bulan)
              </label>
              <input type="number" id="inv-tenor" placeholder="6" min="1"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all text-center font-mono" />
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                  <span class="material-symbols-outlined text-amber-600 text-[14px]">currency_exchange</span> Cicilan / Bulan
                </label>
                <button type="button" id="btn-calc-cicilan" class="text-[10px] text-primary hover:text-primary/80 font-bold hover:underline" title="Hitung otomatis: Total / Tenor">
                  Hitung Otomatis
                </button>
              </div>
              <input type="number" id="inv-cicilan" placeholder="0" min="0"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono font-bold text-amber-800" />
            </div>

            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">description</span> Catatan / Perjanjian
              </label>
              <textarea id="inv-notes" rows="2" placeholder="Catatan kesepakatan, bagi hasil, atau nomor rekening..."
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"></textarea>
            </div>

            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-xs font-bold text-on-surface flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[14px]">account_balance</span> Metode Pembayaran
              </label>
              <select id="inv-payment"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai (Laci)">Tunai (Laci)</option>
                <option value="QRIS / E-Wallet">QRIS / E-Wallet</option>
              </select>
            </div>
          </div>

          <!-- Info box -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 mt-1">
            <span class="material-symbols-outlined text-blue-600 text-[18px] shrink-0 mt-0.5">info</span>
            <p class="text-[11px] text-blue-800">
              Dana investor akan otomatis dicatat sebagai <strong>Kas Pemasukan</strong> kategori <em>"Dana Investor"</em> dan menambah saldo kas toko.
            </p>
          </div>

          <button type="button" id="btn-save-investor"
            class="w-full h-12 bg-primary-container text-surface-bright rounded-xl text-sm font-bold flex items-center justify-center gap-2 bevel-primary active:scale-[0.99] transition-all shadow-md mt-1">
            <span class="material-symbols-outlined text-[18px]">save</span>
            <span id="btn-save-investor-label">Simpan & Catat ke Kas</span>
          </button>
        </div>
      </div>

      <!-- Modal Konfirmasi Hapus -->
      <div id="investor-delete-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6 overflow-hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" id="investor-delete-backdrop"></div>
        <div class="relative w-full max-w-[360px] bg-surface rounded-2xl shadow-2xl p-5 flex flex-col gap-3 z-10">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">delete_forever</span>
            </div>
            <div>
              <h3 class="font-bold text-sm text-on-surface">Hapus Data Investor?</h3>
              <p class="text-[11px] text-on-surface-variant">Data investasi akan dihapus permanen.</p>
            </div>
          </div>
          <p class="text-xs text-on-surface-variant bg-surface-container-low rounded-xl p-3">
            Catatan kas pemasukan yang sudah dibukukan <strong>tidak otomatis terhapus</strong> untuk menjaga keaslian buku kas.
          </p>
          <div class="flex items-center gap-2.5 mt-1">
            <button id="btn-cancel-delete-investor" class="flex-1 h-10 rounded-xl bg-surface-container text-on-surface text-sm font-bold border border-surface-container-high active:scale-95 transition-all">Batal</button>
            <button id="btn-confirm-delete-investor" class="flex-1 h-10 rounded-xl bg-rose-600 text-white text-sm font-bold active:scale-95 transition-all shadow-sm">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initInvestorPage(router, store) {
  bindHeaderEvents(router);
  let deletingId = null;
  let isEditMode = false;
  let currentViewMode = 'table'; // 'table' or 'cards'
  const phoneFrame = document.getElementById('phone-frame') || document.querySelector('.relative.mx-auto') || document.body;

  function g(id) {
    return document.getElementById(id);
  }

  function updateCicilanAuto(force = false) {
    const amount = parseFloat((g('inv-amount') || {}).value) || 0;
    const tenor = parseFloat((g('inv-tenor') || {}).value) || 0;
    const cicilanInput = g('inv-cicilan');
    if (!cicilanInput) return;

    if (force || !cicilanInput.value || parseFloat(cicilanInput.value) === 0) {
      if (amount > 0 && tenor > 0) {
        cicilanInput.value = Math.round(amount / tenor);
      }
    }
  }

  function renderView() {
    const container = g('investor-view-container');
    if (!container) return;
    const list = store.getInvestors ? store.getInvestors() : [];

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-surface-container-lowest rounded-2xl border border-surface-container-high text-on-surface-variant flex flex-col items-center gap-2 shadow-xs">
          <span class="material-symbols-outlined text-4xl opacity-30">account_balance_wallet</span>
          <p class="text-sm font-bold text-on-surface">Belum ada data investor</p>
          <p class="text-xs">Klik tombol <strong>+ Tambah Investor Baru</strong> di atas untuk mulai mencatat modal investasi.</p>
        </div>
      `;
      return;
    }

    if (currentViewMode === 'table') {
      container.innerHTML = `
        <div class="bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-surface-container-low/70 border-b border-surface-container-high text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                  <th class="py-3 px-3 min-w-[90px]">Tanggal</th>
                  <th class="py-3 px-3 min-w-[130px]">Investor</th>
                  <th class="py-3 px-3 min-w-[110px] text-right">Total Inves</th>
                  <th class="py-3 px-3 min-w-[100px]">Jatuh Tempo</th>
                  <th class="py-3 px-2 min-w-[65px] text-center">Tenor</th>
                  <th class="py-3 px-3 min-w-[100px] text-right">Cicilan</th>
                  <th class="py-3 px-3 min-w-[90px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-container-high/60">
                ${list.map((inv) => {
                  const cicilan = inv.cicilan !== undefined ? inv.cicilan : (inv.tenor > 0 ? Math.round(inv.totalAmount / inv.tenor) : 0);
                  const days = daysUntilDue(inv.dueDate);
                  let dueBadge = '';
                  if (days !== null) {
                    if (days < 0) dueBadge = '<span class="text-[9px] text-rose-600 font-bold block">Lewat tempo</span>';
                    else if (days === 0) dueBadge = '<span class="text-[9px] text-rose-600 font-bold block">Hari ini</span>';
                    else if (days <= 30) dueBadge = `<span class="text-[9px] text-amber-600 font-semibold block">${days} hr lg</span>`;
                  }
                  const badge = statusBadge(inv.status || 'aktif');
                  const label = statusLabel(inv.status || 'aktif');

                  return `
                    <tr class="hover:bg-surface-container-low/40 transition-colors">
                      <td class="py-3 px-3 font-medium text-on-surface whitespace-nowrap">
                        ${formatDate(inv.date)}
                      </td>
                      <td class="py-3 px-3">
                        <div class="font-bold text-on-surface">${inv.investorName}</div>
                        <span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${badge} mt-0.5">${label}</span>
                      </td>
                      <td class="py-3 px-3 text-right font-bold text-primary font-tabular whitespace-nowrap">
                        ${formatRupiah(inv.totalAmount, '')}
                      </td>
                      <td class="py-3 px-3 whitespace-nowrap">
                        <span class="text-on-surface font-medium">${formatDate(inv.dueDate)}</span>
                        ${dueBadge}
                      </td>
                      <td class="py-3 px-2 text-center font-bold text-on-surface font-tabular">
                        ${inv.tenor || '-'}<span class="text-[10px] font-normal text-on-surface-variant block">bln</span>
                      </td>
                      <td class="py-3 px-3 text-right font-bold text-rose-700 font-tabular whitespace-nowrap">
                        ${formatRupiah(cicilan, '')}
                      </td>
                      <td class="py-3 px-3 text-center whitespace-nowrap">
                        <div class="inline-flex items-center gap-1">
                          <button type="button" data-edit-investor="${inv.id}" title="Edit"
                            class="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant active:scale-95 transition-all">
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          ${(inv.status || 'aktif') !== 'lunas' ? `
                            <button type="button" data-lunas-investor="${inv.id}" title="Tandai Lunas"
                              class="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95 transition-all border border-emerald-200">
                              <span class="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                          ` : ''}
                          <button type="button" data-delete-investor="${inv.id}" title="Hapus"
                            class="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 transition-all border border-rose-200">
                              <span class="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="p-2.5 bg-surface-container-low/40 border-t border-surface-container-high text-[11px] text-on-surface-variant flex items-center justify-between">
            <span>Geser tabel ke samping untuk melihat kolom penuh</span>
            <span class="font-bold text-primary font-tabular">${list.length} Investor Terdaftar</span>
          </div>
        </div>
      `;
    } else {
      // Cards view
      container.innerHTML = list.map((inv) => {
        const cicilan = inv.cicilan !== undefined ? inv.cicilan : (inv.tenor > 0 ? Math.round(inv.totalAmount / inv.tenor) : 0);
        const days = daysUntilDue(inv.dueDate);
        let daysLabel = '';
        let daysClass = 'text-on-surface-variant';
        if (days !== null) {
          if (days < 0) { daysLabel = 'Lewat jatuh tempo!'; daysClass = 'text-rose-600 font-bold'; }
          else if (days === 0) { daysLabel = 'Jatuh tempo hari ini!'; daysClass = 'text-rose-600 font-bold'; }
          else if (days <= 30) { daysLabel = `${days} hari lagi`; daysClass = 'text-amber-600 font-semibold'; }
          else { daysLabel = `${days} hari lagi`; }
        }
        const badge = statusBadge(inv.status || 'aktif');
        const label = statusLabel(inv.status || 'aktif');

        return `
          <div class="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-xs overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="flex items-start justify-between gap-2 p-3.5 pb-2">
              <div class="flex items-start gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                  <span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-bold text-sm text-on-surface truncate">${inv.investorName}</span>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${badge}">${label}</span>
                    <span class="text-[10px] text-on-surface-variant">${formatDate(inv.date)}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end shrink-0">
                <span class="font-bold text-sm text-primary font-tabular">${formatRupiah(inv.totalAmount, '')}</span>
                <span class="text-[10px] text-on-surface-variant">Total Inves</span>
              </div>
            </div>

            <!-- Data Grid -->
            <div class="grid grid-cols-3 gap-0 divide-x divide-surface-container-high mx-3.5 mb-2.5 bg-surface-container-low/50 rounded-xl border border-surface-container-high overflow-hidden">
              <div class="flex flex-col items-center py-2 px-1 text-center">
                <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide mb-0.5">Tenor</span>
                <span class="font-bold text-sm text-on-surface font-tabular">${inv.tenor || '-'}</span>
                <span class="text-[10px] text-on-surface-variant">Bulan</span>
              </div>
              <div class="flex flex-col items-center py-2 px-1 text-center">
                <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide mb-0.5">Cicilan</span>
                <span class="font-bold text-xs text-rose-700 font-tabular">${formatRupiah(cicilan, '')}</span>
                <span class="text-[10px] text-on-surface-variant">/bulan</span>
              </div>
              <div class="flex flex-col items-center py-2 px-1 text-center">
                <span class="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wide mb-0.5">Jatuh Tempo</span>
                <span class="font-bold text-xs text-on-surface font-tabular">${formatDate(inv.dueDate)}</span>
                ${daysLabel ? `<span class="text-[10px] ${daysClass}">${daysLabel}</span>` : ''}
              </div>
            </div>

            ${inv.notes ? `
              <p class="text-[11px] text-on-surface-variant italic px-3.5 pb-2 truncate">${inv.notes}</p>
            ` : ''}

            <!-- Action Bar -->
            <div class="border-t border-surface-container-high/60 px-3 py-2 flex items-center gap-2">
              <button type="button" data-edit-investor="${inv.id}"
                class="flex-1 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all">
                <span class="material-symbols-outlined text-[15px]">edit_note</span>
                <span>Edit</span>
              </button>
              ${(inv.status || 'aktif') !== 'lunas' ? `
                <button type="button" data-lunas-investor="${inv.id}"
                  class="flex-1 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all border border-emerald-200">
                  <span class="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Tandai Lunas</span>
                </button>
              ` : ''}
              <button type="button" data-delete-investor="${inv.id}"
                class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center active:scale-95 transition-all border border-rose-200">
                <span class="material-symbols-outlined text-[15px]">delete_outline</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    bindListActions();
  }

  function bindListActions() {
    const container = g('investor-view-container');
    if (!container) return;

    // Edit button
    container.querySelectorAll('[data-edit-investor]').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.getAttribute('data-edit-investor')));
    });

    // Lunas button
    container.querySelectorAll('[data-lunas-investor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-lunas-investor');
        store.updateInvestor(id, { status: 'lunas' });
        showToast('Status investasi ditandai Lunas!', 'success', 2500);
        renderView();
        refreshSummary();
      });
    });

    // Delete button
    container.querySelectorAll('[data-delete-investor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        deletingId = btn.getAttribute('data-delete-investor');
        const dm = g('investor-delete-modal');
        if (dm) dm.classList.remove('hidden');
      });
    });
  }

  function refreshSummary() {
    const s = store.getInvestorSummary ? store.getInvestorSummary() : {};
    const kpiEls = document.querySelectorAll('.font-bold.text-lg.font-tabular');
    if (kpiEls.length >= 4) {
      kpiEls[0].textContent = formatRupiah(s.totalInvested || 0, '').replace('Rp ', '');
      kpiEls[1].textContent = formatRupiah(s.totalOutstanding || 0, '').replace('Rp ', '');
      kpiEls[2].textContent = s.countAktif || 0;
      kpiEls[3].textContent = formatRupiah(s.totalCicilan || 0, '').replace('Rp ', '');
    }
  }

  function openModal(id) {
    isEditMode = !!id;
    const inv = id && store.getInvestorById ? store.getInvestorById(id) : null;
    g('investor-modal-title').textContent = isEditMode ? 'Edit Data Investor' : 'Tambah Investor Baru';
    g('btn-save-investor-label').textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan & Catat ke Kas';
    g('investor-edit-id').value = id || '';

    const today = new Date().toISOString().split('T')[0];
    g('inv-name').value = inv ? inv.investorName : '';
    g('inv-date').value = inv ? (inv.date || today) : today;
    g('inv-due-date').value = inv ? (inv.dueDate || '') : '';
    g('inv-amount').value = inv ? (inv.totalAmount || '') : '';
    g('inv-tenor').value = inv ? (inv.tenor || '') : '';
    g('inv-cicilan').value = inv ? (inv.cicilan !== undefined ? inv.cicilan : '') : '';
    g('inv-notes').value = inv ? (inv.notes || '') : '';
    g('inv-payment').value = inv ? (inv.paymentMethod || 'Transfer Bank') : 'Transfer Bank';

    if (!inv) {
      updateCicilanAuto(true);
    }
    const modal = g('investor-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal() {
    const modal = g('investor-modal');
    if (modal) modal.classList.add('hidden');
    isEditMode = false;
  }

  // Bind view switcher
  const btnTable = g('toggle-view-table');
  const btnCards = g('toggle-view-cards');
  if (btnTable && btnCards) {
    btnTable.addEventListener('click', () => {
      currentViewMode = 'table';
      btnTable.className = 'px-2.5 py-1 rounded-md font-bold transition-all bg-surface-container-lowest text-primary shadow-xs';
      btnCards.className = 'px-2.5 py-1 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface';
      renderView();
    });

    btnCards.addEventListener('click', () => {
      currentViewMode = 'cards';
      btnCards.className = 'px-2.5 py-1 rounded-md font-bold transition-all bg-surface-container-lowest text-primary shadow-xs';
      btnTable.className = 'px-2.5 py-1 rounded-md font-semibold transition-all text-on-surface-variant hover:text-on-surface';
      renderView();
    });
  }

  // Bind tambah button
  const btnTambah = g('btn-tambah-investor');
  if (btnTambah) {
    btnTambah.addEventListener('click', () => openModal(null));
  }

  // Real-time cicilan computation (auto-fills if empty)
  ['inv-amount', 'inv-tenor'].forEach((id) => {
    const el = g(id);
    if (el) el.addEventListener('input', () => updateCicilanAuto(false));
  });

  // Explicit auto-calculate button
  const btnCalc = g('btn-calc-cicilan');
  if (btnCalc) {
    btnCalc.addEventListener('click', () => updateCicilanAuto(true));
  }

  // Modal close and outside clicks
  document.addEventListener('click', function(e) {
    const t = e.target;
    if (!t) return;

    if (t.id === 'investor-modal-backdrop' || (t.closest && t.closest('#btn-close-investor-modal'))) {
      closeModal();
      return;
    }

    if (t.id === 'investor-delete-backdrop' || t.id === 'btn-cancel-delete-investor') {
      const dm = g('investor-delete-modal');
      if (dm) dm.classList.add('hidden');
      deletingId = null;
      return;
    }

    if (t.id === 'btn-confirm-delete-investor') {
      if (deletingId) {
        store.deleteInvestor(deletingId);
        showToast('Data investor berhasil dihapus.', 'info', 2000);
        deletingId = null;
      }
      const dm = g('investor-delete-modal');
      if (dm) dm.classList.add('hidden');
      renderView();
      refreshSummary();
      return;
    }

    if (t.closest && t.closest('#btn-save-investor')) {
      const name = (g('inv-name') || {}).value?.trim() || '';
      const date = (g('inv-date') || {}).value || '';
      const due = (g('inv-due-date') || {}).value || '';
      const amount = parseFloat((g('inv-amount') || {}).value) || 0;
      const tenor = parseInt((g('inv-tenor') || {}).value) || 0;
      const notes = (g('inv-notes') || {}).value?.trim() || '';
      const payment = (g('inv-payment') || {}).value || 'Transfer Bank';
      const editId = (g('investor-edit-id') || {}).value || '';

      if (!name) {
        showToast('Nama investor wajib diisi!', 'error');
        return;
      }
      if (amount <= 0) {
        showToast('Total investasi harus lebih dari Rp 0!', 'error');
        return;
      }
      if (tenor <= 0) {
        showToast('Tenor harus minimal 1 bulan!', 'error');
        return;
      }

      let cicilan = parseFloat((g('inv-cicilan') || {}).value);
      if (isNaN(cicilan) || cicilan <= 0) {
        cicilan = tenor > 0 ? Math.round(amount / tenor) : 0;
      }
      const data = {
        investorName: name,
        date,
        dueDate: due,
        totalAmount: amount,
        tenor,
        cicilan,
        notes,
        paymentMethod: payment
      };

      if (editId) {
        store.updateInvestor(editId, data);
        showToast('Data investor berhasil diperbarui!', 'success', 2500);
      } else {
        store.addInvestor(data);
        showToast(`Dana investor Rp ${formatRupiah(amount, '')} berhasil dicatat ke Kas!`, 'success', 3500);
      }
      closeModal();
      renderView();
      refreshSummary();
    }
  });

  // Ensure modals are inside phone frame for correct backdrop sizing
  ['investor-modal', 'investor-delete-modal'].forEach((mid) => {
    const el = g(mid);
    if (el && el.parentElement !== phoneFrame) {
      phoneFrame.appendChild(el);
    }
  });

  renderView();
}
