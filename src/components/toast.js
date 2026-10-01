// Toast Notification Component

export function showToast(message, type = 'success', duration = 2500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  let bgClass = 'bg-primary-container text-surface-bright border border-on-tertiary-container/30';
  let icon = 'check_circle';
  let iconColor = 'text-emerald-400';

  if (type === 'error') {
    bgClass = 'bg-error text-white';
    icon = 'error';
    iconColor = 'text-white';
  } else if (type === 'info') {
    bgClass = 'bg-secondary text-white';
    icon = 'info';
    iconColor = 'text-amber-300';
  }

  toast.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg ${bgClass} text-sm font-medium transition-all pointer-events-auto select-none`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] ${iconColor}">${icon}</span>
    <span class="truncate max-w-[280px]">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, duration);
}
