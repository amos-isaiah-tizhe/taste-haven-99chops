'use strict';

const nodemailer = require('nodemailer');

/* ── Transporter ─────────────────────────────────────────────── */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,   // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

/* ── Base HTML template ──────────────────────────────────────── */
function baseTemplate({ title, preheader, body }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#f5f5f5; color:#1a1a1a; }
    .wrapper { max-width:600px; margin:0 auto; background:#ffffff; }
    .header  { background:#C41E1E; padding:28px 32px; text-align:center; }
    .header-logo { font-size:24px; font-weight:800; color:#ffffff; letter-spacing:0.5px; }
    .header-sub  { color:rgba(255,255,255,0.8); font-size:13px; margin-top:4px; }
    .body    { padding:32px; }
    .footer  { background:#1a1a1a; padding:20px 32px; text-align:center; }
    .footer p { color:rgba(255,255,255,0.5); font-size:12px; line-height:1.6; }
    .footer a { color:#E6A817; text-decoration:none; }
    .btn {
      display:inline-block; background:#C41E1E; color:#ffffff !important;
      padding:13px 28px; border-radius:6px; font-weight:700;
      font-size:15px; text-decoration:none; margin:16px 0;
    }
    .btn-green { background:#16a34a; }
    .btn-wa    { background:#25D366; }
    .status-box {
      border-radius:8px; padding:16px 20px; margin:20px 0;
      border-left:4px solid #C41E1E; background:#fff5f5;
    }
    .status-box.green  { border-color:#16a34a; background:#f0fff4; }
    .status-box.gold   { border-color:#E6A817; background:#fffbeb; }
    .status-box.blue   { border-color:#2563eb; background:#eff6ff; }
    .items-table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
    .items-table th { background:#f5f5f5; padding:10px 12px; text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; }
    .items-table td { padding:10px 12px; border-bottom:1px solid #f0f0f0; }
    .price { font-weight:700; color:#C41E1E; }
    .total-row td { font-weight:800; font-size:16px; border-top:2px solid #e5e7eb; padding-top:14px; }
    .divider { border:none; border-top:1px solid #e5e7eb; margin:20px 0; }
    .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:14px; }
    .label { color:#6b7280; }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">&#127859; Taste Heaven &amp; 99Chops</div>
      <div class="header-sub">Great Food, Great Taste, Every Time!</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>
        Taste Heaven &amp; 99Chops &bull; Low-cost, behind youth center, Keffi, Nasarawa<br/>
        <a href="tel:08136975564">08136975564</a> &bull;
        <a href="https://wa.me/2348136975564">WhatsApp Us</a>
      </p>
      <p style="margin-top:8px">
        Built by <a href="https://onexportalhq.com">Amos Isaiah Tizhe | OneXportal</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/* ── Send helper ─────────────────────────────────────────────── */
async function sendEmail({ to, subject, html }) {
  // Skip if email not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email] Not configured — skipping: ${subject}`);
    return false;
  }

  try {
    const from = process.env.EMAIL_FROM
      || `Taste Heaven & 99Chops <${process.env.EMAIL_USER}>`;

    await getTransporter().sendMail({ from, to, subject, html });
    console.log(`[Email] Sent: "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}

/* ── Format helpers ──────────────────────────────────────────── */
function formatNaira(amount) {
  return `&#8358;${Number(amount || 0).toLocaleString('en-NG')}`;
}

function formatDate(date) {
  return new Date(date).toLocaleString('en-NG', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ══════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
══════════════════════════════════════════════════════════════ */

/* ── 1. Order Confirmation ───────────────────────────────────── */
async function sendOrderConfirmation(order, customer) {
  const itemsRows = order.items.map(item => `
    <tr>
      <td>${item.name}${item.spiceLevel && item.spiceLevel !== 'medium' ? ` <small style="color:#6b7280">(${item.spiceLevel})</small>` : ''}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right" class="price">${formatNaira(item.subtotal)}</td>
    </tr>
  `).join('');

  const deliveryInfo = order.deliveryType === 'delivery'
    ? `<p style="margin-top:6px;color:#1a1a1a">${order.deliveryAddress || 'Address not specified'}</p>`
    : `<p style="margin-top:6px;color:#1a1a1a">Low-cost, behind youth center, Keffi</p>`;

  const html = baseTemplate({
    title:     `Order Confirmed — #${order.orderNumber}`,
    preheader: `Your order #${order.orderNumber} has been received! Total: ₦${order.total.toLocaleString()}`,
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">Order Received!</h1>
      <p style="color:#6b7280;margin-bottom:20px">Hi ${customer.firstName}, thank you for ordering from us.</p>

      <div class="status-box gold">
        <strong>Order #${order.orderNumber}</strong><br/>
        <span style="color:#6b7280;font-size:13px">Placed on ${formatDate(order.createdAt)}</span>
      </div>

      <!-- Items -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          ${order.deliveryFee > 0 ? `
          <tr>
            <td colspan="2" class="label">Delivery Fee</td>
            <td style="text-align:right">${formatNaira(order.deliveryFee)}</td>
          </tr>` : ''}
          <tr class="total-row">
            <td colspan="2">Total</td>
            <td style="text-align:right" class="price">${formatNaira(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <hr class="divider" />

      <!-- Order Info -->
      <div class="info-row"><span class="label">Delivery Type</span><span>${order.deliveryType === 'delivery' ? 'Home Delivery' : 'Pickup'}</span></div>
      <div class="info-row"><span class="label">${order.deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}</span></div>
      ${deliveryInfo}
      <div class="info-row" style="margin-top:8px"><span class="label">Scheduled Time</span><span>${formatDate(order.scheduledTime)}</span></div>
      <div class="info-row"><span class="label">Payment Method</span><span>${order.paymentMethod === 'cash' ? 'Cash' : order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Card (Paystack)'}</span></div>

      <hr class="divider" />

      <!-- CTA -->
      <p style="margin-bottom:8px">Confirm your order on WhatsApp to speed up preparation:</p>
      <a href="https://wa.me/${process.env.WHATSAPP_NUMBER || '2348136975564'}" class="btn btn-wa">
        Chat on WhatsApp
      </a>
      <br/>
      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/customer/orders" class="btn">
        Track My Order
      </a>
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: `Order Confirmed — #${order.orderNumber} | Taste Heaven`,
    html,
  });
}

/* ── 2. Order Status Update ──────────────────────────────────── */
async function sendOrderStatusUpdate(order, customer, status) {
  const statusConfig = {
    confirmed:          { label: 'Confirmed',        color: 'blue',  icon: '&#10003;', msg: 'Your order has been confirmed. We are getting started on your meal!' },
    preparing:          { label: 'Being Prepared',   color: 'gold',  icon: '&#128293;', msg: 'Our kitchen is preparing your order fresh right now. Won\'t be long!' },
    ready:              { label: 'Ready!',            color: 'green', icon: '&#127859;', msg: order.deliveryType === 'pickup' ? 'Your order is ready for pickup!' : 'Your order is ready and our rider is on the way!' },
    'out-for-delivery': { label: 'On the Way',       color: 'blue',  icon: '&#128690;', msg: 'Your order is on its way! Please be available to receive it.' },
    delivered:          { label: 'Delivered',         color: 'green', icon: '&#127881;', msg: 'Your order has been delivered. Enjoy your meal! Please take a moment to rate your experience.' },
    cancelled:          { label: 'Cancelled',         color: '',      icon: '&#10007;',  msg: `Your order has been cancelled. ${order.cancelReason || ''}` },
  };

  const cfg = statusConfig[status];
  if (!cfg) return;

  const showRateBtn = status === 'delivered';

  const html = baseTemplate({
    title:     `Order ${cfg.label} — #${order.orderNumber}`,
    preheader: `Order #${order.orderNumber} is ${cfg.label}. ${cfg.msg}`,
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">Order ${cfg.label}</h1>
      <p style="color:#6b7280;margin-bottom:20px">Hi ${customer.firstName}, here's an update on your order.</p>

      <div class="status-box ${cfg.color}">
        <div style="font-size:24px;margin-bottom:6px">${cfg.icon}</div>
        <strong>Order #${order.orderNumber}</strong><br/>
        <p style="color:#4b5563;margin-top:6px">${cfg.msg}</p>
      </div>

      <div class="info-row"><span class="label">Order Total</span><strong class="price">${formatNaira(order.total)}</strong></div>
      <div class="info-row"><span class="label">Scheduled Time</span><span>${formatDate(order.scheduledTime)}</span></div>

      <br/>
      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/customer/orders" class="btn">
        View Order Details
      </a>

      ${showRateBtn ? `
      <br/>
      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/customer/orders" class="btn btn-green" style="margin-left:8px">
        Rate Your Experience
      </a>` : ''}
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: `Order ${cfg.label} — #${order.orderNumber} | Taste Heaven`,
    html,
  });
}

/* ── 3. Payment Confirmed ────────────────────────────────────── */
async function sendPaymentConfirmed(order, customer) {
  const html = baseTemplate({
    title:     `Payment Confirmed — #${order.orderNumber}`,
    preheader: `Payment of ₦${order.total.toLocaleString()} confirmed for order #${order.orderNumber}`,
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">Payment Confirmed!</h1>
      <p style="color:#6b7280;margin-bottom:20px">Hi ${customer.firstName}, we've received your payment.</p>

      <div class="status-box green">
        <strong>&#10003; Payment Received</strong><br/>
        <span style="color:#4b5563">Amount: <strong>${formatNaira(order.total)}</strong></span><br/>
        <span style="color:#4b5563">Order: <strong>#${order.orderNumber}</strong></span>
      </div>

      <div class="info-row"><span class="label">Payment Method</span><span>${order.paymentMethod === 'cash' ? 'Cash' : order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Card (Paystack)'}</span></div>
      <div class="info-row"><span class="label">Date</span><span>${formatDate(new Date())}</span></div>

      <br/>
      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/customer/orders" class="btn">
        Track My Order
      </a>
    `,
  });

  return sendEmail({
    to:      customer.email,
    subject: `Payment Confirmed — #${order.orderNumber} | Taste Heaven`,
    html,
  });
}

/* ── 4. New Order — Admin Alert ──────────────────────────────── */
async function sendNewOrderAdminAlert(order, adminEmail) {
  const itemsList = order.items.map(i =>
    `<li>${i.name} x${i.quantity} — ${formatNaira(i.subtotal)}</li>`
  ).join('');

  const html = baseTemplate({
    title:     `New Order #${order.orderNumber}`,
    preheader: `New order from ${order.customerName} — ₦${order.total.toLocaleString()}`,
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">New Order Received!</h1>
      <p style="color:#6b7280;margin-bottom:20px">A new order has been placed and needs your attention.</p>

      <div class="status-box">
        <strong>Order #${order.orderNumber}</strong><br/>
        <span style="color:#6b7280">${formatDate(new Date())}</span>
      </div>

      <div class="info-row"><span class="label">Customer</span><strong>${order.customerName}</strong></div>
      <div class="info-row"><span class="label">Phone</span><span>${order.customerPhone || 'N/A'}</span></div>
      <div class="info-row"><span class="label">Type</span><span>${order.deliveryType === 'delivery' ? 'Home Delivery' : 'Pickup'}</span></div>
      <div class="info-row"><span class="label">Payment</span><span>${order.paymentMethod.toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Total</span><strong class="price">${formatNaira(order.total)}</strong></div>
      ${order.deliveryAddress ? `<div class="info-row"><span class="label">Address</span><span>${order.deliveryAddress}</span></div>` : ''}

      <br/>
      <strong>Items:</strong>
      <ul style="margin:10px 0 16px 16px;line-height:2">${itemsList}</ul>

      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin/orders/${order._id}" class="btn">
        View Order in Admin
      </a>
    `,
  });

  return sendEmail({
    to:      adminEmail,
    subject: `New Order #${order.orderNumber} — ₦${order.total.toLocaleString()} | Taste Heaven`,
    html,
  });
}

/* ── 5. Welcome Email ────────────────────────────────────────── */
async function sendWelcomeEmail(user) {
  const html = baseTemplate({
    title:     'Welcome to Taste Heaven & 99Chops!',
    preheader: `Welcome ${user.firstName}! Your account is ready. Start ordering delicious Nigerian meals.`,
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">
        Welcome, ${user.firstName}!
      </h1>
      <p style="color:#6b7280;margin-bottom:24px">
        Your account has been created. You're now ready to order authentic Nigerian meals from Taste Heaven & 99Chops.
      </p>

      <div class="status-box green">
        <strong>Account Created Successfully</strong><br/>
        <span style="color:#4b5563">Email: ${user.email}</span>
      </div>

      <p style="margin-bottom:8px"><strong>What you can do:</strong></p>
      <ul style="margin:0 0 20px 16px;line-height:2.2;color:#4b5563">
        <li>Browse our full menu of 22+ Nigerian dishes</li>
        <li>Customize your spice level and ingredients</li>
        <li>Order for delivery or pickup in Keffi</li>
        <li>Track your order in real time</li>
        <li>Pay by cash, bank transfer, or card</li>
      </ul>

      <a href="${process.env.SITE_URL || 'http://localhost:3000'}/menu" class="btn">
        Browse Our Menu
      </a>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: `Welcome to Taste Heaven & 99Chops, ${user.firstName}!`,
    html,
  });
}

/* ── 6. Password Reset (future use) ─────────────────────────── */
async function sendPasswordReset(user, resetToken) {
  const resetUrl = `${process.env.SITE_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;

  const html = baseTemplate({
    title:     'Reset Your Password',
    preheader: 'You requested a password reset. Click the link to set a new password.',
    body: `
      <h1 style="font-size:22px;font-weight:800;margin-bottom:4px">Reset Your Password</h1>
      <p style="color:#6b7280;margin-bottom:24px">Hi ${user.firstName}, we received a request to reset your password.</p>

      <div class="status-box gold">
        <strong>This link expires in 1 hour</strong><br/>
        <span style="color:#6b7280;font-size:13px">If you didn't request this, ignore this email.</span>
      </div>

      <a href="${resetUrl}" class="btn">Reset My Password</a>

      <p style="margin-top:16px;font-size:13px;color:#9ca3af">
        Or copy this link:<br/>
        <a href="${resetUrl}" style="color:#C41E1E;word-break:break-all">${resetUrl}</a>
      </p>
    `,
  });

  return sendEmail({
    to:      user.email,
    subject: 'Reset Your Password — Taste Heaven',
    html,
  });
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendPaymentConfirmed,
  sendNewOrderAdminAlert,
  sendWelcomeEmail,
  sendPasswordReset,
};