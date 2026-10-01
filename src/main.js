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

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();

  // Create & Initialize Router
  const router = new Router(store, 'app');
  router.init();

  // Make router and store available for debugging if needed
  window.__APP_ROUTER__ = router;
  window.__APP_STORE__ = store;
});
