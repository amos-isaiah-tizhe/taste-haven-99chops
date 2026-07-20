'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { requireAuth, refreshUser } = require('../middleware/auth');
const { notifyOrderStatus, notifyNewOrder } = require('../utils/notifications');
const { buildWhatsAppUrl } = require('../utils/whatsapp');

router.use(refreshUser);

// ─── Place Order Page ──────────────────────────────────────────────────────────
router.get('/place', requireAuth, (req, res) => {
  res.render('orders/place', {
    title: 'Place Order - Taste Heaven & 99Chops',
    pageTitle: 'Place Your Order',
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  });
});

// ─── Checkout (Order Summary + Customization) ─────────────────────────────────
router.get('/checkout', requireAuth, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      req.session.flashMessage = 'Your cart is empty. Please add items.';
      req.session.flashType = 'warning';
      return res.redirect('/menu');
    }
    const itemIds = cart.map(c => c.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
    const itemMap = {};
    menuItems.forEach(m => { itemMap[m._id.toString()] = m; });

    let subtotal = 0;
    const cartWithDetails = cart.map(c => {
      const menuItem = itemMap[c.menuItemId];
      const itemSubtotal = (menuItem?.price || 0) * c.quantity;
      subtotal += itemSubtotal;
      return { ...c, menuItem, itemSubtotal };
    }).filter(c => c.menuItem);

    res.render('orders/checkout', {
      title: 'Checkout - Taste Heaven & 99Chops',
      pageTitle: 'Checkout',
      cart: cartWithDetails,
      subtotal,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
      user: req.session.user,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/menu');
  }
});

// ─── Submit Order ──────────────────────────────────────────────────────────────
router.post('/submit', requireAuth, [
  body('deliveryType').isIn(['delivery', 'pickup']).withMessage('Select delivery or pickup'),
  body('scheduledTime').notEmpty().withMessage('Please select a scheduled time'),
  body('paymentMethod').isIn(['cash', 'transfer', 'card']).withMessage('Select a payment method'),
  body('deliveryAddress').if(body('deliveryType').equals('delivery')).notEmpty().withMessage('Delivery address is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const user = await User.findById(req.session.user._id);
    const itemIds = cart.map(c => c.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: itemIds }, isAvailable: true });
    const itemMap = {};
    menuItems.forEach(m => { itemMap[m._id.toString()] = m; });

    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cart) {
      const menuItem = itemMap[cartItem.menuItemId];
      if (!menuItem) continue;
      const itemSubtotal = menuItem.price * cartItem.quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: cartItem.quantity,
        spiceLevel: cartItem.spiceLevel || 'medium',
        extraSpices: cartItem.extraSpices || [],
        removeItems: cartItem.removeItems || [],
        addItems: cartItem.addItems || [],
        specialInstructions: cartItem.specialInstructions || '',
        subtotal: itemSubtotal,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid items in cart' });
    }

    const deliveryFee = req.body.deliveryType === 'delivery' ? (req.body.deliveryFee ? parseInt(req.body.deliveryFee) : 0) : 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: user._id,
      customerName: user.fullName || `${user.firstName} ${user.lastName}`,
      customerPhone: user.phone,
      customerEmail: user.email,
      items: orderItems,
      subtotal,
      deliveryFee,
      serviceFee: 0,
      discount: 0,
      total,
      status: 'pending',
      deliveryType: req.body.deliveryType,
      deliveryAddress: req.body.deliveryAddress || '',
      deliveryLandmark: req.body.deliveryLandmark || '',
      scheduledTime: new Date(req.body.scheduledTime),
      paymentMethod: req.body.paymentMethod,
      paymentStatus: req.body.paymentMethod === 'card' ? 'pending' : 'pending',
      paystackReference: req.body.paystackReference || null,
      specialInstructions: req.body.specialInstructions || '',
      statusHistory: [{ status: 'pending', message: 'Order placed by customer', updatedBy: user._id }],
    });

    // Update user stats
    await User.findByIdAndUpdate(user._id, { $inc: { orderCount: 1, totalSpent: total } });

    // Update menu item order counts
    for (const item of orderItems) {
      await MenuItem.findByIdAndUpdate(item.menuItem, { $inc: { orderCount: item.quantity } });
    }

    // Populate for WhatsApp
    const populatedOrder = await Order.findById(order._id).populate('items.menuItem');

    // Notify admins
    await notifyNewOrder(populatedOrder);

    // Clear cart
    req.session.cart = [];

    // Build WhatsApp URL
    const whatsappUrl = buildWhatsAppUrl(populatedOrder, process.env.WHATSAPP_NUMBER);

    res.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      whatsappUrl,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });
  } catch (err) {
    console.error('Submit order error:', err);
    res.status(500).json({ success: false, error: 'Failed to place order. Please try again.' });
  }
});

// ─── Order Confirmation Page ───────────────────────────────────────────────────
router.get('/confirmation/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.session.user._id })
      .populate('items.menuItem');
    if (!order) {
      req.session.flashMessage = 'Order not found.';
      req.session.flashType = 'error';
      return res.redirect('/customer/dashboard');
    }
    const whatsappUrl = buildWhatsAppUrl(order, process.env.WHATSAPP_NUMBER);
    res.render('orders/confirmation', {
      title: `Order #${order.orderNumber} Confirmed!`,
      pageTitle: 'Order Confirmed',
      order,
      whatsappUrl,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    });
  } catch (err) {
    res.redirect('/customer/dashboard');
  }
});

// ─── View Single Order ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.session.user._id
    }).populate('items.menuItem');

    if (!order) {
      req.session.flashMessage = 'Order not found.';
      req.session.flashType = 'error';
      return res.redirect('/customer/dashboard');
    }

    const whatsappUrl = buildWhatsAppUrl(order, process.env.WHATSAPP_NUMBER);

    res.render('orders/detail', {
      title: `Order #${order.orderNumber}`,
      pageTitle: `Order #${order.orderNumber}`,
      order,
      whatsappUrl,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    });
  } catch (err) {
    console.error('Order detail error:', err);
    req.session.flashMessage = 'Failed to load order details.';
    req.session.flashType = 'error';
    res.redirect('/customer/orders');
  }
});

// ─── Paystack Verify ───────────────────────────────────────────────────────────
router.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const { reference, orderId } = req.body;
    if (!reference || !orderId) return res.status(400).json({ success: false, error: 'Missing reference or order ID' });

    const axios = require('axios');
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const paystackData = response.data;
    if (paystackData.data.status === 'success') {
      const order = await Order.findOneAndUpdate(
        { _id: orderId, customer: req.session.user._id },
        {
          paymentStatus: 'paid',
          paystackReference: reference,
          paystackData: paystackData.data,
          status: 'confirmed',
          $push: { statusHistory: { status: 'confirmed', message: 'Payment confirmed via Paystack', updatedBy: req.session.user._id } },
        },
        { new: true }
      );
      if (order) {
        await notifyOrderStatus(order, 'confirmed');
        await notifyNewOrder(order);
      }
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      await Order.findOneAndUpdate(
        { _id: orderId, customer: req.session.user._id },
        { paymentStatus: 'failed' }
      );
      res.json({ success: false, error: 'Payment verification failed' });
    }
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ success: false, error: 'Payment verification error' });
  }
});

// ─── Rate Order ────────────────────────────────────────────────────────────────
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
    await Order.findOneAndUpdate(
      { _id: req.params.id, customer: req.session.user._id, status: 'delivered' },
      { rating: { score: parseInt(rating), comment: comment || '', ratedAt: new Date() } }
    );
    res.json({ success: true, message: 'Thank you for your rating!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save rating' });
  }
});

module.exports = router;
