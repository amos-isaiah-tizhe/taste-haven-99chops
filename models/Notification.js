'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientRole: {
    type: String,
    enum: ['customer', 'admin', 'superadmin', 'all-admins'],
    default: 'customer',
  },
  type: {
    type: String,
    enum: [
      'order-placed',
      'order-confirmed',
      'order-preparing',
      'order-ready',
      'order-out-for-delivery',
      'order-delivered',
      'order-cancelled',
      'payment-received',
      'payment-failed',
      'new-order-admin',
      'order-status-update',
      'rating-received',
      'system-alert',
      'promo',
      'custom',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  actionUrl: {
    type: String,
    default: null,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },
  icon: {
    type: String,
    default: 'fa-bell',
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
}, {
  timestamps: true,
});

// Auto-expire notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
