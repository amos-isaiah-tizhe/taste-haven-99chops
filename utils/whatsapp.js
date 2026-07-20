'use strict';

function buildWhatsAppMessage(order) {
  const lines = [];

  lines.push(`*NEW ORDER - Taste Heaven & 99Chops*`);
  lines.push(`Order #: *${order.orderNumber}*`);
  lines.push(`Name: *${order.customerName}*`);
  lines.push(`Phone: *${order.customerPhone}*`);
  lines.push(``);
  lines.push(`*ORDER ITEMS:*`);

  order.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.name} x${item.quantity}`);
    lines.push(`   NGN ${item.price.toLocaleString()} each`);
    if (item.spiceLevel && item.spiceLevel !== 'medium') {
      lines.push(`   Spice: ${item.spiceLevel}`);
    }
    if (item.extraSpices?.length) {
      lines.push(`   Extra: ${item.extraSpices.join(', ')}`);
    }
    if (item.removeItems?.length) {
      lines.push(`   Remove: ${item.removeItems.join(', ')}`);
    }
    if (item.addItems?.length) {
      lines.push(`   Add: ${item.addItems.join(', ')}`);
    }
    if (item.specialInstructions) {
      lines.push(`   Note: ${item.specialInstructions}`);
    }
  });

  lines.push(``);
  lines.push(`*Subtotal:* NGN ${order.subtotal.toLocaleString()}`);
  if (order.deliveryFee > 0) {
    lines.push(`*Delivery Fee:* NGN ${order.deliveryFee.toLocaleString()}`);
  }
  lines.push(`*TOTAL: NGN ${order.total.toLocaleString()}*`);
  lines.push(``);

  lines.push(`*Delivery Type:* ${order.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}`);
  if (order.deliveryType === 'delivery' && order.deliveryAddress) {
    lines.push(`*Address:* ${order.deliveryAddress}`);
    if (order.deliveryLandmark) {
      lines.push(`*Landmark:* ${order.deliveryLandmark}`);
    }
  }

  const scheduled = new Date(order.scheduledTime);
  const dateStr = scheduled.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = scheduled.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  lines.push(`*Scheduled Time:* ${dateStr} at ${timeStr}`);

  const paymentLabel = order.paymentMethod === 'cash' ? 'Cash'
    : order.paymentMethod === 'transfer' ? 'Bank Transfer' : 'Card (Paystack)';
  lines.push(`*Payment:* ${paymentLabel}`);

  if (order.specialInstructions) {
    lines.push(``);
    lines.push(`*Special Instructions:* ${order.specialInstructions}`);
  }

  lines.push(``);
  lines.push(`Thank you! Great Food, Great Taste, Every Time!`);
  lines.push(`- Taste Heaven & 99Chops`);

  return lines.join('\n');
}

function buildWhatsAppUrl(order, whatsappNumber) {
  const message = buildWhatsAppMessage(order);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${whatsappNumber}?text=${encoded}`;
}

module.exports = { buildWhatsAppMessage, buildWhatsAppUrl };