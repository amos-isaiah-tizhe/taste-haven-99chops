/**
 * admin.js — all admin panel interactions
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, showToast, setButtonLoading } from './utils.js';

export function initAdmin() {
  initOrderStatusSelects();
  initPaymentStatusSelects();
  initPaymentStatusDetail();
  initNotifyModal();
  initToggleAvailability();
  initDeleteButtons();
  initToggleUsers();
  initRoleSelects();
  initBroadcast();
  initAdminClock();
  initSeedMenu();
}

/* ── Live clock ─────────────────────────────────────────────── */
function initAdminClock() {
  const el = document.getElementById('adminDateTime');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleString('en-NG', {
      weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit',
    });
  };
  tick();
  setInterval(tick, 60000);
}

/* ── Order status dropdowns ─────────────────────────────────── */
function initOrderStatusSelects() {
  document.querySelectorAll('.status-select[data-order-id]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const orderId = sel.dataset.orderId;
      const status  = sel.value;
      try {
        const data = await apiFetch(`/admin/orders/${orderId}/status`, {
          method: 'POST', body: JSON.stringify({ status }),
        });
        if (data.success) {
          showToast(`Status updated to ${status.toUpperCase()}`, 'success');
          const row = document.getElementById(`order-row-${orderId}`);
          if (row && ['delivered','cancelled'].includes(status)) row.style.opacity = '0.45';
        } else {
          showToast(data.error || 'Update failed', 'error');
          location.reload();
        }
      } catch { showToast('Network error', 'error'); location.reload(); }
    });
  });
}

/* ── Payment status dropdowns (orders list) ─────────────────── */
function initPaymentStatusSelects() {
  document.querySelectorAll('.payment-status-select').forEach(select => {
    // Store initial value for revert on error
    select.dataset.previous = select.value;

    select.addEventListener('focus', () => {
      select.dataset.previous = select.value;
    });

    select.addEventListener('change', async () => {
      const orderId       = select.dataset.orderId;
      const paymentStatus = select.value;

      try {
        const res = await apiFetch(`/admin/orders/${orderId}/payment-status`, {
          method: 'POST',
          body:   JSON.stringify({ paymentStatus }),
        });

        if (res.success) {
          applyPaymentColor(select, paymentStatus);
          showToast(`Payment marked as ${paymentStatus.toUpperCase()}`, 'success');
          select.dataset.previous = paymentStatus;
        } else {
          showToast(res.error || 'Failed to update payment status', 'error');
          select.value = select.dataset.previous || 'pending';
        }
      } catch {
        showToast('Network error. Please try again.', 'error');
        select.value = select.dataset.previous || 'pending';
      }
    });
  });
}

/* ── Payment status on order detail page ────────────────────── */
function initPaymentStatusDetail() {
  const updateBtn    = document.getElementById('updatePaymentStatusBtn');
  const selectDetail = document.getElementById('paymentStatusSelect');
  if (!updateBtn || !selectDetail) return;

  updateBtn.addEventListener('click', async () => {
    const orderId       = updateBtn.dataset.orderId;
    const paymentStatus = selectDetail.value;
    const done          = setButtonLoading(updateBtn, 'Saving...');

    try {
      const res = await apiFetch(`/admin/orders/${orderId}/payment-status`, {
        method: 'POST',
        body:   JSON.stringify({ paymentStatus }),
      });

      if (res.success) {
        applyPaymentColor(selectDetail, paymentStatus);
        showToast(`Payment marked as ${paymentStatus.toUpperCase()}`, 'success');
        done('success');
      } else {
        showToast(res.error || 'Failed to update', 'error');
        done('error');
      }
    } catch {
      showToast('Network error', 'error');
      done('error');
    }
  });
}

/* ── Payment color helper ────────────────────────────────────── */
function applyPaymentColor(el, status) {
  const colors = {
    paid:     { bg: '#dcfce7', color: '#166534' },
    pending:  { bg: '#fef3c7', color: '#92400e' },
    failed:   { bg: '#fee2e2', color: '#991b1b' },
    refunded: { bg: '#eff6ff', color: '#1e40af' },
  };
  const c = colors[status] || colors.pending;
  el.style.background = c.bg;
  el.style.color      = c.color;
}

/* ── Notify customer modal ──────────────────────────────────── */
function initNotifyModal() {
  const modal    = document.getElementById('notifyModal');
  const closeBtn = document.getElementById('notifyModalClose');
  const sendBtn  = document.getElementById('notifySendBtn');
  if (!modal) return;

  document.querySelectorAll('[data-notify-order]').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.dataset.orderId = btn.dataset.notifyOrder;
      const titleEl   = document.getElementById('notifTitle');
      const messageEl = document.getElementById('notifMessage');
      if (titleEl)   titleEl.value   = '';
      if (messageEl) messageEl.value = '';
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });

  closeBtn?.addEventListener('click', closeNotifyModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeNotifyModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeNotifyModal();
  });
  sendBtn?.addEventListener('click', sendNotification);

  document.querySelectorAll('[data-notif-template]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [title, message] = btn.dataset.notifTemplate.split('||');
      const titleEl   = document.getElementById('notifTitle');
      const messageEl = document.getElementById('notifMessage');
      if (titleEl)   titleEl.value   = title   || '';
      if (messageEl) messageEl.value = message || '';
    });
  });
}

function closeNotifyModal() {
  const modal = document.getElementById('notifyModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function sendNotification() {
  const modal   = document.getElementById('notifyModal');
  const orderId = modal?.dataset.orderId;
  const title   = document.getElementById('notifTitle')?.value.trim();
  const message = document.getElementById('notifMessage')?.value.trim();
  const sendBtn = document.getElementById('notifySendBtn');
  if (!title || !message) { showToast('Title and message are required', 'error'); return; }
  const done = setButtonLoading(sendBtn, 'Sending...');
  try {
    const data = await apiFetch(`/admin/orders/${orderId}/notify-customer`, {
      method: 'POST', body: JSON.stringify({ title, message }),
    });
    if (data.success) {
      showToast('Customer notified!', 'success');
      done('success');
      closeNotifyModal();
    } else {
      showToast(data.error || 'Failed to notify', 'error');
      done('error');
    }
  } catch {
    showToast('Network error', 'error');
    done('error');
  }
}

/* ── Menu availability toggle ───────────────────────────────── */
function initToggleAvailability() {
  document.querySelectorAll('[data-toggle-item]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.dataset.toggleItem;
      const done   = setButtonLoading(btn);
      try {
        const data = await apiFetch(`/admin/menu/${itemId}/toggle`, { method: 'POST' });
        if (data.success) {
          showToast(data.message, 'success');
          const card   = btn.closest('.admin-menu-card') || btn.closest('tr');
          const status = card?.querySelector('.avail-status');
          if (status) {
            status.textContent = data.isAvailable ? 'Available' : 'Unavailable';
            status.className   = `avail-status ${data.isAvailable ? 'status-avail' : 'status-unavail'}`;
          }
          card?.classList.toggle('unavailable-row', !data.isAvailable);
          btn.innerHTML = data.isAvailable
            ? '<i class="fas fa-eye-slash" aria-hidden="true"></i> Mark Unavailable'
            : '<i class="fas fa-eye" aria-hidden="true"></i> Mark Available';
          btn.className = data.isAvailable ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success';
          done('success');
        } else {
          showToast(data.error || 'Failed', 'error');
          done('error');
        }
      } catch {
        showToast('Network error', 'error');
        done('error');
      }
    });
  });
}

/* ── Delete buttons ─────────────────────────────────────────── */
function initDeleteButtons() {
  document.querySelectorAll('[data-delete-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(btn.dataset.deleteConfirm || 'Delete this item?')) return;
      const done = setButtonLoading(btn, 'Deleting...');
      try {
        const data = await apiFetch(btn.dataset.deleteUrl, { method: 'DELETE' });
        if (data.success) {
          showToast('Deleted successfully', 'success');
          done('success');
          btn.closest('[data-deletable-row]')?.remove();
          setTimeout(() => location.reload(), 800);
        } else {
          showToast(data.error || 'Failed to delete', 'error');
          done('error');
        }
      } catch {
        showToast('Network error', 'error');
        done('error');
      }
    });
  });
}

/* ── User toggle active ─────────────────────────────────────── */
function initToggleUsers() {
  document.querySelectorAll('[data-toggle-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.toggleUser;
      const done   = setButtonLoading(btn);
      try {
        const data = await apiFetch(`/admin/users/${userId}/toggle`, { method: 'POST' });
        if (data.success) {
          showToast(`User ${data.isActive ? 'activated' : 'deactivated'}`, 'success');
          btn.textContent = data.isActive ? 'Deactivate' : 'Activate';
          btn.className   = data.isActive ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success';
          done('success');
        } else {
          showToast(data.error || 'Failed', 'error');
          done('error');
        }
      } catch {
        showToast('Network error', 'error');
        done('error');
      }
    });
  });
}

/* ── Role change selects ────────────────────────────────────── */
function initRoleSelects() {
  document.querySelectorAll('select[data-role-user]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const userId = sel.dataset.roleUser;
      const role   = sel.value;
      if (!confirm(`Change this user's role to "${role}"?`)) {
        sel.value = sel.dataset.originalRole;
        return;
      }
      try {
        const data = await apiFetch(`/admin/users/${userId}/role`, {
          method: 'POST', body: JSON.stringify({ role }),
        });
        if (data.success) {
          showToast('Role updated!', 'success');
          sel.dataset.originalRole = role;
        } else {
          showToast(data.error || 'Failed', 'error');
          sel.value = sel.dataset.originalRole;
        }
      } catch { showToast('Network error', 'error'); }
    });
  });
}

/* ── Broadcast ──────────────────────────────────────────────── */
function initBroadcast() {
  const sendBtn = document.getElementById('broadcastSendBtn');
  if (!sendBtn) return;
  sendBtn.addEventListener('click', async () => {
    const title   = document.getElementById('broadcastTitle')?.value.trim();
    const message = document.getElementById('broadcastMessage')?.value.trim();
    const target  = document.getElementById('broadcastTarget')?.value;
    if (!title || !message) { showToast('Title and message required', 'error'); return; }
    if (!confirm(`Send broadcast to ${target}?`)) return;
    const done = setButtonLoading(sendBtn, 'Sending...');
    try {
      const data = await apiFetch('/admin/notifications/broadcast', {
        method: 'POST', body: JSON.stringify({ title, message, target }),
      });
      if (data.success) {
        showToast(data.message, 'success');
        document.getElementById('broadcastTitle').value   = '';
        document.getElementById('broadcastMessage').value = '';
        done('success');
      } else {
        showToast(data.error || 'Failed', 'error');
        done('error');
      }
    } catch {
      showToast('Network error', 'error');
      done('error');
    }
  });
}

/* ── Seed menu ──────────────────────────────────────────────── */
function initSeedMenu() {
  const btn = document.getElementById('seedMenuBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!confirm('Re-seed default Taste Heaven menu items?')) return;
    const done = setButtonLoading(btn, 'Seeding...');
    try {
      const data = await apiFetch('/admin/seed-menu', { method: 'POST' });
      if (data.success) {
        showToast('Menu seeded!', 'success');
        done('success');
        setTimeout(() => location.reload(), 1000);
      } else {
        showToast(data.error || 'Seed failed', 'error');
        done('error');
      }
    } catch {
      showToast('Network error', 'error');
      done('error');
    }
  });
}