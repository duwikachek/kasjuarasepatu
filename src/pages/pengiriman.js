import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';

const STATUS_CONFIG = {
  kemas:   { label: 'Kemas',   icon: 'inventory_2',    color: 'text-amber-900',   bg: 'glass-amber',     badge: 'glass-chip text-amber-800',            dot: 'bg-amber-500',   nextStatus: 'kirim',   nextLabel: 'Siap Kirim' },
  kirim:   { label: 'Kirim',   icon: 'local_shipping',  color: 'text-blue-900',    bg: 'glass-blue',      badge: 'glass-chip text-blue-800',             dot: 'bg-blue-500',    nextStatus: 'selesai', nextLabel: 'Selesai' },
  hold:    { label: 'Hold',    icon: 'pause_circle',    color: 'text-rose-900',    bg: 'glass-rose',      badge: 'glass-chip text-rose-800',             dot: 'bg-rose-500',    nextStatus: 'kemas',   nextLabel: 'Lanjut Kemas' },
  selesai: { label: 'Selesai', icon: 'check_circle',    color: 'text-emerald-900', bg: 'glass-emerald',   badge: 'glass-chip text-emerald-800',          dot: 'bg-emerald-500', nextStatus: null,      nextLabel: null }
};

function tabBtnHtml(tab, isActive) {
  const cfg = STATUS_CONFIG[tab];
  const cls = isActive
    ? `shipment-tab-btn flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all glass-seg-active ${cfg.color}`
    : 'shipment-tab-btn flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all text-on-surface-variant';
  return `<button type="button" data-shipment-tab="${tab}" class="${cls}"><span class="material-symbols-outlined text-[15px]">${cfg.icon}</span><span>${cfg.label}</span></button>`;
}

function statusPillHtml(st) {
  const cfg = STATUS_CONFIG[st];
  return `<button type="button" data-status-pill="${st}" class="shipment-status-pill flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 border-transparent text-[10px] font-bold ${cfg.bg} ${cfg.color} active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">${cfg.icon}</span><span>${cfg.label}</span></button>`;
}

export function renderPengirimanPage(store, activeTab) {
  activeTab = activeTab || 'kemas';
  const summary = store.getShipmentSummary ? store.getShipmentSummary() : {};
  const tabs = ['kemas', 'kirim', 'hold', 'selesai'];
  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({ title: 'Pengiriman', badge: 'KIRIM', subtitle: 'Kelola Status Pengiriman Sepatu' })}
      <div class="flex flex-col w-full px-4 pt-3 pb-20 gap-4">
        <div class="grid grid-cols-4 gap-2">
          <div class="glass-amber glass-sheen rounded-xl p-2.5 flex flex-col items-center text-center"><span class="material-symbols-outlined text-amber-700 text-[20px]">inventory_2</span><span class="font-bold text-base text-amber-950 font-tabular" id="kpi-kemas">${summary.countKemas || 0}</span><span class="text-[10px] text-amber-800 font-semibold">Kemas</span></div>
          <div class="glass-blue glass-sheen rounded-xl p-2.5 flex flex-col items-center text-center"><span class="material-symbols-outlined text-blue-700 text-[20px]">local_shipping</span><span class="font-bold text-base text-blue-950 font-tabular" id="kpi-kirim">${summary.countKirim || 0}</span><span class="text-[10px] text-blue-800 font-semibold">Kirim</span></div>
          <div class="glass-rose glass-sheen rounded-xl p-2.5 flex flex-col items-center text-center"><span class="material-symbols-outlined text-rose-700 text-[20px]">pause_circle</span><span class="font-bold text-base text-rose-950 font-tabular" id="kpi-hold">${summary.countHold || 0}</span><span class="text-[10px] text-rose-800 font-semibold">Hold</span></div>
          <div class="glass-emerald glass-sheen rounded-xl p-2.5 flex flex-col items-center text-center"><span class="material-symbols-outlined text-emerald-700 text-[20px]">check_circle</span><span class="font-bold text-base text-emerald-950 font-tabular" id="kpi-selesai">${summary.countSelesai || 0}</span><span class="text-[10px] text-emerald-800 font-semibold">Selesai</span></div>
        </div>
        <div class="glass-track p-1.5 rounded-xl flex items-center gap-1">${tabs.map(t => tabBtnHtml(t, t === activeTab)).join('')}</div>
        <div id="shipment-list-container" class="flex flex-col gap-3"></div>
      </div>
      <div id="shipment-edit-modal" class="hidden absolute inset-0 z-50 flex items-end justify-center overflow-hidden">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" id="shipment-modal-backdrop"></div>
        <div class="relative w-full max-w-[430px] glass-sheet rounded-t-3xl p-4 pb-6 flex flex-col gap-3.5 max-h-[85%] overflow-y-auto z-10">
          <div class="flex items-center justify-between border-b border-white/55 pb-3">
            <div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-full glass-chip text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">local_shipping</span></div><div><h3 class="font-bold text-sm text-on-surface">Update Pengiriman</h3><p id="shipment-modal-subtitle" class="text-[11px] text-on-surface-variant"></p></div></div>
            <button id="btn-close-shipment-modal" class="p-1.5 rounded-full glass-chip-btn text-on-surface-variant"><span class="material-symbols-outlined text-[18px]">close</span></button>
          </div>
          <div class="flex flex-col gap-1.5"><label class="text-xs font-bold text-on-surface">Ubah Status Pengiriman</label><div class="grid grid-cols-4 gap-1.5" id="shipment-status-pills">${Object.keys(STATUS_CONFIG).map(statusPillHtml).join('')}</div></div>
          <div class="flex flex-col gap-1"><label class="text-xs font-bold text-on-surface">Kurir / Ekspedisi</label><input type="text" id="shipment-courier" placeholder="JNE, J&amp;T, SiCepat, GoSend..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all" /></div>
          <div class="flex flex-col gap-1"><label class="text-xs font-bold text-on-surface">No. Resi (Opsional)</label><input type="text" id="shipment-resi" placeholder="Nomor resi pengiriman..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all" /></div>
          <div class="flex flex-col gap-1"><label class="text-xs font-bold text-on-surface">Catatan (Opsional)</label><textarea id="shipment-note" rows="2" placeholder="Catatan khusus..." class="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"></textarea></div>
          <button id="btn-save-shipment" class="glass-primary glass-btn glass-sheen w-full h-12 text-primary-btn rounded-xl text-sm font-bold flex items-center justify-center gap-2"><span class="material-symbols-outlined text-[18px]">save</span><span>Simpan Update Pengiriman</span></button>
        </div>
      </div>
    </div>
  `;
}

export function initPengirimanPage(router, store, activeTab) {
  activeTab = activeTab || 'kemas';
  bindHeaderEvents(router);
  let currentTab = activeTab;
  let editingTrxId = null;
  let selectedStatus = null;
  const phoneFrame = document.getElementById('phone-frame') || document.querySelector('.relative.mx-auto') || document.body;
  function g(id) { return document.getElementById(id); }

  function renderList() {
    const container = g('shipment-list-container');
    if (!container) return;
    const list = store.getShipments ? store.getShipments(currentTab) : [];
    const cfg = STATUS_CONFIG[currentTab];
    if (!list || list.length === 0) {
      container.innerHTML = `<div class="p-8 text-center glass-card glass-sheen rounded-2xl text-on-surface-variant flex flex-col items-center gap-2"><span class="material-symbols-outlined text-4xl opacity-30">${cfg.icon}</span><p class="text-sm font-semibold">Tidak ada paket di tahap "${cfg.label}"</p><p class="text-xs">Belum ada atau sudah dipindahkan.</p></div>`;
      return;
    }
    container.innerHTML = list.map(trx => {
      const itemCount = trx.items && trx.items.length > 0 ? trx.items.length : 1;
      const itemPreview = trx.items && trx.items.length > 0 ? trx.items.map(it => it.name || it.barcode || 'Sepatu').join(', ') : (trx.productName || 'Penjualan Sepatu');
      const nextCfg = cfg.nextStatus ? STATUS_CONFIG[cfg.nextStatus] : null;
      return `
        <div class="glass-card glass-sheen rounded-xl overflow-hidden flex flex-col">
          <div class="flex items-start justify-between gap-3 p-3.5">
            <div class="flex items-start gap-2.5 min-w-0">
              ${(trx.photo || (trx.items && trx.items[0] && trx.items[0].photo)) ? `
                <img src="${trx.photo || trx.items[0].photo}" class="w-10 h-10 rounded-xl object-cover border border-white/70 shrink-0" alt="Foto" />
              ` : ''}
              <div class="flex flex-col min-w-0">
                <span class="font-bold text-sm text-on-surface truncate">${trx.buyer || 'Tanpa Nama'}</span>
                <span class="text-[11px] text-on-surface-variant truncate">${trx.nota || trx.id}</span>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span class="px-1.5 py-0.5 rounded font-bold text-[10px] ${cfg.badge} flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px]">${cfg.icon}</span><span>${cfg.label}</span></span>
                  ${trx.shippingCourier ? `<span class="px-1.5 py-0.5 rounded text-[10px] glass-chip font-semibold">${trx.shippingCourier}</span>` : ''}
                  <span class="text-[10px] text-on-surface-variant">${trx.time || ''}</span>
                </div>
              </div>
            </div>
            <div class="flex flex-col items-end shrink-0"><span class="font-bold text-sm text-emerald-700 font-tabular">+${formatRupiah(trx.amount, '')}</span><span class="text-[10px] text-on-surface-variant">${itemCount} pasang</span></div>
          </div>
          <div class="px-3.5 pb-2">
            <p class="text-[11px] text-on-surface-variant truncate">${itemPreview}</p>
            ${trx.shippingResi ? `<p class="text-[11px] text-primary font-mono mt-0.5">${trx.shippingResi}</p>` : ''}
            ${trx.shippingNote ? `<p class="text-[10px] text-on-surface-variant italic mt-0.5">${trx.shippingNote}</p>` : ''}
          </div>
          <div class="border-t border-white/45 px-3 py-2 flex items-center gap-2">
            <button type="button" data-edit-shipment="${trx.id}" class="glass-chip-btn flex-1 py-2 rounded-xl text-on-secondary-container text-xs font-bold flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-[15px]">edit_note</span><span>Update</span></button>
            ${nextCfg ? `<button type="button" data-quick-next="${trx.id}" data-next-status="${cfg.nextStatus}" class="glass-primary glass-btn flex-1 py-2 rounded-xl text-primary-btn text-xs font-bold flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-[15px]">${nextCfg.icon}</span><span>${cfg.nextLabel}</span></button>` : ''}
            ${currentTab !== 'hold' ? `<button type="button" data-hold-shipment="${trx.id}" class="glass-rose glass-btn px-3 py-2 rounded-xl text-rose-700 text-xs font-bold flex items-center justify-center"><span class="material-symbols-outlined text-[15px]">pause_circle</span></button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-quick-next]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); const id = btn.getAttribute('data-quick-next'); const next = btn.getAttribute('data-next-status'); store.updateShipmentStatus(id, { status: next }); showToast('Status: ' + STATUS_CONFIG[next].label, 'success', 2000); updateKpi(); renderList(); });
    });
    container.querySelectorAll('[data-hold-shipment]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); store.updateShipmentStatus(btn.getAttribute('data-hold-shipment'), { status: 'hold' }); showToast('Pengiriman di-hold!', 'info', 2000); updateKpi(); renderList(); });
    });
    container.querySelectorAll('[data-edit-shipment]').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openModal(btn.getAttribute('data-edit-shipment')); });
    });
  }

  function updateKpi() {
    const s = store.getShipmentSummary ? store.getShipmentSummary() : {};
    ['kemas','kirim','hold','selesai'].forEach(k => { const el = g('kpi-' + k); if (el) el.textContent = s['count' + k.charAt(0).toUpperCase() + k.slice(1)] || 0; });
  }

  function openModal(id) {
    editingTrxId = id;
    const trx = store.getTransactionById ? store.getTransactionById(id) : null;
    if (!trx) return;
    selectedStatus = trx.shippingStatus || 'kemas';
    const subtitle = g('shipment-modal-subtitle'); if (subtitle) subtitle.textContent = (trx.buyer ? trx.buyer + ' - ' : '') + (trx.nota || id);
    const c = g('shipment-courier'); if (c) c.value = trx.shippingCourier || '';
    const r = g('shipment-resi'); if (r) r.value = trx.shippingResi || '';
    const n = g('shipment-note'); if (n) n.value = trx.shippingNote || '';
    highlightPill(selectedStatus);
    const modal = g('shipment-edit-modal'); if (modal) modal.classList.remove('hidden');
  }

  function highlightPill(status) {
    document.querySelectorAll('.shipment-status-pill').forEach(p => {
      const st = p.getAttribute('data-status-pill');
      if (st === status) { p.classList.add('ring-2','ring-current','ring-offset-1'); p.style.borderColor = 'currentColor'; }
      else { p.classList.remove('ring-2','ring-current','ring-offset-1'); p.style.borderColor = 'transparent'; }
    });
  }

  function closeModal() {
    const modal = g('shipment-edit-modal'); if (modal) modal.classList.add('hidden');
    editingTrxId = null; selectedStatus = null;
  }

  document.querySelectorAll('.shipment-status-pill').forEach(p => {
    p.addEventListener('click', () => { selectedStatus = p.getAttribute('data-status-pill'); highlightPill(selectedStatus); });
  });

  document.addEventListener('click', function(e) {
    const t = e.target; if (!t) return;
    if (t.id === 'shipment-modal-backdrop') { closeModal(); return; }
    if (t.closest && t.closest('#btn-close-shipment-modal')) { closeModal(); return; }
    if (t.closest && t.closest('#btn-save-shipment') && editingTrxId) {
      const courier = (g('shipment-courier') || {}).value || '';
      const resi = (g('shipment-resi') || {}).value || '';
      const note = (g('shipment-note') || {}).value || '';
      store.updateShipmentStatus(editingTrxId, { status: selectedStatus, courier, resi, note });
      showToast('Diperbarui: ' + STATUS_CONFIG[selectedStatus].label, 'success', 2000);
      closeModal(); updateKpi(); renderList();
    }
  });

  document.querySelectorAll('.shipment-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.getAttribute('data-shipment-tab');
      document.querySelectorAll('.shipment-tab-btn').forEach(b => {
        const bTab = b.getAttribute('data-shipment-tab');
        const bCfg = STATUS_CONFIG[bTab];
        b.className = bTab === currentTab
          ? `shipment-tab-btn flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all glass-seg-active ${bCfg.color}`
          : 'shipment-tab-btn flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all text-on-surface-variant';
      });
      renderList();
    });
  });

  const modalEl = g('shipment-edit-modal');
  if (modalEl && modalEl.parentElement !== phoneFrame) { phoneFrame.appendChild(modalEl); }
  renderList();
}