/**
 * user.js — user dropdown + notification bell
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, timeAgo, showToast } from './utils.js';

export function initUserDropdown() {
  const btn  = document.getElementById('userMenuToggle');
  const menu = document.getElementById('userDropdownMenu');
  if (!btn || !menu) return;

  // Remove hidden attribute — let CSS control visibility via .open class
  menu.removeAttribute('hidden');
  menu.style.display = 'none';

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  btn.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

export function initNotifications() {
  const toggle   = document.getElementById('notifToggle');
  const dropdown = document.getElementById('notifDropdown');
  const badge    = document.getElementById('notifBadge');
  const markBtn  = document.getElementById('markAllReadBtn');
  if (!toggle) return;

  let loaded = false;

  // Remove hidden — use display style directly like the user dropdown
  dropdown?.removeAttribute('hidden');
  if (dropdown) dropdown.style.display = 'none';

  toggle.addEventListener('click', async e => {
    e.stopPropagation();
    if (!dropdown) return;
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen && !loaded) {
      await loadNotifications();
      loaded = true;
    }
  });

  document.addEventListener('click', e => {
    if (dropdown && !toggle.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  markBtn?.addEventListener('click', async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' });
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      if (badge) badge.style.display = 'none';
      showToast('All notifications marked as read', 'success');
      loaded = false;
    } catch { showToast('Failed to mark notifications', 'error'); }
  });

  // Start polling after 5s delay so page loads first
setTimeout(() => {
  pollBadge();
  setInterval(pollBadge, 60000); // every 60s instead of 30s
}, 5000);

async function pollBadge() {
  try {
    // Abort if takes longer than 8 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res  = await fetch('/notifications/count', { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return;
    const data = await res.json();

    if (!badge) return;
    if (data.count > 0) {
      badge.style.display = 'flex';
      badge.textContent = data.count > 99 ? '99+' : data.count;
    } else {
      badge.style.display = 'none';
    }
  } catch { /* silent — network error or aborted */ }
}

  async function loadNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    try {
      const data = await apiFetch('/notifications/recent');
      if (data.notifications?.length) {
        list.innerHTML = data.notifications.map(n => `
          <a class="notif-item ${n.isRead ? '' : 'unread'}"
             href="${n.order ? `/orders/${n.order}` : '#'}"
             role="listitem"
             data-notif-id="${n._id}">
            <span class="notif-item-icon" aria-hidden="true">
              <i class="fas ${notifIcon(n.type)}"></i>
            </span>
            <div class="notif-item-body">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-msg">${n.message}</div>
              <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
            </div>
          </a>
        `).join('');
        list.querySelectorAll('[data-notif-id]').forEach(el => {
          el.addEventListener('click', async () => {
            const id = el.dataset.notifId;
            try { await apiFetch(`/notifications/${id}/read`, { method: 'POST' }); } catch { }
          });
        });
      } else {
        list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" aria-hidden="true"></i> No notifications yet</div>';
      }
    } catch {
      list.innerHTML = '<div class="notif-empty">Failed to load notifications</div>';
    }
  }
}

function notifIcon(type) {
  const map = {
    'order-placed':           'fa-cart-shopping',
    'order-confirmed':        'fa-circle-check',
    'order-preparing':        'fa-kitchen-set',
    'order-ready':            'fa-bell',
    'order-out-for-delivery': 'fa-motorcycle',
    'order-delivered':        'fa-house-chimney',
    'order-cancelled':        'fa-circle-xmark',
    'payment-received':       'fa-money-bill-wave',
    'payment-failed':         'fa-triangle-exclamation',
    'new-order-admin':        'fa-bell-concierge',
    'order-status-update':    'fa-box',
    'rating-received':        'fa-star',
    'system-alert':           'fa-satellite-dish',
    'promo':                  'fa-tag',
    'custom':                 'fa-bullhorn',
  };
  return map[type] || 'fa-bell';
}
