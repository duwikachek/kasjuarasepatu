import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!supabaseReady) {
  console.error('[Supabase] Kredensial belum dikonfigurasi.');
}

export const supabase = supabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } }
    })
  : null;

/**
 * Push state snapshot ke Supabase.
 * @param {object} state
 * @param {string} [customTimestamp] - ISO timestamp — jika diberikan, dipakai sebagai updated_at
 *   agar store bisa melacak push sendiri dan mengabaikan echo realtime-nya.
 */
export async function pushStateToSupabase(state, customTimestamp) {
  if (!supabaseReady) return;
  const payload = stripPhotosForSync(state);
  const updatedAt = customTimestamp || new Date().toISOString();
  const { error } = await supabase
    .from('app_state')
    .upsert(
      {
        shop_id: 'kas_juara_main',
        data: payload,
        updated_at: updatedAt
      },
      { onConflict: 'shop_id' }
    );
  if (error) {
    console.warn('[Supabase] Push gagal:', error.message);
    throw error;
  }
  console.log('[Supabase] State berhasil disimpan ke cloud ✓');
}

/**
 * Tarik state terbaru dari Supabase.
 * Return: { data, updatedAt } atau null
 */
export async function pullStateFromSupabase() {
  if (!supabaseReady) return null;
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('shop_id', 'kas_juara_main')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // belum ada row
      console.warn('[Supabase] Pull gagal:', error.message);
      return null;
    }
    return data ? { data: data.data, updatedAt: data.updated_at } : null;
  } catch (e) {
    console.warn('[Supabase] Pull exception:', e.message);
    return null;
  }
}

/**
 * Berlangganan perubahan real-time dari Supabase.
 * Juga memulai polling setiap 30 detik sebagai fallback jika realtime terputus.
 *
 * @param {function} onUpdate - dipanggil dengan (newState, updatedAt)
 * @param {function} getLocalUpdatedAt - fungsi yang return timestamp lokal terakhir
 * @returns {function} unsubscribe + stop polling function
 */
export function subscribeToStateChanges(onUpdate, getLocalUpdatedAt) {
  if (!supabaseReady) return () => {};

  // --- Realtime subscription (semua events) ---
  const channel = supabase
    .channel('kas_juara_realtime_v2')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state' },
      (payload) => {
        const record = payload.new || payload.record;
        if (!record || record.shop_id !== 'kas_juara_main') return;
        const remoteTs = record.updated_at;
        const localTs = typeof getLocalUpdatedAt === 'function' ? getLocalUpdatedAt() : null;
        // Skip jika update ini adalah milik kita sendiri (timestamp sama)
        if (localTs && remoteTs && localTs === remoteTs) {
          console.log('[Supabase] Realtime: skip echo dari diri sendiri (ts match)');
          return;
        }
        console.log('[Supabase] Realtime update diterima ✓ event:', payload.eventType);
        // Teruskan remoteTs ke callback agar store bisa verifikasi lebih lanjut
        if (record.data) onUpdate(record.data, remoteTs);
      }
    )
    .subscribe((status) => {
      realtimeConnected = (status === 'SUBSCRIBED');
      console.log('[Supabase] Realtime channel status:', status);
    });

  // --- Polling fallback setiap 2 menit ---
  // Hanya aktif jika: tab visible DAN realtime tidak connected
  let realtimeConnected = false;
  let pollInterval = null;

  function startPolling() {
    if (pollInterval) return; // sudah jalan
    pollInterval = setInterval(async () => {
      // Skip jika tab tidak aktif (hemat baterai & data)
      if (document.hidden) return;
      // Skip jika realtime sudah connected
      if (realtimeConnected) return;
      try {
        const result = await pullStateFromSupabase();
        if (!result) return;
        const localTs = typeof getLocalUpdatedAt === 'function' ? getLocalUpdatedAt() : null;
        if (!localTs || (result.updatedAt && result.updatedAt > localTs)) {
          console.log('[Supabase] Polling: ada update baru dari server ✓');
          onUpdate(result.data, result.updatedAt);
        }
      } catch (e) { /* abaikan error polling */ }
    }, 120000); // 2 menit (hemat resource)
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  // Mulai polling
  startPolling();

  // Pause polling saat tab tidak aktif, resume saat aktif kembali
  const onVisibilityChange = () => {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    supabase.removeChannel(channel);
    stopPolling();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

/**
 * Hapus foto (base64) dari state sebelum dikirim ke Supabase.
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
