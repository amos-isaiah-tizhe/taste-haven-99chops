/**
 * profile.js — customer profile page
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, showToast } from './utils.js';

export function initProfile() {
  initChangePassword();
}

function initChangePassword() {
  const btn = document.getElementById('changePasswordBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const current = document.getElementById('currentPwd')?.value;
    const newP    = document.getElementById('newPwd')?.value;
    const confirm = document.getElementById('confirmPwd')?.value;
    if (!current || !newP || !confirm) { showToast('All fields are required', 'error'); return; }
    if (newP !== confirm)  { showToast('New passwords do not match', 'error'); return; }
    if (newP.length < 8)   { showToast('Password must be at least 8 characters', 'error'); return; }

    try {
      const data = await apiFetch('/customer/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: newP, confirmPassword: confirm }),
      });
      if (data.success) {
        showToast('Password changed successfully!', 'success');
        ['currentPwd','newPwd','confirmPwd'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
      } else {
        showToast(data.error || data.errors?.[0]?.msg || 'Failed to change password', 'error');
      }
    } catch { showToast('Network error', 'error'); }
  });
}
