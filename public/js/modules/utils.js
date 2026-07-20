/**
 * utils.js — shared helpers
 * Taste Heaven & 99Chops | OneXportal
 */

/** Read the server-injected JSON config island */
export function getAppData() {
  const el = document.getElementById('thAppData');
  if (!el) return {};
  try { return JSON.parse(el.textContent); } catch { return {}; }
}

/** Display a toast notification */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" aria-hidden="true"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/** Lightweight fetch wrapper — always JSON */
export async function apiFetch(url, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
  };
  const res = await fetch(url, { ...defaults, ...options, headers: { ...defaults.headers, ...(options.headers || {}) } });
  if (!res.ok && res.status === 403) throw new Error('Forbidden');
  return res.json();
}

/** Format number as Naira */
export function formatNaira(amount) {
  return '\u20A6' + Number(amount).toLocaleString('en-NG');
}

/** Human-readable time ago */
export function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60)    return 'just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

/** Category icon (Font Awesome class) */
export function categoryIcon(cat) {
  const map = {
    'rice-meals':    'fa-bowl-rice',
    'swallow-meals': 'fa-circle-dot',
    'breakfast':     'fa-sun',
    'snacks':        'fa-cookie-bite',
    'drinks':        'fa-glass-water',
    'combo-offers':  'fa-star',
  };
  return map[cat] || 'fa-utensils';
}

/**
 * setButtonLoading — shows a spinner on a button during async work
 *
 * Usage:
 *   const done = setButtonLoading(btn);
 *   await doSomething();
 *   done();            // restores button
 *   done('error');     // restores + flashes red briefly
 *   done('success');   // restores + flashes green briefly
 */
export function setButtonLoading(btn, loadingText = '') {
  if (!btn || btn.disabled) return () => {};

  const original = btn.innerHTML;
  const originalClass = btn.className;
  const originalWidth = btn.offsetWidth;

  // Lock width so button doesn't resize
  btn.style.minWidth = originalWidth + 'px';
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.classList.add('btn-loading');

  btn.innerHTML = loadingText
    ? `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${loadingText}`
    : `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i>`;

  return function restore(state = '') {
    btn.innerHTML = original;
    btn.className = originalClass;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('btn-loading');
    btn.style.minWidth = '';

    if (state === 'success') {
      btn.classList.add('btn-flash-success');
      setTimeout(() => btn.classList.remove('btn-flash-success'), 1200);
    } else if (state === 'error') {
      btn.classList.add('btn-flash-error');
      setTimeout(() => btn.classList.remove('btn-flash-error'), 1200);
    }
  };
}