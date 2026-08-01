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
  const modal     = document.getElementById('rateModal');
  const closeBtn  = document.getElementById('rateModalClose');
  const closeBtn2 = document.getElementById('rateModalClose2');
  const submitBtn = document.getElementById('rateSubmitBtn');
  if (!modal) return;

  let currentRating = 0;
  let currentOrderId = null;
  const aspectRatings = { food: 0, delivery: 0, packaging: 0, value: 0 };

  const rateLabels = {
    1: 'Poor — we\'ll do better',
    2: 'Fair — room to improve',
    3: 'Good — pretty satisfied',
    4: 'Great — really enjoyed it!',
    5: 'Excellent — absolutely loved it!',
  };

  // Open modal when Rate Order button clicked
  document.querySelectorAll('[data-rate-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentOrderId = btn.dataset.rateOrder;
      currentRating  = 0;
      Object.keys(aspectRatings).forEach(k => aspectRatings[k] = 0);

      // Set order number in modal
      const orderNum = btn.dataset.orderNum || '';
      const numEl = document.getElementById('rateOrderNum');
      if (numEl) numEl.textContent = `#${orderNum}`;

      // Reset stars
      modal.querySelectorAll('.star-input i').forEach(i => i.className = 'far fa-star');
      modal.querySelectorAll('.star-input').forEach(s => s.setAttribute('aria-pressed', 'false'));
      modal.querySelectorAll('.aspect-star').forEach(s => {
        s.style.color = 'var(--gray-light)';
        s.setAttribute('aria-pressed', 'false');
      });

      // Reset label, comment, char count
      const label = document.getElementById('rateLabel');
      if (label) label.textContent = 'Tap a star to rate';
      const comment = document.getElementById('ratingComment');
      if (comment) comment.value = '';
      const charCount = document.getElementById('charCount');
      if (charCount) charCount.textContent = '0 / 500 characters';

      // Open modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });

  // Overall star rating
  modal.querySelectorAll('.star-input').forEach(star => {
    star.addEventListener('click', () => {
      currentRating = Number(star.dataset.val);
      const label   = document.getElementById('rateLabel');
      if (label) label.textContent = rateLabels[currentRating] || '';

      modal.querySelectorAll('.star-input').forEach((s, i) => {
        const filled = i < currentRating;
        s.querySelector('i').className = filled ? 'fas fa-star' : 'far fa-star';
        s.querySelector('i').style.color = filled ? 'var(--gold)' : '';
        s.setAttribute('aria-pressed', filled ? 'true' : 'false');
      });
    });

    // Hover preview
    star.addEventListener('mouseenter', () => {
      const val = Number(star.dataset.val);
      modal.querySelectorAll('.star-input').forEach((s, i) => {
        s.querySelector('i').style.color = i < val ? 'var(--gold)' : 'var(--gray-light)';
      });
    });
    star.addEventListener('mouseleave', () => {
      modal.querySelectorAll('.star-input').forEach((s, i) => {
        const filled = i < currentRating;
        s.querySelector('i').style.color = filled ? 'var(--gold)' : '';
      });
    });
  });

  // Aspect star ratings
  modal.querySelectorAll('.aspect-star').forEach(star => {
    star.addEventListener('click', () => {
      const aspect = star.dataset.aspect;
      const val    = Number(star.dataset.val);
      aspectRatings[aspect] = val;

      // Update that aspect's stars
      modal.querySelectorAll(`.aspect-star[data-aspect="${aspect}"]`).forEach((s, i) => {
        s.style.color = i < val ? 'var(--gold)' : 'var(--gray-light)';
        s.setAttribute('aria-pressed', i < val ? 'true' : 'false');
      });
    });

    star.addEventListener('mouseenter', () => {
      const aspect = star.dataset.aspect;
      const val    = Number(star.dataset.val);
      modal.querySelectorAll(`.aspect-star[data-aspect="${aspect}"]`).forEach((s, i) => {
        s.style.color = i < val ? 'var(--gold)' : 'var(--gray-light)';
      });
    });
    star.addEventListener('mouseleave', () => {
      const aspect = star.dataset.aspect;
      const current = aspectRatings[aspect] || 0;
      modal.querySelectorAll(`.aspect-star[data-aspect="${aspect}"]`).forEach((s, i) => {
        s.style.color = i < current ? 'var(--gold)' : 'var(--gray-light)';
      });
    });
  });

  // Character counter
  document.getElementById('ratingComment')?.addEventListener('input', e => {
    const len = e.target.value.length;
    const el  = document.getElementById('charCount');
    if (el) {
      el.textContent = `${len} / 500 characters`;
      el.style.color = len > 450 ? 'var(--red)' : 'var(--gray-2)';
    }
  });

  // Close
  function closeRateModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentOrderId = null;
    currentRating  = 0;
  }

  closeBtn?.addEventListener('click', closeRateModal);
  closeBtn2?.addEventListener('click', closeRateModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeRateModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeRateModal();
  });

  // Submit
  submitBtn?.addEventListener('click', async () => {
    if (!currentRating) {
      showToast('Please select a star rating', 'error');
      return;
    }

    const comment = document.getElementById('ratingComment')?.value?.trim() || '';
    const done    = setButtonLoading(submitBtn, 'Submitting...');

    try {
      const data = await apiFetch(`/orders/${currentOrderId}/rate`, {
        method: 'POST',
        body:   JSON.stringify({
          rating:  currentRating,
          comment,
          aspects: aspectRatings,
        }),
      });

      if (data.success) {
        showToast('Thank you for your feedback!', 'success');
        done('success');

        // Update button in the list to show rated state
        const rateBtn = document.querySelector(`[data-rate-order="${currentOrderId}"]`);
        if (rateBtn) {
          rateBtn.outerHTML = `
            <div style="display:flex;align-items:center;gap:4px;font-size:0.82rem;color:var(--gold);font-weight:600">
              ${'<i class="fas fa-star"></i>'.repeat(currentRating)}
              <span style="color:var(--gray);margin-left:4px">Rated</span>
            </div>`;
        }

        setTimeout(closeRateModal, 800);
      } else {
        showToast(data.error || 'Failed to submit rating', 'error');
        done('error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      done('error');
    }
  });
}