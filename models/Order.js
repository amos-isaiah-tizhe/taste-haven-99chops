'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1, max: 20 },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'spicy', 'extra-spicy', 'no-spice'],
    default: 'medium',
  },
  extraSpices: [{ type: String, trim: true }],
  removeItems: [{ type: String, trim: true }],
  addItems: [{ type: String, trim: true }],
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [300, 'Instructions cannot exceed 300 characters'],
    default: '',
  },
  subtotal: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String, required: true },

  items: [orderItemSchema],

  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  serviceFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },

  deliveryType: {
    type: String,
    enum: ['delivery', 'pickup'],
    required: true,
  },
  deliveryAddress: {
    type: String,
    trim: true,
    default: '',
  },
  deliveryLandmark: {
    type: String,
    trim: true,
    default: '',
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  estimatedDeliveryTime: {
    type: Date,
    default: null,
  },
  actualDeliveryTime: {
    type: Date,
    default: null,
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'card'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paystackReference: {
    type: String,
    default: null,
  },
  paystackData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Instructions cannot exceed 500 characters'],
    default: '',
  },

  statusHistory: [{
    status: String,
    message: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  }],

  whatsappSent: { type: Boolean, default: false },
  adminNotified: { type: Boolean, default: false },
  customerNotified: { type: Boolean, default: false },

  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, trim: true, default: '' },
    ratedAt: { type: Date, default: null },
  },

  cancelReason: { type: String, default: '' },
  refundStatus: {
    type: String,
    enum: ['none', 'requested', 'processing', 'completed'],
    default: 'none',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Pre-save: generate order number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `TH-${timestamp}-${random}`;
  }
  next();
});

// Virtual: item count
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual: formatted total
orderSchema.virtual('formattedTotal').get(function () {
  return `₦${this.total.toLocaleString('en-NG')}`;
});

// Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ scheduledTime: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
