# Handoff Project: Kas Juara Sepatu

## Deskripsi Project
Aplikasi buku kas digital untuk toko sepatu yang mengelola transaksi penjualan, pengeluaran, dan stok barang. Aplikasi ini menggunakan arsitektur *Single State* yang disinkronkan ke Supabase.

## Stack Teknologi
- **Frontend:** Vite, Vanilla JavaScript, Tailwind CSS
- **Database/Sync:** Supabase (tabel `app_state`)
- **Storage:** LocalStorage (untuk data lokal & foto produk)
- **Barcode Scanner:** `html5-qrcode`

## Konteks Terakhir (Update 13 Oktober 2026)

### A. Pemisahan Hak Akses Admin & Atasan (Mode Lihat Saja / Read-Only)
**Waktu:** 13 Oktober 2026  
**Tujuan:** Memisahkan hak akses antara **Admin** (akses penuh untuk operasional toko harian) dan **Atasan/Owner** (akses pantau laporan & seluruh halaman aplikasi secara realtime tanpa dapat mengedit, menghapus, atau menginput data apa pun).

**Kredensial & Autentikasi:**
- **PIN Admin:** `123456` (Dapat diubah oleh Admin di Pengaturan).
- **PIN Atasan:** `888888` (Dapat diubah oleh Admin di Pengaturan).
- Layar login PIN (`src/pages/pin-login.js`) secara otomatis mendeteksi role pengguna berdasarkan PIN yang dimasukkan tanpa menampilkan petunjuk PIN publik demi menjaga kerahasiaan.

**Arsitektur & State Management Role:**
1. **Store & Sesi** (`src/store/store.js`):
   - Ditambahkan `getRole()` (mengambil role dari `sessionStorage['kas_juara_role']`), `setRole(role)`, `isAdmin()`, dan `logout()`.
   - Menggunakan `sessionStorage` sehingga role aman terisolasi per sesi browser/tab dan hilang saat browser ditutup atau saat klik Kunci/Logout.
2. **Router Guard & Propagasi Role** (`src/router.js`):
   - Guard otentikasi: jika belum login, otomatis dialihkan ke `#/login`.
   - Form input pembuatan data baru (`tambah-transaksi`, `tambah-pasok`, `tambah-opname`) diblokir untuk Atasan dengan toast notification peringatan dan dialihkan ke halaman daftar terkait.
   - Atasan diizinkan mengakses **seluruh halaman aplikasi** (Dashboard, Transaksi, Stok, Kirim, Investor, Laporan, Laporan Stok, Stock Opname, Detail Opname, Pengaturan) dalam mode *read-only*.
   - Parameter `isAdmin` diteruskan ke seluruh fungsi `render` dan `init` halaman.
3. **Komponen Navigasi & Header**:
   - `src/components/bottom-nav.js`: Menampilkan badge peran aktif di pojok kanan atas: `ADMIN` (hijau emerald) atau `ATASAN` (biru).
   - `src/components/header.js`: Ditambahkan tombol kunci cepat (`#header-lock-btn`) untuk logout dan switch user dengan satu klik, serta perbaikan navigasi icon settings/logo.

**Proteksi Read-Only Halaman per Halaman untuk Atasan:**
- **Dashboard** (`src/pages/dashboard.js`):
  - Greeting disesuaikan: "Halo, Atasan" dan subjudul "Mode Pantau (Hanya Lihat)".
  - Tombol `+ Kas Masuk`, `- Kas Keluar`, dan `+ Belanja Stock Sepatu` disembunyikan; digantikan banner elegan *Mode Pantau Atasan (Lihat Saja)*.
  - Tombol pantau pengiriman, laporan stok realtime, stock opname, dan investor tetap dapat diakses.
- **Daftar Transaksi** (`src/pages/transaksi-list.js`):
  - Tombol `+ Catat Transaksi Baru` disembunyikan.
  - Tombol `Edit` dan `Hapus` pada tiap transaksi individual disembunyikan.
- **Daftar Stok & Belanja** (`src/pages/barang-masuk-list.js`):
  - Tombol `+ Belanja Baru` dan `+ Stock Opname` disembunyikan (diganti badge *Mode Lihat Saja*).
  - Tombol aksi `+ Barang`, `Edit`, dan `Hapus` per nota belanja disembunyikan.
- **Pengiriman Sepatu** (`src/pages/pengiriman.js`):
  - Tombol update status paket (`Update`, `Next Status`, `Hold`) disembunyikan; digantikan label *Mode Pantau Pengiriman*.
- **Investor & Modal Usaha** (`src/pages/investor.js`):
  - Tombol `+ Tambah Investor Baru` disembunyikan.
  - Kolom `Aksi` (Edit, Tandai Lunas, Hapus) pada tampilan tabel dan action bar pada tampilan kartu disembunyikan.
- **Stock Opname & Detail Opname** (`src/pages/stock-opname.js`, `src/pages/detail-opname.js`):
  - Tombol `+ Mulai Opname Baru` disembunyikan.
  - Tombol `Hapus Riwayat` pada detail opname disembunyikan; tombol `Salin Laporan` tetap dapat digunakan.
- **Pengaturan Toko** (`src/pages/pengaturan.js`):
  - Tampil banner *Mode Atasan (Hanya Lihat)*.
  - Form input dinonaktifkan/tombol simpan modal awal dan profil disembunyikan.
  - Pengubahan PIN Admin dan PIN Atasan hanya dapat dilakukan oleh Admin.
  - Tombol ekspor cadangan data JSON dan kunci aplikasi tetap dapat digunakan oleh Atasan.

**Commits Terkait:**
- `46321a1` - buat halaman atasan
- `96205c1` - hapus teks badge admin dan atasan

---

## Konteks Sebelumnya (Update 12 Oktober 2026)

### B. Fitur Grouping Transaksi Berdasarkan Faktur
**Waktu:** 10-12 Oktober 2026  
**Tujuan:** Ketika menambahkan barang ke faktur yang sama, semua barang ditampilkan dalam satu folder yang dapat di-expand/collapse.

**Implementasi:**
1. **Transaksi List Grouping** (`src/pages/transaksi-list.js`)
   - Implemented `renderGroupedTransactions()` helper function untuk menampilkan transaksi yang digroupkan berdasarkan `nota` (invoice number)
   - Transaksi dengan `nota` yang sama (misal #FAK-PASOK-001) ditampilkan dalam 1 folder yang dapat di-expand
   - Setiap folder menampilkan: nomor invoice, nama supplier, total barang, dan total harga
   - Ketika di-expand: menampilkan daftar individual items dengan detail barcode, harga, qty
   - Expand/collapse state disimpan di `expandedNotes` object untuk persistent state

2. **Dashboard Grouping** (`src/pages/dashboard.js`)
   - Dashboard menampilkan top 4 groups (bukan top 4 transaksi individual)
   - Setiap group menampilkan: invoice number, total amount, dan jumlah transaksi
   - User dapat expand untuk melihat detail items dalam group
   - Konsisten dengan UI di halaman Transaksi

3. **Commits:**
   - `f6ad0b5` - Implemented transaction grouping expand/collapse in transaksi-list.js
   - `e93d10f` - Added dashboard transaction grouping by nota
   - `8d2c9e1` - Fixed transaction grouping expand/collapse bug (state scope issue)

**Benefit:**
- UI lebih rapi dan organized
- User dapat dengan mudah melihat semua barang dari 1 faktur dalam 1 tempat
- Mengurangi clutter di halaman transaksi dan dashboard

---

### B. Filter Faktur di Halaman Laporan (Report)
**Waktu:** 12 Oktober 2026  
**Tujuan:** Filter laporan barang laku dan sisa barang berdasarkan faktur tertentu.

**Implementasi di `src/pages/laporan.js`:**

1. **Faktur Extraction & UI** (lines 150-161, 241-248)
   - Ekstrak unique faktur list dari `supplies` dengan format: `[Nomor Faktur] - [Nama Supplier]`
   - Render dropdown dengan opsi "Semua Faktur" + daftar faktur individual
   - Filter UI ditambahkan di bawah periode filter

2. **State Management** (line 535)
   - Added `currentFaktur = 'all'` state variable
   - Event listener di dropdown (lines 819-825) untuk update state saat faktur berubah

3. **Barcode-to-Invoice Mapping** (lines 620-641, 714-738)
   - Critical fix: `nota` field di transactions berisi informasi buyer, BUKAN faktur reference
   - Solution: Build barcode mapping langsung dari supplies data (localStorage)
   - Untuk setiap supply, extract `invoiceNo` dan semua `items[].barcode`
   - Create Map: `barcode → invoiceNo` (dengan normalisasi uppercase + trim)

4. **Filter Logic untuk Barang Laku & Sisa** (lines 620-641, 714-738)
   - Ketika `currentFaktur !== 'all'`:
     - Filter `soldShoes` array: hanya tampilkan shoes dengan barcode yang map ke faktur terpilih
     - Filter `unsoldItems` array: hanya tampilkan items dengan barcode yang map ke faktur terpilih
   - Ketika `currentFaktur === 'all'`: tampilkan semua data tanpa filter

5. **Commits:**
   - `3c9d8e2` - Implemented faktur filter feature for laporan page (initial)
   - `7525375` - fix fitur filter faktur (fixed barcode mapping issue)

**Testing Result:**
- Filter "Semua Faktur" → menampilkan 3 pasang (correct)
- Filter "Faktur #BLJ-519" → menampilkan 1 pasang (correct)
- Barcode mapping working correctly across both sold dan unsold items

**Technical Notes:**
- Parameter shadowing issue: function parameter `store` shadowing imported `store` module
- Workaround: access supplies langsung via `JSON.parse(localStorage.getItem('kas_juara_sepatu_data_v1'))`
- Barcode normalization: `.toUpperCase().trim()` untuk consistent matching

---

### C. Fitur Lainnya dari Update Sebelumnya (11 Okt 2026)

1. **Standardisasi Barcode Scanner:**
   - Fitur barcode scanner di halaman `tambah-transaksi.js` (Kas Masuk) dan `tambah-barang-masuk.js` (Stock/Belanja) telah diseragamkan.
   - Menggunakan `enhanceVideoElement()` dari `barcode-scanner-config.js` untuk viewfinder yang konsisten (kotak putih terang di tengah).
   - Penamaan variabel, fungsi, dan ID DOM sudah seragam.

2. **Validasi Stok:**
   - Logika validasi stok telah ditambahkan pada `tambah-transaksi.js`.
   - Barcode yang di-scan divalidasi terhadap `store.getRealtimeStockReport().unsoldItems`.
   - Jika barcode tidak ada di stok atau sudah laku, sistem menampilkan error `❌ Barang sudah laku atau tidak ada di stok`.

3. **Sinkronisasi Hapus Stock & Transaksi:**
   - Hapus daftar belanja di halaman Stock (`stock.js` / `stock-opname.js`) sekarang otomatis menghapus transaksi terkait di halaman Transaksi.
   - Mapping via `supplyId` / `nota` / `barcode` antara `supplies` dan `transactions`.
   - Cache PWA (`sw.js` / `workbox`) di-update agar perubahan langsung terlihat di web public tanpa perlu hard refresh manual.

4. **Persistensi Hapus Permanen (Supabase):**
   - `deleteSupply()` dan `deleteTransaction()` di `store.js` sekarang langsung `push` ke Supabase (`app_state`) setelah hapus lokal, sehingga data tidak muncul kembali setelah refresh / re-login.
   - Sebelumnya hanya hapus di LocalStorage sehingga di public (Supabase) data kembali muncul.
   - Commit: `49cda62 fix: push deleteSupply ke Supabase`, `6e06da4 fix: push deleteTransaction ke Supabase`.

5. **Perapian UI Seragam - Compact Mode (11 Okt 2026):**
   - Semua halaman utama dirapikan agar hemat ruang dan seragam: `transaksi.js` + `tambah-transaksi.js` (f6ad0b5), `dashboard.js` + `stock.js` (e93d10f), `laporan.js` + `laporan-stock.js` (26441ee).
   - Pola compact: `p-4` → `p-3`/`p-2.5`, `gap-4` → `gap-3`/`gap-2.5`, `rounded-2xl` → `rounded-xl`/`rounded-lg`, `text-xl` → `text-lg`, `h-14` → `h-11`, `h-12` → `h-10`.
   - Tujuan: susunan teks tidak memakan ruang besar, konsisten di Dashboard, Stock, Kirim, Laporan, dan Transaksi.
   - Build verified: `vite build` sukses (757 kB, gzip ~197 kB).

6. **Laporan Sisa Stock Aktual (13 Okt 2026):**
   - Menghapus card "Potensi Omset" dan "Potensi Laba" di halaman `laporan-stock.js` dan widget sisa stock di `laporan.js`.
   - Menghilangkan asumsi keuntungan: laporan berfokus pada data stok aktual (Sisa Belum Terjual, Modal Aset Tertahan di Stok/HPP, riwayat pasang terjual aktual).
   - Di rincian item sisa stok: kolom potensi laba diganti dengan metrik realisasi penjualan aktual (`Terjual (Aktual)` pasang dari total masuk).
   - Menghapus teks "Jual: [nominal]" pada rincian sisa stock di widget Laporan (`laporan.js`), diganti dengan nilai modal aset sisa aktual (`Aset: [nominal]`).
   - Opsi sort "Potensi Untung Tertinggi" diganti menjadi "Terjual Terbanyak (Aktual)".
   - Ekspor CSV disesuaikan hanya menyertakan data stok dan realisasi aktual (menghilangkan kolom Potensi Omset dan Potensi Laba).

7. **Laporan Google Sheets - Sheet Barang Masuk Per-Baris Setiap Barang (13 Okt 2026):**
   - Format sinkronisasi pada sheet `Barang Masuk (Belanja)` di Google Sheets kini dibuat per-baris untuk setiap barang/sepatu yang masuk (misal jika Suplier A membeli 3 sepatu, akan tercatat 3 baris terpisah).
   - Kolom tabel: No, No. Faktur / ID, Tanggal, Supplier / Sumber, Barcode, Nama Sepatu / Barang, Kondisi, Jumlah (Psg), Harga Modal (Rp), Total Modal (Rp), Status Pembayaran, Metode Bayar, Keterangan / Catatan, dan baris TOTAL di bawahnya.

8. **Laporan Google Sheets - Sheet Kas Masuk Per-Baris Setiap Sepatu (13 Okt 2026):**
   - Format sinkronisasi pada sheet `Kas Masuk` kini juga dibuat per-baris untuk setiap sepatu yang terjual (jika 1 nota penjualan berisi beberapa pasang sepatu, masing-masing dicatat dalam baris terpisah).
   - Kolom tabel: No, No. Nota / ID, Tanggal, Jam, Nama Pelanggan, Barcode, Nama Sepatu / Barang, Kondisi, Jumlah (Psg), Harga / Jumlah Masuk (Rp), Metode Pembayaran, Kategori, Keterangan / Catatan, dan baris TOTAL (+ Modal Awal) di bawahnya.

9. **Laporan Google Sheets - Sheet Pengiriman Per-Baris Setiap Sepatu (13 Okt 2026):**
   - Format sinkronisasi pada sheet `Pengiriman` diseragamkan menjadi per-baris untuk setiap pasang sepatu yang dikirim.
   - Kolom tabel: No, No. Nota / ID, Tanggal, Jam, Nama Pelanggan, Barcode, Nama Sepatu / Barang, Kondisi, Jumlah (Psg), Harga (Rp), Status Pengiriman, Kurir / Ekspedisi, Nomor Resi, Catatan Pengiriman, serta baris TOTAL di bagian bawah.

10. **Laporan Google Sheets - Sheet Dashboard Dark Modern & 4 Grafik Sejajar (13 Okt 2026):**
    - Merombak visual sheet `Dashboard` di Google Sheets menyerupai desain **Dark Modern Card Dashboard**:
    - **4 Kartu KPI Atas Berwarna Solid (Highlight Menonjol):**
      - **Card 1 (Emerald Green):** Total Omset Penjualan Sepatu (Nominal Rp + Jumlah Transaksi).
      - **Card 2 (Royal Blue):** Total Saldo Kas Toko Aktual (Nominal Rp + Status Kas Sehat/Defisit).
      - **Card 3 (Crimson Pink):** Total Pengeluaran Kas (Nominal Rp + Frekuensi Biaya).
      - **Card 4 (Amber Gold):** Sisa Stok Aktual & Nilai Modal HPP (Pasang + Nilai Modal Aset).
    - **Panel Filter Interaktif (Dark Slate Card):**
      - Filter Hari/Periode (`B6`), Filter Suplier (`D6`), Filter Faktur (`F6`) via native data validation dropdown Google Sheets.
    - **Struktur Fungsi & Data Tetap Utuh:**
      - Panel Data Lengkap: Keuangan & Arus Kas, Penjualan Sepatu Laku Aktual, Sisa Stok Aktual (tanpa asumsi keuntungan), Rekap Pengadaan Barang, Komposisi Stok, Laporan Pengeluaran per Kategori, dan Rekap Pengadaan per Suplier.
    - **Integrasi 4 Grafik Google Sheets (Grid 2x2 Sejajar):**
      - **Chart 1 (Top Left / Col F):** Perbandingan Arus Kas (Column Chart).
      - **Chart 2 (Top Right / Col L):** Komposisi Stok Sepatu (Donut Chart Terjual vs Sisa).
      - **Chart 3 (Bottom Left / Col F):** Proporsi Pengeluaran Kas per Kategori (Donut Chart).
      - **Chart 4 (Bottom Right / Col L):** Top Belanja Pengadaan per Suplier (Column Chart).
    - **Formatting Dark Theme:** Latar gelap `#0F172A` / `#090D16`, teks kontras tinggi `#FFFFFF` & `#E2E8F0`, format currency rupiah `Rp #,##0`.

11. **Perbaikan Filter Interaktif Google Sheets Dashboard (13 Okt 2026):**
    - Mengubah seluruh metrik dashboard, kartu KPI, tabel keuangan, dan pengadaan dari nilai statis menjadi **rumus formula dinamis Google Sheets** yang terhubung langsung ke sel dropdown filter:
      - **Filter Hari / Periode (`B6`):** Mendukung `'SEMUA TANGGAL'`, `'HARI INI'`, dan tanggal spesifik (`YYYY-MM-DD`). Secara real-time menyaring Kas Masuk, Kas Keluar, Pengadaan, Pengeluaran per Kategori, dan Grafik Arus Kas.
      - **Filter Suplier (`D6`):** Mendukung `'SEMUA SUPLIER'` dan pilihan nama suplier. Menyaring total pengadaan kulakan, jumlah pasang masuk, faktur, rekap suplier rekanan, dan tabel rincian belanja.
      - **Filter Faktur (`F6`):** Mendukung `'SEMUA FAKTUR'` dan nomor faktur spesifik.
      - **Status Filter Dinamis (`H6`):** Menampilkan badge status real-time (`🟢 SEMUA DATA` vs `🔍 AKTIF: [tanggal] [suplier] [faktur]`).
      - **4 KPI Top Cards Dinamis:** Otomatis menyesuaikan nilai omset, saldo/arus kas periode, pengeluaran, serta modal pengadaan saat filter dipilih.
      - **Tabel Rincian Hasil Filter ([8]):** Menampilkan spill-table real-time via formula `=IFERROR(FILTER(...))` untuk daftar barang belanja sesuai filter yang aktif.
      - **Data Validation Dropdown:** Selalu dipastikan aktif pada sel B6, D6, F6 dengan fallback lengkap hingga 30 entri unik.

## File Kunci
- `src/store/store.js`: Logika bisnis utama, perhitungan stok, dan sinkronisasi Supabase.
- `src/pages/tambah-transaksi.js`: Logika input penjualan dan validasi barcode.
- `src/pages/tambah-barang-masuk.js`: Logika input stok barang.
- `src/utils/barcode-scanner-config.js`: Konfigurasi kamera, filter video, dan utility scanner.
- `src/services/supabase.js`: Koneksi ke Supabase.

## Informasi Supabase
- **Project Ref:** `hsavfeawlfvqpacfjyhb`
- **Sync Method:** State JSON disimpan di tabel `app_state`.

## Catatan untuk Pengembang Selanjutnya
- Selalu gunakan `enhanceVideoElement()` untuk konsistensi tampilan kamera.
- Validasi stok dilakukan di dua tempat: `onSuccess` callback scanner dan `findSaleBarcodeConflict()` untuk input manual.
- Foto produk disimpan di LocalStorage untuk menghindari limitasi ukuran di Supabase.
