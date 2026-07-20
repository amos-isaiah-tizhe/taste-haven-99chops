'use strict';

const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

// ─── Public: Menu API ──────────────────────────────────────────────────────────
router.get('/menu', async (req, res) => {
  try {
    const { category, available = 'true' } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (available) filter.isAvailable = available === 'true';
    const items = await MenuItem.find(filter).sort({ sortOrder: 1 }).select('name price category isAvailable isFeatured image description tags');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch menu' });
  }
});

// ─── Public: Single Item ───────────────────────────────────────────────────────
router.get('/menu/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── Public: Check Order Status ────────────────────────────────────────────────
router.get('/order-status/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .select('orderNumber status createdAt estimatedDeliveryTime actualDeliveryTime statusHistory deliveryType');
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
