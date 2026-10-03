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

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  requestPersistentStorage();

  // Create & Initialize Router
  const router = new Router(store, 'app');
  router.init();

  // Make router and store available for debugging if needed
  window.__APP_ROUTER__ = router;
  window.__APP_STORE__ = store;
});
