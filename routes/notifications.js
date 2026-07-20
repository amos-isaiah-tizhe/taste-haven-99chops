'use strict';

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuthAPI } = require('../middleware/auth');

router.use(requireAuthAPI);

// Get unread count
router.get('/count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.session.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.json({ success: true, count: 0 });
  }
});

// Mark all as read
router.post('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.session.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Mark single as read
router.post('/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.session.user._id }, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// Get recent notifications (polling)
router.get('/recent', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .sort({ createdAt: -1 }).limit(10).select('title message isRead icon type createdAt order');
    res.json({ success: true, notifications });
  } catch (err) {
    res.json({ success: false, notifications: [] });
  }
});

module.exports = router;
