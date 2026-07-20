'use strict';

const User     = require('../models/User');
const MenuItem = require('../models/MenuItem');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@tasteheavenng.com';
    const existing   = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        firstName: 'Admin',
        lastName:  'TasteHeaven',
        email:     adminEmail,
        phone:     process.env.RESTAURANT_PHONE || '08136975564',
        password:  process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026!TasteHeaven',
        role:      'superadmin',
        isVerified: true,
        isActive:   true,
      });
      console.log(`✅ Super Admin created: ${adminEmail}`);
    } else {
      console.log(`✅ Admin already exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Seed admin error:', err);
  }
};

const seedMenu = async () => {
  try {
    const count = await MenuItem.countDocuments();
    if (count > 0) {
      console.log('✅ Menu items already seeded');
      return;
    }

    const menuItems = [
      // ─── RICE MEALS ─────────────────────────────────────────
      {
        name: 'Jollof Rice + Beef',
        category: 'rice-meals',
        price: 2500,
        description: 'Aromatic Nigerian jollof rice cooked to perfection, served with tender seasoned beef.',
        image: '/images/menu/jollof-rice-beef.jpg',
        tags: ['rice', 'beef', 'jollof', 'popular'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 1,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Spice Extras', type: 'extra', items: ['extra pepper', 'curry', 'thyme'] },
          { label: 'Remove', type: 'remove', items: ['onions', 'pepper', 'crayfish'] },
        ],
      },
      {
        name: 'Fried Rice + Beef',
        category: 'rice-meals',
        price: 2500,
        description: 'Flavorful Nigerian fried rice packed with fresh vegetables and seasoned beef.',
        image: '/images/menu/fried-rice-beef.jpg',
        tags: ['rice', 'beef', 'fried', 'popular'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 2,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Remove', type: 'remove', items: ['carrots', 'green peas', 'onions', 'liver'] },
          { label: 'Extra', type: 'extra', items: ['extra beef', 'extra veggies'] },
        ],
      },
      {
        name: 'White Rice + Stew + Beef',
        category: 'rice-meals',
        price: 2500,
        description: 'Plain white rice served with rich tomato stew and tender beef.',
        image: '/images/menu/white-rice-stew-beef.jpg',
        tags: ['rice', 'beef', 'stew', 'white rice'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 3,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Reduce', type: 'reduce', items: ['pepper', 'oil', 'salt'] },
          { label: 'Extra', type: 'extra', items: ['extra stew', 'extra beef'] },
        ],
      },
      {
        name: 'Jollof Rice + Chicken',
        category: 'rice-meals',
        price: 3500,
        description: 'Aromatic Nigerian jollof rice served with juicy grilled chicken.',
        image: '/images/menu/jollof-rice-chicken.jpg',
        tags: ['rice', 'chicken', 'jollof', 'popular'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 4,
        prepTime: 20,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Extra', type: 'extra', items: ['extra pepper', 'extra chicken'] },
          { label: 'Remove', type: 'remove', items: ['onions', 'pepper'] },
        ],
      },
      {
        name: 'Fried Rice + Chicken',
        category: 'rice-meals',
        price: 3500,
        description: 'Nigerian fried rice with seasoned vegetables and tender chicken.',
        image: '/images/menu/fried-rice-chicken.jpg',
        tags: ['rice', 'chicken', 'fried'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 5,
        prepTime: 20,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Remove', type: 'remove', items: ['carrots', 'green peas', 'onions'] },
          { label: 'Extra', type: 'extra', items: ['extra chicken', 'extra veggies'] },
        ],
      },

      // ─── SWALLOW MEALS ───────────────────────────────────────
      {
        name: 'Eba + Egusi + Beef',
        category: 'swallow-meals',
        price: 2500,
        description: 'Smooth eba served with rich egusi soup and tender beef.',
        image: '/images/menu/eba-egusi-beef.jpg',
        tags: ['swallow', 'eba', 'egusi', 'beef', 'traditional'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 6,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Extra', type: 'extra', items: ['extra pepper', 'crayfish', 'stockfish'] },
          { label: 'Reduce', type: 'reduce', items: ['pepper', 'oil', 'crayfish'] },
        ],
      },
      {
        name: 'Eba + Ogbono + Beef',
        category: 'swallow-meals',
        price: 2500,
        description: 'Smooth eba paired with draw-draw ogbono soup and beef.',
        image: '/images/menu/eba-ogbono-beef.jpg',
        tags: ['swallow', 'eba', 'ogbono', 'beef', 'traditional'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 7,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Extra', type: 'extra', items: ['extra beef', 'okra', 'stockfish'] },
          { label: 'Reduce', type: 'reduce', items: ['pepper', 'oil'] },
        ],
      },
      {
        name: 'Semo + Egusi + Beef',
        category: 'swallow-meals',
        price: 2500,
        description: 'Light semovita served with rich egusi soup and seasoned beef.',
        image: '/images/menu/semo-egusi-beef.jpg',
        tags: ['swallow', 'semo', 'egusi', 'beef'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 8,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Extra', type: 'extra', items: ['extra beef', 'stockfish', 'crayfish'] },
          { label: 'Reduce', type: 'reduce', items: ['pepper', 'oil'] },
        ],
      },
      {
        name: 'Pounded Yam + Soup + Beef',
        category: 'swallow-meals',
        price: 3000,
        description: 'Smooth pounded yam served with your choice of soup and beef.',
        image: '/images/menu/pounded-yam-soup-beef.jpg',
        tags: ['swallow', 'pounded yam', 'beef', 'popular'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 9,
        prepTime: 20,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Soup Choice', type: 'add', items: ['egusi', 'ogbono', 'okra', 'vegetable'] },
          { label: 'Extra', type: 'extra', items: ['extra beef', 'stockfish', 'ponmo'] },
          { label: 'Reduce', type: 'reduce', items: ['pepper', 'oil', 'crayfish'] },
        ],
      },

      // ─── BREAKFAST ──────────────────────────────────────────
      {
        name: 'Chips + Egg',
        category: 'breakfast',
        price: 3000,
        description: 'Crispy golden chips served with freshly fried egg.',
        image: '/images/menu/chips-egg.jpg',
        tags: ['breakfast', 'chips', 'egg', 'morning'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 10,
        prepTime: 10,
        spiceOptions: false,
        customizationOptions: [
          { label: 'Egg Style', type: 'add', items: ['sunny side up', 'scrambled', 'fried hard'] },
          { label: 'Extra', type: 'extra', items: ['extra egg', 'ketchup', 'pepper sauce'] },
        ],
      },
      {
        name: 'Yam + Egg',
        category: 'breakfast',
        price: 3000,
        description: 'Boiled or fried yam served with a freshly prepared egg.',
        image: '/images/menu/yam-egg.jpg',
        tags: ['breakfast', 'yam', 'egg', 'morning'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 11,
        prepTime: 15,
        spiceOptions: false,
        customizationOptions: [
          { label: 'Yam Style', type: 'add', items: ['boiled', 'fried', 'porridge'] },
          { label: 'Egg Style', type: 'add', items: ['fried', 'scrambled', 'boiled'] },
        ],
      },
      {
        name: 'Bread + Egg',
        category: 'breakfast',
        price: 1000,
        description: 'Sliced bread served with a freshly prepared egg.',
        image: '/images/menu/bread-egg.jpg',
        tags: ['breakfast', 'bread', 'egg', 'light', 'affordable'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 12,
        prepTime: 5,
        spiceOptions: false,
        customizationOptions: [
          { label: 'Egg Style', type: 'add', items: ['fried', 'scrambled', 'boiled'] },
          { label: 'Extra', type: 'extra', items: ['butter', 'jam', 'extra egg'] },
        ],
      },
      {
        name: 'Noodles + Egg',
        category: 'breakfast',
        price: 1500,
        description: 'Spicy indomie noodles cooked with fresh vegetables and egg.',
        image: '/images/menu/noodles-egg.jpg',
        tags: ['breakfast', 'noodles', 'indomie', 'egg'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 13,
        prepTime: 10,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Spice Level', type: 'extra', items: ['extra pepper', 'extra spice'] },
          { label: 'Add', type: 'add', items: ['extra egg', 'vegetables', 'chicken'] },
          { label: 'Remove', type: 'remove', items: ['pepper', 'seasoning'] },
        ],
      },

      // ─── SNACKS ─────────────────────────────────────────────
      {
        name: 'Puff Puff (5 pieces)',
        category: 'snacks',
        price: 500,
        description: 'Fluffy, sweet deep-fried Nigerian puff puff balls. 5 pieces per serving.',
        image: '/images/menu/puff-puff.jpg',
        tags: ['snacks', 'puff puff', 'sweet', 'affordable'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 14,
        prepTime: 5,
        spiceOptions: false,
        customizationOptions: [],
      },
      {
        name: 'Meat Pie',
        category: 'snacks',
        price: 1000,
        description: 'Flaky pastry filled with spiced minced meat and vegetables.',
        image: '/images/menu/meat-pie.jpg',
        tags: ['snacks', 'meat pie', 'pastry'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 15,
        prepTime: 5,
        spiceOptions: false,
        customizationOptions: [],
      },
      {
        name: 'Chin Chin (Small Pack)',
        category: 'snacks',
        price: 500,
        description: 'Crunchy, sweet Nigerian chin chin in a small pack.',
        image: '/images/menu/chin-chin.jpg',
        tags: ['snacks', 'chin chin', 'sweet', 'crunchy', 'affordable'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 16,
        prepTime: 0,
        spiceOptions: false,
        customizationOptions: [],
      },

      // ─── DRINKS ─────────────────────────────────────────────
      {
        name: 'Soft Drinks',
        category: 'drinks',
        price: 500,
        description: 'Chilled soft drinks. Please specify your brand.',
        image: '/images/menu/soft-drinks.jpg',
        tags: ['drinks', 'soft drink', 'cold', 'soda'],
        isFeatured: true,
        isAvailable: true,
        sortOrder: 17,
        prepTime: 0,
        spiceOptions: false,
        customizationOptions: [
          { label: 'Brand', type: 'add', items: ['Coke', 'Pepsi', 'Fanta Orange', 'Fanta Lemon', 'Sprite', '7Up'] },
        ],
      },
      {
        name: 'Malt Drink',
        category: 'drinks',
        price: 700,
        description: 'Chilled malt drink. Please specify your brand.',
        image: '/images/menu/malt-drink.jpg',
        tags: ['drinks', 'malt', 'cold'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 18,
        prepTime: 0,
        spiceOptions: false,
        customizationOptions: [
          { label: 'Brand', type: 'add', items: ['Malta Guinness', 'Amstel Malta', 'Hi Malt'] },
        ],
      },
      {
        name: 'Bottle Water',
        category: 'drinks',
        price: 300,
        description: 'Chilled bottled water.',
        image: '/images/menu/bottle-water.jpg',
        tags: ['drinks', 'water', 'cold', 'affordable'],
        isFeatured: false,
        isAvailable: true,
        sortOrder: 19,
        prepTime: 0,
        spiceOptions: false,
        customizationOptions: [],
      },

      // ─── COMBO OFFERS ────────────────────────────────────────
      {
        name: 'Rice + Beef + Drink',
        category: 'combo-offers',
        price: 3000,
        description: 'Value combo: Your choice of rice with beef plus a soft drink. Save more!',
        image: '/images/menu/combo-rice-beef-drink.jpg',
        tags: ['combo', 'value', 'popular', 'rice', 'beef', 'drink'],
        isCombo: true,
        isFeatured: true,
        isAvailable: true,
        comboItems: ['Jollof / Fried / White Rice', 'Beef', 'Soft Drink'],
        sortOrder: 20,
        prepTime: 15,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Rice Choice', type: 'add', items: ['Jollof Rice', 'Fried Rice', 'White Rice + Stew'] },
          { label: 'Drink Choice', type: 'add', items: ['Coke', 'Pepsi', 'Fanta', 'Sprite', '7Up'] },
        ],
      },
      {
        name: 'Rice + Chicken + Drink',
        category: 'combo-offers',
        price: 3500,
        description: 'Premium combo: Your choice of rice with chicken plus a soft drink.',
        image: '/images/menu/combo-rice-chicken-drink.jpg',
        tags: ['combo', 'value', 'popular', 'rice', 'chicken', 'drink'],
        isCombo: true,
        isFeatured: true,
        isAvailable: true,
        comboItems: ['Jollof / Fried Rice', 'Chicken', 'Soft Drink'],
        sortOrder: 21,
        prepTime: 20,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Rice Choice', type: 'add', items: ['Jollof Rice', 'Fried Rice'] },
          { label: 'Drink Choice', type: 'add', items: ['Coke', 'Pepsi', 'Fanta', 'Sprite', '7Up'] },
        ],
      },
      {
        name: 'Swallow + Soup + Drink',
        category: 'combo-offers',
        price: 3000,
        description: 'Traditional combo: Swallow with soup and beef plus a soft drink.',
        image: '/images/menu/combo-swallow-soup-drink.jpg',
        tags: ['combo', 'value', 'swallow', 'traditional', 'drink'],
        isCombo: true,
        isFeatured: true,
        isAvailable: true,
        comboItems: ['Eba / Semo / Pounded Yam', 'Soup + Beef', 'Soft Drink'],
        sortOrder: 22,
        prepTime: 20,
        spiceOptions: true,
        customizationOptions: [
          { label: 'Swallow Choice', type: 'add', items: ['Eba', 'Semo', 'Pounded Yam'] },
          { label: 'Soup Choice', type: 'add', items: ['Egusi', 'Ogbono', 'Okra', 'Vegetable'] },
          { label: 'Drink Choice', type: 'add', items: ['Coke', 'Pepsi', 'Fanta', 'Sprite', '7Up'] },
        ],
      },
    ];

    await MenuItem.insertMany(menuItems);
    console.log(`✅ Seeded ${menuItems.length} menu items`);
  } catch (err) {
    console.error('Seed menu error:', err);
  }
};

// ── Exports ────────────────────────────────────────────────────
module.exports = { seedAdmin, seedMenu };