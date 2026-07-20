/**
 * checkout.js — checkout page interactions
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, showToast, formatNaira } from './utils.js';
import { getAppData } from './utils.js';

export function initCheckout() {
  if (!document.getElementById('placeOrderBtn')) return;

  initDeliveryToggle();
  initPaymentToggle();
  initQuickTimes();
  initPlaceOrder();
  initPaystack();
}

/* ── Delivery type toggle ───────────────────────────────────── */
function initDeliveryToggle() {
  const deliveryRadio = document.getElementById('deliveryRadio');
  const pickupRadio   = document.getElementById('pickupRadio');
  const deliveryFields= document.getElementById('deliveryFields');
  const pickupFields  = document.getElementById('pickupFields');
  const feeNote       = document.getElementById('deliveryFeeLine');

  function toggle() {
    const isDelivery = deliveryRadio?.checked;
    if (deliveryFields) deliveryFields.hidden = !isDelivery;
    if (pickupFields)   pickupFields.hidden   =  isDelivery;
    if (feeNote)        feeNote.hidden        = !isDelivery;
  }

  deliveryRadio?.addEventListener('change', toggle);
  pickupRadio?.addEventListener('change', toggle);
  toggle(); // init
}

/* ── Payment method toggle ──────────────────────────────────── */
function initPaymentToggle() {
  const cardRadio  = document.getElementById('cardPayment');
  const cardPanel  = document.getElementById('cardPayNow');

  function toggle() {
    if (cardPanel) cardPanel.hidden = !cardRadio?.checked;
  }
  document.querySelectorAll('input[name="paymentMethod"]').forEach(r => r.addEventListener('change', toggle));
  toggle();
}

/* ── Quick time buttons ─────────────────────────────────────── */
function initQuickTimes() {
  document.querySelectorAll('[data-quick-minutes]').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = Number(btn.dataset.quickMinutes);
      const dt = new Date(Date.now() + minutes * 60 * 1000);
      const input = document.getElementById('scheduledTime');
      if (input) input.value = dt.toISOString().slice(0, 16);
    });
  });
}

/* ── Place order ────────────────────────────────────────────── */
function initPlaceOrder() {
  const btn = document.getElementById('placeOrderBtn');
  btn?.addEventListener('click', async () => {
    const payload = buildPayload();
    if (!payload) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Placing Order&hellip;';
    try {
      const data = await apiFetch('/orders/submit', { method: 'POST', body: JSON.stringify(payload) });
      if (data.success) {
        showToast('Order placed successfully!', 'success');
        window._placedOrderId = data.orderId;
        setTimeout(() => { window.location.href = `/orders/confirmation/${data.orderId}`; }, 800);
      } else {
        showToast(data.error || data.errors?.[0]?.msg || 'Failed to place order', 'error');
        resetBtn(btn);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      resetBtn(btn);
    }
  });
}

/* ── Paystack ───────────────────────────────────────────────── */
function initPaystack() {
  const btn = document.getElementById('paystackPayBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const payload = buildPayload('card');
    if (!payload) return;

    // First create the order, then invoke Paystack
    try {
      const data = await apiFetch('/orders/submit', { method: 'POST', body: JSON.stringify(payload) });
      if (!data.success) { showToast(data.error || 'Could not create order', 'error'); return; }
      window._placedOrderId = data.orderId;

      const { paystackKey, user } = getAppData();
      const handler = window.PaystackPop.setup({
        key:      paystackKey,
        email:    document.getElementById('checkoutEmail')?.value || user?.email || '',
        amount:   data.total * 100,
        currency: 'NGN',
        ref:      `TH_${Date.now()}`,
        metadata: { orderId: data.orderId },
        callback: async response => {
          const verify = await apiFetch('/orders/verify-payment', {
            method: 'POST',
            body: JSON.stringify({ reference: response.reference, orderId: data.orderId }),
          });
          if (verify.success) {
            window.location.href = `/orders/confirmation/${data.orderId}`;
          } else {
            showToast('Payment verification failed. Contact us.', 'error');
          }
        },
        onClose: () => showToast('Payment cancelled.', 'warning'),
      });
      handler.openIframe();
    } catch { showToast('Network error', 'error'); }
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
function buildPayload(forcePayment) {
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
  const paymentMethod = forcePayment || document.querySelector('input[name="paymentMethod"]:checked')?.value;
  const scheduledTime = document.getElementById('scheduledTime')?.value;
  const deliveryAddress = document.getElementById('deliveryAddress')?.value?.trim() || '';
  const deliveryLandmark= document.getElementById('deliveryLandmark')?.value?.trim() || '';
  const specialInstructions = document.getElementById('specialInstructions')?.value?.trim() || '';

  if (!scheduledTime) { showToast('Please select a scheduled time', 'error'); return null; }
  if (deliveryType === 'delivery' && !deliveryAddress) {
    showToast('Please enter your delivery address', 'error'); return null;
  }
  return { deliveryType, deliveryAddress, deliveryLandmark, scheduledTime, paymentMethod, specialInstructions };
}

function resetBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Place Order';
}
