'use strict';

const express  = require('express');
const router   = express.Router();
const MenuItem = require('../models/MenuItem');
const { refreshUser } = require('../middleware/auth');
const cache    = require('../utils/cache');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.use(refreshUser);

const CATEGORY_META = {
  'rice-meals':    { label: 'Rice Meals',    icon: 'fa-bowl-rice',   description: 'Delicious Nigerian rice dishes' },
  'swallow-meals': { label: 'Swallow Meals', icon: 'fa-circle-dot',  description: 'Traditional Nigerian swallow with rich soups' },
  'breakfast':     { label: 'Breakfast',     icon: 'fa-sun',         description: 'Start your day right with our breakfast options' },
  'snacks':        { label: 'Snacks',        icon: 'fa-cookie-bite', description: 'Light bites and snacks to satisfy cravings' },
  'drinks':        { label: 'Drinks',        icon: 'fa-glass-water', description: 'Cold drinks to complement your meal' },
  'combo-offers':  { label: 'Combo Offers',  icon: 'fa-star',        description: 'Great value combo meals' },
};

// ─── Full Menu ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, search, available } = req.query;

    // Only cache unfiltered requests — search/filter results are dynamic
    const isFiltered = category || search || available;
    const cacheKey   = 'menu:full';

    let items, countMap;

    if (!isFiltered) {
      // Try cache first
      const cached = cache.get(cacheKey);
      if (cached) {
        items    = cached.items;
        countMap = cached.countMap;
      }
    }

    // Cache miss or filtered — query MongoDB
    if (!items) {
      const filter = {};
      if (category && CATEGORY_META[category]) filter.category = category;
      if (available === 'true')  filter.isAvailable = true;
      if (available === 'false') filter.isAvailable = false;
      if (search) filter.$text = { $search: search };

      const [fetchedItems, categoryCounts] = await Promise.all([
        MenuItem.find(filter).sort({ sortOrder: 1, name: 1 }),
        MenuItem.aggregate([
          { $group: { _id: '$category', total: { $sum: 1 }, available: { $sum: { $cond: ['$isAvailable', 1, 0] } } } },
        ]),
      ]);

      countMap = {};
      categoryCounts.forEach(c => { countMap[c._id] = c; });
      items = fetchedItems;

      // Store in cache only for unfiltered requests
      if (!isFiltered) {
        cache.set(cacheKey, { items, countMap }, CACHE_TTL);
      }
    }

    res.render('menu/index', {
      title:          'Our Menu - Taste Heaven & 99Chops',
      pageTitle:      'Full Menu',
      items,
      categoryMeta:   CATEGORY_META,
      countMap,
      activeCategory: category || 'all',
      search:         search   || '',
      availableFilter: available || '',
    });
  } catch (err) {
    console.error(err);
    req.session.flashMessage = 'Failed to load menu. Please try again.';
    req.session.flashType    = 'error';
    res.redirect('/');
  }
});

// ─── Category Filter ───────────────────────────────────────────────────────────
router.get('/category/:cat', async (req, res) => {
  const { cat } = req.params;
  if (!CATEGORY_META[cat]) return res.redirect('/menu');

  try {
    const cacheKey = `menu:category:${cat}`;
    let items = cache.get(cacheKey);

    if (!items) {
      items = await MenuItem.find({ category: cat }).sort({ sortOrder: 1 });
      cache.set(cacheKey, items, CACHE_TTL);
    }

    res.render('menu/category', {
      title: `${CATEGORY_META[cat].label} - Taste Heaven`,
      pageTitle: CATEGORY_META[cat].label,
      items,
      category: cat,
      meta: CATEGORY_META[cat],
      categoryMeta: CATEGORY_META,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/menu');
  }
});

// ─── Single Item ───────────────────────────────────────────────────────────────
router.get('/item/:id', async (req, res) => {
  try {
    const cacheKey = `menu:item:${req.params.id}`;
    let item = cache.get(cacheKey);

    if (!item) {
      item = await MenuItem.findById(req.params.id);
      if (item) cache.set(cacheKey, item, CACHE_TTL);
    }

    if (!item) {
      req.session.flashMessage = 'Menu item not found.';
      req.session.flashType    = 'error';
      return res.redirect('/menu');
    }

    const related = await MenuItem.find({
      category: item.category,
      _id: { $ne: item._id },
      isAvailable: true,
    }).limit(4);

    res.render('menu/item', {
      title: `${item.name} - Taste Heaven`,
      pageTitle: item.name,
      item,
      related,
      categoryMeta: CATEGORY_META,
    });
  } catch (err) {
    res.redirect('/menu');
  }
});

// ─── API: Search (AJAX) ────────────────────────────────────────────────────────
router.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ items: [] });
    const items = await MenuItem.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { description: { $regex: q, $options: 'i' } },
      ],
    }).select('name price category isAvailable image slug').limit(10);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ items: [] });
  }
});

module.exports = router;
