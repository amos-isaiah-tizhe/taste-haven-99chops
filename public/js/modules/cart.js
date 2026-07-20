/**
 * cart.js — sidebar cart: open/close, render, add/remove/update
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, showToast, formatNaira, categoryIcon, setButtonLoading } from './utils.js';

export function initCart() {
  const toggle   = document.getElementById('cartToggle');
  if (!toggle) return; // not logged in

  const sidebar  = document.getElementById('cartSidebar');
  const overlay  = document.getElementById('cartOverlay');
  const closeBtn = document.getElementById('cartClose');
  const clearBtn = document.getElementById('clearCartBtn');

  toggle.addEventListener('click',  openCart);
  closeBtn?.addEventListener('click', closeCart);
  overlay?.addEventListener('click',  closeCart);

  clearBtn?.addEventListener('click', async () => {
  if (!confirm('Clear all items from your cart?')) return;
  const done = setButtonLoading(clearBtn, 'Clearing...');
  try {
    await apiFetch('/customer/cart/clear', { method: 'POST' });
    updateBadge(0);
    renderCart();
    showToast('Cart cleared', 'info');
    done('success');
  } catch {
    showToast('Failed to clear cart', 'error');
    done('error');
  }
});

  // Render badge on page load
  refreshBadge();

  function openCart() {
    sidebar?.removeAttribute('aria-hidden');
    sidebar?.classList.add('open');
    overlay?.removeAttribute('aria-hidden');
    overlay?.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    renderCart();
  }

  function closeCart() {
    sidebar?.setAttribute('aria-hidden', 'true');
    sidebar?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    overlay?.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

// Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeCart();
  });
}

export async function renderCart() {
  const body        = document.getElementById('cartItems');
  const empty       = document.getElementById('cartEmpty');
  const footer      = document.getElementById('cartFooter');
  const totalDisplay= document.getElementById('cartTotalDisplay');
  const badge       = document.getElementById('cartBadge');
  if (!body) return;

  try {
    const data  = await apiFetch('/customer/cart');
    const items = data.cart || [];
    const qty   = items.reduce((s, i) => s + i.quantity, 0);
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    updateBadge(qty);

    if (items.length === 0) {
      empty?.removeAttribute('hidden');
      body.innerHTML = '';
      footer?.setAttribute('hidden', '');
      return;
    }

    empty?.setAttribute('hidden', '');
    footer?.removeAttribute('hidden');
    if (totalDisplay) totalDisplay.textContent = formatNaira(total);

    body.innerHTML = items.map(item => `
      <div class="cart-item" role="listitem" data-item-id="${item.menuItemId}">
        <div class="cart-item-icon" aria-hidden="true">
          <i class="fas ${categoryIcon(item.category || '')}"></i>
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatNaira(item.price)} each</div>
          ${item.spiceLevel && item.spiceLevel !== 'medium'
            ? `<div class="cart-item-spice"><i class="fas fa-pepper-hot" aria-hidden="true"></i> ${item.spiceLevel}</div>`
            : ''}
          <div class="cart-item-controls" role="group" aria-label="Quantity controls for ${item.name}">
            <button class="cart-qty-btn" data-id="${item.menuItemId}" data-delta="-1" aria-label="Decrease quantity">
              <i class="fas fa-minus" aria-hidden="true"></i>
            </button>
            <span class="cart-item-qty" aria-live="polite">${item.quantity}</span>
            <button class="cart-qty-btn" data-id="${item.menuItemId}" data-delta="1" aria-label="Increase quantity">
              <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
            <span class="cart-item-subtotal">${formatNaira(item.price * item.quantity)}</span>
          </div>
        </div>
        <button class="cart-item-remove" data-id="${item.menuItemId}" aria-label="Remove ${item.name} from cart">
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
        </button>
      </div>
    `).join('');

    // Bind quantity buttons
body.querySelectorAll('.cart-qty-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id    = btn.dataset.id;
    const item  = items.find(i => i.menuItemId === id);
    if (!item) return;
    const newQty = item.quantity + parseInt(btn.dataset.delta);
    const done = setButtonLoading(btn);
    try {
      const res = await apiFetch('/customer/cart/update', {
        method: 'POST',
        body: JSON.stringify({ menuItemId: id, quantity: newQty }),
      });
      updateBadge(res.cartCount);
      done('success');
      renderCart();
    } catch {
      showToast('Failed to update quantity', 'error');
      done('error');
    }
  });
});

    // Bind remove buttons
body.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const done = setButtonLoading(btn);

        try {
            const res = await apiFetch('/customer/cart/remove', {
                method: 'POST',
                body: JSON.stringify({ menuItemId: id }),
            });

            updateBadge(res.cartCount);
            showToast('Item removed from cart', 'info');
            done('success');
            renderCart();
        } catch {
            showToast('Failed to remove item', 'error');
            done('error');
        }
    });
});

} catch {
    showToast('Failed to load cart', 'error');
}
}

export async function addToCart(menuItemId, name, price, options = {}, triggerBtn = null) {
  const done = triggerBtn ? setButtonLoading(triggerBtn, 'Adding...') : () => {};
  try {
    const data = await apiFetch('/customer/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        menuItemId,
        quantity:            options.quantity            || 1,
        spiceLevel:          options.spiceLevel          || 'medium',
        extraSpices:         options.extraSpices         || [],
        removeItems:         options.removeItems         || [],
        addItems:            options.addItems            || [],
        specialInstructions: options.specialInstructions || '',
      }),
    });
    if (data.success) {
      updateBadge(data.cartCount);
      showToast(`${name} added to cart!`, 'success');
      done('success');
      renderCart();
    } else {
      showToast(data.error || 'Failed to add to cart', 'error');
      done('error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
    done('error');
  }
}

function updateBadge(count) {
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = count;
}

async function refreshBadge() {
  try {
    const data = await apiFetch('/customer/cart');
    const qty  = (data.cart || []).reduce((s, i) => s + i.quantity, 0);
    updateBadge(qty);
  } catch { /* silent */ }
}