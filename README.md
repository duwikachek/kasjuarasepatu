# Kas Juara Sepatu 👟

Aplikasi Buku Kas Digital untuk toko sepatu, dibangun dengan HTML + Vanilla JavaScript + Vite.

## Fitur Utama

- 📊 **Dashboard** — Ringkasan saldo kas, transaksi terkini, dan status pengiriman
- 💵 **Kas Masuk** — Pencatatan semua penerimaan uang (penjualan, dll)
- 💸 **Kas Keluar** — Pencatatan semua pengeluaran (belanja stok, biaya operasional)
- 📦 **Barang Masuk (Belanja)** — Manajemen pengadaan stok sepatu dari supplier
- 🚚 **Pengiriman** — Tracking status pengiriman pesanan ke pelanggan
- 📋 **Laporan** — Rekap keuangan berdasarkan periode
- ⚙️ **Pengaturan** — Konfigurasi toko dan integrasi Google Sheets

## Integrasi Google Sheets

Aplikasi ini mendukung sinkronisasi otomatis ke Google Spreadsheet dengan tampilan **Executive Dashboard** yang interaktif, mencakup:
- 6 sheet: Dashboard, Ringkasan Usaha, Kas Masuk, Kas Keluar, Barang Masuk (Belanja), Pengiriman
- Grafik otomatis (Donut Chart alokasi kas + Column Chart arus kas)
- Tema dark navy premium dengan format mata uang Rupiah otomatis

## Cara Setup Google Sheets

1. Buat **Google Cloud Service Account** dan download file JSON credentials.
2. Rename file tersebut menjadi `service-account.json` dan letakkan di folder `src/config/`.
   - Lihat contoh formatnya di `src/config/service-account.example.json`
3. Buat Google Spreadsheet baru dan **bagikan** (Share) ke email Service Account dengan peran **Editor**.
4. Buka Pengaturan di aplikasi, masukkan ID atau link Spreadsheet, lalu klik **Uji Koneksi**.

## Cara Menjalankan Aplikasi

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build untuk production
npm run build
```

## Teknologi

- **Frontend:** HTML5, Vanilla JavaScript (ES Modules)
- **Build Tool:** Vite
- **Penyimpanan Data:** localStorage (offline-first)
- **Integrasi:** Google Sheets API v4 via Service Account

## Lisensi

Proyek pribadi — Hak cipta milik pemilik toko.
