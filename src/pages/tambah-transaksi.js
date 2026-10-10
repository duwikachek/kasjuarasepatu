import { parseRupiah, formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { compressImageFile } from '../utils/image.js';
import { Html5Qrcode } from 'html5-qrcode';
import {
  buildScannerConfig1D,
  createScanDebouncer,
  enhanceVideoElement,
  checkCameraSupport,
  describeCameraError,
  playBeep
} from '../utils/barcode-scanner-config.js';

const KATEGORI_KELUAR = [
  { label: 'BIAYA FO SHP', desc: 'Free Ongkir Shopee', icon: 'local_shipping' },
  { label: 'BIAYA RETUR', desc: 'Retur barang / komplain', icon: 'replay' },
  { label: 'BIAYA OPERASIONAL', desc: 'Makan, bensin, listrik', icon: 'storefront' },
  { label: 'BIAYA GAJI', desc: 'Gaji karyawan toko', icon: 'payments' },
  { label: 'BIAYA PACKING', desc: 'Kardus, bubble, lakban', icon: 'inventory_2' },
  { label: 'BIAYA BELANJA SEPATU', desc: 'Belanja stock sepatu', icon: 'shopping_bag' },
  { label: 'BIAYA ONGKIR BELANJA', desc: 'Ongkos kirim kargo', icon: 'local_shipping' },
  { label: 'BIAYA SEWA', desc: 'Sewa toko / ruko', icon: 'apartment' },
  { label: 'DANA KEPERLUAN', desc: 'Keperluan darurat / lain', icon: 'account_balance_wallet' }
];

function genItemId() { return 'sale-item-' + Date.now() + '-' + Math.floor(Math.random() * 9999); }

function renderSaleItemCard(item, index, totalItems) {
  const num = index + 1;
  const priceVal = item.price ? formatRupiah(item.price, '') : '';
  return `
 <div class="sale-item-card glass-card glass-sheen rounded-2xl p-3.5 flex flex-col gap-2.5" data-sale-item-id="${item.id}">
      <div class="flex items-center justify-between border-b border-white/45 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">${num}</span>
          <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">Sepatu #${num}</span>
 ${item.barcode ? `<span class="font-mono text-[10px] text-on-surface-variant glass-chip px-1.5 py-0.5 rounded">${item.barcode}</span>` : ''}
        </div>
        ${totalItems > 1 ? `<button type="button" class="btn-remove-sale-item text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-rose-50 active:scale-95 transition-all" data-sale-item-id="${item.id}"><span class="material-symbols-outlined text-[15px]">delete</span><span>Hapus</span></button>` : ''}
      </div>
      <div class="sale-item-name-row ${item.name ? 'flex' : 'hidden'} items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2" data-sale-item-id="${item.id}">
        <span class="sale-item-name-label font-label-md text-xs font-bold text-emerald-900 truncate">${item.name || ''}</span>
        ${item.kondisi === 'Minus' ? '<span class="kondisi-badge ml-auto shrink-0 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full">⚠ Minus</span>' : (item.name ? '<span class="kondisi-badge ml-auto shrink-0 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full">✓ Bagus</span>' : '')}
      </div>
      <!-- Input Barcode & List Stok Belum Terjual -->
      <div class="stock-dropdown-wrapper flex flex-col w-full">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-on-surface-variant pointer-events-none"><span class="material-symbols-outlined text-[17px]">qr_code</span></span>
            <input 
              type="text" 
 class="sale-item-barcode w-full pl-9 pr-8 py-2 rounded-xl glass-input text-on-surface font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all" 
              placeholder="Scan / ketik / pilih dari stok..." 
              value="${item.barcode || ''}" 
              data-sale-item-id="${item.id}"
              autocomplete="off"
            />
            <button 
              type="button" 
              class="btn-toggle-stock-dropdown absolute right-2 top-2 text-on-surface-variant hover:text-primary transition-all p-0.5 rounded active:scale-95" 
              data-sale-item-id="${item.id}" 
              title="Tampilkan daftar sepatu di stok yang belum terjual"
            >
              <span class="material-symbols-outlined text-[20px] pointer-events-none">arrow_drop_down</span>
            </button>
          </div>
          <button 
            type="button" 
 class="btn-sale-item-camera px-3 py-2 rounded-xl glass-primary glass-btn text-primary-btn font-label-md text-xs font-bold flex items-center gap-1 shrink-0" 
            data-sale-item-id="${item.id}"
            title="Scan Barcode via Kamera HP"
          >
            <span class="material-symbols-outlined text-[17px]">photo_camera</span>
            <span>Scan</span>
          </button>
        </div>

        <!-- LIST SEPATU DI STOK (IN-FLOW EXPANDABLE, BEBAS TUMPANG TINDIH) -->
        <div 
 class="stock-dropdown-popup hidden w-full mt-2 max-h-72 overflow-y-auto glass-sheet rounded-2xl p-2 flex flex-col gap-1 transition-all border border-white/30" 
          data-sale-item-id="${item.id}"
        >
        </div>
      </div>

      <!-- Warning Barcode Dobel di Daftar Sepatu Terjual -->
      <div class="sale-item-barcode-warning hidden text-xs font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-xl p-2.5 flex items-start gap-1.5 shadow-xs transition-all" data-sale-item-id="${item.id}">
        <span class="material-symbols-outlined text-rose-600 text-base leading-none shrink-0 mt-0.5">warning</span>
        <div class="sale-item-warning-text leading-snug flex-1"></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <span class="absolute left-3 top-2.5 text-xs text-on-surface-variant font-bold">Rp</span>
 <input type="text" class="sale-item-price w-full pl-8 pr-3 py-2 rounded-xl glass-input text-on-surface font-bold text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-on-tertiary-container" placeholder="Harga jual..." value="${priceVal}" inputmode="numeric" data-sale-item-id="${item.id}" />
        </div>
        <span class="text-[10px] text-on-surface-variant font-semibold shrink-0">Harga Jual</span>
      </div>
    </div>
  `;
}

export function renderTambahTransaksiPage(store, params = {}) {
  const isEdit = Boolean(params && params.editId);
  const existingTrx = isEdit ? store.getTransactionById(params.editId) : null;
  const initialType = existingTrx ? existingTrx.type : (params.type === 'keluar' ? 'keluar' : 'masuk');

  let initialItems = [];
  if (isEdit && existingTrx && existingTrx.items && existingTrx.items.length > 0) {
    initialItems = existingTrx.items.map((it) => ({ id: genItemId(), barcode: it.barcode || '', name: it.name || '', kondisi: it.kondisi || 'Bagus', price: it.price || 0, photo: it.photo || null }));
    if (params && params.autoAddNewItem) {
      initialItems.push({ id: genItemId(), barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null });
    }
  } else if (isEdit && existingTrx) {
    initialItems = [{ id: genItemId(), barcode: existingTrx.barcode || '', name: existingTrx.productName || '', kondisi: existingTrx.kondisi || 'Bagus', price: existingTrx.amount || 0, photo: existingTrx.photo || null }];
    if (params && params.autoAddNewItem) {
      initialItems.push({ id: genItemId(), barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null });
    }
  } else {
    initialItems = [{ id: genItemId(), barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null }];
  }

  const defaultBuyer = existingTrx ? (existingTrx.buyer || '') : '';
  const defaultOngkir = existingTrx ? (existingTrx.ongkir || 'FO') : 'FO';
  const defaultNote = existingTrx ? (existingTrx.note || '') : '';
  const defaultKeterangan = existingTrx ? (existingTrx.title || existingTrx.keterangan || '') : '';
  const defaultCategory = existingTrx ? (existingTrx.category || KATEGORI_KELUAR[0].label) : KATEGORI_KELUAR[0].label;
  const defaultNominalKeluar = (existingTrx && existingTrx.type === 'keluar') ? formatRupiah(existingTrx.amount, '') : '';
  const defaultPhoto = existingTrx ? (existingTrx.photo || '') : '';
  const defaultDate = existingTrx ? (existingTrx.date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
  const totalItemsPrice = initialItems.reduce((s, it) => s + (Number(it.price) || 0), 0);

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-16">
      ${renderHeader({ title: isEdit ? 'Edit Transaksi' : 'Tambah Transaksi', badge: 'Form Kas', subtitle: isEdit ? ('Perbarui ' + (existingTrx.nota || 'Transaksi')) : 'Catat Arus Kas Toko', showBack: true, backRoute: 'transaksi', rightAction: { label: 'Simpan', icon: 'check_circle', actionId: 'btn-save-header' } })}

      <form id="form-tambah-trx" novalidate class="flex flex-col w-full px-4 pt-3 pb-24 gap-4">
        <input type="hidden" id="edit-trx-id" value="${isEdit ? params.editId : ''}" />

 <div class="w-full glass-track p-1.5 rounded-xl flex items-center gap-1.5">
 <button type="button" id="btn-switch-masuk" class="flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${initialType === 'masuk' ? 'glass-seg-active text-primary font-bold' : 'text-on-surface-variant'}">
 <span class="w-5 h-5 rounded-full ${initialType === 'masuk' ? 'bg-secondary-fixed text-primary' : 'glass-chip text-on-surface-variant'} flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">arrow_downward</span></span>
            <span class="font-label-md text-xs font-bold">+ Kas Masuk (Jual)</span>
          </button>
 <button type="button" id="btn-switch-keluar" class="flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${initialType === 'keluar' ? 'glass-seg-active text-rose-800 font-bold' : 'text-on-surface-variant'}">
 <span class="w-5 h-5 rounded-full ${initialType === 'keluar' ? 'bg-rose-100 text-rose-800' : 'glass-chip text-on-surface-variant'} flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">arrow_upward</span></span>
            <span class="font-label-md text-xs font-medium">- Kas Keluar</span>
          </button>
        </div>

        <!-- KAS MASUK -->
        <div id="masuk-wrapper" class="${initialType === 'masuk' ? 'flex' : 'hidden'} flex-col gap-4">
          <!-- TANGGAL TRANSAKSI KAS MASUK -->
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="input-trx-date-masuk" class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                <span>Tanggal Transaksi</span>
              </label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Tanggal Kas Masuk</span>
            </div>
            <input 
              type="date" 
              id="input-trx-date-masuk" 
              value="${defaultDate}" 
 class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all" 
              required
            />
          </div>

 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-[18px]">person</span><span>Nama Pembeli</span></label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Pelanggan Toko</span>
            </div>
 <input type="text" id="input-buyer-name" placeholder="Contoh: Mas Budi / Kak Anisa..." value="${defaultBuyer}" class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-on-tertiary-container" />
          </div>

          <!-- MULTI-ITEM CART -->
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[20px]">shopping_cart</span>
                <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">Daftar Sepatu Terjual</span>
              </div>
              <span id="sale-item-count-badge" class="font-label-sm text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">${initialItems.length} pasang</span>
            </div>
            <div id="sale-items-container" class="flex flex-col gap-3">
              ${initialItems.map((item, idx) => renderSaleItemCard(item, idx, initialItems.length)).join('')}
            </div>

            <!-- Tombol Tambah Sepatu Lagi: Di bawah setelah transaksi pertama selesai -->
            <button type="button" id="btn-add-sale-item" class="${(initialItems[0] && (initialItems[0].price > 0 || initialItems[0].name)) ? 'flex' : 'hidden'} w-full py-3 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary/70 bg-primary/5 hover:bg-primary/10 text-primary font-label-md text-xs font-bold items-center justify-center gap-2 active:scale-[0.99] transition-all">
              <span class="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Tambah Sepatu Lagi</span>
            </button>
          </div>

          <!-- ONGKIR -->
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-[18px]">local_shipping</span><span>Ongkir / Pengiriman</span></label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Pilih Layanan</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <label class="ongkir-radio-card cursor-pointer p-2.5 rounded-xl border-2 ${defaultOngkir === 'FO' ? 'glass-chip-btn text-primary border-2 border-primary' : 'glass-chip-btn text-on-surface-variant'} flex flex-col items-center justify-center text-center transition-all"><input type="radio" name="ongkirOption" value="FO" ${defaultOngkir === 'FO' ? 'checked' : ''} class="hidden" /><span class="font-label-md text-sm font-bold tracking-tight">FO</span><span class="text-[10px]">Free Ongkir</span></label>
              <label class="ongkir-radio-card cursor-pointer p-2.5 rounded-xl border ${defaultOngkir === 'COD' ? 'glass-chip-btn border-2 border-primary text-primary' : 'glass-chip-btn text-on-surface-variant'} flex flex-col items-center justify-center text-center transition-all"><input type="radio" name="ongkirOption" value="COD" ${defaultOngkir === 'COD' ? 'checked' : ''} class="hidden" /><span class="font-label-md text-sm font-bold tracking-tight text-on-surface">COD</span><span class="text-[10px] text-on-surface-variant">Bayar di Tempat</span></label>
              <label class="ongkir-radio-card cursor-pointer p-2.5 rounded-xl border ${defaultOngkir === 'SHOPEE' ? 'glass-chip-btn border-2 border-primary text-primary' : 'glass-chip-btn text-on-surface-variant'} flex flex-col items-center justify-center text-center transition-all"><input type="radio" name="ongkirOption" value="SHOPEE" ${defaultOngkir === 'SHOPEE' ? 'checked' : ''} class="hidden" /><span class="font-label-md text-sm font-bold tracking-tight text-on-surface">SHOPEE</span><span class="text-[10px] text-on-surface-variant">Marketplace</span></label>
            </div>
          </div>

          <!-- NOTE -->
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-primary text-[18px]">edit_note</span><span>Note</span></label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Catatan Transaksi</span>
            </div>
 <input type="text" id="input-notes" placeholder="Catatan tambahan..." value="${defaultNote}" class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all" />
          </div>
        </div>

        <!-- KAS KELUAR -->
        <div id="keluar-wrapper" class="${initialType === 'keluar' ? 'flex' : 'hidden'} flex-col gap-4">
          <!-- TANGGAL TRANSAKSI KAS KELUAR -->
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="input-trx-date-keluar" class="font-label-md text-xs text-rose-950 font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-rose-700 text-[18px]">calendar_today</span>
                <span>Tanggal Transaksi</span>
              </label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Tanggal Kas Keluar</span>
            </div>
            <input 
              type="date" 
              id="input-trx-date-keluar" 
              value="${defaultDate}" 
 class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all" 
              required
            />
          </div>

 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-rose-950 font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-rose-700 text-[18px]">category</span><span>Kategori Pengeluaran</span></label>
              <span id="selected-kategori-label" class="font-label-sm text-[10px] bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-bold">${defaultCategory}</span>
            </div>
            <div class="grid grid-cols-2 gap-2" id="kategori-keluar-grid">
 ${KATEGORI_KELUAR.map((cat) => { const a = cat.label === defaultCategory; return '<button type="button" data-cat-keluar="' + cat.label + '" class="btn-cat-keluar p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ' + (a ? 'border-2 border-rose-600 bg-rose-50 text-rose-950 font-bold ' : ' text-on-surface-variant hover:') + '"><div class="w-7 h-7 rounded-lg ' + (a ? 'bg-rose-200 text-rose-900' : 'glass-chip text-on-surface-variant') + ' flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[15px]">' + cat.icon + '</span></div><div class="flex flex-col min-w-0"><span class="font-label-md text-[11px] leading-tight truncate">' + cat.label + '</span><span class="text-[9px] text-on-surface-variant/80 truncate leading-tight">' + cat.desc + '</span></div></button>'; }).join('')}
            </div>
          </div>
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-rose-700 text-[18px]">description</span><span>Keterangan Pengeluaran</span></label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Rincian</span>
            </div>
 <input type="text" id="input-keluar-keterangan" placeholder="Contoh: Ongkir Shopee order #9921..." value="${defaultKeterangan}" class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-body-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all" />
          </div>
 <div class="w-full glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Nominal Pengeluaran (IDR)</span>
              <span class="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200 font-semibold">Pengeluaran Toko</span>
            </div>
            <div class="flex items-baseline gap-2 py-1">
              <span class="font-headline-sm text-xl text-on-surface-variant font-bold">Rp</span>
              <input type="text" id="input-nominal" inputmode="numeric" value="${defaultNominalKeluar}" class="font-currency-display text-3xl font-bold text-rose-700 bg-transparent focus:outline-none w-full tracking-tight select-all font-tabular" placeholder="0" />
            </div>
            <div class="h-0.5 w-full bg-white/50 rounded-full my-1"></div>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button type="button" class="denom-chip shrink-0 px-2.5 py-1.5 rounded-lg glass-chip-btn text-on-surface font-label-sm text-xs" data-add="10000">+10.000</button>
              <button type="button" class="denom-chip shrink-0 px-2.5 py-1.5 rounded-lg glass-chip-btn text-on-surface font-label-sm text-xs" data-add="50000">+50.000</button>
              <button type="button" class="denom-chip shrink-0 px-2.5 py-1.5 rounded-lg glass-chip-btn text-on-surface font-label-sm text-xs" data-add="100000">+100.000</button>
              <button type="button" class="denom-chip shrink-0 px-2.5 py-1.5 rounded-lg glass-chip-btn text-on-surface font-label-sm text-xs" data-add="500000">+500.000</button>
 <button type="button" id="btn-denom-reset" class="shrink-0 px-2.5 py-1.5 rounded-lg glass-chip text-on-surface-variant font-label-sm text-xs active:scale-95">Reset</button>
            </div>
          </div>
 <div class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5"><span class="material-symbols-outlined text-rose-700 text-[18px]">receipt_long</span><span>Foto Bukti Transaksi</span></label>
              <span class="font-label-sm text-[10px] text-on-surface-variant">Screenshot / Struk</span>
            </div>
            <input type="file" id="input-keluar-photo" accept="image/*" class="hidden" />
 <label for="input-keluar-photo" id="keluar-photo-placeholder" class="${defaultPhoto ? 'hidden' : ''} w-full p-4 rounded-2xl border-2 border-dashed hover:border-rose-400 glass-panel cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center transition-all active:scale-[0.99]">
              <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center shadow-inner"><span class="material-symbols-outlined text-2xl">add_photo_alternate</span></div>
              <span class="font-label-md text-xs font-bold text-on-surface mt-1">Unggah Screenshot / Foto Bukti Transfer</span>
              <span class="font-body-sm text-[11px] text-on-surface-variant">Ketuk untuk memilih screenshot m-banking atau foto struk</span>
            </label>
            <div id="keluar-photo-preview-box" class="${defaultPhoto ? '' : 'hidden'} relative rounded-2xl overflow-hidden border border-white/70 bg-black/5">
              <img id="keluar-photo-preview-img" src="${defaultPhoto}" alt="Bukti Transfer" class="w-full h-44 object-cover object-center" />
              <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md text-white">
                <span class="font-label-sm text-[11px] font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span><span>SS Transfer Terlampir</span></span>
                <div class="flex items-center gap-1.5">
                  <label for="input-keluar-photo" id="btn-retake-keluar-photo" class="cursor-pointer px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold active:scale-95 select-none">Ganti</label>
                  <button type="button" id="btn-remove-keluar-photo" class="p-1 rounded-lg bg-rose-600/80 hover:bg-rose-700 text-white active:scale-95"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" id="btn-submit-trx" class="w-full mt-1 h-14 ${initialType === 'masuk' ? 'glass-primary glass-btn glass-sheen text-primary-btn' : 'glass-rose glass-btn glass-sheen text-primary-btn'} rounded-2xl font-label-md text-base font-bold flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[22px]">save</span>
          <span id="btn-submit-text">${isEdit ? 'Simpan Perubahan' : (initialType === 'masuk' ? 'Simpan Kas Masuk' : 'Simpan Kas Keluar')}</span>
        </button>
      </form>

      <!-- Fullscreen Barcode Camera Scanner Modal -->
      <div id="barcode-scanner-modal" class="hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-start p-3 pt-safe">
        <!-- Top Bar -->
        <div class="w-full max-w-[400px] flex items-center justify-between text-white pt-3 px-2 shrink-0">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-emerald-300 text-2xl">qr_code_scanner</span>
            <div>
              <h3 class="font-headline-sm text-base font-bold">Scan Barcode Sepatu Terjual</h3>
              <p class="text-[11px] text-white/70">Code 128 / Code 39 / EAN / QR</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-scanner-torch"
              class="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white active:scale-95 transition-all"
              title="Nyalakan lampu kilat">
              <span class="material-symbols-outlined text-xl">flashlight_on</span>
            </button>
            <button type="button" id="btn-close-scanner" class="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>

        <!-- Viewfinder dengan fokus optimal untuk barcode -->
        <div class="w-full max-w-[460px] flex flex-col items-center pt-4 shrink-0">
          <!-- Container Camera Preview -->
          <div class="relative isolate w-full h-56 sm:h-64 rounded-3xl overflow-hidden border-3 border-emerald-400 shadow-2xl bg-black" style="box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);">
            <div id="qr-reader" class="w-full h-full"></div>
            
            <!-- Overlay: Sudut bidik + Garis panduan -->
            <div class="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <!-- Sudut keempat penjuru (corner brackets) -->
              <div class="absolute left-3 top-3 w-8 h-8 border-l-4 border-t-4 border-emerald-300 rounded-tl-lg opacity-80"></div>
              <div class="absolute right-3 top-3 w-8 h-8 border-r-4 border-t-4 border-emerald-300 rounded-tr-lg opacity-80"></div>
              <div class="absolute left-3 bottom-3 w-8 h-8 border-l-4 border-b-4 border-emerald-300 rounded-bl-lg opacity-80"></div>
              <div class="absolute right-3 bottom-3 w-8 h-8 border-r-4 border-b-4 border-emerald-300 rounded-br-lg opacity-80"></div>
              
              <!-- Garis horizontal center dengan animasi scanning -->
              <div class="absolute inset-x-8 top-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/50" style="transform: translateY(-50%); animation: scan 2s ease-in-out infinite;"></div>
              
              <!-- Garis vertikal center (subtle) -->
              <div class="absolute inset-y-8 left-1/2 w-0.5 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent opacity-50" style="transform: translateX(-50%);"></div>
              
              <!-- Area terang di tengah untuk fokus -->
              <div class="absolute top-1/2 left-1/2 w-48 h-20 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-emerald-300/40 rounded-lg opacity-50"></div>
            </div>
            
            <!-- Vignette (tepi gelap) untuk fokus ke tengah -->
            <div class="absolute inset-0 z-5 pointer-events-none bg-gradient-to-r from-black/30 via-transparent to-black/30"></div>
          </div>
          
          <!-- Panduan teks dinamis -->
          <div class="mt-4 text-center">
            <p id="scanner-hint" class="text-sm text-white/90 font-medium leading-snug px-4">
              🔍 Arahkan barcode ke tengah kotak
            </p>
            <p class="text-xs text-white/60 mt-2 px-4">
              Jarak ideal: 15-20cm • Cahaya cukup • Posisi datar
            </p>
          </div>

          <!-- Status / panduan dinamis -->
          <p id="scanner-hint" class="text-xs text-white/90 text-center mt-2.5 px-5 leading-snug font-medium">
            Geser barcode ke dalam kotak sampai terkunci
          </p>

          <!-- Tombol coba lagi (hanya muncul saat error) -->
          <button type="button" id="btn-scanner-retry"
            class="hidden mt-2.5 px-4 py-2 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95">
            Coba Lagi
          </button>

          <!-- Barcode terakhir terbaca -->
          <div id="scanner-last-read" class="hidden mt-2 px-3 py-1.5 rounded-full glass-chip text-[11px] text-white font-mono"></div>
        </div>

        <!-- Bottom Controls -->
        <div class="w-full max-w-[420px] mt-auto pt-4 pb-4 flex flex-col items-center gap-2.5 shrink-0">
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <button type="button" id="btn-scanner-switch-cam"
              class="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold active:scale-95 flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">cameraswitch</span>
              Ganti Kamera
            </button>
            <button type="button" id="btn-scanner-zoom"
              class="px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold active:scale-95 flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px]">zoom_in</span>
              <span>Zoom</span>
            </button>
          </div>
          <p class="text-[10px] text-white/50 text-center">Tips: gunakan cahaya terang, posisi datar, dan jarak 15-20 cm</p>
          <button type="button" id="btn-cancel-scanner" class="px-5 py-2.5 rounded-full bg-rose-600/90 text-white text-xs font-bold active:scale-95">Tutup Kamera</button>
        </div>
      </div>
    </div>
  `;
}

export function initTambahTransaksiPage(router, store, params = {}) {
  bindHeaderEvents(router);
  const editId = (params && params.editId) || (document.getElementById('edit-trx-id') && document.getElementById('edit-trx-id').value) || '';
  const isEditMode = Boolean(editId);
  const existingTrx = isEditMode ? store.getTransactionById(editId) : null;
  let currentType = existingTrx ? existingTrx.type : (params.type === 'keluar' ? 'keluar' : 'masuk');
  let selectedKategoriKeluar = (existingTrx && existingTrx.category) || KATEGORI_KELUAR[0].label;
  let keluarPhotoDataUrl = (existingTrx && existingTrx.photo) || null;
  let html5Scanner = null;
  let activeScanItemId = null;
  // State scanner tambahan untuk pengalaman barcode 1D responsif
  let scannerZoom = 1;
  let torchOn = false;
  let useFrontCamera = false;
  let scannerStartedOnce = false;
  const scanDebouncer = createScanDebouncer(1500);

  // Baca item kartu yang sudah ada di DOM agar ID 100% cocok dengan elemen HTML
  let saleItems = [];
  const initialCards = document.querySelectorAll('#sale-items-container .sale-item-card');
  if (initialCards && initialCards.length > 0) {
    saleItems = Array.from(initialCards).map((card) => {
      const id = card.getAttribute('data-sale-item-id');
      const bcInput = card.querySelector('.sale-item-barcode');
      const priceInput = card.querySelector('.sale-item-price');
      const nameLabel = card.querySelector('.sale-item-name-label');
      return {
        id: id,
        barcode: (bcInput ? bcInput.value.trim() : ''),
        name: (nameLabel ? nameLabel.textContent.trim() : ''),
        kondisi: 'Bagus',
        price: parseRupiah(priceInput ? priceInput.value : '0'),
        photo: null
      };
    });
  } else if (isEditMode && existingTrx && existingTrx.items && existingTrx.items.length > 0) {
    saleItems = existingTrx.items.map((it) => ({ id: genItemId(), barcode: it.barcode || '', name: it.name || '', kondisi: it.kondisi || 'Bagus', price: it.price || 0, photo: it.photo || null }));
  } else if (isEditMode && existingTrx) {
    saleItems = [{ id: genItemId(), barcode: existingTrx.barcode || '', name: existingTrx.productName || '', kondisi: existingTrx.kondisi || 'Bagus', price: existingTrx.amount || 0, photo: existingTrx.photo || null }];
  } else {
    saleItems = [{ id: genItemId(), barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null }];
  }

  const btnMasuk = document.getElementById('btn-switch-masuk');
  const btnKeluar = document.getElementById('btn-switch-keluar');
  const masukWrapper = document.getElementById('masuk-wrapper');
  const keluarWrapper = document.getElementById('keluar-wrapper');
  const btnSubmit = document.getElementById('btn-submit-trx');
  const btnSubmitText = document.getElementById('btn-submit-text');
  const dateMasukInput = document.getElementById('input-trx-date-masuk');
  const dateKeluarInput = document.getElementById('input-trx-date-keluar');

  // Sinkronisasi input tanggal antara kas masuk dan kas keluar
  if (dateMasukInput && dateKeluarInput) {
    dateMasukInput.addEventListener('change', () => {
      dateKeluarInput.value = dateMasukInput.value;
    });
    dateKeluarInput.addEventListener('change', () => {
      dateMasukInput.value = dateKeluarInput.value;
    });
  }

  function updateType(type) {
    currentType = type;
    if (currentType === 'masuk') {
      if (dateMasukInput && dateKeluarInput && dateKeluarInput.value) {
        dateMasukInput.value = dateKeluarInput.value;
      }
 if (btnMasuk) btnMasuk.className = 'flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 glass-seg-active text-primary font-bold';
      if (btnKeluar) btnKeluar.className = 'flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 text-on-surface-variant';
      if (masukWrapper) masukWrapper.classList.remove('hidden');
      if (keluarWrapper) keluarWrapper.classList.add('hidden');
      if (btnSubmit) btnSubmit.className = 'w-full mt-1 h-14 glass-primary glass-btn glass-sheen text-primary-btn rounded-2xl font-label-md text-base font-bold flex items-center justify-center gap-2';
      if (btnSubmitText) btnSubmitText.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Kas Masuk';
    } else {
      if (dateMasukInput && dateKeluarInput && dateMasukInput.value) {
        dateKeluarInput.value = dateMasukInput.value;
      }
 if (btnKeluar) btnKeluar.className = 'flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 glass-seg-active text-rose-800 font-bold';
      if (btnMasuk) btnMasuk.className = 'flex-1 py-3 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 text-on-surface-variant';
      if (masukWrapper) masukWrapper.classList.add('hidden');
      if (keluarWrapper) keluarWrapper.classList.remove('hidden');
      if (btnSubmit) btnSubmit.className = 'w-full mt-1 h-14 glass-rose glass-btn glass-sheen text-white rounded-2xl font-label-md text-base font-bold flex items-center justify-center gap-2';
      if (btnSubmitText) btnSubmitText.textContent = isEditMode ? 'Simpan Perubahan' : 'Simpan Kas Keluar';
    }
  }

  if (btnMasuk) btnMasuk.addEventListener('click', () => updateType('masuk'));
  if (btnKeluar) btnKeluar.addEventListener('click', () => updateType('keluar'));

  // Sinkronkan data array saleItems dengan nilai sebenarnya di DOM input
  function syncSaleItemsFromDOM() {
    const cards = document.querySelectorAll('#sale-items-container .sale-item-card');
    if (!cards || cards.length === 0) return;

    cards.forEach((card, idx) => {
      const id = card.getAttribute('data-sale-item-id');
      const bcInput = card.querySelector('.sale-item-barcode');
      const priceInput = card.querySelector('.sale-item-price');
      const nameLabel = card.querySelector('.sale-item-name-label');

      const barcode = bcInput ? bcInput.value.trim() : '';
      const price = parseRupiah(priceInput ? priceInput.value : '0');
      const name = nameLabel ? nameLabel.textContent.trim() : '';

      let item = saleItems.find((it) => it.id === id);
      if (!item) {
        if (saleItems[idx]) {
          saleItems[idx].id = id;
          item = saleItems[idx];
        } else {
          item = { id, barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null };
          saleItems.push(item);
        }
      }
      if (item) {
        item.barcode = barcode;
        item.price = price;
        if (name) item.name = name;
        else if (barcode && !item.name) {
          const prod = store.getProductByBarcode(barcode);
          if (prod && prod.name) item.name = prod.name;
        }
      }
    });
  }

  function recalcTotal() {
    syncSaleItemsFromDOM();
    const total = saleItems.reduce((s, it) => s + (Number(it.price) || 0), 0);
    const totalEl = document.getElementById('sale-total-amount');
    const countEl = document.getElementById('sale-total-count');
    const badgeEl = document.getElementById('sale-item-count-badge');
    if (totalEl) totalEl.textContent = total > 0 ? ('+' + formatRupiah(total, '')) : 'Rp 0';
    if (countEl) countEl.textContent = '(' + saleItems.length + ' pasang)';
    if (badgeEl) badgeEl.textContent = saleItems.length + ' pasang';

    // Tombol + Tambah Sepatu Lagi hanya muncul di bawah setelah transaksi pertama selesai
    const addMoreBtn = document.getElementById('btn-add-sale-item');
    if (addMoreBtn) {
      const firstItem = saleItems[0];
      const isFirstItemDone = Boolean(firstItem && (Number(firstItem.price) > 0 || (firstItem.name && firstItem.name.trim().length > 0) || (firstItem.barcode && firstItem.barcode.trim().length > 0)));
      if (isFirstItemDone) {
        addMoreBtn.classList.remove('hidden');
        addMoreBtn.classList.add('flex');
      } else {
        addMoreBtn.classList.add('hidden');
        addMoreBtn.classList.remove('flex');
      }
    }
  }

  function rerenderItemsContainer() {
    const container = document.getElementById('sale-items-container');
    if (!container) return;
    container.innerHTML = saleItems.map((item, idx) => renderSaleItemCard(item, idx, saleItems.length)).join('');
    bindItemCardEvents();
    recalcTotal();
  }

  function findSaleBarcodeConflict(barcode, currentItemId) {
    if (!barcode || !barcode.trim() || barcode.trim().length < 2) return null;
    const clean = barcode.trim().toUpperCase();

    // 1. Cek duplikat sesama item di formulir penjualan saat ini
    const siblingIdx = saleItems.findIndex((it) => it.id !== currentItemId && it.barcode && it.barcode.trim().toUpperCase() === clean);
    if (siblingIdx !== -1) {
      const siblingNum = siblingIdx + 1;
      const sib = saleItems[siblingIdx];
      return {
        type: 'sibling',
        conflictBarcode: clean,
        message: `Peringatan: Barcode "${clean}" sudah dimasukkan pada Sepatu #${siblingNum}${sib.name ? ` (${sib.name})` : ''} di daftar ini! Jangan memasukkan barcode ganda.`
      };
    }

    // 2. Cek apakah barcode ini sudah pernah terjual di transaksi lain sebelumnya
    const soldTrx = store.findSoldTransactionByBarcode(clean, isEditMode ? editId : null);
    if (soldTrx) {
      const buyerInfo = soldTrx.buyer ? `ke ${soldTrx.buyer}` : '';
      const notaInfo = soldTrx.nota || 'transaksi lain';
      const timeInfo = soldTrx.time ? `(${soldTrx.time})` : '';
      return {
        type: 'already_sold',
        conflictBarcode: clean,
        message: `Peringatan: Sepatu dengan barcode "${clean}" SUDAH PERNAH TERJUAL sebelumnya pada ${notaInfo} ${buyerInfo} ${timeInfo}! Sepatu yang sudah laku tidak boleh diinput lagi.`
      };
    }

    return null;
  }

  function validateSaleBarcodeField(itemId, code) {
    const cardEl = document.querySelector(`.sale-item-card[data-sale-item-id="${itemId}"]`);
    if (!cardEl) return true;
    const inputBarcode = cardEl.querySelector('.sale-item-barcode');
    const warningBox = cardEl.querySelector('.sale-item-barcode-warning');
    const warningText = warningBox ? warningBox.querySelector('.sale-item-warning-text') : null;

    if (!code || code.trim().length < 2) {
      if (warningBox) warningBox.classList.add('hidden');
      if (inputBarcode) {
        inputBarcode.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
        inputBarcode.classList.add('border-surface-container-high');
      }
      return true;
    }

    const conflict = findSaleBarcodeConflict(code, itemId);
    if (conflict) {
      if (warningText) warningText.textContent = conflict.message;
      else if (warningBox) warningBox.textContent = conflict.message;
      if (warningBox) warningBox.classList.remove('hidden');
      if (inputBarcode) {
        inputBarcode.classList.add('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
        inputBarcode.classList.remove('border-surface-container-high');
      }
      return false;
    } else {
      if (warningBox) warningBox.classList.add('hidden');
      if (inputBarcode) {
        inputBarcode.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
        inputBarcode.classList.add('border-surface-container-high');
      }
      return true;
    }
  }

  function lookupBarcodeForItem(itemId, barcode) {
    let item = saleItems.find((it) => it.id === itemId);
    if (!item && saleItems.length === 1) {
      saleItems[0].id = itemId;
      item = saleItems[0];
    }
    if (!item) return;

    if (!barcode) {
      item.barcode = ''; item.name = ''; item.kondisi = 'Bagus'; item.price = 0; item.photo = null;
      syncItemNameRow(itemId, item); recalcTotal(); return;
    }

    // Jika terjadi konflik duplikat, jangan proses auto-fill produk
    const conflict = findSaleBarcodeConflict(barcode, itemId);
    if (conflict) {
      item.barcode = barcode.trim();
      return;
    }

    const prod = store.getProductByBarcode(barcode);
    if (prod) {
      item.barcode = barcode; 
      item.name = prod.name || ''; 
      item.kondisi = prod.kondisi || 'Bagus';
      const finalPrice = prod.sellPrice || (prod.buyPrice ? Math.round(Number(prod.buyPrice) * 1.35) : 0);
      item.price = finalPrice; 
      item.photo = prod.photo || null;
      const priceInput = document.querySelector('.sale-item-price[data-sale-item-id="' + itemId + '"]');
      if (priceInput && finalPrice > 0) {
        priceInput.value = formatRupiah(finalPrice, '');
      }
      syncItemNameRow(itemId, item); 
      recalcTotal();
      showToast('Sepatu terdeteksi: ' + prod.name, 'success', 2500);
    } else {
      item.barcode = barcode;
      recalcTotal();
      showToast('Barcode siap. Masukkan harga jual.', 'info');
    }
  }

  function syncItemNameRow(itemId, item) {
    const nameRow = document.querySelector('.sale-item-name-row[data-sale-item-id="' + itemId + '"]');
    if (!nameRow) return;
    if (item.name) {
      nameRow.classList.remove('hidden');
      const lbl = nameRow.querySelector('.sale-item-name-label');
      if (lbl) lbl.textContent = item.name;
      let badge = nameRow.querySelector('.kondisi-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'kondisi-badge ml-auto shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full'; nameRow.appendChild(badge); }
      if (item.kondisi === 'Minus') { badge.className = 'kondisi-badge ml-auto shrink-0 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full'; badge.textContent = '\u26A0 Minus'; }
      else { badge.className = 'kondisi-badge ml-auto shrink-0 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full'; badge.textContent = '\u2713 Bagus'; }
    } else { nameRow.classList.add('hidden'); }
  }

  function populateStockDropdown(itemId, searchQuery = '') {
    const cardEl = document.querySelector(`.sale-item-card[data-sale-item-id="${itemId}"]`);
    if (!cardEl) return;
    const popup = cardEl.querySelector('.stock-dropdown-popup');
    if (!popup) return;

    // Filter keluar barcode yang sedang dipilih pada sepatu lain di form ini
    const otherSelectedBarcodes = new Set(
      saleItems
        .filter((it) => it.id !== itemId && it.barcode)
        .map((it) => it.barcode.trim().toUpperCase())
    );

    // Ambil daftar sepatu yang tersedia di stok & belum terjual
    const available = store.getAvailableProducts(isEditMode ? editId : null).filter((p) => {
      return !otherSelectedBarcodes.has(p.barcode.toString().trim().toUpperCase());
    });

    const query = (searchQuery || '').trim().toLowerCase();
    const filtered = query
      ? available.filter((p) => (p.name && p.name.toLowerCase().includes(query)) || (p.barcode && p.barcode.toLowerCase().includes(query)))
      : available;

    if (filtered.length === 0) {
      popup.innerHTML = `
        <div class="p-3 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
          <div class="w-full flex justify-end">
            <button type="button" class="btn-close-stock-popup p-1 rounded-lg hover:bg-white/20 text-on-surface-variant hover:text-on-surface" title="Tutup">
              <span class="material-symbols-outlined text-[16px] pointer-events-none">close</span>
            </button>
          </div>
          <span class="material-symbols-outlined text-xl text-on-surface-variant/50">inventory_2</span>
          <span class="font-semibold text-on-surface">${query ? 'Tidak ada sepatu di stok cocok dengan "' + searchQuery + '"' : 'Belum ada stok sepatu dengan barcode'}</span>
          ${!query ? '<span class="text-[10px] text-on-surface-variant/70 leading-relaxed">Tambahkan sepatu melalui menu<br/><strong class="text-primary">+ Tambah Barang Masuk</strong></span>' : ''}
        </div>
      `;
      popup.classList.remove('hidden');
      popup.querySelectorAll('.btn-close-stock-popup').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation(); popup.classList.add('hidden');
        });
      });
      return;
    }

    popup.innerHTML = `
      <div class="px-2.5 py-1.5 flex items-center justify-between border-b border-white/45 text-[11px] font-bold text-primary glass-panel bg-white/40 rounded-xl mb-1">
        <span class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[15px]">inventory_2</span>
          <span>Stok Tersedia (${filtered.length} Sepatu)</span>
        </span>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-on-surface-variant font-normal">Pilih untuk auto-fill</span>
          <button type="button" class="btn-close-stock-popup p-0.5 rounded hover:bg-white/30 text-on-surface-variant hover:text-on-surface" title="Tutup list stok">
            <span class="material-symbols-outlined text-[16px] pointer-events-none">close</span>
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        ${filtered.map((p) => `
          <button 
            type="button" 
            class="btn-select-stock-item w-full text-left p-2.5 rounded-xl glass-row flex items-center gap-2.5 transition-all active:scale-[0.99] hover:bg-white/10" 
            data-barcode="${p.barcode}"
            data-sale-item-id="${itemId}"
          >
            ${p.photo ? `
              <img src="${p.photo}" class="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/70" alt="Foto" />
            ` : `
              <div class="w-10 h-10 rounded-lg bg-surface-container-high/60 flex items-center justify-center shrink-0 border border-white/30 text-on-surface-variant">
                <span class="material-symbols-outlined text-[18px]">footwear</span>
              </div>
            `}
            <div class="flex-1 min-w-0 flex flex-col">
              <span class="font-bold text-xs text-on-surface truncate">${p.name || 'Sepatu Tanpa Nama'}</span>
              <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-0.5">
                <span class="font-mono font-bold glass-chip px-1.5 py-0.2 rounded text-primary">${p.barcode}</span>
                ${p.kondisi === 'Minus' ? '<span class="text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">⚠ Minus</span>' : '<span class="text-emerald-700 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">✓ Bagus</span>'}
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="font-bold text-xs text-emerald-800 font-tabular block">
                ${p.sellPrice ? 'Rp ' + formatRupiah(p.sellPrice, '') : (p.buyPrice ? 'Rp ' + formatRupiah(p.buyPrice, '') : '-')}
              </span>
              <span class="text-[10px] text-on-surface-variant">Harga Jual</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;

    popup.classList.remove('hidden');

    // Bind tombol tutup
    popup.querySelectorAll('.btn-close-stock-popup').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); popup.classList.add('hidden');
      });
    });

    // Bind event klik pada opsi dropdown
    popup.querySelectorAll('.btn-select-stock-item').forEach((itemBtn) => {
      itemBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedBarcode = itemBtn.getAttribute('data-barcode');
        const inputBarcode = cardEl.querySelector('.sale-item-barcode');
        if (inputBarcode) {
          inputBarcode.value = selectedBarcode;
          inputBarcode.dispatchEvent(new Event('input', { bubbles: true }));
        }
        popup.classList.add('hidden');
      });
    });
  }

  function bindItemCardEvents() {
    document.querySelectorAll('.sale-item-barcode').forEach((input) => {
      const itemId = input.getAttribute('data-sale-item-id');

      // Tampilkan dropdown saat input barcode difokuskan
      input.addEventListener('focus', () => {
        populateStockDropdown(itemId, input.value.trim());
      });

      // Filter live dropdown saat admin mengetik barcode/nama
      input.addEventListener('input', (e) => {
        const code = e.target.value.trim();
        let item = saleItems.find((it) => it.id === itemId);
        if (!item && saleItems.length === 1) {
          saleItems[0].id = itemId;
          item = saleItems[0];
        }
        if (!item) {
          syncSaleItemsFromDOM();
          item = saleItems.find((it) => it.id === itemId);
        }
        if (item) item.barcode = code;

        // Buka & perbarui dropdown sesuai kata kunci pencarian
        populateStockDropdown(itemId, code);

        // Validasi duplikat
        const isValid = validateSaleBarcodeField(itemId, code);

        // Revalidasi sibling items agar status error kartu lain bisa otomatis hilang jika konflik sudah diatasi
        document.querySelectorAll('.sale-item-barcode').forEach((sibInput) => {
          const sibId = sibInput.getAttribute('data-sale-item-id');
          if (sibId !== itemId) {
            validateSaleBarcodeField(sibId, sibInput.value.trim());
          }
        });

        if (isValid && code.length >= 3) {
          lookupBarcodeForItem(itemId, code);
        } else if (code.length === 0) {
          lookupBarcodeForItem(itemId, '');
        }
      });

      // Initial check on render (misal saat edit)
      const initCode = input.value.trim();
      if (initCode) validateSaleBarcodeField(itemId, initCode);
    });

    // Toggle button dropdown list stok
    document.querySelectorAll('.btn-toggle-stock-dropdown').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.getAttribute('data-sale-item-id');
        const cardEl = document.querySelector(`.sale-item-card[data-sale-item-id="${itemId}"]`);
        if (!cardEl) return;
        const popup = cardEl.querySelector('.stock-dropdown-popup');
        const inputBarcode = cardEl.querySelector('.sale-item-barcode');
        if (popup) {
          if (popup.classList.contains('hidden')) {
            // Tutup dropdown lain terlebih dahulu
            document.querySelectorAll('.stock-dropdown-popup').forEach((p) => p.classList.add('hidden'));
            populateStockDropdown(itemId, inputBarcode ? inputBarcode.value.trim() : '');
            if (inputBarcode) inputBarcode.focus();
          } else {
            popup.classList.add('hidden');
          }
        }
      });
    });

    // Tutup dropdown jika klik di luar
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.stock-dropdown-wrapper')) {
        document.querySelectorAll('.stock-dropdown-popup').forEach((p) => p.classList.add('hidden'));
      }
    });

    document.querySelectorAll('.sale-item-price').forEach((input) => {
      input.addEventListener('input', (e) => {
        const itemId = input.getAttribute('data-sale-item-id');
        const raw = parseRupiah(e.target.value);
        input.value = raw > 0 ? formatRupiah(raw, '') : '';
        let item = saleItems.find((it) => it.id === itemId);
        if (!item && saleItems.length === 1) {
          saleItems[0].id = itemId;
          item = saleItems[0];
        }
        if (!item) {
          syncSaleItemsFromDOM();
          item = saleItems.find((it) => it.id === itemId);
        }
        if (item) item.price = raw;
        recalcTotal();
      });
    });
    document.querySelectorAll('.btn-sale-item-camera').forEach((btn) => {
      btn.addEventListener('click', () => { activeScanItemId = btn.getAttribute('data-sale-item-id'); openScanner(); });
    });
    document.querySelectorAll('.btn-remove-sale-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-sale-item-id');
        saleItems = saleItems.filter((it) => it.id !== itemId);
        rerenderItemsContainer();
        showToast('Sepatu dihapus dari daftar', 'info');
      });
    });
  }

  bindItemCardEvents();
  recalcTotal();

  if (params && params.autoAddNewItem) {
    setTimeout(() => {
      const container = document.getElementById('sale-items-container');
      if (container && container.lastElementChild) {
        container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const bcInput = container.lastElementChild.querySelector('.sale-item-barcode');
        if (bcInput) {
          bcInput.focus();
          showToast('Siap menambah barang susulan untuk transaksi ini', 'info', 3000);
        }
      }
    }, 250);
  }

  const btnAddItem = document.getElementById('btn-add-sale-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      saleItems.push({ id: genItemId(), barcode: '', name: '', kondisi: 'Bagus', price: 0, photo: null });
      rerenderItemsContainer();
      showToast('Sepatu baru ditambahkan!', 'success');
      setTimeout(() => {
        const container = document.getElementById('sale-items-container');
        if (container && container.lastElementChild) container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    });
  }

  const selectedKategoriLabel = document.getElementById('selected-kategori-label');
  const catButtons = document.querySelectorAll('.btn-cat-keluar');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedKategoriKeluar = btn.getAttribute('data-cat-keluar');
      if (selectedKategoriLabel) selectedKategoriLabel.textContent = selectedKategoriKeluar;
      catButtons.forEach((b) => {
        b.className = 'btn-cat-keluar p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all glass-chip-btn text-on-surface-variant';
        const id2 = b.querySelector('div:first-of-type');
 if (id2) id2.className = 'w-7 h-7 rounded-lg glass-chip text-on-surface-variant flex items-center justify-center shrink-0';
      });
      btn.className = 'btn-cat-keluar p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all border-2 border-rose-600 bg-rose-50 text-rose-950 font-bold shadow-sm';
      const id2 = btn.querySelector('div:first-of-type');
      if (id2) id2.className = 'w-7 h-7 rounded-lg bg-rose-200 text-rose-900 flex items-center justify-center shrink-0';
    });
  });

  const keluarPhotoInput = document.getElementById('input-keluar-photo');
  const keluarPlaceholder = document.getElementById('keluar-photo-placeholder');
  const keluarPreviewBox = document.getElementById('keluar-photo-preview-box');
  const keluarPreviewImg = document.getElementById('keluar-photo-preview-img');
  // Foto dibuka native via <label for="input-keluar-photo"> agar andal di browser HP / WebView
  const btnRemoveKP = document.getElementById('btn-remove-keluar-photo');
  if (btnRemoveKP) {
    btnRemoveKP.addEventListener('click', () => {
      keluarPhotoDataUrl = null;
      if (keluarPhotoInput) keluarPhotoInput.value = '';
      if (keluarPreviewImg) keluarPreviewImg.src = '';
      if (keluarPreviewBox) keluarPreviewBox.classList.add('hidden');
      if (keluarPlaceholder) keluarPlaceholder.classList.remove('hidden');
      showToast('Foto bukti transfer dihapus.', 'info');
    });
  }
  if (keluarPhotoInput) {
    keluarPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      // Reset value agar memilih file yang sama lagi tetap memicu event change
      keluarPhotoInput.value = '';

      // Kompres foto agar tidak melampaui kuota penyimpanan browser
      compressImageFile(file).then((dataUrl) => {
        keluarPhotoDataUrl = dataUrl;
        if (keluarPreviewImg) keluarPreviewImg.src = keluarPhotoDataUrl;
        if (keluarPlaceholder) keluarPlaceholder.classList.add('hidden');
        if (keluarPreviewBox) keluarPreviewBox.classList.remove('hidden');
        showToast('Bukti transfer berhasil dilampirkan!', 'success');
      }).catch((err) => {
        console.warn('Gagal memproses foto', err);
        showToast('Foto gagal diproses. Coba pilih foto lain.', 'error');
      });
    });
  }

  const inputNominal = document.getElementById('input-nominal');
  if (inputNominal) { inputNominal.addEventListener('input', () => { const raw = parseRupiah(inputNominal.value); inputNominal.value = formatRupiah(raw, ''); }); }
  document.querySelectorAll('.denom-chip').forEach((btn) => {
    btn.addEventListener('click', () => { if (!inputNominal) return; inputNominal.value = formatRupiah(parseRupiah(inputNominal.value) + (Number(btn.getAttribute('data-add')) || 0), ''); });
  });
  const btnReset = document.getElementById('btn-denom-reset');
  if (btnReset && inputNominal) btnReset.addEventListener('click', () => { inputNominal.value = '0'; });

  document.querySelectorAll('input[name="ongkirOption"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.ongkir-radio-card').forEach((card) => {
        card.className = 'ongkir-radio-card cursor-pointer p-2.5 rounded-xl border glass-chip-btn text-on-surface-variant flex flex-col items-center justify-center text-center transition-all';
        const ts = card.querySelector('span:first-of-type');
        if (ts) ts.className = 'font-label-md text-sm font-bold tracking-tight text-on-surface';
      });
      const parent = radio.closest('.ongkir-radio-card');
      if (parent) {
        parent.className = 'ongkir-radio-card cursor-pointer p-2.5 rounded-xl border-2 border-primary bg-secondary-container text-primary flex flex-col items-center justify-center text-center transition-all shadow-sm';
        const ts = parent.querySelector('span:first-of-type');
        if (ts) ts.className = 'font-label-md text-sm font-bold tracking-tight text-primary';
      }
    });
  });

  const barcodeScannerModal = document.getElementById('barcode-scanner-modal');
  const btnCloseScanner = document.getElementById('btn-close-scanner');
  const btnCancelScanner = document.getElementById('btn-cancel-scanner');

  /** Set pesan status di dalam modal scanner. */
  function setScannerStatus(text, type) {
    const hint = document.getElementById('scanner-hint');
    if (!hint) return;
    hint.textContent = text;
    if (type === 'error') {
      hint.className = 'text-sm text-rose-300 text-center mt-4 px-4 leading-snug font-bold';
    } else {
      hint.className = 'text-sm text-white/90 text-center mt-4 px-4 leading-snug font-medium';
    }
  }

  /** Tampilkan / sembunyikan tombol Coba Lagi. */
  function showRetryButton(show) {
    const btn = document.getElementById('btn-scanner-retry');
    if (btn) btn.classList.toggle('hidden', !show);
  }

  /** Nyalakan / matikan torch scanner. */
  async function applyTorch(on) {
    try {
      const video = document.querySelector('#qr-reader video');
      if (!video || !video.srcObject) return;
      const track = video.srcObject.getVideoTracks()[0];
      if (!track) return;
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (!caps.torch) return;
      await track.applyConstraints({ advanced: [{ torch: on }] });
      torchOn = on;
      const btn = document.getElementById('btn-scanner-torch');
      if (btn) btn.classList.toggle('bg-amber-500/70', on);
    } catch (_) { /* perangkat tidak mendukung torch */ }
  }

  /** Cycle zoom kamera: 1x → 1.5x → 2x → 2.5x → 3x → kembali 1x. */
  function cycleZoom() {
    const steps = [1, 1.5, 2, 2.5, 3];
    const idx = steps.indexOf(scannerZoom);
    scannerZoom = steps[(idx + 1) % steps.length];
    try {
      const video = document.querySelector('#qr-reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          track.applyConstraints({ advanced: [{ zoom: scannerZoom }] });
        }
      }
    } catch (_) { /* abaikan */ }
    const btn = document.getElementById('btn-scanner-zoom');
    if (btn) {
      const label = btn.querySelector('span:last-child');
      if (label) label.textContent = `Zoom ${scannerZoom}x`;
    }
  }

  /** Ganti kamera depan <-> belakang. */
  function switchCamera() {
    useFrontCamera = !useFrontCamera;
    const oldScanner = html5Scanner;
    html5Scanner = null;
    if (oldScanner) {
      oldScanner.stop()
        .then(() => { try { oldScanner.clear(); } catch (_) {} })
        .catch(() => { try { oldScanner.clear(); } catch (_) {} })
        .then(() => setTimeout(openScanner, 180));
    } else {
      setTimeout(openScanner, 180);
    }
  }

  function openScanner() {
    if (!barcodeScannerModal) return;
    barcodeScannerModal.classList.remove('hidden');

    // Pre-flight: pastikan kamera bisa dibuka (HTTPS / localhost)
    const support = checkCameraSupport();
    if (!support.ok) {
      setScannerStatus(support.reason, 'error');
      showRetryButton(true);
      return;
    }

    setScannerStatus('Meminta izin kamera...', 'info');
    showRetryButton(false);

    scannerZoom = 1;
    useFrontCamera = scannerStartedOnce ? !useFrontCamera : false;
    torchOn = false;
    const torchBtn = document.getElementById('btn-scanner-torch');
    if (torchBtn) torchBtn.classList.remove('bg-amber-500/70');

    const onSuccess = (decodedText) => {
      if (!scanDebouncer(decodedText)) return;

      playBeep('success');

      const lastRead = document.getElementById('scanner-last-read');
      if (lastRead) {
        lastRead.textContent = decodedText;
        lastRead.classList.remove('hidden');
      }

      if (activeScanItemId) {
        const barcodeInput = document.querySelector('.sale-item-barcode[data-sale-item-id="' + activeScanItemId + '"]');
        if (barcodeInput) {
          barcodeInput.value = decodedText.trim();
          barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      closeScanner();
    };
    const onError = () => { /* frame tanpa barcode, abaikan */ };

    const afterStart = () => {
      scannerStartedOnce = true;
      enhanceVideoElement('qr-reader');
      applyTorch(false);
      setScannerStatus('Geser barcode ke dalam kotak sampai terkunci', 'info');
      showRetryButton(false);
    };

    /**
     * Setiap percobaan memakai instance Html5Qrcode BARU karena
     * html5-qrcode tidak mengizinkan start() dua kali pada instance sama.
     */
    const tryStart = (cameraConstraint, config, label) => {
      if (html5Scanner) {
        try { html5Scanner.clear(); } catch (_) { /* abaikan */ }
        html5Scanner = null;
      }
      const scanner = new Html5Qrcode('qr-reader', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      });
      html5Scanner = scanner;
      return scanner.start(cameraConstraint, config, onSuccess, onError)
        .then(() => { afterStart(); })
        .catch((err) => {
          console.warn(`[scanner] gagal start (${label}):`, err);
          try { scanner.clear(); } catch (_) { /* abaikan */ }
          if (html5Scanner === scanner) html5Scanner = null;
          throw err;
        });
    };

    const baseConfig = buildScannerConfig1D();
    const facing = useFrontCamera ? 'user' : 'environment';

    // PERCOBAAN 1: facingMode ideal
    tryStart({ facingMode: { ideal: facing } }, baseConfig, 'facingMode ideal')
      // PERCOBAAN 2: facingMode exact, fps sedikit diturunkan
      .catch(() => tryStart({ facingMode: facing }, { ...baseConfig, fps: 15 }, 'facingMode exact'))
      // PERCOBAAN 3: fallback environment
      .catch(() => tryStart({ facingMode: 'environment' }, { ...baseConfig, fps: 10 }, 'environment fallback'))
      // PERCOBAAN 4: kamera manapun
      .catch(() => tryStart({ facingMode: 'user' }, { ...baseConfig, fps: 10 }, 'user fallback'))
      .catch((err) => {
        console.error('[scanner] kamera tidak dapat dibuka:', err);
        setScannerStatus(describeCameraError(err), 'error');
        showRetryButton(true);
      });
  }

  function closeScanner() {
    if (!barcodeScannerModal) return;
    barcodeScannerModal.classList.add('hidden');
    applyTorch(false);

    const oldScanner = html5Scanner;
    html5Scanner = null;
    if (oldScanner) {
      oldScanner.clear().then(() => oldScanner.stop()).catch(() => {})
        .then(() => { try { oldScanner.clear(); } catch (_) {} })
        .catch(() => {});
    }

    activeScanItemId = null;
    scannerStartedOnce = false;
    showRetryButton(false);
    setScannerStatus('Geser barcode ke dalam kotak sampai terkunci', 'info');
    const lastRead = document.getElementById('scanner-last-read');
    if (lastRead) lastRead.classList.add('hidden');
  }

  if (btnCloseScanner) btnCloseScanner.addEventListener('click', closeScanner);
  if (btnCancelScanner) btnCancelScanner.addEventListener('click', closeScanner);

  // Bind controls scanner
  const btnTorch = document.getElementById('btn-scanner-torch');
  const btnZoom = document.getElementById('btn-scanner-zoom');
  const btnSwitchCam = document.getElementById('btn-scanner-switch-cam');
  const btnRetry = document.getElementById('btn-scanner-retry');
  if (btnTorch) btnTorch.addEventListener('click', () => applyTorch(!torchOn));
  if (btnZoom) btnZoom.addEventListener('click', cycleZoom);
  if (btnSwitchCam) btnSwitchCam.addEventListener('click', switchCamera);
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      const old = html5Scanner;
      html5Scanner = null;
      if (old) {
        old.stop()
          .then(() => { try { old.clear(); } catch (_) {} })
          .catch(() => {})
          .then(() => openScanner());
      } else {
        openScanner();
      }
    });
  }

  function handleSubmit() {
    try {
      if (currentType === 'masuk') {
        syncSaleItemsFromDOM();

        // Singkirkan kartu tambahan yang benar-benar kosong jika ada lebih dari 1 kartu
        if (saleItems.length > 1) {
          const filled = saleItems.filter((it) => (Number(it.price) || 0) > 0 || (it.barcode && it.barcode.trim()) || (it.name && it.name.trim()));
          if (filled.length > 0) {
            saleItems = filled;
          }
        }

        // Cek apakah ada sepatu yang barcode atau namanya sudah diisi tapi harga jualnya masih 0
        for (let i = 0; i < saleItems.length; i++) {
          const it = saleItems[i];
          if ((it.barcode && it.barcode.trim()) || (it.name && it.name.trim())) {
            if ((Number(it.price) || 0) <= 0) {
              showToast(`Sepatu #${i + 1}${it.name ? ` (${it.name})` : ''} belum memiliki harga jual. Silakan isi harga.`, 'error', 4000);
              const cardEl = document.querySelector(`.sale-item-card[data-sale-item-id="${it.id}"]`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const priceInput = cardEl.querySelector('.sale-item-price');
                if (priceInput) priceInput.focus();
              }
              return;
            }
          }
        }

        const validItems = saleItems.filter((it) => (Number(it.price) || 0) > 0);
        if (validItems.length === 0) {
          showToast('Masukkan harga jual minimal 1 sepatu', 'error');
          return;
        }

        // Validasi Duplikasi Barcode Sepatu Terjual
        for (let i = 0; i < saleItems.length; i++) {
          const it = saleItems[i];
          if (it.barcode && it.barcode.trim()) {
            const conflict = findSaleBarcodeConflict(it.barcode, it.id);
            if (conflict) {
              showToast(conflict.message, 'error', 4500);
              const cardEl = document.querySelector(`.sale-item-card[data-sale-item-id="${it.id}"]`);
              if (cardEl) {
                cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inputEl = cardEl.querySelector('.sale-item-barcode');
                if (inputEl) {
                  inputEl.focus();
                  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
              return;
            }
          }
        }

        const dateInputMasuk = document.getElementById('input-trx-date-masuk');
        const trxDate = (dateInputMasuk && dateInputMasuk.value) ? dateInputMasuk.value : new Date().toISOString().split('T')[0];
        const buyerName = (document.getElementById('input-buyer-name') && document.getElementById('input-buyer-name').value.trim()) || '';
        const noteVal = (document.getElementById('input-notes') && document.getElementById('input-notes').value.trim()) || '';
        const ongkirRadio = document.querySelector('input[name="ongkirOption"]:checked');
        const ongkirVal = ongkirRadio ? ongkirRadio.value : 'FO';
        const totalAmount = validItems.reduce((s, it) => s + (Number(it.price) || 0), 0);
        const itemNames = validItems.filter((it) => it.name).map((it) => it.name);
        let title = '';
        if (buyerName && itemNames.length > 0) title = buyerName + ' \u2022 ' + itemNames.join(', ');
        else if (buyerName) title = 'Penjualan ke ' + buyerName;
        else if (itemNames.length > 0) title = itemNames.join(', ');
        else if (noteVal) title = noteVal;
        else title = 'Penjualan ' + validItems.length + ' Pasang Sepatu';
        const primaryBarcode = (validItems.find((it) => it.barcode) || {}).barcode || null;
        const primaryProduct = validItems.find((it) => it.name);
        const trxData = {
          type: 'masuk',
          category: 'Penjualan Sepatu',
          date: trxDate,
          amount: totalAmount,
          title,
          buyer: buyerName,
          ongkir: ongkirVal,
          note: noteVal,
          barcode: primaryBarcode,
          productName: primaryProduct ? primaryProduct.name : null,
          kondisi: primaryProduct ? primaryProduct.kondisi : null,
          photo: primaryProduct ? primaryProduct.photo : null,
          items: validItems.map((it) => ({
            barcode: it.barcode || null,
            name: it.name || null,
            kondisi: it.kondisi || 'Bagus',
            price: Number(it.price) || 0,
            photo: it.photo || null
          })),
          itemCount: validItems.length
        };
        if (isEditMode) {
          store.updateTransaction(editId, trxData);
          showToast('Perubahan penjualan berhasil disimpan!', 'success');
        } else {
          store.addTransaction(trxData);
          showToast('Penjualan ' + validItems.length + ' pasang disimpan!', 'success');
        }
      } else {
        const amount = parseRupiah(inputNominal ? inputNominal.value : '0');
        if (amount <= 0) { showToast('Nominal pengeluaran harus lebih dari 0', 'error'); return; }
        const keteranganKeluar = (document.getElementById('input-keluar-keterangan') && document.getElementById('input-keluar-keterangan').value.trim()) || selectedKategoriKeluar;
        const dateInputKeluar = document.getElementById('input-trx-date-keluar');
        const trxDate = (dateInputKeluar && dateInputKeluar.value) ? dateInputKeluar.value : new Date().toISOString().split('T')[0];
        const keluarData = {
          type: 'keluar',
          category: selectedKategoriKeluar,
          date: trxDate,
          amount,
          title: keteranganKeluar,
          keterangan: keteranganKeluar,
          photo: keluarPhotoDataUrl || (existingTrx ? existingTrx.photo : null)
        };
        if (isEditMode) {
          store.updateTransaction(editId, keluarData);
          showToast('Perubahan pengeluaran berhasil disimpan!', 'success');
        } else {
          store.addTransaction(keluarData);
          showToast('Pengeluaran [' + selectedKategoriKeluar + '] berhasil dicatat!', 'success');
        }
      }
      setTimeout(() => { router.navigate('transaksi'); }, 200);
    } catch (err) {
      console.error('Error saat menyimpan transaksi:', err);
      showToast('Gagal menyimpan: ' + (err.message || 'Terjadi kesalahan sistem'), 'error');
    }
  }

  const form = document.getElementById('form-tambah-trx');
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleSubmit(); });
  const btnSubmitTrx = document.getElementById('btn-submit-trx');
  if (btnSubmitTrx) btnSubmitTrx.addEventListener('click', (e) => { e.preventDefault(); handleSubmit(); });
  const saveHeaderBtn = document.getElementById('btn-save-header');
  if (saveHeaderBtn) saveHeaderBtn.addEventListener('click', (e) => { e.preventDefault(); handleSubmit(); });
}
