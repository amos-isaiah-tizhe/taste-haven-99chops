/**
 * navbar.js — all navigation interactions
 * CSP-compliant: zero inline handlers
 */
import { apiFetch } from './utils.js';

export function initNavbar() {
  initMobileMenu();
  initDropdowns();
  initSearch();
  initScrollEffect();
  initFlash();
}

/* ── Scroll shadow ─────────────────────────────────────────── */
function initScrollEffect() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const onScroll = () => {
    navbar.style.boxShadow = window.scrollY > 40
      ? '0 4px 24px rgba(0,0,0,0.15)'
      : '0 2px 8px rgba(0,0,0,0.08)';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ── Mobile menu ───────────────────────────────────────────── */
function initMobileMenu() {
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

  // Close when a nav link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (navLinks.classList.contains('mobile-open') &&
        !navLinks.contains(e.target) &&
        !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
      closeMenu();
    }
  });
}

/* ── Category dropdown ─────────────────────────────────────── */
function initDropdowns() {
  const btn  = document.getElementById('catDropdownBtn');
  const menu = document.getElementById('catDropdownMenu');
  if (!btn || !menu) return;

  // Remove hidden — control with display style directly
  menu.removeAttribute('hidden');
  menu.style.display = 'none';

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    menu.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  const dropdownEl = btn.closest('.dropdown');
  if (dropdownEl) {
    dropdownEl.addEventListener('mouseenter', () => {
      menu.style.display = 'block';
      btn.setAttribute('aria-expanded', 'true');
    });
    dropdownEl.addEventListener('mouseleave', () => {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    });
  }

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

/* ── Search ────────────────────────────────────────────────── */
function initSearch() {
  const toggle  = document.getElementById('searchToggle');
  const bar     = document.getElementById('searchBar');
  const input   = document.getElementById('globalSearch');
  const close   = document.getElementById('searchClose');
  const results = document.getElementById('searchResults');
  if (!toggle || !bar) return;

  // Control visibility with style.display — consistent with all other dropdowns
  bar.style.display = 'none';

  function openSearch() {
    bar.style.display = 'block';
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close search');
    input?.focus();
  }

  function closeSearch() {
    bar.style.display = 'none';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open search');
    if (results) {
      results.style.display = 'none';
      results.innerHTML = '';
    }
    if (input) input.value = '';
  }

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    bar.style.display === 'block' ? closeSearch() : openSearch();
  });

  close?.addEventListener('click', closeSearch);

  input?.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = input.value.trim();
      if (q.length >= 1) window.location.href = `/menu?search=${encodeURIComponent(q)}`;
    }
  });

  document.addEventListener('click', e => {
    if (bar.style.display === 'block' &&
        !bar.contains(e.target) &&
        !toggle.contains(e.target)) {
      closeSearch();
    }
  });

  let timer;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      if (results) results.style.display = 'none';
      return;
    }
    timer = setTimeout(() => runSearch(q), 350);
  });

  async function runSearch(q) {
    if (!results) return;
    results.innerHTML = `
      <div class="search-result-item search-no-result">
        <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Searching&hellip;
      </div>`;
    results.style.display = 'block';

    try {
      const data = await apiFetch(`/menu/api/search?q=${encodeURIComponent(q)}`);
      if (data.items?.length) {
        results.innerHTML = data.items.map(item => `
          <a class="search-result-item" href="/menu/item/${item._id}" role="option">
            <div>
              <strong>${item.name}</strong>
              <div class="search-result-cat">${item.category.replace(/-/g, ' ')}</div>
            </div>
            <div class="search-result-right">
              <span class="search-result-price">&#8358;${item.price.toLocaleString('en-NG')}</span>
              <span class="search-result-avail ${item.isAvailable ? 'avail-yes' : 'avail-no'}">
                ${item.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </a>
        `).join('') + `
          <a class="search-result-see-all" href="/menu?search=${encodeURIComponent(q)}">
            <i class="fas fa-list" aria-hidden="true"></i>
            See all results for &ldquo;${q}&rdquo;
          </a>
        `;
      } else {
        results.innerHTML = `
          <div class="search-result-item search-no-result">
            <i class="fas fa-search" aria-hidden="true"></i>
            No results for &ldquo;${q}&rdquo;
          </div>`;
      }
      results.style.display = 'block';
    } catch {
      results.innerHTML = `
        <div class="search-result-item search-no-result">
          <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
          Search failed. Please try again.
        </div>`;
    }
  }
}
/* ── Flash dismiss ─────────────────────────────────────────── */
function initFlash() {
  const flash = document.getElementById('flashMsg');
  const btn   = document.getElementById('flashClose');
  if (!flash) return;
  btn?.addEventListener('click', () => flash.remove());
  setTimeout(() => flash?.remove(), 5000);
}

/* ── Hero search → global search bridge ─────────────────────── */
export function initHeroSearch() {
  const heroInput   = document.getElementById('heroSearchInput');
  const heroBtn     = document.getElementById('heroSearchBtn');
  const resultsBox  = document.getElementById('heroSearchResults');
  if (!heroInput) return;

  // Search on button click
  heroBtn?.addEventListener('click', () => {
    const q = heroInput.value.trim();
    if (q.length < 1) {
      heroInput.focus();
      return;
    }
    if (q.length < 2) {
      showHeroResults([]);
      return;
    }
    runHeroSearch(q);
  });

  // Search as user types
  let timer;
  heroInput.addEventListener('input', () => {
    clearTimeout(timer);
    const q = heroInput.value.trim();
    if (q.length < 2) {
      if (resultsBox) resultsBox.style.display = 'none';
      return;
    }
    timer = setTimeout(() => runHeroSearch(q), 350);
  });

  // Enter key triggers search
  heroInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = heroInput.value.trim();
      if (q.length >= 1) {
        // Navigate to menu search page
        window.location.href = `/menu?search=${encodeURIComponent(q)}`;
      }
    }
    if (e.key === 'Escape') {
      if (resultsBox) resultsBox.style.display = 'none';
    }
  });

  // Close results when clicking outside
  document.addEventListener('click', e => {
    if (resultsBox &&
        !heroInput.contains(e.target) &&
        !heroBtn?.contains(e.target) &&
        !resultsBox.contains(e.target)) {
      resultsBox.style.display = 'none';
    }
  });

  async function runHeroSearch(q) {
    if (!resultsBox) return;
    resultsBox.innerHTML = '<div class="hero-search-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Searching&hellip;</div>';
    resultsBox.style.display = 'block';

    try {
      const res  = await fetch(`/menu/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      showHeroResults(data.items || [], q);
    } catch {
      resultsBox.innerHTML = '<div class="hero-search-error"><i class="fas fa-exclamation-circle" aria-hidden="true"></i> Search failed. Try again.</div>';
    }
  }

  function showHeroResults(items, q = '') {
    if (!resultsBox) return;
    if (items.length === 0) {
      resultsBox.innerHTML = `
        <div class="hero-search-empty">
          <i class="fas fa-search" aria-hidden="true"></i>
          No results for &ldquo;${q}&rdquo;
          <a href="/menu" class="hero-search-browse">Browse full menu</a>
        </div>`;
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.innerHTML = items.map(item => `
      <a class="hero-search-item" href="/menu/item/${item._id}" role="option">
        <div class="hero-search-item-icon" aria-hidden="true">
          <i class="fas ${categoryIconMap(item.category)}"></i>
        </div>
        <div class="hero-search-item-info">
          <span class="hero-search-item-name">${item.name}</span>
          <span class="hero-search-item-cat">${item.category.replace(/-/g, ' ')}</span>
        </div>
        <div class="hero-search-item-right">
          <span class="hero-search-item-price">&#8358;${item.price.toLocaleString('en-NG')}</span>
          <span class="hero-search-avail ${item.isAvailable ? 'avail-yes' : 'avail-no'}">
            ${item.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </a>
    `).join('') + `
      <a class="hero-search-see-all" href="/menu?search=${encodeURIComponent(q)}">
        <i class="fas fa-list" aria-hidden="true"></i>
        See all results for &ldquo;${q}&rdquo;
      </a>
    `;
    resultsBox.style.display = 'block';
  }

  function categoryIconMap(cat) {
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
}