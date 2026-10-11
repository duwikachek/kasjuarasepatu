# Handoff Project: Kas Juara Sepatu

## Deskripsi Project
Aplikasi buku kas digital untuk toko sepatu yang mengelola transaksi penjualan, pengeluaran, dan stok barang. Aplikasi ini menggunakan arsitektur *Single State* yang disinkronkan ke Supabase.

## Stack Teknologi
- **Frontend:** Vite, Vanilla JavaScript, Tailwind CSS
- **Database/Sync:** Supabase (tabel `app_state`)
- **Storage:** LocalStorage (untuk data lokal & foto produk)
- **Barcode Scanner:** `html5-qrcode`

## Konteks Terakhir (Update 12 Oktober 2026)

### A. Fitur Grouping Transaksi Berdasarkan Faktur
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
