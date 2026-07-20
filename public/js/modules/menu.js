/**
 * menu.js — menu page interactions
 * Customise modal, add-to-cart, category tab filter
 * CSP-compliant: zero inline handlers
 */
import { showToast, getAppData, setButtonLoading  } from './utils.js';
import { addToCart } from './cart.js';

export function initMenuPage() {
  // Run on every page — homepage has Add buttons too
  initAddToCartButtons();

  // Customize modal only initializes if its HTML exists on the page
  if (document.getElementById('customizeOverlay')) {
    initCustomizeModal();
  }
}

/* ── Add-to-cart buttons (simple, no customisation) ─────────── */
function initAddToCartButtons() {
  document.querySelectorAll('.btn-add-cart[data-item-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { user } = getAppData();
      if (!user) { showToast('Please log in to add items', 'warning'); return; }
      const id      = btn.dataset.itemId;
      const name    = btn.dataset.itemName;
      const price   = Number(btn.dataset.itemPrice);
      const hasOpts = btn.dataset.hasOptions === 'true';
      const hasSpice= btn.dataset.spiceOptions === 'true';
      if (hasOpts || hasSpice) {
        openCustomizeModal({ id, name, price,
          options: JSON.parse(btn.dataset.options.replace(/&quot;/g, '"') || '[]'),
          spiceOptions: hasSpice,
        });
      } else {
        // Pass btn so addToCart can show the loader on it
        addToCart(id, name, price, {}, btn);
      }
    });
  });
}

/* ── Customise modal ─────────────────────────────────────────── */
let currentItem = null;
let currentQty  = 1;
let currentRating = 0;

function initCustomizeModal() {
  const overlay    = document.getElementById('customizeOverlay');
  const closeBtn   = document.getElementById('customizeCloseBtn');
  const cancelBtn  = document.getElementById('customizeCancelBtn2');
  const confirmBtn = document.getElementById('customizeConfirmBtn');
  const qtyDec     = document.getElementById('customizeQtyDec');
  const qtyInc     = document.getElementById('customizeQtyInc');
  if (!overlay) return;

  closeBtn?.addEventListener('click', closeCustomizeModal);
  cancelBtn?.addEventListener('click', closeCustomizeModal);
  confirmBtn?.addEventListener('click', confirmCustomize);
  qtyDec?.addEventListener('click', () => setQty(currentQty - 1));
  qtyInc?.addEventListener('click', () => setQty(currentQty + 1));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCustomizeModal();
  });

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeCustomizeModal();
  });
}

export function openCustomizeModal({ id, name, price, options = [], spiceOptions = true }) {
  currentItem = { id, name, price, options, spiceOptions };
  currentQty  = 1;

  const overlay    = document.getElementById('customizeOverlay');
  const titleEl    = document.getElementById('customizeItemName');
  const priceEl    = document.getElementById('customizeItemPrice');
  const totalEl    = document.getElementById('customizeTotalPrice');
  const qtyEl      = document.getElementById('customizeQty');
  const spiceGroup = document.getElementById('customizeSpiceGroup');
  const optsWrap   = document.getElementById('customizeOptions');
  const instrEl    = document.getElementById('customizeInstructions');
  if (!overlay) return;

  if (titleEl) titleEl.textContent = name;
  if (priceEl) priceEl.textContent = '\u20A6' + price.toLocaleString('en-NG');
  if (totalEl) totalEl.textContent = '\u20A6' + price.toLocaleString('en-NG');
  if (qtyEl)   qtyEl.textContent   = 1;
  if (instrEl) instrEl.value       = '';

  // Spice level default
  const mediumRadio = overlay.querySelector('input[name="spiceLevel"][value="medium"]');
  if (mediumRadio) mediumRadio.checked = true;
  if (spiceGroup) spiceGroup.hidden = !spiceOptions;

  // Dynamic customisation options
  if (optsWrap) {
    optsWrap.innerHTML = '';
    options.forEach(opt => {
      const typeLabel = { add:'Add', remove:'Remove', extra:'Extra', reduce:'Reduce' }[opt.type] || opt.label;
      const iconMap   = { add:'fa-plus-circle', remove:'fa-minus-circle', extra:'fa-circle-plus', reduce:'fa-circle-minus' };
      const icon      = iconMap[opt.type] || 'fa-sliders';
      const group     = document.createElement('div');
      group.className = 'customize-group';
      group.innerHTML = `
        <span class="customize-label">
          <i class="fas ${icon}" aria-hidden="true"></i> ${typeLabel}: ${opt.label}
        </span>
        <div class="customize-checkboxes">
          ${opt.items.map(item => `
            <label class="check-opt">
              <input type="checkbox" name="opt_${opt.type}" value="${item}" />
              <span>${item}</span>
            </label>
          `).join('')}
        </div>
      `;
      optsWrap.appendChild(group);
    });
  }

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  titleEl?.focus();
}

function closeCustomizeModal() {
  const overlay = document.getElementById('customizeOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  currentItem = null;
}

function setQty(val) {
  currentQty = Math.max(1, Math.min(20, val));
  const qtyEl   = document.getElementById('customizeQty');
  const totalEl = document.getElementById('customizeTotalPrice');
  if (qtyEl)   qtyEl.textContent   = currentQty;
  if (totalEl && currentItem) {
    totalEl.textContent = '\u20A6' + (currentItem.price * currentQty).toLocaleString('en-NG');
  }
}

async function confirmCustomize() {
  if (!currentItem) return;

  const confirmBtn = document.getElementById('customizeConfirmBtn');
  const done = setButtonLoading(confirmBtn, 'Adding...');

  const overlay = document.getElementById('customizeOverlay');
  const spiceLevel = overlay?.querySelector('input[name="spiceLevel"]:checked')?.value || 'medium';
  const extraSpices = [...(overlay?.querySelectorAll('input[name="opt_extra"]:checked') || [])].map(el => el.value);
  const removeItems = [...(overlay?.querySelectorAll('input[name="opt_remove"]:checked') || [])].map(el => el.value);
  const addItems    = [...(overlay?.querySelectorAll('input[name="opt_add"]:checked')    || [])].map(el => el.value);
  const specialInstructions = document.getElementById('customizeInstructions')?.value || '';

  await addToCart(currentItem.id, currentItem.name, currentItem.price, {
    quantity: currentQty, spiceLevel, extraSpices, removeItems, addItems, specialInstructions,
  });

  done();
  closeCustomizeModal();
}

/* ── Rating modal (My Orders page) ──────────────────────────── */
export function initRatingModal() {
  const modal   = document.getElementById('rateModal');
  const closeBtn= document.getElementById('rateModalClose');
  const submitBtn= document.getElementById('rateSubmitBtn');
  if (!modal) return;

  closeBtn?.addEventListener('click',  closeRateModal);
  submitBtn?.addEventListener('click', submitRating);
  modal.addEventListener('click', e => { if (e.target === modal) closeRateModal(); });

  // Star buttons
  modal.querySelectorAll('.star-input').forEach(star => {
    star.addEventListener('click', () => {
      currentRating = Number(star.dataset.val);
      modal.querySelectorAll('.star-input').forEach((s, i) => {
        s.setAttribute('aria-pressed', i < currentRating ? 'true' : 'false');
        s.querySelector('i').className = i < currentRating ? 'fas fa-star' : 'far fa-star';
      });
    });
  });

  // Trigger buttons on orders list
  document.querySelectorAll('[data-rate-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.dataset.orderId = btn.dataset.rateOrder;
      currentRating = 0;
      modal.querySelectorAll('.star-input i').forEach(i => i.className = 'far fa-star');
      const comment = document.getElementById('ratingComment');
      if (comment) comment.value = '';
      modal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    });
  });
}

function closeRateModal() {
  const modal = document.getElementById('rateModal');
  modal?.setAttribute('hidden', '');
  document.body.style.overflow = '';
  currentRating = 0;
}

async function submitRating() {
  const modal   = document.getElementById('rateModal');
  const orderId = modal?.dataset.orderId;
  if (!orderId || !currentRating) { showToast('Please select a star rating', 'error'); return; }
  const comment = document.getElementById('ratingComment')?.value || '';
  try {
    const { apiFetch } = await import('./utils.js');
    const data = await apiFetch(`/orders/${orderId}/rate`, {
      method: 'POST', body: JSON.stringify({ rating: currentRating, comment }),
    });
    if (data.success) {
      showToast('Thank you for your rating!', 'success');
      closeRateModal();
      setTimeout(() => location.reload(), 1200);
    } else {
      showToast(data.error || 'Failed to submit rating', 'error');
    }
  } catch { showToast('Network error', 'error'); }
}
