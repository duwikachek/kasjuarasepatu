# Project: Kas Juara Sepatu 👟

Aplikasi Buku Kas Digital khusus toko sepatu yang dirancang untuk penggunaan mobile-first, offline-first, dan sinkronisasi real-time.

## 🚀 Quick Links
- **Repository**: [duwikachek/kasjuarasepatu](https://github.com/duwikachek/kasjuarasepatu)
- **Supabase Console**: [hsavfeawlfvqpacfjyhb](https://hsavfeawlfvqpacfjyhb.supabase.co)
- **Production URL**: [GitHub Pages](https://duwikachek.github.io/kasjuarasepatu/)

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, Tailwind CSS (via CDN/Vite)
- **Build Tool**: [Vite 6.0](https://vitejs.dev/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Storage**: `localStorage` (Local) + `app_state` table (Cloud)
- **PWA**: `vite-plugin-pwa` (Service Worker, Offline Support)
- **Scanner**: `html5-qrcode`

---

## 📂 Folder Structure
- [src/main.js](C:/ai/Project/kas-juara/src/main.js): Entry point aplikasi, inisialisasi router & store.
- [src/router.js](C:/ai/Project/kas-juara/src/router.js): Pengatur navigasi antar halaman (hash-based).
- [src/store/store.js](C:/ai/Project/kas-juara/src/store/store.js): Logika bisnis & manajemen state (JSONB).
- [src/pages/](C:/ai/Project/kas-juara/src/pages/): Kumpulan modul halaman (Dashboard, Transaksi, Stok, dll).
- [src/services/](C:/ai/Project/kas-juara/src/services/): Integrasi API (Supabase, Google Sheets).
- [src/components/](C:/ai/Project/kas-juara/src/components/): Komponen UI reusable (Header, BottomNav, Toast).
- [src/utils/](C:/ai/Project/kas-juara/src/utils/): Helper functions (Barcode, Image compression).

---

## 🔄 Data Flow & Sync
1. **Local First**: Data disimpan ke `localStorage` segera setelah input.
2. **Cloud Sync**: State di-push ke Supabase `app_state` (tanpa foto base64 untuk efisiensi).
3. **Real-time**: Menggunakan Supabase Channels untuk sinkronisasi antar perangkat secara instan.
4. **Polling Fallback**: Polling setiap 2 menit jika koneksi realtime terputus.
5. **Photo Handling**: Foto tetap di lokal (localStorage) dan tidak di-sync ke cloud untuk menghemat bandwidth/storage.

---

## 📋 Fitur Utama
- ✅ **Dashboard**: Ringkasan saldo (Laci & Bank), grafik arus kas, dan alert stok rendah.
- ✅ **Manajemen Stok**: Input barang masuk (kulakan), barcode scanning, dan laporan sisa pasang.
- ✅ **Transaksi**: Pencatatan kas masuk (penjualan) dan kas keluar (operasional).
- ✅ **Pengiriman**: Tracking status pesanan (Kemas -> Proses -> Kirim -> Tiba).
- ✅ **Stock Opname**: Verifikasi fisik vs sistem dengan fitur verifikasi per item.
- ✅ **Investor**: Perhitungan bagi hasil dan modal investor.
- ✅ **Google Sheets**: Sinkronisasi otomatis ke spreadsheet untuk dashboard eksekutif.

---

## 🛠️ Development
```bash
# Install dependencies
npm install

# Jalankan dev server
npm run dev

# Build production
npm run build
```

## 📝 Catatan Penting
- **PWA Cache**: Versi aplikasi dikontrol via `APP_VERSION` di `main.js`.
- **Security**: Menggunakan Row Level Security (RLS) di Supabase (Anon access enabled).
- **Base Path**: Aplikasi menggunakan base path `/kasjuarasepatu/` untuk compatibility dengan GitHub Pages.

---
*Terakhir diperbarui: 2026-10-10*
