/**
 * profile.js — customer profile page
 * CSP-compliant: zero inline handlers
 */
import { apiFetch, showToast, setButtonLoading } from './utils.js';

export function initProfile() {
  initChangePassword();
  initPasswordToggles();
  initPasswordStrength();
  initProfileSaveBtn();
}

/* ── Save profile button loader ─────────────────────────────── */
function initProfileSaveBtn() {
  const form = document.querySelector('form[action="/customer/profile"]');
  if (!form) return;

  form.addEventListener('submit', e => {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) setButtonLoading(btn, 'Saving...');
  });
}

/* ── Change password ─────────────────────────────────────────── */
function initChangePassword() {
  const btn = document.getElementById('changePasswordBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const current  = document.getElementById('currentPwd')?.value?.trim();
    const newP     = document.getElementById('newPwd')?.value?.trim();
    const confirm  = document.getElementById('confirmPwd')?.value?.trim();

    // Clear previous errors
    clearFieldError('currentPwd');
    clearFieldError('newPwd');
    clearFieldError('confirmPwd');

    let valid = true;

    if (!current) { setFieldError('currentPwd', 'Current password is required'); valid = false; }
    if (!newP)    { setFieldError('newPwd', 'New password is required'); valid = false; }
    if (!confirm) { setFieldError('confirmPwd', 'Please confirm your new password'); valid = false; }

    if (newP && newP.length < 8) {
      setFieldError('newPwd', 'Password must be at least 8 characters');
      valid = false;
    }
    if (newP && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newP)) {
      setFieldError('newPwd', 'Must include uppercase, lowercase and a number');
      valid = false;
    }
    if (newP && confirm && newP !== confirm) {
      setFieldError('confirmPwd', 'Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    const done = setButtonLoading(btn, 'Updating...');

    try {
      const data = await apiFetch('/customer/change-password', {
        method: 'POST',
        body:   JSON.stringify({
          currentPassword: current,
          newPassword:     newP,
          confirmPassword: confirm,
        }),
      });

      if (data.success) {
        showToast('Password changed successfully!', 'success');
        done('success');
        ['currentPwd', 'newPwd', 'confirmPwd'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        // Reset strength meter
        const bar   = document.getElementById('pwdStrengthBar');
        const label = document.getElementById('pwdStrengthLabel');
        if (bar)   { bar.style.width = '0%'; bar.style.background = 'var(--gray-light)'; }
        if (label) label.textContent = '';
      } else {
        const msg = data.error || data.errors?.[0]?.msg || 'Failed to change password';
        showToast(msg, 'error');
        done('error');
        if (msg.toLowerCase().includes('current')) {
          setFieldError('currentPwd', 'Current password is incorrect');
        }
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      done('error');
    }
  });
}

/* ── Show / hide password toggles ───────────────────────────── */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.password-input-wrap')?.querySelector('input');
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('i').className = isPassword
        ? 'fas fa-eye-slash'
        : 'fas fa-eye';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

/* ── Password strength meter ─────────────────────────────────── */
function initPasswordStrength() {
  const input = document.getElementById('newPwd');
  const bar   = document.getElementById('pwdStrengthBar');
  const label = document.getElementById('pwdStrengthLabel');
  if (!input || !bar) return;

  input.addEventListener('input', () => {
    const val      = input.value;
    const strength = getStrength(val);

    const levels = {
      0: { width: '0%',   color: 'var(--gray-light)', text: ''           },
      1: { width: '25%',  color: '#ef4444',           text: 'Weak'       },
      2: { width: '50%',  color: '#f97316',           text: 'Fair'       },
      3: { width: '75%',  color: '#eab308',           text: 'Good'       },
      4: { width: '100%', color: 'var(--green)',       text: 'Strong'     },
    };

    const level = levels[strength];
    bar.style.width      = level.width;
    bar.style.background = level.color;
    bar.style.transition = 'all 0.3s ease';
    if (label) {
      label.textContent = level.text;
      label.style.color = level.color;
    }
  });
}

function getStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)  score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

/* ── Field error helpers ─────────────────────────────────────── */
function setFieldError(id, msg) {
  const input = document.getElementById(id);
  if (!input) return;
  input.style.borderColor = 'var(--red)';
  input.style.boxShadow   = '0 0 0 3px rgba(196,30,30,0.15)';
  let err = input.nextElementSibling;
  if (!err || !err.classList.contains('field-error')) {
    err = document.createElement('span');
    err.className = 'field-error';
    err.style.cssText = 'color:var(--red);font-size:0.78rem;margin-top:4px;display:block';
    input.insertAdjacentElement('afterend', err);
  }
  err.textContent = msg;
}

function clearFieldError(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.style.borderColor = '';
  input.style.boxShadow   = '';
  const err = input.nextElementSibling;
  if (err?.classList.contains('field-error')) err.remove();
}