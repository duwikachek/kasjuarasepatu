-- ========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- ========================================
-- File: supabase_rls_setup.sql
-- Purpose: Enable Row Level Security untuk table kas_juara_state
-- Date: 26 Oktober 2026
--
-- CARA PAKAI:
-- 1. Login ke Supabase Dashboard: https://supabase.com/dashboard
-- 2. Pilih project Anda
-- 3. Klik "SQL Editor" di sidebar kiri
-- 4. Copy-paste script ini
-- 5. Klik "Run" untuk execute
--
-- ========================================

-- Step 1: Enable RLS pada table kas_juara_state
-- Ini akan aktifkan row-level security untuk table tersebut
ALTER TABLE kas_juara_state ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PILIHAN POLICY (Pilih salah satu sesuai kebutuhan)
-- ========================================

-- ----------------------------------------
-- OPTION 1: MVP / SINGLE USER (Recommended untuk saat ini)
-- ----------------------------------------
-- Policy ini mengizinkan semua orang read/write
-- Cocok untuk MVP atau aplikasi single-user
-- Security bergantung pada kerahasiaan anon key

-- Allow all users to read all data
CREATE POLICY "kas_juara_public_read"
ON kas_juara_state
FOR SELECT
USING (true);

-- Allow all users to insert data
CREATE POLICY "kas_juara_public_insert"
ON kas_juara_state
FOR INSERT
WITH CHECK (true);

-- Allow all users to update data
CREATE POLICY "kas_juara_public_update"
ON kas_juara_state
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow all users to delete data
CREATE POLICY "kas_juara_public_delete"
ON kas_juara_state
FOR DELETE
USING (true);

-- ----------------------------------------
-- OPTION 2: MULTI-USER dengan Authentication (Future)
-- ----------------------------------------
-- Uncomment ini HANYA jika Anda sudah implement Supabase Auth
-- dan setiap user punya auth.uid() sendiri

-- Add user_id column dulu (jika belum ada):
-- ALTER TABLE kas_juara_state ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Policy: Users can only read their own data
-- CREATE POLICY "kas_juara_users_read_own"
-- ON kas_juara_state
-- FOR SELECT
-- USING (auth.uid() = user_id);

-- Policy: Users can only insert their own data
-- CREATE POLICY "kas_juara_users_insert_own"
-- ON kas_juara_state
-- FOR INSERT
-- WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own data
-- CREATE POLICY "kas_juara_users_update_own"
-- ON kas_juara_state
-- FOR UPDATE
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own data
-- CREATE POLICY "kas_juara_users_delete_own"
-- ON kas_juara_state
-- FOR DELETE
-- USING (auth.uid() = user_id);

-- ----------------------------------------
-- OPTION 3: IP WHITELIST (Advanced)
-- ----------------------------------------
-- Policy berdasarkan IP address tertentu
-- Hanya IP yang di-whitelist yang bisa akses

-- CREATE POLICY "kas_juara_ip_whitelist"
-- ON kas_juara_state
-- FOR ALL
-- USING (
--   current_setting('request.headers')::json->>'x-real-ip' IN (
--     '192.168.1.100',  -- Replace dengan IP kantor Anda
--     '203.0.113.45'    -- Replace dengan IP rumah Anda
--   )
-- );

-- ========================================
-- VERIFICATION: Check apakah RLS sudah aktif
-- ========================================
-- Run query ini untuk verify:

SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'kas_juara_state';
-- Expected: rowsecurity = true

-- Check existing policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'kas_juara_state';
-- Should show 4 policies jika pakai Option 1

-- ========================================
-- ROLLBACK (jika perlu disable RLS)
-- ========================================
-- Jika ada masalah dan perlu rollback:

-- DROP POLICY IF EXISTS "kas_juara_public_read" ON kas_juara_state;
-- DROP POLICY IF EXISTS "kas_juara_public_insert" ON kas_juara_state;
-- DROP POLICY IF EXISTS "kas_juara_public_update" ON kas_juara_state;
-- DROP POLICY IF EXISTS "kas_juara_public_delete" ON kas_juara_state;
-- ALTER TABLE kas_juara_state DISABLE ROW LEVEL SECURITY;

-- ========================================
-- TESTING
-- ========================================
-- Setelah apply policy, test dengan:

-- 1. Test read (harus bisa)
-- SELECT * FROM kas_juara_state LIMIT 1;

-- 2. Test insert (harus bisa)
-- INSERT INTO kas_juara_state (id, state_data, updated_at)
-- VALUES ('test-id', '{"test": true}', NOW())
-- ON CONFLICT (id) DO NOTHING;

-- 3. Test update (harus bisa)
-- UPDATE kas_juara_state 
-- SET state_data = '{"test": "updated"}' 
-- WHERE id = 'test-id';

-- 4. Test delete (harus bisa)
-- DELETE FROM kas_juara_state WHERE id = 'test-id';

-- ========================================
-- NOTES & RECOMMENDATIONS
-- ========================================
-- 
-- 1. UNTUK MVP (Sekarang):
--    - Gunakan OPTION 1 (Public policies)
--    - Jaga kerahasiaan VITE_SUPABASE_ANON_KEY
--    - Jangan share anon key ke publik
--
-- 2. UNTUK PRODUCTION (Nanti):
--    - Implement Supabase Authentication
--    - Migration ke OPTION 2 (User-based policies)
--    - Add user_id column & foreign key
--
-- 3. SECURITY BEST PRACTICES:
--    - Enable RLS SELALU untuk semua tables
--    - Rotate anon key secara berkala
--    - Monitor Supabase logs untuk suspicious activity
--    - Set up rate limiting di Supabase dashboard
--
-- 4. ALTERNATIVE SECURITY (tanpa RLS):
--    - Gunakan Supabase Edge Functions sebagai API layer
--    - Validate requests di Edge Function
--    - Jangan expose anon key ke frontend
--    - Tapi ini lebih complex, RLS lebih mudah
--
-- ========================================
-- AUTHOR: Kiro AI
-- CREATED: 26 Oktober 2026
-- PROJECT: Kas Juara Sepatu
-- ========================================
