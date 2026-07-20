'use strict';

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireAuth, refreshUser } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

router.use(refreshUser, requireAuth);

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const mongoose = require('mongoose');
    const ObjectId = mongoose.Types.ObjectId;

    const [recentOrders, unreadNotifications, user, stats] = await Promise.all([
      Order.find({ customer: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status total createdAt deliveryType paymentMethod'),
      Notification.find({ recipient: userId, isRead: false })
        .sort({ createdAt: -1 })
        .limit(5),
      User.findById(userId).select('-password'),
      Order.aggregate([
        { $match: { customer: new ObjectId(userId) } },
        { $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent:  { $sum: '$total' },
          avgOrder:    { $avg: '$total' }
        }}
      ]),
    ]);

    // Guard against missing user fields
    if (!user) {
      req.session.destroy();
      return res.redirect('/auth/login');
    }

    res.render('customer/dashboard', {
      title: 'My Dashboard - Taste Heaven',
      pageTitle: 'My Dashboard',
      recentOrders,
      unreadNotifications,
      user,
      stats: stats[0] || { totalOrders: 0, totalSpent: 0, avgOrder: 0 },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('customer/dashboard', {
      title: 'My Dashboard',
      pageTitle: 'My Dashboard',
      recentOrders: [],
      unreadNotifications: [],
      user: {
        firstName: req.session.user?.firstName || 'User',
        lastName:  req.session.user?.lastName  || '',
        email:     req.session.user?.email     || '',
        phone:     req.session.user?.phone     || '',
        role:      req.session.user?.role      || 'customer',
        orderCount: 0,
        totalSpent: 0,
        createdAt: new Date(),
      },
      stats: { totalOrders: 0, totalSpent: 0, avgOrder: 0 },
    });
  }
});

// ─── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).select('-password');
    res.render('customer/profile', {
      title: 'My Profile - Taste Heaven',
      pageTitle: 'My Profile',
      user,
      errors: [],
      success: null,
    });
  } catch (err) {
    res.redirect('/customer/dashboard');
  }
});

router.post('/profile', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('phone').trim().matches(/^(\+?234|0)[789]\d{9}$/).withMessage('Valid Nigerian phone required'),
  body('defaultAddress').trim().optional(),
], async (req, res) => {
  const errors = validationResult(req);
  const user = await User.findById(req.session.user._id).select('-password');
  if (!errors.isEmpty()) {
    return res.render('customer/profile', { title: 'My Profile', pageTitle: 'My Profile', user, errors: errors.array(), success: null });
  }
  try {
    const updated = await User.findByIdAndUpdate(req.session.user._id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      defaultAddress: req.body.defaultAddress || '',
      'preferences.spiceLevel': req.body.spiceLevel || 'medium',
    }, { new: true }).select('-password');

    req.session.user.firstName = updated.firstName;
    req.session.user.lastName = updated.lastName;
    req.session.user.phone = updated.phone;

    res.render('customer/profile', { title: 'My Profile', pageTitle: 'My Profile', user: updated, errors: [], success: 'Profile updated successfully!' });
  } catch (err) {
    res.render('customer/profile', { title: 'My Profile', pageTitle: 'My Profile', user, errors: [{ msg: 'Update failed' }], success: null });
  }
});

// ─── Change Password ───────────────────────────────────────────────────────────
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.newPassword) throw new Error('Passwords do not match');
    return true;
  }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.json({ success: false, errors: errors.array() });
    const user = await User.findById(req.session.user._id).select('+password');
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) return res.json({ success: false, error: 'Current password is incorrect' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.json({ success: false, error: 'Failed to change password' });
  }
});

// ─── My Orders ────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1 } = req.query;
    const userId      = req.session.user._id;
    const perPage     = 10;
    const currentPage = parseInt(page);

    const filter = { customer: userId };
    if (status && status !== 'all') filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / perPage);

    res.render('customer/orders', {
      title:       'My Orders - Taste Heaven',
      pageTitle:   'My Orders',
      orders,
      status:      status || '',
      total,
      totalPages,
      currentPage,
    });
  } catch (err) {
    console.error('Orders error:', err);
    res.render('customer/orders', {
      title:       'My Orders',
      pageTitle:   'My Orders',
      orders:      [],
      status:      '',
      total:       0,
      totalPages:  1,
      currentPage: 1,
    });
  }
});

// ─── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .sort({ createdAt: -1 }).limit(50);
    await Notification.updateMany({ recipient: req.session.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.render('customer/notifications', {
      title: 'Notifications - Taste Heaven',
      pageTitle: 'Notifications',
      notifications,
    });
  } catch (err) {
    res.render('customer/notifications', { title: 'Notifications', pageTitle: 'Notifications', notifications: [] });
  }
});

// ─── Cart (Session-based) ──────────────────────────────────────────────────────
router.get('/cart', (req, res) => {
  res.json({ success: true, cart: req.session.cart || [] });
});

router.post('/cart/add', async (req, res) => {
  try {
    const { menuItemId, quantity = 1, spiceLevel, extraSpices, removeItems, addItems, specialInstructions } = req.body;
    const menuItem = await require('../models/MenuItem').findById(menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      return res.json({ success: false, error: 'Item not available' });
    }
    const cart = req.session.cart || [];
    const existingIndex = cart.findIndex(c => c.menuItemId === menuItemId);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += parseInt(quantity);
    } else {
      cart.push({
        menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: parseInt(quantity),
        spiceLevel: spiceLevel || 'medium',
        extraSpices: extraSpices || [],
        removeItems: removeItems || [],
        addItems: addItems || [],
        specialInstructions: specialInstructions || '',
      });
    }
    req.session.cart = cart;
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ success: true, message: `${menuItem.name} added to cart!`, cartCount, cartTotal });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add to cart' });
  }
});

router.post('/cart/remove', (req, res) => {
  const { menuItemId } = req.body;
  const cart = (req.session.cart || []).filter(c => c.menuItemId !== menuItemId);
  req.session.cart = cart;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, cartCount });
});

router.post('/cart/update', (req, res) => {
  const { menuItemId, quantity } = req.body;
  const cart = req.session.cart || [];
  const index = cart.findIndex(c => c.menuItemId === menuItemId);
  if (index > -1) {
    if (parseInt(quantity) <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = parseInt(quantity);
    }
  }
  req.session.cart = cart;
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, cartCount, cartTotal });
});

router.post('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true });
});

module.exports = router;
