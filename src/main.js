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

  // Terapkan background tersimpan sejak pertama buka app
  (function restoreBackground() {
    try {
      const BG_STORAGE_KEY = 'kas_juara_custom_background';
      const PRESET_STYLES = {
        'default':           { image: `url('./assets/background-sepatu-kulit.jpg')`, color: '#0d1f16' },
        'solid-black':       { image: 'none', color: '#000000' },
        'solid-green':       { image: 'none', color: '#0d1f16' },
        'solid-navy':        { image: 'none', color: '#0f172a' },
        'solid-brown':       { image: 'none', color: '#3d2619' },
        'gradient-sunset':   { image: 'linear-gradient(135deg,#1a0000,#3d1a00,#1f0a00)', color: '#1a0000' },
        'gradient-midnight': { image: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', color: '#0f0c29' },
        'gradient-forest':   { image: 'linear-gradient(135deg,#0a2012,#1a4a2e,#0d2e1a)', color: '#0a2012' },
      };
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (!saved) return;
      const bgData = JSON.parse(saved);
      const frame = document.getElementById('phone-frame');
      if (!frame) return;

      if (bgData.type === 'image') {
        frame.style.backgroundImage = `url(${bgData.value})`;
        frame.style.backgroundSize = 'cover';
        frame.style.backgroundPosition = 'center 30%';
        frame.style.backgroundRepeat = 'no-repeat';
        frame.style.backgroundColor = '#000';
      } else if (bgData.type === 'preset') {
        const style = PRESET_STYLES[bgData.value];
        if (style) {
          frame.style.backgroundImage = style.image;
          frame.style.backgroundSize = style.image !== 'none' ? 'cover' : '';
          frame.style.backgroundPosition = 'center 30%';
          frame.style.backgroundRepeat = 'no-repeat';
          frame.style.backgroundColor = style.color;
        }
      }
    } catch (e) { /* abaikan */ }
  })();

  // Create & Initialize Router
  const router = new Router(store, 'app');
  router.init();

  // Make router and store available for debugging if needed
  window.__APP_ROUTER__ = router;
  window.__APP_STORE__ = store;
});
