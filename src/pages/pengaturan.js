import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { formatRupiah, parseRupiah } from '../store/store.js';
import { testSpreadsheetConnection, syncAllToGoogleSheets, extractSpreadsheetId, getCredentials } from '../services/googleSheets.js';

export function renderPengaturanPage(store) {
  const shop = store.getShop();
  const initialLaci = Number(shop.initialBalanceLaci ?? 8450000);
  const initialBank = Number(shop.initialBalanceBank ?? 6400000);
  const initialTotal = initialLaci + initialBank;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Pengaturan',
        badge: 'Sistem',
        subtitle: 'Profil, Keamanan & Data Toko',
        showBack: true,
        backRoute: 'dashboard'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-4">
        <!-- Modal / Saldo Kas Awal Toko Card -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
              <h3 class="font-title-ledger text-sm font-bold text-on-surface">Modal / Saldo Kas Awal Toko</h3>
            </div>
            <span class="font-label-sm text-[10px] px-2 py-0.5 rounded-full glass-chip text-primary font-bold">Saldo Awal</span>
          </div>
          
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Tentukan modal kas toko saat pertama kali pembukuan dimulai. Rumus saldo: <strong>Saldo Kas Awal + Pemasukan - Pengeluaran</strong>.
          </p>

          <div class="flex flex-col gap-2.5 mt-0.5">
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant flex items-center justify-between">
                <span>Kas Awal di Rek Tampungan</span>
                <span class="text-primary font-bold">IDR</span>
              </label>
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  id="input-initial-laci" 
                  inputmode="numeric"
                  value="${formatRupiah(initialLaci, '')}" 
                  class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-bold text-base font-tabular focus:outline-primary"
                  placeholder="0"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant flex items-center justify-between">
                <span>Kas Awal di Rekening Bank Toko</span>
                <span class="text-primary font-bold">IDR</span>
              </label>
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  id="input-initial-bank" 
                  inputmode="numeric"
                  value="${formatRupiah(initialBank, '')}" 
                  class="w-full px-3.5 py-2.5 rounded-xl glass-input text-on-surface font-bold text-base font-tabular focus:outline-primary"
                  placeholder="0"
                />
              </div>
            </div>

            <!-- Total Preview & Quick 0 Button -->
            <div class="glass-panel rounded-xl p-3 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[11px] text-on-surface-variant">Total Saldo Kas Awal</span>
                <span id="preview-total-initial" class="text-base font-bold text-primary font-tabular">
                  ${formatRupiah(initialTotal)}
                </span>
              </div>
              <button 
                type="button" 
                id="btn-set-zero-initial" 
                class="px-2.5 py-1.5 rounded-lg glass-chip-btn text-on-surface text-xs font-semibold"
                title="Atur modal awal menjadi 0 rupiah"
              >
                Setel ke Rp 0
              </button>
            </div>

            <button 
              type="button" 
              id="btn-save-initial-balance" 
              class="mt-1 w-full py-2.5 rounded-xl glass-primary glass-btn glass-sheen text-primary-btn font-label-md text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[16px]">save</span>
              <span>Simpan Saldo Kas Awal</span>
            </button>
          </div>
        </section>

        <!-- Profil Toko Form Card -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">store</span>
            <h3 class="font-title-ledger text-sm font-bold text-on-surface">Profil Toko Sepatu</h3>
          </div>

          <div class="flex flex-col gap-2.5">
            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant">Nama Toko</label>
              <input 
                type="text" 
                id="input-shop-name" 
                value="${shop.name}" 
                class="w-full px-3 py-2 rounded-xl glass-input text-on-surface font-body-md text-sm"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant">Nama Pemilik</label>
              <input 
                type="text" 
                id="input-shop-owner" 
                value="${shop.owner || 'Pak Hendra'}" 
                class="w-full px-3 py-2 rounded-xl glass-input text-on-surface font-body-md text-sm"
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="font-label-sm text-xs text-on-surface-variant">Alamat Toko</label>
              <input 
                type="text" 
                id="input-shop-address" 
                value="${shop.address || 'Jl. Veteran No. 45, Bandung'}" 
                class="w-full px-3 py-2 rounded-xl glass-input text-on-surface font-body-md text-sm"
              />
            </div>

            <button 
              type="button" 
              id="btn-save-shop-profile" 
              class="mt-1 w-full py-2.5 rounded-xl glass-primary glass-btn glass-sheen text-primary-btn font-label-md text-xs font-bold"
            >
              Simpan Profil Toko
            </button>
          </div>
        </section>

        <!-- Keamanan & PIN -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">security</span>
            <h3 class="font-title-ledger text-sm font-bold text-on-surface">Keamanan & Akses Kasir</h3>
          </div>

          <div class="flex flex-col gap-2 divide-y divide-white/45">
            <div class="flex items-center justify-between py-2">
              <div class="flex flex-col">
                <span class="font-label-md text-xs font-semibold text-on-surface">PIN Masuk Toko</span>
                <span class="text-[11px] text-on-surface-variant">PIN saat ini: <strong class="text-on-surface">${shop.pin || '123456'}</strong></span>
              </div>
              <button 
                type="button" 
                id="btn-change-pin"
                class="px-3 py-1.5 rounded-lg glass-chip-btn text-primary font-label-md text-xs font-semibold"
              >
                Ubah PIN
              </button>
            </div>

            <div class="flex items-center justify-between py-2">
              <div class="flex flex-col">
                <span class="font-label-md text-xs font-semibold text-on-surface">Kunci Aplikasi Sekarang</span>
                <span class="text-[11px] text-on-surface-variant">Keluar ke layar PIN login</span>
              </div>
              <button 
                type="button" 
                id="btn-lock-app"
                class="px-3 py-1.5 rounded-lg glass-rose text-rose-800 font-label-md text-xs font-semibold flex items-center gap-1"
            </div>
          </div>
        </section>

        <!-- Integrasi Google Spreadsheet Card -->
        <section class="glass-emerald glass-sheen rounded-2xl p-4 flex flex-col gap-3" id="section-google-sheets">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl glass-emerald text-emerald-900 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">table_chart</span>
              </div>
              <div>
                <h3 class="font-title-ledger text-sm font-bold text-on-surface">Integrasi Google Spreadsheet</h3>
                <p class="text-[11px] text-on-surface-variant">Kirim & sinkronkan data kas langsung ke Google Sheets</p>
              </div>
            </div>
            <span class="font-label-sm text-[10px] px-2 py-0.5 rounded-full glass-chip text-emerald-800 font-bold">
              Google Cloud API
            </span>
          </div>

          <!-- Email Service Account Box -->
          <div class="glass-emerald rounded-xl p-3 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-emerald-900 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">shield_person</span>
                Email Service Account
              </span>
              <button 
                type="button" 
                id="btn-copy-service-email" 
                class="px-2 py-0.5 rounded-lg glass-emerald text-emerald-900 text-[10px] font-bold flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-[12px]">content_copy</span>
                <span>Salin Email</span>
              </button>
            </div>
            <div class="text-xs font-mono font-bold text-emerald-950 break-all select-all py-1 px-2 rounded-lg bg-white/70 border border-emerald-200" id="text-service-email">
              ${(getCredentials(store) && getCredentials(store).client_email) || 'juarasepatukas@juarasepatukas.iam.gserviceaccount.com'}
            </div>
            <p class="text-[10px] text-emerald-800 leading-tight">
              Pastikan Google Spreadsheet Anda sudah di-<strong>Share (Bagikan)</strong> ke email di atas dengan izin akses <strong>Editor</strong>.
            </p>
          </div>

          <!-- Kredensial Service Account JSON / Key Box -->
          <div class="glass-panel rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] ${((getCredentials(store) && getCredentials(store).client_email && !getCredentials(store).client_email.includes('your-service-account')) ? 'text-emerald-600' : 'text-amber-500')}">
                  ${((getCredentials(store) && getCredentials(store).client_email && !getCredentials(store).client_email.includes('your-service-account')) ? 'verified_user' : 'warning')}
                </span>
                Kunci Service Account (Google Cloud)
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full glass-chip ${((getCredentials(store) && getCredentials(store).client_email && !getCredentials(store).client_email.includes('your-service-account')) ? 'text-emerald-800' : 'text-amber-800')}">
                ${((getCredentials(store) && getCredentials(store).client_email && !getCredentials(store).client_email.includes('your-service-account')) ? 'Aktif' : 'Perlu Diisi')}
              </span>
            </div>

            <p class="text-[11px] text-on-surface-variant leading-tight">
              ${((getCredentials(store) && getCredentials(store).client_email && !getCredentials(store).client_email.includes('your-service-account')) 
                ? 'File kunci service-account.json sudah aktif di perangkat ini. Data siap disinkronkan ke Google Spreadsheet toko.' 
                : 'Di versi online, unggah atau tempel file <code>service-account.json</code> toko Anda agar sinkronisasi Google Sheets dapat berjalan.')}
            </p>

            <div class="flex items-center gap-2 mt-1">
              <label class="flex-1 cursor-pointer py-2 px-3 rounded-lg glass-emerald text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5">
                <input type="file" id="input-upload-sa-json" accept=".json" class="hidden"/>
                <span class="material-symbols-outlined text-[15px]">upload_file</span>
                <span>Unggah service-account.json</span>
              </label>

              <button 
                type="button" 
                id="btn-toggle-sa-paste" 
                class="py-2 px-3 rounded-lg glass-chip-btn text-on-surface text-xs font-bold"
              >
                Tempel Teks
              </button>

              ${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().serviceAccountJson) ? `
                <button 
                  type="button" 
                  id="btn-clear-sa-json" 
                  class="py-2 px-2.5 rounded-lg glass-rose text-rose-800 text-xs font-bold" 
                  title="Hapus Kunci Tersimpan"
                >
                  <span class="material-symbols-outlined text-[15px]">delete</span>
                </button>
              ` : ''}
            </div>

            <!-- Paste Box Area -->
            <div id="box-paste-sa" class="hidden flex flex-col gap-2 mt-2 pt-2 border-t border-white/45">
              <textarea 
                id="textarea-sa-json" 
                rows="4" 
                class="w-full p-2.5 rounded-lg glass-input font-mono text-[11px] text-on-surface focus:outline-emerald-600" 
                placeholder="Tempel seluruh isi file service-account.json di sini..."
              ></textarea>
              <button 
                type="button" 
                id="btn-save-pasted-sa" 
                class="py-2 rounded-lg glass-emerald text-emerald-900 text-xs font-bold flex items-center justify-center gap-1"
              >
                <span class="material-symbols-outlined text-[14px]">save</span>
                <span>Simpan Kunci</span>
              </button>
            </div>
          </div>

          <!-- Input Spreadsheet ID / URL -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-sm text-xs text-on-surface font-semibold flex items-center justify-between">
              <span>Link atau ID Google Spreadsheet</span>
              <span class="text-[10px] text-on-surface-variant font-normal">docs.google.com/spreadsheets/d/...</span>
            </label>
            <input 
              type="text" 
              id="input-spreadsheet-id"
              value="${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) || ''}"
              class="glass-input w-full px-3.5 py-2.5 rounded-xl text-on-surface font-body-md text-xs focus:outline-emerald-600"
              placeholder="Tempel link Google Spreadsheet (URL penuh) atau ID-nya di sini..."
            />
          </div>

          <!-- Toggle Auto-Sync -->
          <div class="flex items-center justify-between p-2.5 rounded-xl glass-panel">
            <div class="flex flex-col">
              <span class="font-bold text-xs text-on-surface">Auto-Sync Otomatis</span>
              <span class="text-[10px] text-on-surface-variant">Kirim otomatis saat ada perubahan transaksi</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="check-auto-sync" class="sr-only peer" ${
                (store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().autoSync) ? 'checked' : ''
              }>
              <div class="w-11 h-6 bg-white/45 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <!-- Status Sinkronisasi -->
          <div class="flex items-center justify-between text-xs py-1 px-1" id="sheets-sync-status-box">
            <div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
              <span class="material-symbols-outlined text-[15px] text-emerald-700">sync</span>
              <span id="text-last-sync">Terakhir sinkron: ${
                (store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().lastSync) || 'Belum pernah'
              }</span>
            </div>
            <a 
              id="link-open-spreadsheet" 
              href="${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(store.getGoogleSheetsConfig().spreadsheetId)}/edit` : '#'}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 ${(store.getGoogleSheetsConfig && store.getGoogleSheetsConfig().spreadsheetId) ? '' : 'hidden'}"
            >
              <span>Buka Sheet</span>
              <span class="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2 mt-1">
            <button 
              type="button" 
              id="btn-test-sheets-conn" 
              class="py-2.5 px-3 rounded-xl glass-chip-btn text-on-surface font-label-md text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[16px]">sensors</span>
              <span>Tes Koneksi</span>
            </button>
            <button 
              type="button" 
              id="btn-sync-sheets-now" 
              class="py-2.5 px-3 rounded-xl glass-emerald text-emerald-900 font-label-md text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[16px]" id="icon-sync-btn">cloud_upload</span>
              <span id="text-sync-btn">Sinkronkan Sekarang</span>
            </button>
          </div>
        </section>

        <!-- Backup & Restore Data -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">cloud_sync</span>
            <h3 class="font-title-ledger text-sm font-bold text-on-surface">Cadangan & Pemulihan Data</h3>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              id="btn-export-json"
              class="py-3 px-3 rounded-xl glass-chip-btn text-on-surface font-label-md text-xs font-semibold flex flex-col items-center justify-center gap-1.5 text-center"
            >
              <span class="material-symbols-outlined text-[20px] text-primary">download</span>
              <span>Cadangkan Data (JSON)</span>
            </button>

            <label 
              class="cursor-pointer py-3 px-3 rounded-xl glass-chip-btn text-on-surface font-label-md text-xs font-semibold flex flex-col items-center justify-center gap-1.5 text-center"
            >
              <input type="file" id="input-import-json" accept=".json" class="hidden"/>
              <span class="material-symbols-outlined text-[20px] text-primary">upload</span>
              <span>Pulihkan Data (JSON)</span>
            </label>
          </div>

          <button 
            type="button" 
            id="btn-force-update"
            class="w-full py-2.5 rounded-xl glass-primary text-primary-btn font-label-md text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">sync</span>
            <span>Perbarui Aplikasi & Bersihkan Cache</span>
          </button>

          <button 
            type="button" 
            id="btn-purge-sample"
            class="w-full py-2.5 rounded-xl glass-amber text-amber-900 font-label-md text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">cleaning_services</span>
            <span>Hapus Data Contoh (Dummy)</span>
          </button>

          <button 
            type="button" 
            id="btn-reset-data"
            class="w-full py-2.5 rounded-xl glass-rose text-rose-900 font-label-md text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
            <span>Kosongkan Semua Data</span>
          </button>
        </section>


        <!-- Tampilan Background App -->
        <section class="glass-card glass-sheen rounded-2xl p-4 flex flex-col gap-3" id="section-background">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">wallpaper</span>
            <h3 class="font-title-ledger text-sm font-bold text-on-surface">Tampilan Background</h3>
          </div>
          <p class="text-xs text-on-surface-variant leading-relaxed">
            Ganti gambar latar belakang aplikasi sesuai selera. Upload foto sendiri atau pilih dari tema preset yang tersedia.
          </p>

          <!-- Preview Background Saat Ini -->
          <div class="relative w-full h-28 rounded-xl overflow-hidden border border-white/40 shadow-sm">
            <div id="bg-preview-box" class="absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image:url('./assets/background-sepatu-kulit.jpg');background-color:#0d1f16;"></div>
            <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span class="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">Preview Background</span>
            </div>
          </div>

          <!-- Upload Foto Sendiri -->
          <div class="flex flex-col gap-1.5">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Upload Foto Sendiri</span>
            <label for="input-bg-upload"
              class="w-full py-2.5 px-4 rounded-xl glass-neutral glass-btn glass-sheen cursor-pointer flex items-center justify-center gap-2 text-on-surface font-label-md text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <span class="material-symbols-outlined text-[20px] text-primary">add_photo_alternate</span>
              <span>Pilih Foto dari Galeri</span>
              <input type="file" id="input-bg-upload" accept="image/*" class="hidden" />
            </label>
          </div>

          <!-- Preset Tema -->
          <div class="flex flex-col gap-2">
            <span class="font-label-sm text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Atau Pilih Tema Preset</span>
            <div class="grid grid-cols-4 gap-2" id="bg-preset-grid">
              <!-- Default: Foto Sepatu Kulit -->
              <button type="button" data-bg-preset="default" class="bg-preset-btn relative h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all">
                <div class="absolute inset-0 bg-cover bg-center" style="background-image:url('./assets/background-sepatu-kulit.jpg')"></div>
                <div class="absolute inset-0 bg-black/20"></div>
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center drop-shadow">Default</span>
              </button>
              <!-- Hitam Solid -->
              <button type="button" data-bg-preset="solid-black" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:#000000;">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Hitam</span>
              </button>
              <!-- Hijau Gelap -->
              <button type="button" data-bg-preset="solid-green" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:#0d1f16;">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Hijau</span>
              </button>
              <!-- Navy -->
              <button type="button" data-bg-preset="solid-navy" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:#0f172a;">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Navy</span>
              </button>
              <!-- Coklat Tua -->
              <button type="button" data-bg-preset="solid-brown" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:#3d2619;">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Coklat</span>
              </button>
              <!-- Gradien Sunset -->
              <button type="button" data-bg-preset="gradient-sunset" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:linear-gradient(135deg,#1a0000,#3d1a00,#1f0a00);">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Sunset</span>
              </button>
              <!-- Gradien Midnight -->
              <button type="button" data-bg-preset="gradient-midnight" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Midnight</span>
              </button>
              <!-- Gradien Forest -->
              <button type="button" data-bg-preset="gradient-forest" class="bg-preset-btn h-14 rounded-xl overflow-hidden border-2 border-transparent active:scale-95 transition-all relative" style="background:linear-gradient(135deg,#0a2012,#1a4a2e,#0d2e1a);">
                <span class="absolute bottom-0.5 left-0 right-0 text-[8px] text-white font-bold text-center">Forest</span>
              </button>
            </div>
          </div>

          <!-- Tombol Reset -->
          <button
            type="button"
            id="btn-reset-background"
            class="w-full py-2 rounded-xl glass-neutral glass-btn text-on-surface-variant font-label-md text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Reset ke Background Default</span>
          </button>
        </section>

        <!-- Informasi Aplikasi -->
        <section class="p-3 text-center text-xs text-on-surface-variant/80 flex flex-col items-center gap-1">
          <span class="font-bold text-on-surface">Kas Juara Sepatu v1.0.0</span>
          <span>Desain Retro Modern Warm Vintage Ledger</span>
          <span>Format Siap Bungkus ke Android APK (Capacitor)</span>
        </section>
      </div>
    </div>
  `;
}

export function initPengaturanPage(router, store) {
  bindHeaderEvents(router);

  // Saldo Kas Awal Handlers
  const inputLaci = document.getElementById('input-initial-laci');
  const inputBank = document.getElementById('input-initial-bank');
  const previewTotal = document.getElementById('preview-total-initial');
  const btnSetZero = document.getElementById('btn-set-zero-initial');
  const btnSaveInitial = document.getElementById('btn-save-initial-balance');

  function updateTotalPreview() {
    const laciVal = parseRupiah(inputLaci ? inputLaci.value : '0');
    const bankVal = parseRupiah(inputBank ? inputBank.value : '0');
    if (previewTotal) {
      previewTotal.textContent = formatRupiah(laciVal + bankVal);
    }
  }

  if (inputLaci) {
    inputLaci.addEventListener('input', () => {
      const raw = parseRupiah(inputLaci.value);
      inputLaci.value = formatRupiah(raw, '');
      updateTotalPreview();
    });
  }

  if (inputBank) {
    inputBank.addEventListener('input', () => {
      const raw = parseRupiah(inputBank.value);
      inputBank.value = formatRupiah(raw, '');
      updateTotalPreview();
    });
  }

  if (btnSetZero) {
    btnSetZero.addEventListener('click', () => {
      if (inputLaci) inputLaci.value = '0';
      if (inputBank) inputBank.value = '0';
      updateTotalPreview();
      showToast('Nilai kas awal diatur ke Rp 0. Klik Simpan untuk menerapkan.', 'info');
    });
  }

  if (btnSaveInitial) {
    btnSaveInitial.addEventListener('click', () => {
      const laciVal = parseRupiah(inputLaci ? inputLaci.value : '0');
      const bankVal = parseRupiah(inputBank ? inputBank.value : '0');

      store.updateShop({
        initialBalanceLaci: laciVal,
        initialBalanceBank: bankVal
      });

      showToast(`Saldo kas awal berhasil disimpan (${formatRupiah(laciVal + bankVal)})!`, 'success');
    });
  }

  // Save profile
  const btnSave = document.getElementById('btn-save-shop-profile');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const name = document.getElementById('input-shop-name').value.trim();
      const owner = document.getElementById('input-shop-owner').value.trim();
      const address = document.getElementById('input-shop-address').value.trim();

      store.updateShop({ name, owner, address });
      showToast('Profil toko berhasil diperbarui!', 'success');
    });
  }

  // Change PIN
  const btnPin = document.getElementById('btn-change-pin');
  if (btnPin) {
    btnPin.addEventListener('click', () => {
      const currentPin = store.getShop().pin || '123456';
      const newPin = prompt(`Masukkan 6 digit PIN baru (saat ini: ${currentPin}):`, currentPin);
      if (newPin && newPin.trim().length === 6 && /^\d+$/.test(newPin.trim())) {
        store.updateShop({ pin: newPin.trim() });
        showToast('PIN berhasil diubah!', 'success');
        router.navigate('pengaturan');
      } else if (newPin !== null) {
        showToast('PIN harus berupa 6 angka.', 'error');
      }
    });
  }

  // Lock App
  const btnLock = document.getElementById('btn-lock-app');
  if (btnLock) {
    btnLock.addEventListener('click', () => {
      showToast('Aplikasi terkunci.', 'info');
      router.navigate('login');
    });
  }

  // Export JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(store.exportData());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup_kas_juara_sepatu_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('File cadangan JSON berhasil diunduh.', 'success');
    });
  }

  // Import JSON
  const inputImport = document.getElementById('input-import-json');
  if (inputImport) {
    inputImport.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = store.importData(event.target.result);
        if (success) {
          showToast('Data toko berhasil dipulihkan!', 'success');
          router.navigate('dashboard');
        } else {
          showToast('Format file JSON tidak valid.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Hapus data contoh (dummy) — hanya record contoh, data asli tetap aman
  const btnPurgeSample = document.getElementById('btn-purge-sample');
  if (btnPurgeSample) {
    btnPurgeSample.addEventListener('click', () => {
      if (!confirm('Hapus semua data CONTOH (dummy) bawaan aplikasi?\n\nHanya record contoh yang dihapus berdasarkan ID/barcode-nya. Data asli Anda tidak disentuh.')) return;
      const removed = store.purgeSampleData();
      if (removed === 0) {
        showToast('Tidak ada data contoh yang tersisa.', 'info');
      } else {
        showToast(`${removed} data contoh berhasil dihapus.`, 'success', 4500);
      }
      router.navigate('dashboard');
    });
  }

  // Kosongkan semua data (mulai baru dari nol)
  const btnReset = document.getElementById('btn-reset-data');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('KOSONGKAN semua data (transaksi, belanja/stok, produk, investor)?\n\nPengaturan toko & koneksi Google Sheets tetap disimpan. Disarankan lakukan "Cadangkan Data (JSON)" terlebih dahulu.')) {
        store.resetToEmpty();
        showToast('Semua data telah dikosongkan.', 'info');
        router.navigate('dashboard');
      }
    });
  }

  // Force App Update & Clear Cache
  const btnForceUpdate = document.getElementById('btn-force-update');
  if (btnForceUpdate) {
    btnForceUpdate.addEventListener('click', async () => {
      showToast('Memperbarui & membersihkan cache aplikasi...', 'info');
      if (typeof window.forceAppUpdate === 'function') {
        await window.forceAppUpdate();
      } else {
        window.location.reload(true);
      }
    });
  }

  // ── Google Sheets Integration Handlers ──
  // Upload JSON File
  const inputUploadSa = document.getElementById('input-upload-sa-json');
  if (inputUploadSa) {
    inputUploadSa.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const parsed = JSON.parse(content);
          if (!parsed.client_email || !parsed.private_key) {
            throw new Error('File JSON tidak memiliki client_email atau private_key yang valid.');
          }
          store.saveGoogleSheetsConfig({ serviceAccountJson: content });
          showToast(`Kunci Service Account berhasil dipasang! (${parsed.client_email})`, 'success', 4000);
          router.navigate('pengaturan');
        } catch (err) {
          showToast(`File tidak valid: ${err.message}`, 'error', 4000);
        }
      };
      reader.readAsText(file);
    });
  }

  // Toggle Paste Box
  const btnTogglePaste = document.getElementById('btn-toggle-sa-paste');
  const boxPaste = document.getElementById('box-paste-sa');
  if (btnTogglePaste && boxPaste) {
    btnTogglePaste.addEventListener('click', () => {
      boxPaste.classList.toggle('hidden');
    });
  }

  // Save Pasted JSON
  const btnSavePasted = document.getElementById('btn-save-pasted-sa');
  const textareaSa = document.getElementById('textarea-sa-json');
  if (btnSavePasted && textareaSa) {
    btnSavePasted.addEventListener('click', () => {
      const val = textareaSa.value.trim();
      if (!val) {
        showToast('Tempel teks JSON service-account terlebih dahulu.', 'error');
        return;
      }
      try {
        const parsed = JSON.parse(val);
        if (!parsed.client_email || !parsed.private_key) {
          throw new Error('JSON tidak memiliki client_email atau private_key.');
        }
        store.saveGoogleSheetsConfig({ serviceAccountJson: val });
        showToast(`Kunci Service Account tersimpan! (${parsed.client_email})`, 'success', 4000);
        router.navigate('pengaturan');
      } catch (err) {
        showToast(`Format JSON salah: ${err.message}`, 'error', 4000);
      }
    });
  }

  // Clear Custom Key
  const btnClearSa = document.getElementById('btn-clear-sa-json');
  if (btnClearSa) {
    btnClearSa.addEventListener('click', () => {
      if (confirm('Hapus kunci Service Account kustom yang tersimpan di browser ini?')) {
        store.saveGoogleSheetsConfig({ serviceAccountJson: '' });
        showToast('Kunci kustom dihapus.', 'info');
        router.navigate('pengaturan');
      }
    });
  }
  const btnCopyEmail = document.getElementById('btn-copy-service-email');
  const textEmail = document.getElementById('text-service-email');
  if (btnCopyEmail && textEmail) {
    btnCopyEmail.addEventListener('click', async () => {
      const email = textEmail.textContent.trim();
      try {
        await navigator.clipboard.writeText(email);
        showToast('Email Service Account disalin ke clipboard!', 'success');
      } catch (e) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Email Service Account disalin!', 'success');
      }
    });
  }

  const inputSheetId = document.getElementById('input-spreadsheet-id');
  const checkAutoSync = document.getElementById('check-auto-sync');
  const linkOpenSheet = document.getElementById('link-open-spreadsheet');

  function saveSheetConfigFromUI() {
    const rawInput = inputSheetId ? inputSheetId.value.trim() : '';
    const cleanId = extractSpreadsheetId(rawInput);
    const autoSync = checkAutoSync ? checkAutoSync.checked : false;

    store.saveGoogleSheetsConfig({
      spreadsheetId: cleanId,
      autoSync
    });

    if (linkOpenSheet) {
      if (cleanId) {
        linkOpenSheet.href = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
        linkOpenSheet.classList.remove('hidden');
      } else {
        linkOpenSheet.classList.add('hidden');
      }
    }
  }

  if (inputSheetId) {
    inputSheetId.addEventListener('change', () => {
      saveSheetConfigFromUI();
      showToast('ID Spreadsheet disimpan.', 'info');
    });
  }

  if (checkAutoSync) {
    checkAutoSync.addEventListener('change', () => {
      saveSheetConfigFromUI();
      showToast(
        checkAutoSync.checked ? 'Auto-sync aktif! Data akan otomatis dikirim.' : 'Auto-sync dimatikan.',
        'info'
      );
    });
  }

  // Tes Koneksi Sheets
  const btnTestConn = document.getElementById('btn-test-sheets-conn');
  if (btnTestConn) {
    btnTestConn.addEventListener('click', async () => {
      saveSheetConfigFromUI();
      const rawInput = inputSheetId ? inputSheetId.value.trim() : '';
      const cleanId = extractSpreadsheetId(rawInput);

      if (!cleanId) {
        showToast('Masukkan link atau ID Google Spreadsheet terlebih dahulu.', 'error');
        if (inputSheetId) inputSheetId.focus();
        return;
      }

      btnTestConn.disabled = true;
      btnTestConn.innerHTML = `
        <span class="material-symbols-outlined text-[16px] animate-spin">refresh</span>
        <span>Memeriksa...</span>
      `;

      try {
        const info = await testSpreadsheetConnection(store, cleanId);
        showToast(`Koneksi Sukses! Terhubung ke "${info.title}"`, 'success', 3500);
      } catch (err) {
        console.error(err);
        alert(`Gagal terhubung ke Google Sheets:\n\n${err.message}`);
        showToast('Koneksi gagal. Periksa izin share spreadsheet.', 'error');
      } finally {
        btnTestConn.disabled = false;
        btnTestConn.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">sensors</span>
          <span>Tes Koneksi</span>
        `;
      }
    });
  }

  // Sinkronkan Sekarang
  const btnSyncNow = document.getElementById('btn-sync-sheets-now');
  const textLastSync = document.getElementById('text-last-sync');
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', async () => {
      saveSheetConfigFromUI();
      const rawInput = inputSheetId ? inputSheetId.value.trim() : '';
      const cleanId = extractSpreadsheetId(rawInput);

      if (!cleanId) {
        showToast('Masukkan link atau ID Google Spreadsheet terlebih dahulu.', 'error');
        if (inputSheetId) inputSheetId.focus();
        return;
      }

      btnSyncNow.disabled = true;
      btnSyncNow.innerHTML = `
        <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
        <span>Menyinkronkan...</span>
      `;

      try {
        const result = await syncAllToGoogleSheets(store, cleanId);
        if (textLastSync) {
          textLastSync.textContent = `Terakhir sinkron: ${result.syncTime}`;
        }
        showToast(
          `Berhasil sinkron ke Spreadsheet! (${result.counts.masuk} masuk, ${result.counts.keluar} keluar, ${result.counts.supplies} belanja, ${result.counts.shipments} pengiriman)`,
          'success',
          4000
        );
      } catch (err) {
        console.error(err);
        alert(`Gagal menyinkronkan data:\n\n${err.message}`);
        showToast('Sinkronisasi gagal. Pastikan izin editor aktif.', 'error');
      } finally {
        btnSyncNow.disabled = false;
        btnSyncNow.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">cloud_upload</span>
          <span>Sinkronkan Sekarang</span>
        `;
      }
    });
  }

  // =============================================
  // BACKGROUND CUSTOMIZER
  // =============================================
  const BG_STORAGE_KEY = 'kas_juara_custom_background';

  const PRESET_STYLES = {
    'default':           { image: `url('./assets/background-sepatu-kulit.jpg')`, color: '#0d1f16' },
    'solid-black':       { image: 'none', color: '#000000' },
    'solid-green':       { image: 'none', color: '#0d1f16' },
    'solid-navy':        { image: 'none', color: '#0f172a' },
    'solid-brown':       { image: 'none', color: '#3d2619' },
    'gradient-sunset':   { image: 'linear-gradient(135deg,#1a0000,#3d1a00,#1f0a00)', color: '#1a0000' },
    'gradient-midnight': { image: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', color: '#0f0c29' },
    'gradient-forest':   { image: 'linear-gradient(135deg,#0a2012,#1a4a2e,#0d2e1a)', color: '#0a2012' },
  };

  /** Terapkan background ke phone-frame dan preview box */
  function applyBackground(bgData) {
    const frame = document.getElementById('phone-frame');
    const preview = document.getElementById('bg-preview-box');

    if (!bgData) return;

    if (bgData.type === 'image') {
      // Custom upload — base64
      if (frame) {
        frame.style.backgroundImage = `url(${bgData.value})`;
        frame.style.backgroundSize = 'cover';
        frame.style.backgroundPosition = 'center 30%';
        frame.style.backgroundRepeat = 'no-repeat';
        frame.style.backgroundColor = '#000';
      }
      if (preview) {
        preview.style.backgroundImage = `url(${bgData.value})`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundColor = '#000';
      }
    } else if (bgData.type === 'preset') {
      const style = PRESET_STYLES[bgData.value];
      if (!style) return;
      if (frame) {
        frame.style.backgroundImage = style.image;
        frame.style.backgroundSize = style.image !== 'none' ? 'cover' : '';
        frame.style.backgroundPosition = 'center 30%';
        frame.style.backgroundRepeat = 'no-repeat';
        frame.style.backgroundColor = style.color;
      }
      if (preview) {
        preview.style.backgroundImage = style.image;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundColor = style.color;
      }
    }

    // Tandai preset yang aktif
    document.querySelectorAll('.bg-preset-btn').forEach((btn) => {
      const isActive = bgData.type === 'preset' && btn.dataset.bgPreset === bgData.value;
      btn.classList.toggle('border-primary', isActive);
      btn.classList.toggle('border-transparent', !isActive);
      btn.classList.toggle('ring-2', isActive);
      btn.classList.toggle('ring-primary', isActive);
    });
  }

  /** Muat background tersimpan dari localStorage */
  function loadSavedBackground() {
    try {
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (saved) {
        const bgData = JSON.parse(saved);
        applyBackground(bgData);
      }
    } catch (e) { /* abaikan */ }
  }

  // Inisialisasi: tampilkan background yang sudah tersimpan
  loadSavedBackground();

  // Upload foto dari galeri
  const inputBgUpload = document.getElementById('input-bg-upload');
  if (inputBgUpload) {
    inputBgUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran foto terlalu besar (maks 5MB). Coba foto yang lebih kecil.', 'error', 4000);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        const bgData = { type: 'image', value: base64 };
        localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bgData));
        applyBackground(bgData);
        showToast('Background berhasil diganti! ✓', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // Pilih preset
  document.querySelectorAll('.bg-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.bgPreset;
      if (!preset) return;
      const bgData = { type: 'preset', value: preset };
      localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bgData));
      applyBackground(bgData);
      showToast(`Tema "${preset}" diterapkan! ✓`, 'success');
    });
  });

  // Reset ke default
  const btnResetBg = document.getElementById('btn-reset-background');
  if (btnResetBg) {
    btnResetBg.addEventListener('click', () => {
      localStorage.removeItem(BG_STORAGE_KEY);
      const bgData = { type: 'preset', value: 'default' };
      applyBackground(bgData);
      showToast('Background dikembalikan ke default.', 'info');
    });
  }
}

