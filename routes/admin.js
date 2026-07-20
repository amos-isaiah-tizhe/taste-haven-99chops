'use strict';

// ─── Admin Routes ─────────────────────────────────────────────────────────────

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cache = require('../utils/cache');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/images/menu');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only JPG, PNG and WebP images are allowed'));
  },
});

// Export middleware for routes

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const { requireAdmin, requireSuperAdmin, refreshUser } = require('../middleware/auth');
const { notifyOrderStatus, createNotification, notifyAllAdmins } = require('../utils/notifications');
const { body, validationResult } = require('express-validator');

router.use(refreshUser, requireAdmin);

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayOrders, pendingOrders, totalCustomers,
      monthRevenue, totalOrders, recentOrders,
      menuAvailability, unreadNotifications,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'preparing'] } }),
      User.countDocuments({ role: 'customer' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: thisMonth }, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
      Order.find({ status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } })
        .sort({ createdAt: -1 }).limit(10)
        .populate('customer', 'firstName lastName phone'),
      MenuItem.aggregate([
        { $group: { _id: '$isAvailable', count: { $sum: 1 } } },
      ]),
      Notification.countDocuments({ recipient: req.session.user._id, isRead: false }),
    ]);

    const availMap = {};
    menuAvailability.forEach(m => { availMap[m._id ? 'available' : 'unavailable'] = m.count; });

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Taste Heaven',
      pageTitle: 'Admin Dashboard',
      stats: {
        todayOrders,
        pendingOrders,
        totalCustomers,
        monthRevenue: monthRevenue[0]?.total || 0,
        totalOrders,
        menuAvailable: availMap.available || 0,
        menuUnavailable: availMap.unavailable || 0,
      },
      recentOrders,
      unreadNotifications,
    });
  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', { title: 'Admin Dashboard', pageTitle: 'Admin Dashboard', stats: {}, recentOrders: [], unreadNotifications: 0 });
  }
});

// ─── Admin Orders ──────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, date, page = 1, search } = req.query;
    const limit = 20;
    const filter = {};
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      filter.createdAt = { $gte: d, $lt: next };
    }
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit)
        .populate('customer', 'firstName lastName phone email'),
      Order.countDocuments(filter),
    ]);

    res.render('admin/orders', {
      title: 'Orders - Admin',
      pageTitle: 'All Orders',
      orders,
      status: status || '',
      date: date || '',
      search: search || '',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.render('admin/orders', { title: 'Orders', pageTitle: 'All Orders', orders: [], status: '', date: '', search: '', currentPage: 1, totalPages: 1, total: 0 });
  }
});

// ─── Admin Order Detail ────────────────────────────────────────────────────────
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName phone email defaultAddress')
      .populate('items.menuItem');
    if (!order) {
      req.session.flashMessage = 'Order not found.';
      req.session.flashType = 'error';
      return res.redirect('/admin/orders');
    }
    const { buildWhatsAppUrl } = require('../utils/whatsapp');
    const whatsappUrl = buildWhatsAppUrl(order, process.env.WHATSAPP_NUMBER);
    res.render('admin/order-detail', {
      title: `Order #${order.orderNumber} - Admin`,
      pageTitle: `Order #${order.orderNumber}`,
      order,
      whatsappUrl,
    });
  } catch (err) {
    res.redirect('/admin/orders');
  }
});

// ─── Update Order Status ───────────────────────────────────────────────────────
router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status, message } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.json({ success: false, error: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, {
      status,
      $push: {
        statusHistory: {
          status,
          message: message || `Status updated to ${status}`,
          updatedBy: req.session.user._id,
          timestamp: new Date(),
        },
      },
      ...(status === 'delivered' ? { actualDeliveryTime: new Date() } : {}),
    }, { new: true });

    if (!order) return res.json({ success: false, error: 'Order not found' });

    // Notify customer
    await notifyOrderStatus(order, status);

    res.json({ success: true, message: `Order status updated to ${status}`, order: { status: order.status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// ─── Send Custom Notification to Customer ─────────────────────────────────────
router.post('/orders/:id/notify-customer', async (req, res) => {
  try {
    const { title, message } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.json({ success: false, error: 'Order not found' });
    await createNotification({
      recipient: order.customer,
      recipientRole: 'customer',
      type: 'custom',
      title: title || 'Message from Taste Heaven',
      message,
      order: order._id,
      actionUrl: `/orders/${order._id}`,
    });
    res.json({ success: true, message: 'Customer notified successfully' });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send notification' });
  }
});

// ─── Menu Management ───────────────────────────────────────────────────────────
router.get('/menu', async (req, res) => {
  try {
    const { category, available } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined && available !== '') filter.isAvailable = available === 'true';
    const items = await MenuItem.find(filter).sort({ category: 1, sortOrder: 1 });
    res.render('admin/menu', {
      title: 'Menu Management - Admin',
      pageTitle: 'Menu Management',
      items,
      activeCategory: category || 'all',
      availableFilter: available || '',
    });
  } catch (err) {
    res.render('admin/menu', { title: 'Menu Management', pageTitle: 'Menu Management', items: [], activeCategory: 'all', availableFilter: '' });
  }
});

// ─── Toggle Item Availability ──────────────────────────────────────────────────
router.post('/menu/:id/toggle', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.json({ success: false, error: 'Item not found' });
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, isAvailable: item.isAvailable, message: `${item.name} is now ${item.isAvailable ? 'available' : 'unavailable'}` });
  } catch (err) {
    res.json({ success: false, error: 'Failed to toggle availability' });
  }
});

// ─── Add Menu Item ─────────────────────────────────────────────────────────────
router.get('/menu/new', (req, res) => {
  res.render('admin/menu-form', { title: 'Add Menu Item', pageTitle: 'Add Menu Item', item: null, errors: [] });
});

router.post('/menu/new', upload.single('image'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').isIn(['rice-meals', 'swallow-meals', 'breakfast', 'snacks', 'drinks', 'combo-offers']).withMessage('Valid category required'),
  body('price').isNumeric().withMessage('Valid price required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/menu-form', { title: 'Add Menu Item', pageTitle: 'Add Menu Item', item: req.body, errors: errors.array() });
  }
  try {
    await MenuItem.create({
      name: req.body.name,
      category: req.body.category,
      price: parseInt(req.body.price),
      description: req.body.description || '',
      isAvailable: req.body.isAvailable === 'true',
      isFeatured: req.body.isFeatured === 'true',
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      prepTime: parseInt(req.body.prepTime) || 15,
      image: req.file ? `/images/menu/${req.file.filename}` : null,
    });
    req.session.flashMessage = 'Menu item added successfully!';
    req.session.flashType = 'success';
    res.redirect('/admin/menu');
  } catch (err) {
    res.render('admin/menu-form', { title: 'Add Menu Item', pageTitle: 'Add Menu Item', item: req.body, errors: [{ msg: 'Failed to add item' }] });
  }
});

cache.clear();

// ─── Edit Menu Item ────────────────────────────────────────────────────────────
router.get('/menu/:id/edit', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.redirect('/admin/menu');
    res.render('admin/menu-form', { title: 'Edit Menu Item', pageTitle: 'Edit Item', item, errors: [] });
  } catch (err) {
    res.redirect('/admin/menu');
  }
});

router.post('/menu/:id/edit', upload.single('image'), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      category: req.body.category,
      price: parseInt(req.body.price),
      description: req.body.description || '',
      isAvailable: req.body.isAvailable === 'true',
      isFeatured: req.body.isFeatured === 'true',
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      prepTime: parseInt(req.body.prepTime) || 15,
    };

    if (req.file) {
      // Delete old image from disk if it exists
      const oldItem = await MenuItem.findById(req.params.id).select('image');
      if (oldItem && oldItem.image) {
        const oldImagePath = path.join(__dirname, '../public', oldItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/images/menu/${req.file.filename}`;
    }

    await MenuItem.findByIdAndUpdate(req.params.id, updateData);
    cache.clear(); // clear menu cache so changes show immediately

    req.session.flashMessage = 'Menu item updated successfully!';
    req.session.flashType = 'success';
    res.redirect('/admin/menu');
  } catch (err) {
    req.session.flashMessage = 'Failed to update item.';
    req.session.flashType = 'error';
    res.redirect('/admin/menu');
  }
});

// ─── Delete Menu Item (Super Admin only) ──────────────────────────────────────
router.delete('/menu/:id', requireSuperAdmin, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).select('image');

    // Delete image from disk if it exists
    if (item && item.image) {
      const imagePath = path.join(__dirname, '../public', item.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await MenuItem.findByIdAndDelete(req.params.id);
    cache.clear();
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (err) {
    res.json({ success: false, error: 'Failed to delete' });
  }
});

// ─── User Management (Super Admin) ────────────────────────────────────────────
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const { role, page = 1, search } = req.query;
    const limit = 20;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-password'),
      User.countDocuments(filter),
    ]);
    res.render('admin/users', {
      title: 'User Management - Admin',
      pageTitle: 'User Management',
      users,
      role: role || '',
      search: search || '',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.render('admin/users', { title: 'Users', pageTitle: 'Users', users: [], role: '', search: '', currentPage: 1, totalPages: 1, total: 0 });
  }
});

// ─── Toggle User Active ────────────────────────────────────────────────────────
router.post('/users/:id/toggle', requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user._id.toString() === req.session.user._id.toString()) {
      return res.json({ success: false, error: 'Cannot modify this user' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    res.json({ success: false, error: 'Failed to toggle user' });
  }
});

// ─── Promote/Change Role ───────────────────────────────────────────────────────
router.post('/users/:id/role', requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'admin', 'superadmin'].includes(role)) return res.json({ success: false, error: 'Invalid role' });
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ success: true, message: 'Role updated' });
  } catch (err) {
    res.json({ success: false, error: 'Failed to update role' });
  }
});

// ─── Analytics / Reports ───────────────────────────────────────────────────────
router.get('/analytics', requireSuperAdmin, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      revenueByDay,
      ordersByStatus,
      topItems,
      ordersByPayment,
      ordersByDelivery,
      totalRevenue,
      avgOrderValue,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Order.aggregate([{ $group: { _id: '$paymentMethod', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$deliveryType', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $group: { _id: null, avg: { $avg: '$total' } } }]),
    ]);

    res.render('admin/analytics', {
      title: 'Analytics - Admin',
      pageTitle: 'Analytics & Reports',
      revenueByDay: JSON.stringify(revenueByDay),
      ordersByStatus: JSON.stringify(ordersByStatus),
      topItems: JSON.stringify(topItems),
      ordersByPayment: JSON.stringify(ordersByPayment),
      ordersByDelivery: JSON.stringify(ordersByDelivery),
      totalRevenue: totalRevenue[0]?.total || 0,
      avgOrderValue: Math.round(avgOrderValue[0]?.avg || 0),
    });
  } catch (err) {
    console.error(err);
    res.render('admin/analytics', { title: 'Analytics', pageTitle: 'Analytics', revenueByDay: '[]', ordersByStatus: '[]', topItems: '[]', ordersByPayment: '[]', ordersByDelivery: '[]', totalRevenue: 0, avgOrderValue: 0 });
  }
});

// ─── Admin Notifications ───────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('order', 'orderNumber status').sort({ createdAt: -1 }).limit(100);
    await Notification.updateMany({ recipient: req.session.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.render('admin/notifications', { title: 'Notifications - Admin', pageTitle: 'Notifications', notifications });
  } catch (err) {
    res.render('admin/notifications', { title: 'Notifications', pageTitle: 'Notifications', notifications: [] });
  }
});

// ─── Broadcast Notification ────────────────────────────────────────────────────
router.post('/notifications/broadcast', requireSuperAdmin, async (req, res) => {
  try {
    const { title, message, target } = req.body;
    if (!title || !message) return res.json({ success: false, error: 'Title and message required' });
    const filter = { isActive: true };
    if (target === 'customers') filter.role = 'customer';
    else if (target === 'admins') filter.role = { $in: ['admin', 'superadmin'] };
    const users = await User.find(filter).select('_id role');
    const notifications = users.map(u => ({
      recipient: u._id,
      recipientRole: u.role,
      type: 'promo',
      title,
      message,
      icon: 'fa-bullhorn',
      priority: 'normal',
    }));
    await Notification.insertMany(notifications);
    res.json({ success: true, message: `Notification sent to ${notifications.length} users` });
  } catch (err) {
    res.json({ success: false, error: 'Failed to send broadcast' });
  }
});

// ─── Seed Menu (Super Admin) ───────────────────────────────────────────────────
router.post('/seed-menu', requireSuperAdmin, async (req, res) => {
  try {
    const { seedMenu } = require('../utils/seeder');
    await seedMenu();
    req.session.flashMessage = 'Menu seeded successfully!';
    req.session.flashType = 'success';
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Seed failed' });
  }
});

module.exports = router;
