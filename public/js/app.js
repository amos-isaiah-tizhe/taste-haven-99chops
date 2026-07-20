/**
 * app.js — main entry point (ES module)
 * Taste Heaven & 99Chops | OneXportal | OneXportalhq.com
 *
 * All event binding lives in modules.
 * Zero inline handlers. Zero eval. CSP-safe.
 */

import { initNavbar, initHeroSearch } from './modules/navbar.js';
import {
  initUserDropdown,
  initNotifications
} from './modules/user.js';
import { initCart } from './modules/cart.js';
import {
  initMenuPage,
  initRatingModal
} from './modules/menu.js';
import { initCheckout } from './modules/checkout.js';
import { initAdmin } from './modules/admin.js';
import { initAuth } from './modules/auth.js';
import { initProfile } from './modules/profile.js';
import { getAppData } from './modules/utils.js';

/* ── Scroll-reveal ──────────────────────────────────────────── */
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(
    '.menu-card, .category-card, .step-card, .why-card, .stat-card, .testimonial-card, .admin-stat-card'
  ).forEach(el => { el.classList.add('reveal'); obs.observe(el); });
}

/* ── Smooth scroll ──────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

/* ── Auto-refresh for admin dashboard (active orders) ───────── */
function initAdminAutoRefresh() {
  const isAdminDash = document.querySelector('.admin-page #order-row-pending, .admin-page .status-select');
  if (!isAdminDash) return;
  setInterval(() => {
    if (document.visibilityState === 'visible') location.reload();
  }, 60000);
}

/* ── Second modal-close binding (notifyModal close2 btn) ────── */
function initModalClose2() {
  // Admin dashboard / orders notify modal has two close buttons
  const close2 = document.getElementById('notifyModalClose2');
  const modal = document.getElementById('notifyModal');
  close2?.addEventListener('click', () => {
    modal?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  });

  // Rate modal second close
  const rateClose2 = document.getElementById('rateModalClose2');
  const rateModal = document.getElementById('rateModal');
  rateClose2?.addEventListener('click', () => {
    rateModal?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  });

  // Customize modal cancel btn (2nd button)
  const custCancel2 = document.getElementById('customizeCancelBtn2');
  const custOverlay = document.getElementById('customizeOverlay');
  custCancel2?.addEventListener('click', () => {
    custOverlay?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  });
}

/* ── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const { user } = getAppData();

  // Always
  initNavbar();
  initHeroSearch();
  initSmoothScroll();
  initScrollAnimations();
  initModalClose2();

  // Authenticated
  if (user) {
    initUserDropdown();
    initNotifications();
    initCart();
  }

  // Page-specific (each guards itself)
  initMenuPage();
  initRatingModal();
  initCheckout();
  initAuth();
  initProfile();
  initAdmin();
  initAdminAutoRefresh();

  console.log(
    '%cTaste Heaven & 99Chops',
    'font-size:18px;color:#C41E1E;font-weight:bold;'
  );
  console.log(
    '%cBuilt by Amos Isaiah Tizhe | OneXportal | OneXportalhq.com',
    'color:#E6A817;font-weight:600;'
  );
});
