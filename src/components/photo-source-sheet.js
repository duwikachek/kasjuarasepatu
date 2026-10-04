/**
 * Bottom sheet pilihan sumber foto (Kamera / Kamera Depan / Galeri).
 *
 * Catatan penting soal atribut `capture` pada <input type="file">:
 * - accept="image/*" tanpa capture -> browser biasanya langsung membuka GALERI.
 * - accept="image/*" capture       -> browser biasanya langsung membuka KAMERA.
 *
 * Perilaku ini berbeda antar browser dan WebView Android, jadi cara paling
 * andal adalah menyediakan KEDUA input lalu membiarkan pengguna memilih
 * sendiri lewat sheet ini.
 *
 * Sheet dipasang ke #phone-frame (bukan #app) supaya tidak ikut terhapus
 * saat halaman di-render ulang.
 */
export function createPhotoSourceSheet() {
  const phoneFrame = document.getElementById('phone-frame') || document.body;

  let sheet = document.getElementById('photo-source-sheet');
  if (sheet && sheet.parentElement !== phoneFrame) {
    sheet.remove();
    sheet = null;
  }

  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'photo-source-sheet';
    sheet.className = 'hidden absolute inset-0 z-50 flex items-end justify-center overflow-hidden';
    sheet.innerHTML = buildSheetHtml();
    phoneFrame.appendChild(sheet);
  }

  const backdrop = sheet.querySelector('#photo-sheet-backdrop');
  const btnClose = sheet.querySelector('#btn-close-photo-sheet');
  const btnCancel = sheet.querySelector('#btn-cancel-photo-sheet');
  const btnBack = sheet.querySelector('#photo-src-camera');
  const btnFront = sheet.querySelector('#photo-src-front-camera');
  const btnGallery = sheet.querySelector('#photo-src-gallery');

  // Id item yang sedang memilih sumber foto
  let currentItemId = null;

  function closeSheet() {
    sheet.classList.add('hidden');
    currentItemId = null;
  }

  function openSheet(itemId) {
    currentItemId = itemId;
    sheet.classList.remove('hidden');
  }

  /**
   * Memicu input file pada kartu item tertentu.
   * @param {'environment'|'user'|null} source kamera belakang / depan / galeri
   */
  function triggerInput(source) {
    if (!currentItemId) return;
    const cardEl = document.querySelector(`.item-card[data-item-id="${currentItemId}"]`);
    if (!cardEl) return;

    let input = null;
    if (source === 'environment') input = cardEl.querySelector('.input-photo-camera');
    else if (source === 'user') input = cardEl.querySelector('.input-photo-front');
    else input = cardEl.querySelector('.input-photo-gallery');

    // Fallback bila input khusus tidak tersedia
    if (!input) {
      input = cardEl.querySelector('.input-photo-camera') || cardEl.querySelector('.input-photo-gallery');
    }
    if (!input) return;

    // Tutup sheet dulu agar kamera/pemilih file mendapat fokus
    closeSheet();

    // Reset value agar memilih berkas yang sama lagi tetap memicu event change
    input.value = '';
    setTimeout(() => {
      try {
        input.click();
      } catch (err) {
        console.warn('Gagal membuka input file', err);
      }
    }, 120);
  }

  if (btnBack) btnBack.addEventListener('click', () => triggerInput('environment'));
  if (btnFront) btnFront.addEventListener('click', () => triggerInput('user'));
  if (btnGallery) btnGallery.addEventListener('click', () => triggerInput(null));
  if (btnClose) btnClose.addEventListener('click', closeSheet);
  if (btnCancel) btnCancel.addEventListener('click', closeSheet);
  if (backdrop) backdrop.addEventListener('click', closeSheet);

  return {
    open: openSheet,
    close: closeSheet,
    isOpen: () => !sheet.classList.contains('hidden')
  };
}

/** Markup bottom sheet pilihan sumber foto. */
function buildSheetHtml() {
  return `
    <div class="absolute inset-0 bg-black/65 backdrop-blur-sm" id="photo-sheet-backdrop"></div>
    <div class="relative w-full max-w-[430px] glass-sheet rounded-t-3xl p-4 pb-6 flex flex-col gap-2.5 z-10 animate-in fade-in slide-in-from-bottom duration-200">
      <div class="flex items-center justify-between pb-1">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-full glass-chip text-primary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[20px]">add_a_photo</span>
          </div>
          <div>
            <h3 class="font-bold text-sm text-on-surface">Ambil Foto Barang</h3>
            <p class="text-[11px] text-on-surface-variant">Pilih sumber foto sepatu</p>
          </div>
        </div>
        <button type="button" id="btn-close-photo-sheet" class="p-1.5 rounded-full glass-chip-btn text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <button type="button" id="photo-src-camera"
        class="glass-chip-btn w-full p-3.5 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98]">
        <span class="w-11 h-11 rounded-xl glass-emerald text-emerald-200 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[22px]">photo_camera</span>
        </span>
        <span class="flex flex-col min-w-0">
          <span class="font-bold text-sm text-on-surface">Ambil dengan Kamera</span>
          <span class="text-[11px] text-on-surface-variant">Foto langsung memakai kamera HP</span>
        </span>
        <span class="material-symbols-outlined text-[20px] text-on-surface-variant ml-auto shrink-0">chevron_right</span>
      </button>

      <button type="button" id="photo-src-front-camera"
        class="glass-chip-btn w-full p-3.5 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98]">
        <span class="w-11 h-11 rounded-xl glass-blue text-blue-200 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[22px]">portrait_camera</span>
        </span>
        <span class="flex flex-col min-w-0">
          <span class="font-bold text-sm text-on-surface">Kamera Depan</span>
          <span class="text-[11px] text-on-surface-variant">Selfie / foto renew</span>
        </span>
        <span class="material-symbols-outlined text-[20px] text-on-surface-variant ml-auto shrink-0">chevron_right</span>
      </button>

      <button type="button" id="photo-src-gallery"
        class="glass-chip-btn w-full p-3.5 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98]">
        <span class="w-11 h-11 rounded-xl glass-amber text-amber-200 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[22px]">photo_library</span>
        </span>
        <span class="flex flex-col min-w-0">
          <span class="font-bold text-sm text-on-surface">Pilih dari Galeri</span>
          <span class="text-[11px] text-on-surface-variant">Ambil foto yang sudah tersimpan</span>
        </span>
        <span class="material-symbols-outlined text-[20px] text-on-surface-variant ml-auto shrink-0">chevron_right</span>
      </button>

      <button type="button" id="btn-cancel-photo-sheet"
        class="glass-chip-btn w-full py-3 rounded-2xl text-on-surface text-sm font-bold mt-0.5">
        Batal
      </button>
    </div>
  `;
}