import { store } from './store/store.js';
import { Router } from './router.js';

// Setup live clock in mock status bar
function initLiveClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}`;
  }

  updateClock();
  setInterval(updateClock, 10000);
}

// Minta penyimpanan persisten agar data tidak dibersihkan browser saat ruang menipis
async function requestPersistentStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      const alreadyPersisted = typeof navigator.storage.persisted === 'function'
        ? await navigator.storage.persisted()
        : false;
      if (!alreadyPersisted) {
        await navigator.storage.persist();
      }
    }
  } catch (e) {
    /* diabaikan: ini hanya optimisasi agar data lebih tahan lama */
  }
}

// Versi app — ubah setiap deploy besar agar SW lama otomatis dihapus
const APP_VERSION = '2026.10.06-v5';
const VERSION_KEY = 'kas_juara_app_version';

async function forceUpdateIfNewVersion() {
  try {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    if (savedVersion === APP_VERSION) return; // Tidak ada perubahan versi

    console.log('[App] Versi baru terdeteksi, membersihkan cache lama...');

    // Hapus semua SW cache lama
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Unregister SW lama, biarkan yang baru mendaftar
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // Simpan versi baru
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    // Reload sekali untuk pakai SW + JS baru
    if (savedVersion !== null) {
      // Hanya reload jika bukan pertama kali (ada versi lama)
      console.log('[App] Reload untuk memuat versi terbaru...');
      window.location.reload();
      return;
    }
  } catch (e) {
    console.warn('[App] Gagal force update:', e);
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Force update SW lama jika ada versi baru
  await forceUpdateIfNewVersion();

  initLiveClock();
  requestPersistentStorage();

  // Create & Initialize Router
  const router = new Router(store, 'app');
  router.init();

  // Make router and store available for debugging if needed
  window.__APP_ROUTER__ = router;
  window.__APP_STORE__ = store;
});
