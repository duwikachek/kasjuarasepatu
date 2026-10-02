// App Header Component
import { showToast } from './toast.js';
import logoJuara from '../assets/logo-juara.png';

export function renderHeader({
  title = 'Kas Juara',
  badge = 'Sepatu',
  subtitle = 'Dashboard',
  showBack = false,
  backRoute = 'dashboard',
  rightAction = null // { label, icon, actionId }
} = {}) {
  return `
    <header class="app-header sticky top-0 w-full z-40 bg-black shadow-[0_4px_20px_rgba(0,0,0,0.4)] pt-safe border-b border-neutral-800" style="background-color: #000000 !important;">
      <div class="h-16 px-4 flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          ${showBack ? `
            <button 
              type="button" 
              data-back="${backRoute}" 
              class="w-10 h-10 -ml-1 flex items-center justify-center rounded-full text-white hover:bg-neutral-800 active:scale-90 transition-all" 
              aria-label="Kembali"
            >
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ` : `
            <div class="h-10 px-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-xs shrink-0 overflow-hidden cursor-pointer hover:border-neutral-700 transition-all" data-nav="dashboard" title="Juara Sepatu">
              <img src="${logoJuara}" alt="Juara Sepatu" class="h-7 w-auto max-w-[72px] object-contain" />
            </div>
          `}
          
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-[17px] text-white font-bold tracking-tight truncate">${title}</span>
              ${badge ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 text-[10px] font-label-sm font-semibold uppercase tracking-wider shrink-0">
                  ${badge}
                </span>
              ` : ''}
            </div>
            <span class="font-label-sm text-label-sm text-neutral-400 truncate">${subtitle}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          ${rightAction ? `
            <button 
              type="button" 
              id="${rightAction.actionId}" 
              class="h-9 px-3 rounded-xl bg-white text-black font-label-md text-label-md flex items-center gap-1.5 hover:bg-neutral-200 active:scale-95 transition-all shadow-sm font-bold"
            >
              ${rightAction.icon ? `<span class="material-symbols-outlined text-[18px] text-black">${rightAction.icon}</span>` : ''}
              <span>${rightAction.label}</span>
            </button>
          ` : `
            <button 
              type="button" 
              id="header-notif-btn" 
              class="w-10 h-10 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-90 transition-all relative"
              aria-label="Notifikasi Toko"
            >
              <span class="material-symbols-outlined text-[22px]">notifications</span>
              <span class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse ring-2 ring-black"></span>
            </button>
            <button 
              type="button" 
              data-nav="pengaturan" 
              class="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white flex items-center justify-center ml-0.5 shadow-sm border border-neutral-700 active:scale-90 transition-all"
              aria-label="Pengaturan Toko"
            >
              <span class="material-symbols-outlined text-[18px]">settings</span>
            </button>
          `}
        </div>
      </div>
    </header>
  `;
}

export function bindHeaderEvents(router) {
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-back');
      router.navigate(target || 'dashboard');
    });
  });

  const notifBtn = document.getElementById('header-notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      showToast('Semua catatan kas telah tersinkron aman di memori lokal.', 'info');
    });
  }
}
