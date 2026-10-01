// Bottom Navigation Component

export function renderBottomNav(activeRoute = 'dashboard') {
  const tabs = [
    { route: 'dashboard', icon: 'storefront', label: 'Dashboard' },
    { route: 'pasok', icon: 'inventory_2', label: 'Stock' },
    { route: 'transaksi', icon: 'point_of_sale', label: 'Transaksi' },
    { route: 'pengiriman', icon: 'local_shipping', label: 'Kirim' },
    { route: 'laporan', icon: 'analytics', label: 'Laporan' },
  ];

  return `
    <nav class="w-full bg-black shadow-[0_-4px_25px_rgba(0,0,0,0.6)] border-t border-neutral-800 select-none pb-1 sm:pb-2 pt-1" style="background-color: #000000 !important;">
      <div class="flex justify-around items-center h-16 sm:h-[68px] px-2 max-w-[430px] mx-auto bg-black" style="background-color: #000000 !important;">
        ${tabs.map((tab) => {
          const isActive = activeRoute === tab.route;
          const activeClass = isActive
            ? 'text-white bg-neutral-800 font-bold shadow-sm ring-1 ring-neutral-700'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60';
          return `
            <button
              type="button"
              data-nav="${tab.route}"
              class="flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all active:scale-95 ${activeClass}"
              aria-label="${tab.label}"
            >
              <span class="material-symbols-outlined text-[22px]">${tab.icon}</span>
              <span class="font-label-sm text-[11px] leading-tight mt-0.5">${tab.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </nav>
  `;
}

export function bindBottomNavEvents(router) {
  const navContainer = document.getElementById('global-bottom-nav');
  if (!navContainer) return;
  navContainer.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-nav');
      if (target) {
        router.navigate(target);
      }
    });
  });
}

