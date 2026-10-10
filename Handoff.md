# Handoff Project: Kas Juara Sepatu

## Deskripsi Project
Aplikasi buku kas digital untuk toko sepatu yang mengelola transaksi penjualan, pengeluaran, dan stok barang. Aplikasi ini menggunakan arsitektur *Single State* yang disinkronkan ke Supabase.

## Stack Teknologi
- **Frontend:** Vite, Vanilla JavaScript, Tailwind CSS
- **Database/Sync:** Supabase (tabel `app_state`)
- **Storage:** LocalStorage (untuk data lokal & foto produk)
- **Barcode Scanner:** `html5-qrcode`

## Konteks Terakhir (Update Oktober 2026)
1. **Standardisasi Barcode Scanner:**
   - Fitur barcode scanner di halaman `tambah-transaksi.js` (Kas Masuk) dan `tambah-barang-masuk.js` (Stock/Belanja) telah diseragamkan.
   - Menggunakan `enhanceVideoElement()` dari `barcode-scanner-config.js` untuk viewfinder yang konsisten (kotak putih terang di tengah).
   - Penamaan variabel, fungsi, dan ID DOM sudah seragam.

2. **Validasi Stok:**
   - Logika validasi stok telah ditambahkan pada `tambah-transaksi.js`.
   - Barcode yang di-scan divalidasi terhadap `store.getRealtimeStockReport().unsoldItems`.
   - Jika barcode tidak ada di stok atau sudah laku, sistem menampilkan error `❌ Barang sudah laku atau tidak ada di stok`.

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
