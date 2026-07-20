'use strict';

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['rice-meals', 'swallow-meals', 'breakfast', 'snacks', 'drinks', 'combo-offers'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  image: {
    type: String,
    default: null,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isCombo: {
    type: Boolean,
    default: false,
  },
  comboItems: [{
    type: String,
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
  allergens: [{
    type: String,
    trim: true,
  }],
  spiceOptions: {
    type: Boolean,
    default: true,
  },
  customizationOptions: [{
    label: String,
    type: {
      type: String,
      enum: ['add', 'remove', 'reduce', 'extra'],
    },
    items: [String],
  }],
  orderCount: {
    type: Number,
    default: 0,
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  prepTime: {
    type: Number, // minutes
    default: 15,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: formatted price
menuItemSchema.virtual('formattedPrice').get(function () {
  return `₦${this.price.toLocaleString('en-NG')}`;
});

// Pre-save: generate slug
menuItemSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now();
  }
  next();
});

// Indexes
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ isFeatured: 1 });
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
