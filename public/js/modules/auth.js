/**
 * auth.js — login & register page interactions
 * CSP-compliant: zero inline handlers
 */

export function initAuth() {
  initPasswordToggles();
  initPasswordStrength();
}

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    const targetId = btn.dataset.togglePassword;
    const input    = document.getElementById(targetId);
    const icon     = btn.querySelector('i');
    if (!input || !icon) return;
    btn.addEventListener('click', () => {
      const isText = input.type === 'text';
      input.type   = isText ? 'password' : 'text';
      icon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
      btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
    });
  });
}

function initPasswordStrength() {
  const input = document.getElementById('password');
  const bar   = document.getElementById('passwordStrengthBar');
  const label = document.getElementById('passwordStrengthLabel');
  if (!input || !bar || !label) return;

  input.addEventListener('input', () => {
    const v      = input.value;
    let strength = 0;
    if (v.length >= 8)             strength++;
    if (/[A-Z]/.test(v))           strength++;
    if (/[a-z]/.test(v))           strength++;
    if (/\d/.test(v))              strength++;
    if (/[^A-Za-z0-9]/.test(v))   strength++;

    const colours = ['', '#ef4444','#f97316','#eab308','#22c55e','#16a34a'];
    const labels  = ['', 'Very Weak','Weak','Fair','Strong','Very Strong'];

    bar.style.width      = v.length ? `${strength * 20}%` : '0%';
    bar.style.background = colours[strength] || '#e5e7eb';
    label.textContent    = v.length ? labels[strength] : '';
    label.style.color    = colours[strength] || 'inherit';
  });
}
