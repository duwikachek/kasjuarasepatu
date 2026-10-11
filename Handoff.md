# Handoff Project: Kas Juara Sepatu

## Deskripsi Project
Aplikasi buku kas digital untuk toko sepatu yang mengelola transaksi penjualan, pengeluaran, dan stok barang. Aplikasi ini menggunakan arsitektur *Single State* yang disinkronkan ke Supabase.

## Stack Teknologi
- **Frontend:** Vite, Vanilla JavaScript, Tailwind CSS
- **Database/Sync:** Supabase (tabel `app_state`)
- **Storage:** LocalStorage (untuk data lokal & foto produk)
- **Barcode Scanner:** `html5-qrcode`

## Konteks Terakhir (Update 11 Oktober 2026)
1. **Standardisasi Barcode Scanner:**
   - Fitur barcode scanner di halaman `tambah-transaksi.js` (Kas Masuk) dan `tambah-barang-masuk.js` (Stock/Belanja) telah diseragamkan.
   - Menggunakan `enhanceVideoElement()` dari `barcode-scanner-config.js` untuk viewfinder yang konsisten (kotak putih terang di tengah).
   - Penamaan variabel, fungsi, dan ID DOM sudah seragam.

2. **Validasi Stok:**
   - Logika validasi stok telah ditambahkan pada `tambah-transaksi.js`.
   - Barcode yang di-scan divalidasi terhadap `store.getRealtimeStockReport().unsoldItems`.
   - Jika barcode tidak ada di stok atau sudah laku, sistem menampilkan error `❌ Barang sudah laku atau tidak ada di stok`.

3. **Sinkronisasi Hapus Stock & Transaksi (Fix Oktober 2026):**
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
