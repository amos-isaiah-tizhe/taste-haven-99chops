'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: '',
  },
  aspects: {
    food: { type: Number, min: 1, max: 5, default: null },
    delivery: { type: Number, min: 1, max: 5, default: null },
    packaging: { type: Number, min: 1, max: 5, default: null },
    value: { type: Number, min: 1, max: 5, default: null },
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  adminReply: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

reviewSchema.index({ customer: 1, order: 1 }, { unique: true });
reviewSchema.index({ menuItem: 1 });
reviewSchema.index({ rating: -1 });

module.exports = mongoose.model('Review', reviewSchema);
