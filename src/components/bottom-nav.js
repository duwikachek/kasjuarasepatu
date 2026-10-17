// Bottom Navigation Component

export function renderBottomNav(activeRoute = 'dashboard', isAdmin = true) {
  const tabs = [
    { route: 'dashboard', icon: 'storefront', label: 'Dashboard' },
    { route: 'pasok', icon: 'inventory_2', label: 'Stock' },
    { route: 'transaksi', icon: 'point_of_sale', label: 'Transaksi' },
    { route: 'investor', icon: 'handshake', label: 'Investasi' },
    { route: 'pengiriman', icon: 'local_shipping', label: 'Kirim' },
    { route: 'laporan', icon: 'analytics', label: 'Laporan' },
  ];

  // Badge role — ditampilkan di pojok kanan atas nav
  const roleBadge = isAdmin
    ? `<span class="absolute top-1 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 tracking-wide">
        <span class="material-symbols-outlined text-[9px]">manage_accounts</span>ADMIN
       </span>`
    : `<span class="absolute top-1 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700/60 tracking-wide">
        <span class="material-symbols-outlined text-[9px]">visibility</span>ATASAN
       </span>`;

  return `
    <nav class="w-full bg-black shadow-[0_-4px_25px_rgba(0,0,0,0.6)] border-t border-neutral-800 select-none pb-1 sm:pb-2 pt-1 relative" style="background-color: #000000 !important;">
      ${roleBadge}
      <div class="flex justify-around items-center h-16 sm:h-[68px] px-1.5 max-w-[430px] mx-auto bg-black" style="background-color: #000000 !important;">
        ${tabs.map((tab) => {
          const isActive = activeRoute === tab.route;
          const activeClass = isActive
            ? 'text-white bg-neutral-800 font-bold shadow-sm ring-1 ring-neutral-700'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60';
          return `
            <button
              type="button"
              data-nav="${tab.route}"
              class="flex flex-col items-center justify-center flex-1 min-w-0 max-w-[66px] h-12 rounded-xl transition-all active:scale-95 px-0.5 ${activeClass}"
              aria-label="${tab.label}"
            >
              <span class="material-symbols-outlined text-[20px]">${tab.icon}</span>
              <span class="font-label-sm text-[9.5px] leading-tight mt-0.5 truncate">${tab.label}</span>
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

