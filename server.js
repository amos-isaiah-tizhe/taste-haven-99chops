'use strict';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const hpp = require('hpp');
const path = require('path');
const crypto = require('crypto');

const app = express();

// ── CSP Nonce Middleware (attach before helmet) ───────────────
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// ── Database ──────────────────────────────────────────────────
// Accept either MONGODB_URI or MONGO_URI (both are supported)
const MONGO_URI = process.env.MONGODB_URI
  || process.env.MONGO_URI
  || 'mongodb://localhost:27017/tastehaven';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── View Engine ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Security: Helmet with strict CSP ─────────────────────────
app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.nonce}'`,
          "https://js.paystack.co",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",           // Font Awesome & Google Fonts require this
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.paystack.co"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })(req, res, next);
});

// ── Rate Limiting ─────────────────────────────────────────────
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true });
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

app.use('/api/', generalLimiter);
app.use('/auth/', authLimiter);
app.use('/orders/', orderLimiter);

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.SITE_URL : 'http://localhost:3000', credentials: true }));

// ── Body / Sanitize ───────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));

// ── Session ───────────────────────────────────────────────────

const RAW_SECRET = process.env.SESSION_SECRET || '';
const SESSION_KEY = RAW_SECRET.replace(/[^a-zA-Z0-9]/g, '').length >= 32
  ? RAW_SECRET.replace(/[^a-zA-Z0-9]/g, '')
  : 'TasteHeavenAndNinetyNineChopsSessionKeySecure2026OneXportal';

app.use(session({
  secret: SESSION_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    touchAfter: 24 * 3600,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
  name: 'th99.sid',
}));

// ── Global Template Locals ────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAdmin = ['admin', 'superadmin'].includes(req.session.user?.role);
  res.locals.isSuperAdmin = req.session.user?.role === 'superadmin';
  res.locals.restaurantName = process.env.RESTAURANT_NAME || 'Taste Heaven & 99Chops';
  res.locals.whatsappNumber = process.env.WHATSAPP_NUMBER || '2349064367123';
  res.locals.restaurantPhone = process.env.RESTAURANT_PHONE || '08136975564';
  res.locals.currentPath = req.path;
  res.locals.flashMessage = req.session.flashMessage || null;
  res.locals.flashType = req.session.flashType || null;
  if (req.session.flashMessage) {
    delete req.session.flashMessage;
    delete req.session.flashType;
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/menu', require('./routes/menu'));
app.use('/orders', require('./routes/orders'));
app.use('/customer', require('./routes/customer'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));
app.use('/notifications', require('./routes/notifications'));

// Silence Chrome DevTools probe
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.json({});
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).render('errors/404', { title: '404 - Not Found', pageTitle: 'Not Found' }));

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.stack);
  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.';
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(status).json({ success: false, error: message });
  }
  res.status(status).render('errors/500', { title: 'Server Error', pageTitle: 'Server Error', message });
});

// ── Start ─────────────────────────────────────────────────────
const { seedAdmin } = require('./utils/seeder');
const PORT = process.env.PORT || 3000;

mongoose.connection.once('open', async () => {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`\n🍽️  Taste Heaven & 99Chops`);
    console.log(`🌐  http://localhost:${PORT}`);
    console.log(`🔐  Admin: http://localhost:${PORT}/admin/dashboard`);
    console.log(`👨‍💻  Amos Isaiah Tizhe | OneXportal | OneXportalhq.com\n`);
  });
});
