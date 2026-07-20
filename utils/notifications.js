'use strict';

const Notification = require('../models/Notification');
const User = require('../models/User');

const NOTIFICATION_CONFIG = {
  'order-placed':           { icon: 'fa-cart-shopping',    priority: 'normal' },
  'order-confirmed':        { icon: 'fa-circle-check',     priority: 'normal' },
  'order-preparing':        { icon: 'fa-kitchen-set',      priority: 'normal' },
  'order-ready':            { icon: 'fa-bell',             priority: 'high'   },
  'order-out-for-delivery': { icon: 'fa-motorcycle',       priority: 'high'   },
  'order-delivered':        { icon: 'fa-house-chimney',    priority: 'normal' },
  'order-cancelled':        { icon: 'fa-circle-xmark',     priority: 'high'   },
  'payment-received':       { icon: 'fa-money-bill-wave',  priority: 'normal' },
  'payment-failed':         { icon: 'fa-triangle-exclamation', priority: 'urgent' },
  'new-order-admin':        { icon: 'fa-bell-concierge',   priority: 'urgent' },
  'order-status-update':    { icon: 'fa-box',              priority: 'normal' },
  'rating-received':        { icon: 'fa-star',             priority: 'low'    },
  'system-alert':           { icon: 'fa-satellite-dish',   priority: 'urgent' },
  'promo':                  { icon: 'fa-tag',              priority: 'low'    },
  'custom':                 { icon: 'fa-bullhorn',         priority: 'normal' },
};

/**
 * Create a notification for a specific user
 */
const createNotification = async ({ recipient, recipientRole = 'customer', type, title, message, order = null, actionUrl = null }) => {
  try {
    const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG['custom'];
    const notification = await Notification.create({
      recipient,
      recipientRole,
      type,
      title,
      message,
      order,
      actionUrl,
      icon: config.icon,
      priority: config.priority,
    });
    return notification;
  } catch (err) {
    console.error('Create notification error:', err);
    return null;
  }
};

/**
 * Notify all admins of a new event
 */
const notifyAllAdmins = async ({ type, title, message, order = null, actionUrl = null }) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] }, isActive: true }).select('_id');
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      recipientRole: 'admin',
      type,
      title,
      message,
      order,
      actionUrl,
      icon: NOTIFICATION_CONFIG[type]?.icon || '🔔',
      priority: NOTIFICATION_CONFIG[type]?.priority || 'normal',
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    return true;
  } catch (err) {
    console.error('Notify admins error:', err);
    return false;
  }
};

/**
 * Get unread count for a user
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ recipient: userId, isRead: false });
  } catch (err) {
    return 0;
  }
};

/**
 * Notify customer of order status change
 */
const notifyOrderStatus = async (order, status) => {
 const messages = {
  'confirmed': {
    title:   'Order Confirmed!',
    message: `Your order #${order.orderNumber} has been confirmed. We are preparing it now!`,
  },
  'preparing': {
    title:   'Cooking in Progress',
    message: `Your order #${order.orderNumber} is being freshly prepared. Sit tight!`,
  },
  'ready': {
    title:   'Your Order is Ready!',
    message: `Order #${order.orderNumber} is ready! ${order.deliveryType === 'pickup' ? 'You can pick it up now.' : 'Our rider is on the way!'}`,
  },
  'out-for-delivery': {
    title:   'Order On the Way!',
    message: `Your order #${order.orderNumber} is on its way to you. Please be available.`,
  },
  'delivered': {
    title:   'Order Delivered!',
    message: `Order #${order.orderNumber} has been delivered. Enjoy your meal! Please rate us.`,
  },
  'cancelled': {
    title:   'Order Cancelled',
    message: `Your order #${order.orderNumber} has been cancelled. ${order.cancelReason || ''}`,
  },
};

  const msgConfig = messages[status];
  if (!msgConfig) return;

  await createNotification({
    recipient: order.customer,
    recipientRole: 'customer',
    type: `order-${status}`,
    title: msgConfig.title,
    message: msgConfig.message,
    order: order._id,
    actionUrl: `/orders/${order._id}`,
  });
};

/**
 * Notify admins of new order
 */
const notifyNewOrder = async (order) => {
  await notifyAllAdmins({
    type: 'new-order-admin',
    title: `New Order: #${order.orderNumber}`,
    message: `${order.customerName} placed an order of ${order.formattedTotal || '₦' + order.total.toLocaleString()}. ${order.deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} - ${order.paymentMethod.toUpperCase()}`,
    order: order._id,
    actionUrl: `/admin/orders/${order._id}`,
  });
};

module.exports = {
  createNotification,
  notifyAllAdmins,
  getUnreadCount,
  notifyOrderStatus,
  notifyNewOrder,
};
