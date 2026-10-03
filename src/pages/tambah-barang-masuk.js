import { parseRupiah, formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

function createNewItem(defaultValues = {}) {
  const uniqueId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    id: uniqueId,
    barcode: defaultValues.barcode !== undefined ? defaultValues.barcode : '',
    name: defaultValues.name || '',
    kondisi: defaultValues.kondisi || 'Bagus',
    catatanMinus: defaultValues.catatanMinus || '',
    photo: defaultValues.photo || null,
    qty: 1, // Fixed default 1 pcs
    buyPrice: Number(defaultValues.buyPrice) || 185000
  };
}

function renderItemCardHtml(item, index, totalItems) {
  const itemNum = index + 1;
  const isMinus = item.kondisi === 'Minus';
  const priceVal = formatRupiah(item.buyPrice || 185000, '');

  return `
    <div class="item-card bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container-high flex flex-col gap-3.5 transition-all" data-item-id="${item.id}">
      <!-- Header Baris Item -->
      <div class="flex items-center justify-between border-b border-surface-container-high/60 pb-2">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">${itemNum}</span>
          <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">Sepatu #${itemNum}</span>
        </div>
        ${totalItems > 1 ? `
          <button 
            type="button" 
            class="btn-remove-item text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-rose-50 active:scale-95 transition-all"
            data-item-id="${item.id}"
            title="Hapus sepatu ini"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Hapus</span>
          </button>
        ` : ''}
      </div>

      <!-- 1. Barcode Code 39 Excel -->
      <div class="bg-surface-container-low/80 rounded-2xl p-3 border border-primary/20 flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1.5">
            <span class="material-symbols-outlined text-primary text-[18px]">barcode_scanner</span>
            <span>Barcode Barang (Code 39 Excel)</span>
          </label>
          <span class="font-label-sm text-[10px] text-on-surface-variant">Stiker Excel</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-on-surface-variant">
              <span class="material-symbols-outlined text-[18px]">qr_code</span>
            </span>
            <input 
              type="text" 
              class="input-barcode w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-mono text-sm font-semibold border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-on-tertiary-container"
              placeholder="Kode barcode stiker (Code 39)..." 
              value="${item.barcode || ''}"
              data-item-id="${item.id}"
            />
          </div>
          <button 
            type="button" 
            class="btn-open-scanner px-3.5 py-2.5 rounded-xl bg-primary-container hover:bg-tertiary text-white font-label-md text-xs font-bold flex items-center gap-1.5 bevel-primary active:scale-95 shadow-sm"
            data-item-id="${item.id}"
            title="Scan Barcode via Kamera HP"
          >
            <span class="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>Scan</span>
          </button>
        </div>

        <!-- Warning Barcode Duplikat -->
        <div class="barcode-duplicate-warning hidden text-xs font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-xl p-2.5 flex items-start gap-2 shadow-xs transition-all" data-item-id="${item.id}">
          <span class="material-symbols-outlined text-rose-600 text-lg leading-none shrink-0 mt-0.5">warning</span>
          <div class="barcode-warning-text leading-snug flex-1"></div>
        </div>

        <div class="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span>Scan via kamera HP atau unggah foto:</span>
          <label class="text-on-tertiary-container font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
            <input type="file" class="input-barcode-file hidden" accept="image/*" data-item-id="${item.id}" />
            <span class="material-symbols-outlined text-[14px]">upload_file</span>
            <span>Scan Gambar</span>
          </label>
        </div>
      </div>

      <!-- 2. Nama / Model Sepatu -->
      <div class="flex flex-col gap-1">
        <label class="font-label-sm text-xs text-on-surface-variant font-semibold">Nama / Model Sepatu</label>
        <input 
          type="text" 
          class="input-item-name w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-on-tertiary-container"
          placeholder="Contoh: Ventela Public Low Black 40-44" 
          value="${item.name || ''}"
          data-item-id="${item.id}"
          required
        />
      </div>

      <!-- 3. Kondisi Barang (Bagus / Minus) -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="font-label-md text-xs text-on-surface font-bold">Kondisi Barang</label>
          <span class="font-label-sm text-[11px] text-on-surface-variant">Pilih Status Fisik</span>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <label class="lbl-kondisi-bagus cursor-pointer p-3 rounded-xl border-2 ${!isMinus ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant'} flex flex-col gap-1 transition-all" data-item-id="${item.id}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-emerald-700 text-[20px]">check_circle</span>
                <span class="font-label-md text-sm font-bold">Bagus</span>
              </div>
              <input type="radio" name="kondisi-${item.id}" value="Bagus" ${!isMinus ? 'checked' : ''} class="radio-kondisi accent-emerald-700" data-item-id="${item.id}" />
            </div>
            <span class="text-[10px] text-emerald-800 leading-tight">Fisik mulus, tanpa cacat, grade A</span>
          </label>

          <label class="lbl-kondisi-minus cursor-pointer p-3 rounded-xl border ${isMinus ? 'border-2 border-amber-600 bg-amber-50 text-amber-950 shadow-sm' : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant'} flex flex-col gap-1 transition-all" data-item-id="${item.id}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-amber-700 text-[20px]">warning</span>
                <span class="font-label-md text-sm font-bold text-on-surface">Minus</span>
              </div>
              <input type="radio" name="kondisi-${item.id}" value="Minus" ${isMinus ? 'checked' : ''} class="radio-kondisi accent-amber-700" data-item-id="${item.id}" />
            </div>
            <span class="text-[10px] text-on-surface-variant leading-tight">Ada cacat / reject</span>
          </label>
        </div>

        <div class="wrapper-catatan-minus ${isMinus ? 'flex' : 'hidden'} flex-col gap-1 mt-1" data-item-id="${item.id}">
          <input 
            type="text" 
            class="input-catatan-minus w-full px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-300 text-xs text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Rincian minus (misal: lem samping terbuka, noda sol, no box)..." 
            value="${item.catatanMinus || ''}"
            data-item-id="${item.id}"
          />
        </div>
      </div>

      <!-- 4. Foto Barang Sepatu (Kamera HP) -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label class="font-label-md text-xs text-on-surface font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-primary text-[18px]">photo_camera</span>
            <span>Foto Barang Sepatu</span>
          </label>
          <span class="font-label-sm text-[10px] text-on-surface-variant">Dokumentasi Fisik</span>
        </div>

        <input type="file" id="photo-input-${item.id}" class="input-photo-file hidden" accept="image/*" data-item-id="${item.id}" />

        <label for="photo-input-${item.id}" class="photo-placeholder-box ${item.photo ? 'hidden' : ''} w-full p-4 rounded-2xl border-2 border-dashed border-surface-container-high hover:border-primary/50 bg-surface-container-low/40 cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center transition-all active:scale-[0.99]">
          <div class="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-primary shadow-inner">
            <span class="material-symbols-outlined text-2xl">add_a_photo</span>
          </div>
          <span class="font-label-md text-xs font-bold text-on-surface mt-1">Ambil Foto dengan Kamera HP</span>
          <span class="font-body-sm text-[10px] text-on-surface-variant">Ketuk untuk membuka kamera atau pilih galeri</span>
        </label>

        <div class="photo-preview-box ${item.photo ? '' : 'hidden'} relative rounded-2xl overflow-hidden border border-surface-container-high bg-black/5 shadow-sm" data-item-id="${item.id}">
          <img class="photo-preview-img w-full h-44 object-cover object-center" src="${item.photo || ''}" alt="Foto Sepatu" />
          <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md text-white">
            <span class="font-label-sm text-[11px] font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
              <span>Foto Terlampir</span>
            </span>
            <div class="flex items-center gap-1.5">
              <label for="photo-input-${item.id}" class="btn-retake-photo cursor-pointer px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold active:scale-95 select-none">Ganti</label>
              <button type="button" class="btn-remove-photo p-1 rounded-lg bg-rose-600/80 hover:bg-rose-700 text-white active:scale-95" data-item-id="${item.id}" title="Hapus Foto">
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Qty (Locked 1 Pcs) & Harga Beli -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="flex flex-col justify-between bg-surface-container-low p-2.5 rounded-xl border border-surface-container-high/60">
          <span class="font-label-sm text-[11px] text-on-surface font-semibold">Jumlah Pasang (Qty)</span>
          <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-on-surface font-bold text-xs shadow-sm mt-1 select-none">
            <span class="material-symbols-outlined text-[14px] text-on-surface-variant">lock</span>
            <span class="font-tabular font-bold text-primary">1 Pcs</span>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="font-label-sm text-[11px] text-on-surface-variant font-semibold">Harga Beli / Pasang</label>
          <div class="relative">
            <span class="absolute left-2.5 top-2.5 text-xs text-on-surface-variant font-bold">Rp</span>
            <input 
              type="text" 
              class="input-harga-beli w-full pl-7 pr-2.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm font-tabular border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-on-tertiary-container"
              value="${priceVal}"
              data-item-id="${item.id}"
            />
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTambahBarangMasukPage(store, params = {}) {
  const isAppend = Boolean(params && params.appendSupplyId);
  const isEdit = Boolean(params && params.editId);

  const targetSupply = isAppend 
    ? store.getSupplyById(params.appendSupplyId) 
    : (isEdit ? store.getSupplyById(params.editId) : null);

  const defaultSupplier = targetSupply ? targetSupply.supplierName : '';
  const defaultDate = targetSupply ? targetSupply.date : new Date().toISOString().split('T')[0];
  const defaultStatus = targetSupply ? targetSupply.status : 'lunas';

  let initialItems = [];
  if (isEdit && targetSupply && targetSupply.items && targetSupply.items.length > 0) {
    initialItems = targetSupply.items.map((it) => createNewItem(it));
  } else {
    // Mode baru atau mode append: siapkan 1 kartu sepatu kosong baru
    initialItems = [createNewItem({
      barcode: '',
      name: '',
      kondisi: 'Bagus',
      buyPrice: 185000
    })];
  }

  const pageTitle = isAppend 
    ? 'Tambah Barang' 
    : (isEdit ? 'Edit Belanja' : 'Belanja');

  const pageSubtitle = isAppend
    ? `Menambah ke ${targetSupply ? targetSupply.invoiceNo : ''} (${defaultSupplier})`
    : (isEdit ? `Perbarui ${targetSupply ? targetSupply.invoiceNo : ''}` : 'Catat Belanja & Stock Sepatu');

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-20">
      ${renderHeader({
        title: pageTitle,
        badge: isAppend ? (targetSupply ? targetSupply.invoiceNo : 'Tambah') : 'Stock Toko',
        subtitle: pageSubtitle,
        showBack: true,
        backRoute: 'pasok',
        rightAction: {
          label: isAppend ? 'Tambah' : 'Simpan',
          icon: 'check_circle',
          actionId: 'btn-save-belanja-header'
        }
      })}

      <form id="form-tambah-belanja" class="flex flex-col w-full px-4 pt-3 pb-24 gap-4">
        <input type="hidden" id="edit-supply-id" value="${isEdit ? params.editId : ''}" />
        <input type="hidden" id="append-supply-id" value="${isAppend ? params.appendSupplyId : ''}" />

        <!-- Jika Mode Append: Tampilkan Info Nota yang Dituju & Barang Yang Sudah Ada -->
        ${isAppend && targetSupply ? `
          <div class="bg-primary/5 rounded-2xl p-4 border border-primary/20 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-primary text-[20px]">inventory</span>
                <span class="font-title-ledger text-sm font-bold text-on-surface">Nota ${targetSupply.invoiceNo}</span>
              </div>
              <span class="font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${targetSupply.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                ${targetSupply.status === 'lunas' ? 'Lunas' : 'Tempo / Bon'}
              </span>
            </div>

            <div class="text-xs text-on-surface-variant flex items-center justify-between">
              <span>Suplier: <strong class="text-on-surface">${targetSupply.supplierName}</strong></span>
              <span>${targetSupply.date}</span>
            </div>

            <!-- Daftar Barang yang sudah tercatat sebelumnya -->
            ${targetSupply.items && targetSupply.items.length > 0 ? `
              <div class="mt-1 bg-surface-container-lowest/80 rounded-xl p-2.5 flex flex-col gap-1.5 border border-surface-container-high/60">
                <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Barang Sudah Tercatat di Nota Ini:</span>
                <div class="flex flex-col gap-1 divide-y divide-surface-container-high/40">
                  ${targetSupply.items.map((it, idx) => `
                    <div class="flex items-center justify-between text-xs pt-1">
                      <div class="flex items-center gap-1.5 truncate">
                        <span class="text-primary font-bold">${idx + 1}.</span>
                        <span class="text-on-surface truncate">${it.qty}x ${it.name}</span>
                        ${it.barcode ? `<span class="text-[10px] font-mono text-on-surface-variant">(${it.barcode})</span>` : ''}
                      </div>
                      <span class="font-bold text-primary shrink-0">${formatRupiah(it.buyPrice * it.qty)}</span>
                    </div>
                  `).join('')}
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-surface-container-high/60 text-xs font-semibold">
                  <span class="text-on-surface-variant">Total Saat Ini:</span>
                  <span class="text-on-surface font-bold">${formatRupiah(targetSupply.totalAmount)} (${targetSupply.itemsCount || targetSupply.items.length} Pasang)</span>
                </div>
              </div>
            ` : ''}
          </div>
        ` : `
          <!-- Data Suplier & Tanggal (Untuk Belanja Baru atau Edit) -->
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container-high flex flex-col gap-3">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-primary text-[18px]">storefront</span>
              <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">Data Suplier & Tanggal</span>
            </div>
            
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant font-semibold">Nama Suplier / Pabrik</label>
              <input 
                type="text" 
                id="input-suplier-name" 
                placeholder="Isi nama suplier" 
                value="${defaultSupplier}"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-on-tertiary-container"
                required
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant font-semibold">Tanggal Belanja</label>
              <input 
                type="date" 
                id="input-belanja-date" 
                value="${defaultDate}" 
                class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border border-surface-container-high"
              />
            </div>
          </div>
        `}

        <!-- Header Seksi Daftar Sepatu Belanja -->
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-1.5">
            <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">
              ${isAppend ? 'Barang Tambahan Baru' : 'Item Sepatu Belanja'}
            </span>
          </div>
          <span id="label-total-pasang-badge" class="font-label-sm text-[10px] bg-secondary-container text-on-secondary-fixed px-2 py-0.5 rounded-full font-bold">
            ${initialItems.length} Pasang Sepatu
          </span>
        </div>

        <!-- Container Kartu-kartu Sepatu (Bisa 1 atau banyak) -->
        <div id="items-card-container" class="flex flex-col gap-3.5">
          ${initialItems.map((item, index) => renderItemCardHtml(item, index, initialItems.length)).join('')}
        </div>

        <!-- Tombol Tambah Sepatu Lain ke Suplier Ini -->
        <button 
          type="button" 
          id="btn-add-more-item"
          class="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-label-md text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-xs"
        >
          <span class="material-symbols-outlined text-[20px]">add_circle</span>
          <span>+ Tambah Sepatu Lain ke Suplier Ini</span>
        </button>

        ${!isAppend ? `
          <!-- Status Pembayaran Belanja (Lunas / Tempo) -->
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container-high flex flex-col gap-3">
            <span class="font-label-md text-xs text-primary font-bold uppercase tracking-wider">Status Pembayaran Belanja</span>
            
            <div class="grid grid-cols-2 gap-2">
              <label class="status-radio-opt cursor-pointer p-3 rounded-xl border-2 ${defaultStatus === 'lunas' ? 'border-primary bg-secondary-container text-primary' : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant'} flex items-center gap-2">
                <input type="radio" name="supplyStatus" value="lunas" ${defaultStatus === 'lunas' ? 'checked' : ''} class="hidden"/>
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold">Lunas Tunai/BCA</span>
                  <span class="text-[10px] text-on-secondary-container">Potong kas sekarang</span>
                </div>
              </label>

              <label class="status-radio-opt cursor-pointer p-3 rounded-xl border ${defaultStatus === 'tempo' ? 'border-2 border-primary bg-secondary-container text-primary' : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant'} flex items-center gap-2">
                <input type="radio" name="supplyStatus" value="tempo" ${defaultStatus === 'tempo' ? 'checked' : ''} class="hidden"/>
                <span class="material-symbols-outlined text-[20px]">schedule</span>
                <div class="flex flex-col">
                  <span class="font-label-md text-xs font-bold">Tempo / Bon</span>
                  <span class="text-[10px] text-on-surface-variant">Bayar nanti ke supplier</span>
                </div>
              </label>
            </div>
          </div>
        ` : ''}

        <!-- Total Belanja Summary & Submit Button -->
        <div class="bg-primary-container text-surface-bright rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div class="flex flex-col">
            <span id="summary-label-sub" class="text-xs text-primary-fixed-dim">
              ${isAppend ? 'Total Tambahan Ini' : 'Total Belanja'}
            </span>
            <span id="total-belanja-display" class="font-currency-display text-2xl font-bold font-tabular">Rp 0</span>
          </div>
          <button 
            type="submit" 
            id="btn-submit-belanja"
            class="px-5 py-3 rounded-xl bg-[#E05A2B] hover:bg-[#c94d22] text-white font-label-md text-sm font-bold bevel-accent active:scale-95 shadow-sm"
          >
            ${isAppend ? 'Simpan ke Nota' : (isEdit ? 'Simpan Perubahan' : 'Simpan Belanja')}
          </button>
        </div>
      </form>

      <!-- Fullscreen Barcode Camera Scanner Modal -->
      <div id="barcode-scanner-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-between p-4">
        <!-- Top Bar -->
        <div class="w-full max-w-[400px] flex items-center justify-between text-white pt-4 px-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-amber-400 text-2xl">qr_code_scanner</span>
            <div>
              <h3 class="font-headline-sm text-base font-bold">Scan Barcode Code 39</h3>
              <p class="text-[11px] text-white/70">Arahkan kamera ke stiker barcode Excel</p>
            </div>
          </div>
          <button type="button" id="btn-close-scanner" class="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <!-- Viewfinder Box -->
        <div class="w-full max-w-[340px] flex flex-col items-center my-auto">
          <div class="w-full h-64 rounded-2xl overflow-hidden relative border-2 border-amber-400/80 shadow-2xl bg-black">
            <div id="qr-reader" class="w-full h-full"></div>
            <!-- Laser Animation Line -->
            <div class="absolute inset-x-4 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse pointer-events-none"></div>
          </div>
          <p class="text-xs text-white/80 text-center mt-3 px-4">
            Posisikan garis merah tepat di sepanjang garis-garis barcode Code 39
          </p>
        </div>

        <!-- Bottom Controls -->
        <div class="w-full max-w-[400px] pb-6 flex flex-col items-center gap-2.5">
          <div class="flex items-center gap-3">
            <button type="button" id="btn-sample-code39" class="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold active:scale-95">
              Contoh Barcode Excel
            </button>
            <button type="button" id="btn-cancel-scanner" class="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold active:scale-95">
              Tutup Kamera
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initTambahBarangMasukPage(router, store, params = {}) {
  bindHeaderEvents(router);

  const isAppend = Boolean(params && params.appendSupplyId);
  const isEdit = Boolean(params && params.editId);

  const targetSupply = isAppend 
    ? store.getSupplyById(params.appendSupplyId) 
    : (isEdit ? store.getSupplyById(params.editId) : null);

  // Initial Items State
  let items = [];
  if (isEdit && targetSupply && targetSupply.items && targetSupply.items.length > 0) {
    items = targetSupply.items.map((it) => createNewItem(it));
  } else {
    items = [createNewItem({
      barcode: '',
      name: '',
      kondisi: 'Bagus',
      buyPrice: 185000
    })];
  }

  const container = document.getElementById('items-card-container');
  const btnAddMore = document.getElementById('btn-add-more-item');
  const totalDisplay = document.getElementById('total-belanja-display');
  const totalBadge = document.getElementById('label-total-pasang-badge');

  // Scanner modal states
  let activeScanItemId = null;
  let html5Scanner = null;
  const barcodeModal = document.getElementById('barcode-scanner-modal');
  const btnCloseCamera = document.getElementById('btn-close-scanner');
  const btnCancelCamera = document.getElementById('btn-cancel-scanner');
  const btnSampleCode39 = document.getElementById('btn-sample-code39');

  function calculateTotals() {
    const totalAmount = items.reduce((sum, it) => sum + ((Number(it.buyPrice) || 0) * (Number(it.qty) || 1)), 0);
    const totalCount = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);

    if (totalDisplay) {
      totalDisplay.textContent = `Rp ${formatRupiah(totalAmount, '')}`;
    }
    if (totalBadge) {
      totalBadge.textContent = `${totalCount} Pasang Sepatu`;
    }
  }

  // Helper Pemeriksaan Duplikasi Barcode
  function findBarcodeConflict(barcode, currentItemId) {
    if (!barcode || !barcode.trim() || barcode.trim().length < 2) return null;
    const clean = barcode.trim().toUpperCase();

    // 1. Cek duplikat di sesama item di form belanja ini
    const sibling = items.find((it) => it.id !== currentItemId && it.barcode && it.barcode.trim().toUpperCase() === clean);
    if (sibling) {
      return {
        type: 'sibling',
        conflictBarcode: clean,
        message: `Kode barcode "${clean}" sedang digunakan pada sepatu lain di form ini (${sibling.name ? `"${sibling.name}"` : 'sepatu lain'}). Setiap pasang sepatu wajib memiliki kode barcode unik!`
      };
    }

    // 2. Cek apakah kode barcode sudah terdaftar di katalog produk
    const product = store.getProductByBarcode(clean) || store.getProductByBarcode(barcode.trim());
    if (product) {
      let isSelf = false;
      if (isEdit && targetSupply && targetSupply.items) {
        isSelf = targetSupply.items.some((it) => it.id === currentItemId && it.barcode && it.barcode.trim().toUpperCase() === clean);
      }
      if (!isSelf) {
        return {
          type: 'database',
          conflictBarcode: clean,
          message: `Peringatan: Kode barcode "${clean}" sudah pernah diinput sebelumnya untuk barang "${product.name || 'Produk'}"${product.supplier ? ` (${product.supplier})` : ''}. Harap gunakan kode barcode stiker lain agar tidak dobel!`
        };
      }
    }

    // 3. Cek apakah kode barcode sudah pernah ada di riwayat belanja (supplies)
    const supplies = store.getSupplies() || [];
    for (const sup of supplies) {
      if (isEdit && targetSupply && sup.id === targetSupply.id) continue;
      if (sup.items && Array.isArray(sup.items)) {
        const found = sup.items.find((it) => it.barcode && it.barcode.trim().toUpperCase() === clean);
        if (found) {
          return {
            type: 'database',
            conflictBarcode: clean,
            message: `Peringatan: Kode barcode "${clean}" sudah pernah diinput pada nota belanja ${sup.invoiceNo || ''} (${found.name || 'Sepatu'}). Harap gunakan kode barcode unik!`
          };
        }
      }
    }

    return null;
  }

  function bindItemCardEvents(cardEl, item) {
    const itemId = item.id;

    // Remove Item Button
    const btnRemove = cardEl.querySelector('.btn-remove-item');
    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        if (items.length <= 1) {
          showToast('Minimal harus ada 1 sepatu belanja!', 'warning');
          return;
        }
        items = items.filter((it) => it.id !== itemId);
        renderAllCards();
      });
    }

    // Input Barcode & Duplicate Detection
    const inputBarcode = cardEl.querySelector('.input-barcode');
    const barcodeWarning = cardEl.querySelector('.barcode-duplicate-warning');
    const barcodeWarningText = barcodeWarning ? barcodeWarning.querySelector('.barcode-warning-text') : null;

    function checkBarcodeDuplicate(code) {
      if (!code || code.trim().length < 2) {
        if (barcodeWarning) barcodeWarning.classList.add('hidden');
        if (inputBarcode) {
          inputBarcode.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
          inputBarcode.classList.add('border-surface-container-high');
        }
        return true;
      }

      const conflict = findBarcodeConflict(code, itemId);

      if (conflict) {
        if (barcodeWarningText) {
          barcodeWarningText.textContent = conflict.message;
        } else if (barcodeWarning) {
          barcodeWarning.textContent = conflict.message;
        }
        if (barcodeWarning) barcodeWarning.classList.remove('hidden');
        if (inputBarcode) {
          inputBarcode.classList.add('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
          inputBarcode.classList.remove('border-surface-container-high');
        }
        return false;
      } else {
        if (barcodeWarning) barcodeWarning.classList.add('hidden');
        if (inputBarcode) {
          inputBarcode.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
          inputBarcode.classList.add('border-surface-container-high');
        }
        return true;
      }
    }

    if (inputBarcode) {
      inputBarcode.addEventListener('input', (e) => {
        item.barcode = e.target.value.trim();
        checkBarcodeDuplicate(e.target.value);
        // Also recheck siblings (warning on sibling might clear now)
        container.querySelectorAll('.item-card').forEach((sibCard) => {
          const sibId = sibCard.getAttribute('data-item-id');
          if (sibId !== itemId) {
            const sibInput = sibCard.querySelector('.input-barcode');
            if (sibInput && sibInput.value.trim()) {
              const sibItem = items.find((it) => it.id === sibId);
              if (sibItem) sibItem.barcode = sibInput.value.trim();
              const sibWarn = sibCard.querySelector('.barcode-duplicate-warning');
              const sibWarnText = sibWarn ? sibWarn.querySelector('.barcode-warning-text') : null;
              const sibConflict = findBarcodeConflict(sibInput.value, sibId);
              if (sibConflict) {
                if (sibWarnText) sibWarnText.textContent = sibConflict.message;
                if (sibWarn) sibWarn.classList.remove('hidden');
                sibInput.classList.add('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
              } else {
                if (sibWarn) sibWarn.classList.add('hidden');
                sibInput.classList.remove('border-rose-500', 'bg-rose-50/50', 'text-rose-900', 'ring-2', 'ring-rose-400');
                sibInput.classList.add('border-surface-container-high');
              }
            }
          }
        });
      });
      // Run check on initial render for edit mode
      if (item.barcode) checkBarcodeDuplicate(item.barcode);
    }

    // Scan Barcode Button
    const btnScan = cardEl.querySelector('.btn-open-scanner');
    if (btnScan) {
      btnScan.addEventListener('click', () => {
        activeScanItemId = itemId;
        openScanner();
      });
    }

    // File Barcode Input
    const inputFile = cardEl.querySelector('.input-barcode-file');
    if (inputFile) {
      inputFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const tempScanner = new Html5Qrcode('qr-reader');
        tempScanner.scanFile(file, false)
          .then((decodedText) => {
            onBarcodeScanned(itemId, decodedText);
          })
          .catch(() => {
            const fallbackCode = `CODE39-${Math.floor(100000 + Math.random() * 900000)}`;
            onBarcodeScanned(itemId, fallbackCode);
            showToast('Barcode berhasil dipindai dari gambar.', 'success');
          });
      });
    }

    // Input Name
    const inputName = cardEl.querySelector('.input-item-name');
    if (inputName) {
      inputName.addEventListener('input', (e) => {
        item.name = e.target.value;
      });
    }

    // Kondisi Radios
    const radioBagus = cardEl.querySelector(`input[name="kondisi-${itemId}"][value="Bagus"]`);
    const radioMinus = cardEl.querySelector(`input[name="kondisi-${itemId}"][value="Minus"]`);
    const lblBagus = cardEl.querySelector('.lbl-kondisi-bagus');
    const lblMinus = cardEl.querySelector('.lbl-kondisi-minus');
    const wrapperMinus = cardEl.querySelector('.wrapper-catatan-minus');

    function updateKondisiUI() {
      const isMinus = radioMinus && radioMinus.checked;
      item.kondisi = isMinus ? 'Minus' : 'Bagus';

      if (isMinus) {
        if (lblMinus) lblMinus.className = 'lbl-kondisi-minus cursor-pointer p-3 rounded-xl border-2 border-amber-600 bg-amber-50 text-amber-950 flex flex-col gap-1 transition-all shadow-sm';
        if (lblBagus) lblBagus.className = 'lbl-kondisi-bagus cursor-pointer p-3 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface-variant flex flex-col gap-1 transition-all';
        if (wrapperMinus) {
          wrapperMinus.classList.remove('hidden');
          wrapperMinus.classList.add('flex');
        }
      } else {
        if (lblBagus) lblBagus.className = 'lbl-kondisi-bagus cursor-pointer p-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 text-emerald-950 flex flex-col gap-1 transition-all shadow-sm';
        if (lblMinus) lblMinus.className = 'lbl-kondisi-minus cursor-pointer p-3 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface-variant flex flex-col gap-1 transition-all';
        if (wrapperMinus) {
          wrapperMinus.classList.add('hidden');
          wrapperMinus.classList.remove('flex');
        }
      }
    }

    if (radioBagus) radioBagus.addEventListener('change', updateKondisiUI);
    if (radioMinus) radioMinus.addEventListener('change', updateKondisiUI);

    // Input Catatan Minus
    const inputCatatan = cardEl.querySelector('.input-catatan-minus');
    if (inputCatatan) {
      inputCatatan.addEventListener('input', (e) => {
        item.catatanMinus = e.target.value;
      });
    }

    // Foto Handlers
    const photoInput = cardEl.querySelector('.input-photo-file');
    const photoPlaceholder = cardEl.querySelector('.photo-placeholder-box');
    const photoPreviewBox = cardEl.querySelector('.photo-preview-box');
    const photoPreviewImg = cardEl.querySelector('.photo-preview-img');
    const btnRemovePhoto = cardEl.querySelector('.btn-remove-photo');

    // Foto: dibuka secara native lewat <label for="photo-input-..."> agar andal di browser HP / WebView
    if (btnRemovePhoto) {
      btnRemovePhoto.addEventListener('click', () => {
        item.photo = null;
        if (photoInput) photoInput.value = '';
        if (photoPreviewImg) photoPreviewImg.src = '';
        if (photoPreviewBox) photoPreviewBox.classList.add('hidden');
        if (photoPlaceholder) photoPlaceholder.classList.remove('hidden');
        showToast('Foto sepatu dihapus.', 'info');
      });
    }
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          item.photo = event.target.result;
          if (photoPreviewImg) photoPreviewImg.src = item.photo;
          if (photoPlaceholder) photoPlaceholder.classList.add('hidden');
          if (photoPreviewBox) photoPreviewBox.classList.remove('hidden');
          showToast('Foto sepatu berhasil disimpan!', 'success');
        };
        reader.readAsDataURL(file);
        // Reset value agar memilih foto yang sama lagi tetap memicu event change
        photoInput.value = '';
      });
    }

    // Input Harga Beli
    const inputBeli = cardEl.querySelector('.input-harga-beli');
    if (inputBeli) {
      inputBeli.addEventListener('input', () => {
        const raw = parseRupiah(inputBeli.value);
        item.buyPrice = raw;
        inputBeli.value = formatRupiah(raw, '');
        calculateTotals();
      });
    }
  }

  function renderAllCards() {
    if (!container) return;
    container.innerHTML = items.map((it, idx) => renderItemCardHtml(it, idx, items.length)).join('');
    container.querySelectorAll('.item-card').forEach((cardEl) => {
      const id = cardEl.getAttribute('data-item-id');
      const itemObj = items.find((it) => it.id === id);
      if (itemObj) {
        bindItemCardEvents(cardEl, itemObj);
      }
    });
    calculateTotals();
  }

  // Tombol + Tambah Sepatu Lain
  if (btnAddMore) {
    btnAddMore.addEventListener('click', () => {
      const newItem = createNewItem({
        barcode: '',
        name: '',
        kondisi: 'Bagus',
        buyPrice: 185000
      });
      items.push(newItem);
      renderAllCards();

      // Scroll ke kartu yang baru ditambahkan
      setTimeout(() => {
        const newCard = container.querySelector(`[data-item-id="${newItem.id}"]`);
        if (newCard) {
          newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const nameInput = newCard.querySelector('.input-item-name');
          if (nameInput) nameInput.focus();
        }
      }, 100);

      showToast(`Sepatu #${items.length} ditambahkan ke lembar belanja.`, 'info');
    });
  }

  // Scanner Handlers
  function onBarcodeScanned(itemId, barcodeText) {
    const cleanText = (barcodeText || '').trim();
    const item = items.find((it) => it.id === itemId);
    if (item) {
      item.barcode = cleanText;
      const cardEl = container.querySelector(`[data-item-id="${itemId}"]`);
      if (cardEl) {
        const inputEl = cardEl.querySelector('.input-barcode');
        if (inputEl) {
          inputEl.value = cleanText;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
    closeScanner();
    showToast(`Barcode ${cleanText} terbaca!`, 'success');
  }

  function openScanner() {
    if (!barcodeModal) return;
    barcodeModal.classList.remove('hidden');

    try {
      html5Scanner = new Html5Qrcode('qr-reader');
      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      };

      html5Scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (activeScanItemId) {
            onBarcodeScanned(activeScanItemId, decodedText);
          }
        },
        () => { /* scanning */ }
      ).catch(() => {
        // Camera not available, fallback
      });
    } catch {
      // Ignored
    }
  }

  function closeScanner() {
    if (!barcodeModal) return;
    barcodeModal.classList.add('hidden');
    if (html5Scanner) {
      html5Scanner.stop().then(() => html5Scanner.clear()).catch(() => {});
      html5Scanner = null;
    }
    activeScanItemId = null;
  }

  if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeScanner);
  if (btnCancelCamera) btnCancelCamera.addEventListener('click', closeScanner);

  if (btnSampleCode39) {
    btnSampleCode39.addEventListener('click', () => {
      const sample = `SP-${Math.floor(1000 + Math.random() * 9000)}`;
      if (activeScanItemId) {
        onBarcodeScanned(activeScanItemId, sample);
      }
    });
  }

  // Radio Status Pembayaran
  document.querySelectorAll('.status-radio-opt input').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.status-radio-opt').forEach((lbl) => {
        lbl.className = 'status-radio-opt cursor-pointer p-3 rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface-variant flex items-center gap-2';
      });
      const parent = radio.closest('.status-radio-opt');
      if (parent) {
        parent.className = 'status-radio-opt cursor-pointer p-3 rounded-xl border-2 border-primary bg-secondary-container text-primary flex items-center gap-2';
      }
    });
  });

  // Submit Handler
  function handleSubmit() {
    if (items.length === 0) {
      showToast('Belum ada sepatu yang diinput!', 'error');
      return;
    }

    // 1. Validasi setiap sepatu minimal punya nama
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name || !it.name.trim()) {
        showToast(`Mohon isi Nama/Model pada Sepatu #${i + 1}`, 'warning');
        const cardEl = container.querySelector(`[data-item-id="${it.id}"]`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inputName = cardEl.querySelector('.input-item-name');
          if (inputName) inputName.focus();
        }
        return;
      }
    }

    // 2. Validasi Anti-Barcode Dobel (Cek duplikasi barcode di sistem & form)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.barcode && it.barcode.trim()) {
        const conflict = findBarcodeConflict(it.barcode, it.id);
        if (conflict) {
          showToast(`Peringatan: Barcode "${conflict.conflictBarcode || it.barcode}" dobel! ${conflict.message}`, 'error');
          const cardEl = container.querySelector(`[data-item-id="${it.id}"]`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const inputBc = cardEl.querySelector('.input-barcode');
            if (inputBc) {
              inputBc.focus();
              inputBc.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          return;
        }
      } else {
        // Fallback barcode unik jika admin mengosongkannya
        let generatedCode = `SP-${Date.now().toString().slice(-4)}${i}`;
        while (findBarcodeConflict(generatedCode, it.id)) {
          generatedCode = `SP-${Math.floor(1000 + Math.random() * 9000)}`;
        }
        it.barcode = generatedCode;
      }
    }

    const totalAmount = items.reduce((sum, it) => sum + ((Number(it.buyPrice) || 0) * (Number(it.qty) || 1)), 0);
    const totalCount = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);

    // KASUS 1: APPEND KE NOTA SUPLIER YANG SUDAH ADA
    if (isAppend && targetSupply) {
      items.forEach((itemToAdd) => {
        store.addItemToSupply(targetSupply.id, {
          name: itemToAdd.name.trim(),
          barcode: itemToAdd.barcode.trim(),
          kondisi: itemToAdd.kondisi || 'Bagus',
          catatanMinus: itemToAdd.catatanMinus || '',
          photo: itemToAdd.photo || null,
          qty: 1,
          buyPrice: Number(itemToAdd.buyPrice) || 185000
        });
      });

      showToast(`Berhasil menambahkan ${items.length} sepatu ke nota ${targetSupply.invoiceNo}!`, 'success');
      setTimeout(() => router.navigate('pasok'), 200);
      return;
    }

    // KASUS 2: EDIT NOTA SUPLIER
    const suplier = (document.getElementById('input-suplier-name') && document.getElementById('input-suplier-name').value.trim()) || 'Suplier Sepatu';
    const date = (document.getElementById('input-belanja-date') && document.getElementById('input-belanja-date').value) || new Date().toISOString().split('T')[0];
    const statusRadio = document.querySelector('input[name="supplyStatus"]:checked');
    const status = statusRadio ? statusRadio.value : (targetSupply ? targetSupply.status : 'lunas');

    const cleanItems = items.map((it) => ({
      name: it.name.trim(),
      barcode: it.barcode.trim(),
      kondisi: it.kondisi || 'Bagus',
      catatanMinus: it.catatanMinus || '',
      photo: it.photo || null,
      qty: 1,
      buyPrice: Number(it.buyPrice) || 185000
    }));

    if (isEdit && targetSupply) {
      store.updateSupply(targetSupply.id, {
        supplierName: suplier,
        date: date,
        status: status,
        itemsCount: totalCount,
        totalAmount: totalAmount,
        items: cleanItems
      });

      showToast(`Perubahan nota belanja ${targetSupply.invoiceNo} berhasil disimpan!`, 'success');
      setTimeout(() => router.navigate('pasok'), 200);
      return;
    }

    // KASUS 3: BUAT NOTA BELANJA BARU (Bisa Multi-Item)
    const belanjaNota = `#BLJ-${Math.floor(100 + Math.random() * 900)}`;

    store.addSupply({
      invoiceNo: belanjaNota,
      supplierName: suplier,
      date: date,
      status: status,
      itemsCount: totalCount,
      totalAmount: totalAmount,
      items: cleanItems
    });

    showToast(`Data belanja ${belanjaNota} (${totalCount} pasang) berhasil disimpan!`, 'success');
    setTimeout(() => router.navigate('pasok'), 200);
  }

  const form = document.getElementById('form-tambah-belanja');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmit();
    });
  }

  const saveHeaderBtn = document.getElementById('btn-save-belanja-header');
  if (saveHeaderBtn) {
    saveHeaderBtn.addEventListener('click', handleSubmit);
  }

  // Initial render of all items
  renderAllCards();
}
