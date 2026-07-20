// routes/auth.js

'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireGuest, requireAuth } = require('../middleware/auth');

// ─── Register Page ─────────────────────────────────────────────────────────────
router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', { title: 'Create Account', pageTitle: 'Register', errors: [], formData: {} });
});

// ─── Register POST ─────────────────────────────────────────────────────────────
router.post('/register', requireGuest, [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required').matches(/^(\+?234|0)[789]\d{9}$/).withMessage('Enter a valid Nigerian phone number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must have uppercase, lowercase and a number'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Create Account',
      pageTitle: 'Register',
      errors: errors.array(),
      formData: req.body,
    });
  }

  try {
    const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Create Account',
        pageTitle: 'Register',
        errors: [{ msg: 'An account with this email already exists.' }],
        formData: req.body,
      });
    }

    const user = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email.toLowerCase(),
      phone: req.body.phone,
      password: req.body.password,
      role: 'customer',
      isVerified: true, // Auto-verified for now; email verification can be added
    });

    req.session.user = {
  _id:       user._id,
  firstName: user.firstName || 'User',
  lastName:  user.lastName  || 'Account',
  email:     user.email     || '',
  phone:     user.phone     || '',
  role:      user.role      || 'customer',
  avatar:    user.avatar    || null,
};

   req.session.flashMessage = `Welcome, ${user.firstName}! Your account has been created.`;
    req.session.flashType = 'success';

    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/auth/login');
      }
      res.redirect('/customer/dashboard');
    });
  } catch (err) {
    console.error('Register error:', err);
    res.render('auth/register', {
      title: 'Create Account',
      pageTitle: 'Register',
      errors: [{ msg: 'Registration failed. Please try again.' }],
      formData: req.body,
    });
  }
});

// ─── Login Page ────────────────────────────────────────────────────────────────
router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', { title: 'Login', pageTitle: 'Login', errors: [], formData: {} });
});

// ─── Login POST ────────────────────────────────────────────────────────────────
router.post('/login', requireGuest, [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Login',
      pageTitle: 'Login',
      errors: errors.array(),
      formData: req.body,
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        pageTitle: 'Login',
        errors: [{ msg: 'Invalid email or password.' }],
        formData: req.body,
      });
    }

    if (user.isLocked) {
      return res.render('auth/login', {
        title: 'Login',
        pageTitle: 'Login',
        errors: [{ msg: 'Account temporarily locked due to too many failed attempts. Try again in 2 hours.' }],
        formData: req.body,
      });
    }

    if (!user.isActive) {
      return res.render('auth/login', {
        title: 'Login',
        pageTitle: 'Login',
        errors: [{ msg: 'Your account has been deactivated. Contact support.' }],
        formData: req.body,
      });
    }

    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.render('auth/login', {
        title: 'Login',
        pageTitle: 'Login',
        errors: [{ msg: 'Invalid email or password.' }],
        formData: req.body,
      });
    }

    // Reset login attempts
    await user.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });

  req.session.user = {
  _id:       user._id,
  firstName: user.firstName || 'User',
  lastName:  user.lastName  || 'Account',
  email:     user.email     || '',
  phone:     user.phone     || '',
  role:      user.role      || 'customer',
  avatar:    user.avatar    || null,
};

    req.session.flashMessage = `Welcome back, ${user.firstName}!`;
    req.session.flashType = 'success';

    const returnTo = req.session.returnTo || (
      ['admin', 'superadmin'].includes(user.role) ? '/admin/dashboard' : '/customer/dashboard'
    );
    delete req.session.returnTo;

    // Save session before redirect — prevents race condition
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/auth/login');
      }
      res.redirect(returnTo);
    });
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      title: 'Login',
      pageTitle: 'Login',
      errors: [{ msg: 'Login failed. Please try again.' }],
      formData: req.body,
    });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('th99.sid');
    res.redirect('/');
  });
});

router.get('/logout', requireAuth, (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('th99.sid');
    res.redirect('/');
  });
});

module.exports = router;
