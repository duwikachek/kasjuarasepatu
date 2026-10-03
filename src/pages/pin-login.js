import { showToast } from '../components/toast.js';
import logoJuara from '../assets/logo-juara.png';

export function renderPinLoginPage() {
  return `
    <div class="page-fade-in flex-1 flex flex-col justify-between px-6 pt-10 pb-8 min-h-screen bg-surface">
      <!-- Brand & Header -->
      <div class="flex flex-col items-center text-center mt-2">
        <div class="w-52 h-24 rounded-2xl bg-black flex items-center justify-center p-3 shadow-lg mb-4 border border-neutral-800">
          <img src="${logoJuara}" alt="Juara Sepatu" class="w-full h-full object-contain" />
        </div>
        <h1 class="font-headline-lg text-2xl font-bold text-on-surface">Kas Juara Sepatu</h1>
        <p class="font-body-md text-sm text-on-surface-variant mt-1">Buku Kas & Stok Sepatu Retro Modern</p>
        
        <div class="mt-8 flex flex-col items-center">
          <span class="font-label-md text-sm font-semibold text-primary uppercase tracking-wider">Buka Buku Kas</span>
          <p class="font-body-sm text-xs text-on-surface-variant mt-0.5">Masukkan 6 Digit PIN Kasir / Pemilik</p>
          
          <!-- PIN Indicator Dots -->
          <div id="pin-indicator-group" class="flex items-center gap-3.5 mt-5">
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150"></div>
          </div>
          <span id="pin-error-msg" class="text-xs text-error font-medium mt-2 h-4 transition-all"></span>
        </div>
      </div>

      <!-- Tactile Numpad -->
      <div class="w-full max-w-[320px] mx-auto my-4">
        <div class="grid grid-cols-3 gap-3">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `
            <button 
              type="button" 
              class="pin-key h-14 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-keypad-num text-2xl font-semibold rounded-2xl shadow-sm active:translate-y-0.5 transition-all flex items-center justify-center border border-surface-container-high"
              data-val="${n}"
            >
              ${n}
            </button>
          `).join('')}
          
          <button 
            type="button" 
            id="btn-forgot-pin"
            class="h-14 bg-surface-container-low hover:bg-surface-container text-on-tertiary-container font-label-md text-xs font-semibold rounded-2xl flex items-center justify-center active:translate-y-0.5 transition-all"
          >
            Lupa PIN?
          </button>
          
          <button 
            type="button" 
            class="pin-key h-14 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-keypad-num text-2xl font-semibold rounded-2xl shadow-sm active:translate-y-0.5 transition-all flex items-center justify-center border border-surface-container-high"
            data-val="0"
          >
            0
          </button>
          
          <button 
            type="button" 
            id="btn-pin-backspace"
            class="h-14 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-2xl flex items-center justify-center active:translate-y-0.5 transition-all"
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
        dot.className = 'w-3.5 h-3.5 rounded-full bg-surface-container-high transition-all duration-150';
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
        router.navigate('dashboard');
      }, 200);
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
