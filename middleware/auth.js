'use strict';

const User = require('../models/User');

// ─── Require Login ─────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.session.flashMessage = 'Please log in to continue.';
    req.session.flashType = 'warning';
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
};

// ─── Require Guest (not logged in) ────────────────────────────────────────────
const requireGuest = (req, res, next) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'customer' ? '/customer/dashboard' : '/admin/dashboard');
  }
  next();
};

// ─── Require Admin ─────────────────────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    req.session.flashMessage = 'Please log in to access this area.';
    req.session.flashType = 'warning';
    return res.redirect('/auth/login');
  }
  if (!['admin', 'superadmin'].includes(req.session.user.role)) {
    req.session.flashMessage = 'Access denied. Admins only.';
    req.session.flashType = 'error';
    return res.redirect('/');
  }
  next();
};

// ─── Require Super Admin ───────────────────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  if (req.session.user.role !== 'superadmin') {
    req.session.flashMessage = 'Access denied. Super Admins only.';
    req.session.flashType = 'error';
    return res.redirect('/admin/dashboard');
  }
  next();
};

// ─── Refresh Session User ──────────────────────────────────────────────────────
const refreshUser = async (req, res, next) => {
  if (req.session.user) {
    try {
      const user = await User.findById(req.session.user._id).select('-password');
      if (!user || !user.isActive) {
        req.session.destroy();
        return res.redirect('/auth/login');
      }
     req.session.user = {
  _id:       user._id,
  firstName: user.firstName || 'User',
  lastName:  user.lastName  || 'Account',
  email:     user.email     || '',
  phone:     user.phone     || '',
  role:      user.role      || 'customer',
  avatar:    user.avatar    || null,
};
      res.locals.user = req.session.user;
      res.locals.isAdmin = ['admin', 'superadmin'].includes(user.role);
      res.locals.isSuperAdmin = user.role === 'superadmin';
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }
  next();
};

// ─── API Auth (for AJAX) ──────────────────────────────────────────────────────
const requireAuthAPI = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  next();
};

const requireAdminAPI = (req, res, next) => {
  if (!req.session.user || !['admin', 'superadmin'].includes(req.session.user.role)) {
    return res.status(403).json({ success: false, error: 'Admin access required.' });
  }
  next();
};

module.exports = {
  requireAuth,
  requireGuest,
  requireAdmin,
  requireSuperAdmin,
  refreshUser,
  requireAuthAPI,
  requireAdminAPI,
};
