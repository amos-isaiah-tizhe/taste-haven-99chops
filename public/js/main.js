/**
 * TASTE HEAVEN & 99CHOPS — Main JavaScript
 * Author: Amos Isaiah Tizhe | OneXportal | OneXportalhq.com
 * 2026
 */

'use strict';

/* ─── Toast Notification System ─────────────────────────────── */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
 const icons = {
  success: '<i class="fas fa-circle-check"></i>',
  error:   '<i class="fas fa-circle-xmark"></i>',
  warning: '<i class="fas fa-triangle-exclamation"></i>',
  info:    '<i class="fas fa-circle-info"></i>',
};
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ─── Navbar Scroll Effect ───────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
    } else {
      navbar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
  }, { passive: true });
})();

/* ─── Mobile Menu ────────────────────────────────────────────── */
(function initMobileMenu() {
  const toggle   = document.getElementById('mobileToggle');
  const icon     = document.getElementById('mobileToggleIcon');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  function openMenu() {
    navLinks.classList.add('mobile-open');
    if (icon) icon.className = 'fas fa-times';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navLinks.classList.remove('mobile-open');
    if (icon) icon.className = 'fas fa-bars';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    navLinks.classList.contains('mobile-open') ? closeMenu() : openMenu();
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', e => {
    if (navLinks.classList.contains('mobile-open') &&
        !navLinks.contains(e.target) &&
        !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
      closeMenu();
    }
  });
})();

/* ─── Search Bar ─────────────────────────────────────────────── */
(function initSearch() {
  const searchToggle = document.getElementById('searchToggle');
  const searchBar = document.getElementById('searchBar');
  const searchClose = document.getElementById('searchClose');
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');
  if (!searchToggle || !searchBar) return;

  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('open');
    if (searchBar.classList.contains('open')) searchInput?.focus();
  });
  searchClose?.addEventListener('click', () => {
    searchBar.classList.remove('open');
    if (searchResults) { searchResults.innerHTML = ''; searchResults.classList.remove('has-results'); }
  });

  let searchTimeout;
  searchInput?.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    const q = this.value.trim();
    if (q.length < 2) {
      searchResults.innerHTML = '';
      searchResults.classList.remove('has-results');
      return;
    }
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/menu/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          searchResults.innerHTML = data.items.map(item => `
            <div class="search-result-item" onclick="window.location.href='/menu/item/${item._id}'">
              <div>
                <strong>${item.name}</strong>
                <div style="font-size:0.78rem;color:var(--gray)">${item.category.replace('-', ' ')}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:700;color:var(--red)">₦${item.price.toLocaleString('en-NG')}</span>
                ${item.isAvailable
              ? '<span style="font-size:0.72rem;color:var(--green);font-weight:600">Available</span>'
              : '<span style="font-size:0.72rem;color:var(--gray)">Unavailable</span>'}
              </div>
            </div>
          `).join('');
          searchResults.classList.add('has-results');
        } else {
          searchResults.innerHTML = '<div class="search-result-item"><span style="color:var(--gray)">No items found for "' + q + '"</span></div>';
          searchResults.classList.add('has-results');
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 350);
  });

  document.addEventListener('click', e => {
    if (!searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
      searchBar.classList.remove('open');
    }
  });
})();

/* ─── Notification Dropdown ──────────────────────────────────── */
(function initNotifications() {
  const toggle = document.getElementById('notifToggle');
  const dropdown = document.getElementById('notifDropdown');
  const badge = document.getElementById('notifBadge');
  if (!toggle || !dropdown) return;

  let loaded = false;

  toggle.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open') && !loaded) {
      await loadNotifications();
      loaded = true;
    }
  });

  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  async function loadNotifications() {
    try {
      const res = await fetch('/notifications/recent');
      const data = await res.json();
      const list = document.getElementById('notifList');
      if (!list) return;
      if (data.notifications && data.notifications.length > 0) {
        list.innerHTML = data.notifications.map(n => `
          <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="handleNotifClick('${n._id}', '${n.order || ''}')">
            <div class="notif-item-icon"><i class="fas ${n.icon || 'fa-bell'}" aria-hidden="true"></i></div>
            <div class="notif-item-body">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-msg">${n.message}</div>
              <div class="notif-item-time">${timeAgo(new Date(n.createdAt))}</div>
            </div>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash" aria-hidden="true"></i> No notifications yet</div>';
      }
    } catch (err) {
      console.error('Notification load error:', err);
    }
  }

  // Poll for unread count every 30s
  async function updateBadge() {
    try {
      const res = await fetch('/notifications/count');
      const data = await res.json();
      if (badge) {
        if (data.count > 0) {
          badge.style.display = 'flex';
          badge.textContent = data.count > 99 ? '99+' : data.count;
        } else {
          badge.style.display = 'none';
        }
      }
    } catch (err) { }
  }

  updateBadge();
  setInterval(updateBadge, 30000);

  window.handleNotifClick = async (notifId, orderId) => {
    try {
      await fetch(`/notifications/${notifId}/read`, { method: 'POST' });
      loaded = false;
      if (orderId) window.location.href = `/orders/${orderId}`;
    } catch (err) { }
  };

  window.markAllNotificationsRead = async () => {
    try {
      await fetch('/notifications/mark-all-read', { method: 'POST' });
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      if (badge) badge.style.display = 'none';
      showToast('All notifications marked as read', 'success');
    } catch (err) { }
  };
})();

/* ─── Cart System ────────────────────────────────────────────── */
(function initCart() {
  const cartToggle = document.getElementById('cartToggle');
  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');
  if (!cartToggle) return;

  cartToggle.addEventListener('click', openCart);
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  function openCart() {
    cartSidebar?.classList.add('open');
    cartOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
  }

  window.closeCart = function () {
    cartSidebar?.classList.remove('open');
    cartOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Fetch and render cart
  window.renderCart = async function () {
    try {
      const res = await fetch('/customer/cart');
      const data = await res.json();
      const items = data.cart || [];
      const badge = document.getElementById('cartBadge');
      const cartBody = document.getElementById('cartItems');
      const cartEmpty = document.getElementById('cartEmpty');
      const cartFooter = document.getElementById('cartFooter');
      const totalDisplay = document.getElementById('cartTotalDisplay');

      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      const totalPrice = items.reduce((s, i) => s + (i.price * i.quantity), 0);

      if (badge) badge.textContent = totalQty;

      if (items.length === 0) {
        if (cartEmpty) cartEmpty.style.display = 'block';
        if (cartBody) cartBody.innerHTML = '';
        if (cartFooter) cartFooter.style.display = 'none';
      } else {
        if (cartEmpty) cartEmpty.style.display = 'none';
        if (cartFooter) cartFooter.style.display = 'block';
        if (totalDisplay) totalDisplay.textContent = '₦' + totalPrice.toLocaleString('en-NG');
        if (cartBody) {
          cartBody.innerHTML = items.map(item => `
            <div class="cart-item" id="cart-item-${item.menuItemId}">
              <div class="cart-item-icon">
                ${item.name.toLowerCase().includes('drink') || item.name.toLowerCase().includes('malt') || item.name.toLowerCase().includes('water') ? '🥤' :
              item.name.toLowerCase().includes('puff') || item.name.toLowerCase().includes('chin') || item.name.toLowerCase().includes('pie') ? '🧁' : '🍽️'}
              </div>
              <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₦${item.price.toLocaleString('en-NG')} each</div>
                ${item.spiceLevel && item.spiceLevel !== 'medium' ? `<div style="font-size:0.75rem;color:var(--gray)">🌶️ ${item.spiceLevel}</div>` : ''}
                <div class="cart-item-controls">
                  <button onclick="updateCartQty('${item.menuItemId}', ${item.quantity - 1})">−</button>
                  <span class="cart-item-qty">${item.quantity}</span>
                  <button onclick="updateCartQty('${item.menuItemId}', ${item.quantity + 1})">+</button>
                  <span style="margin-left:auto;font-weight:700;color:var(--red)">₦${(item.price * item.quantity).toLocaleString('en-NG')}</span>
                </div>
              </div>
              <button class="cart-item-remove" onclick="removeFromCart('${item.menuItemId}')" title="Remove">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Cart render error:', err);
    }
  };

  // Init badge on load
  window.renderCart();
})();

/* ─── Cart Actions ───────────────────────────────────────────── */
window.addToCart = async function (menuItemId, name, price, options = {}) {
  if (!window.TH_USER) {
    showToast('Please login to add items to cart', 'warning');
    setTimeout(() => window.location.href = '/auth/login', 1200);
    return;
  }
  try {
    const res = await fetch('/customer/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menuItemId,
        quantity: options.quantity || 1,
        spiceLevel: options.spiceLevel || 'medium',
        extraSpices: options.extraSpices || [],
        removeItems: options.removeItems || [],
        addItems: options.addItems || [],
        specialInstructions: options.specialInstructions || '',
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${name} added to cart!`, 'success');
      const badge = document.getElementById('cartBadge');
      if (badge) badge.textContent = data.cartCount;
      window.renderCart?.();
    } else {
      showToast(data.error || 'Failed to add to cart', 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  }
};

window.removeFromCart = async function (menuItemId) {
  try {
    const res = await fetch('/customer/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuItemId }),
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('cartBadge');
      if (badge) badge.textContent = data.cartCount;
      window.renderCart?.();
    }
  } catch (err) {
    showToast('Failed to remove item', 'error');
  }
};

window.updateCartQty = async function (menuItemId, quantity) {
  try {
    const res = await fetch('/customer/cart/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuItemId, quantity }),
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('cartBadge');
      if (badge) badge.textContent = data.cartCount;
      window.renderCart?.();
    }
  } catch (err) {
    showToast('Failed to update cart', 'error');
  }
};

window.clearCart = async function () {
  if (!confirm('Clear all items from cart?')) return;
  try {
    await fetch('/customer/cart/clear', { method: 'POST' });
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = '0';
    window.renderCart?.();
    showToast('Cart cleared', 'info');
  } catch (err) { }
};

/* ─── User Dropdown ──────────────────────────────────────────── */
(function initUserDropdown() {
  const btn = document.getElementById('userMenuToggle');
  const menu = document.getElementById('userDropdownMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => { if (menu) menu.style.display = 'none'; });
})();

/* ─── Time Ago Utility ───────────────────────────────────────── */
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

/* ─── Admin: Toggle Menu Availability ───────────────────────── */
window.toggleMenuAvailability = async function (itemId, btn) {
  try {
    btn.disabled = true;
    const res = await fetch(`/admin/menu/${itemId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      const card = btn.closest('.menu-admin-card') || btn.closest('tr');
      if (card) {
        card.classList.toggle('unavailable-row', !data.isAvailable);
        const statusEl = card.querySelector('.avail-status');
        if (statusEl) {
          statusEl.textContent = data.isAvailable ? 'Available' : 'Unavailable';
          statusEl.className = `avail-status ${data.isAvailable ? 'status-avail' : 'status-unavail'}`;
        }
        btn.textContent = data.isAvailable ? 'Mark Unavailable' : 'Mark Available';
        btn.className = data.isAvailable ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success';
      }
    } else {
      showToast(data.error || 'Failed to toggle', 'error');
    }
    btn.disabled = false;
  } catch (err) {
    showToast('Network error', 'error');
    btn.disabled = false;
  }
};

/* ─── Smooth Scroll ──────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ─── Form Validation Helpers ────────────────────────────────── */
window.validatePhone = function (phone) {
  return /^(\+?234|0)[789]\d{9}$/.test(phone);
};

/* ─── Intersection Observer for Animations ───────────────────── */
(function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.menu-card, .category-card, .step-card, .why-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
})();

/* ─── Confirm Delete Prompt ──────────────────────────────────── */
window.confirmDelete = function (url, message = 'Are you sure you want to delete this?') {
  if (confirm(message)) {
    fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .then(d => {
        if (d.success) { showToast('Deleted successfully', 'success'); setTimeout(() => location.reload(), 1000); }
        else showToast(d.error || 'Delete failed', 'error');
      })
      .catch(() => showToast('Network error', 'error'));
  }
};

console.log('%c🍽️ Taste Heaven & 99Chops', 'font-size:20px;color:#C41E1E;font-weight:bold;');
console.log('%cBuilt by Amos Isaiah Tizhe | OneXportal | OneXportalhq.com', 'color:#E6A817;font-weight:600;');
