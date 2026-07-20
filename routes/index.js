'use strict';

const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { refreshUser } = require('../middleware/auth');

router.use(refreshUser);

// ─── Home Page ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [featuredItems, categories, recentReviews, stats] = await Promise.all([
      MenuItem.find({ isAvailable: true, isFeatured: true }).sort({ sortOrder: 1 }).limit(8),
      MenuItem.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, availableCount: { $sum: { $cond: ['$isAvailable', 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
      Review.find({ isApproved: true }).populate('customer', 'firstName lastName avatar').sort({ createdAt: -1 }).limit(6),
      Order.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]),
    ]);

    const categoryLabels = {
'rice-meals':    { label: 'Rice Meals',    icon: 'fa-bowl-rice'   },
'swallow-meals': { label: 'Swallow Meals', icon: 'fa-circle-dot'  },
'breakfast':     { label: 'Breakfast',     icon: 'fa-sun'         },
'snacks':        { label: 'Snacks',        icon: 'fa-cookie-bite' },
'drinks':        { label: 'Drinks',        icon: 'fa-glass-water' },
'combo-offers': { label: 'Combo Offers', icon: 'fa-star' },
    };

    res.render('index', {
      title: 'Taste Heaven & 99Chops - Great Food, Great Taste, Every Time!',
      pageTitle: 'Home',
      featuredItems,
      categories: categories.map(c => ({ ...c, ...categoryLabels[c._id] })),
      recentReviews,
      orderCount: stats[0]?.total || 0,
      categoryLabels,
    });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'Taste Heaven & 99Chops', pageTitle: 'Home', featuredItems: [], categories: [], recentReviews: [], orderCount: 0, categoryLabels: {} });
  }
});

// ─── About Page ────────────────────────────────────────────────────────────────
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us - Taste Heaven & 99Chops', pageTitle: 'About Us' });
});

// ─── Contact Page ──────────────────────────────────────────────────────────────
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us - Taste Heaven & 99Chops', pageTitle: 'Contact Us' });
});

// ─── Health Check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Taste Heaven & 99Chops' });
});

module.exports = router;
