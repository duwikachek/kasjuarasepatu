import { showToast } from '../components/toast.js';
import logoJuara from '../assets/logo-juara.png';

export function renderPinLoginPage() {
  return `
    <div class="page-fade-in flex-1 flex flex-col justify-between px-6 pt-10 pb-8 min-h-screen" style="background:#000000;">
      <!-- Logo -->
      <div class="flex flex-col items-center text-center mt-2">
        <div class="glass-dark glass-sheen rounded-2xl flex items-center justify-center p-3 shadow-lg" style="width:166px;height:77px;">
          <img src="${logoJuara}" alt="Juara Sepatu" class="w-full h-full object-contain" />
        </div>
      </div>

      <!-- PIN Input & Numpad (grup PIN didekatkan ke tombol angka) -->
      <div class="w-full max-w-[320px] mx-auto my-4">
        <div class="flex flex-col items-center mb-6">
          <span class="font-label-md text-sm font-semibold uppercase tracking-wider" style="color:#ffffff;">Buka Buku Kas</span>
          <p class="font-body-sm text-xs mt-0.5" style="color:rgba(255,255,255,0.6);">Masukkan 6 Digit PIN Kasir / Pemilik</p>
          
          <!-- PIN Indicator Dots -->
          <div id="pin-indicator-group" class="flex items-center gap-3.5 mt-5">
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150"></div>
          </div>
          <span id="pin-error-msg" class="text-xs text-error font-medium mt-2 h-4 transition-all"></span>
        </div>

        <div class="grid grid-cols-3 gap-3">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `
            <button 
              type="button" 
              class="pin-key glass-card glass-btn glass-sheen h-14 font-keypad-num text-2xl font-semibold rounded-2xl flex items-center justify-center"
              style="color:#ffffff;"
              data-val="${n}"
            >
              ${n}
            </button>
          `).join('')}
          
          <button 
            type="button" 
            id="btn-forgot-pin"
            class="h-14 glass-neutral glass-btn glass-sheen font-label-md text-xs font-semibold rounded-2xl flex items-center justify-center"
            style="color:rgba(255,255,255,0.7);"
          >
            Lupa PIN?
          </button>
          
          <button 
            type="button" 
            class="pin-key glass-card glass-btn glass-sheen h-14 font-keypad-num text-2xl font-semibold rounded-2xl flex items-center justify-center"
            style="color:#ffffff;"
            data-val="0"
          >
            0
          </button>
          
          <button 
            type="button" 
            id="btn-pin-backspace"
            class="h-14 glass-neutral glass-btn glass-sheen rounded-2xl flex items-center justify-center"
            style="color:#ffffff;"
            aria-label="Hapus Digit"
          >
            <span class="material-symbols-outlined text-2xl">backspace</span>
          </button>
        </div>
      </div>

    </div>
  `;
}

export function initPinLoginPage(router, store) {
  let pin = '';
  const expectedPin = store.getShop().pin || '123456';
  const dots = document.querySelectorAll('#pin-indicator-group > div');
  const errorMsg = document.getElementById('pin-error-msg');

  function updateDots() {
    dots.forEach((dot, idx) => {
      if (idx < pin.length) {
        dot.className = 'w-3.5 h-3.5 rounded-full bg-on-tertiary-container shadow-sm transform scale-110 transition-all duration-150';
      } else {
        dot.className = 'w-3.5 h-3.5 rounded-full glass-chip transition-all duration-150';
      }
    });

    if (pin.length === 6) {
      setTimeout(verifyPin, 100);
    }
  }

  function verifyPin() {
    if (pin === expectedPin) {
      if (errorMsg) errorMsg.textContent = '';
      showToast('Autentikasi Berhasil. Selamat Datang!', 'success');
      setTimeout(() => {
        // Paksa navigate ke dashboard — gunakan router global sbg fallback
        const activeRouter = window.__APP_ROUTER__ || router;
        window.location.hash = '#/dashboard';
        activeRouter.currentRoute = 'dashboard';
        activeRouter.params = {};
        try {
          activeRouter.render();
        } catch (e) {
          console.error('[PIN] render gagal:', e);
          // Fallback terakhir: reload dengan hash dashboard
          window.location.href = window.location.pathname + '#/dashboard';
          window.location.reload();
        }
      }, 300);
    } else {
      if (errorMsg) errorMsg.textContent = 'PIN salah, silakan coba lagi.';
      pin = '';
      updateDots();
      // Shake effect
      const group = document.getElementById('pin-indicator-group');
      if (group) {
        group.classList.add('animate-bounce');
        setTimeout(() => group.classList.remove('animate-bounce'), 400);
      }
    }
  }

  document.querySelectorAll('.pin-key').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (pin.length < 6) {
        pin += btn.getAttribute('data-val');
        if (errorMsg) errorMsg.textContent = '';
        updateDots();
      }
    });
  });

  const backspaceBtn = document.getElementById('btn-pin-backspace');
  if (backspaceBtn) {
    backspaceBtn.addEventListener('click', () => {
      if (pin.length > 0) {
        pin = pin.slice(0, -1);
        if (errorMsg) errorMsg.textContent = '';
        updateDots();
      }
    });
  }

  const forgotBtn = document.getElementById('btn-forgot-pin');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      showToast('Lupa PIN? Silakan hubungi pemilik toko untuk mengatur ulang PIN.', 'info', 4000);
    });
  }
}
