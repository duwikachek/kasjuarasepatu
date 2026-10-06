-- ==========================================================
-- KAS JUARA SEPATU — Supabase Schema
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ==========================================================

-- Tabel utama: menyimpan seluruh state aplikasi sebagai JSONB
-- 1 row per toko (shop_id = 'kas_juara_main')
CREATE TABLE IF NOT EXISTS app_state (
  shop_id    TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Policy: anon key bisa baca dan tulis (karena aplikasi pakai anon key)
-- CATATAN: Ini aman selama URL Supabase tidak dipublikasikan secara luas.
-- Untuk keamanan lebih tinggi, ganti ke authenticated role dan tambah login.
CREATE POLICY "Allow anon read" ON app_state
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert" ON app_state
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update" ON app_state
  FOR UPDATE USING (true);

-- Enable Realtime untuk tabel ini
-- (Wajib agar Supabase bisa kirim update ke semua client secara real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE app_state;
