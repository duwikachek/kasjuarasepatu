import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Kredensial belum dikonfigurasi. Pastikan .env sudah ada.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false // Aplikasi ini tidak pakai auth user, cukup anon key
  }
});

// ============================================================
// HELPER: upsert seluruh state ke Supabase (dipakai oleh store)
// ============================================================

/**
 * Push state snapshot ke Supabase.
 * Kita simpan state sebagai 1 row per "shop_id" di tabel app_state.
 * Ini cara paling simpel agar tidak perlu migrasi skema yang rumit.
 */
export async function pushStateToSupabase(state) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  // Hilangkan foto (base64 bisa sangat besar) sebelum kirim ke Supabase
  const payload = stripPhotosForSync(state);

  const { error } = await supabase
    .from('app_state')
    .upsert(
      {
        shop_id: 'kas_juara_main',
        data: payload,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'shop_id' }
    );

  if (error) {
    console.warn('[Supabase] Gagal menyimpan state:', error.message);
    throw error;
  }
}

/**
 * Tarik state terbaru dari Supabase.
 * Dipakai saat pertama kali app dibuka (atau refresh).
 */
export async function pullStateFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('shop_id', 'kas_juara_main')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row tidak ditemukan — pertama kali
      return null;
    }
    console.warn('[Supabase] Gagal membaca state:', error.message);
    return null;
  }

  return data ? data.data : null;
}

/**
 * Berlangganan perubahan real-time dari Supabase.
 * Ketika admin lain membuat perubahan, callback akan dipanggil dengan state baru.
 * @param {function} onUpdate - dipanggil dengan (newState) saat ada update
 * @returns {function} unsubscribe function
 */
export function subscribeToStateChanges(onUpdate) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return () => {};

  const channel = supabase
    .channel('app_state_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_state',
        filter: 'shop_id=eq.kas_juara_main'
      },
      (payload) => {
        if (payload.new && payload.new.data) {
          console.log('[Supabase] Real-time update diterima dari admin lain');
          onUpdate(payload.new.data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Hapus foto (base64) dari state sebelum dikirim ke Supabase.
 * Foto bisa sangat besar (> 1MB per foto) — disimpan di localStorage saja.
 */
function stripPhotosForSync(data) {
  const clone = JSON.parse(JSON.stringify(data || {}));
  const del = (it) => { if (it && typeof it === 'object' && it.photo) delete it.photo; };
  (clone.transactions || []).forEach((t) => {
    del(t);
    if (Array.isArray(t.items)) t.items.forEach(del);
  });
  (clone.supplies || []).forEach((s) => {
    if (Array.isArray(s.items)) s.items.forEach(del);
  });
  (clone.products || []).forEach(del);
  return clone;
}
