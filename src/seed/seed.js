// Run with: npm run seed
// Creates an admin user + sample categories + sample products for quick demo
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const run = async () => {
  await connectDB();

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@royaljewels.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      phone: '+910000000000',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    console.log('Admin user created:', adminEmail);
  }

  // --- Categories ---
  const categoryNames = ['Rings', 'Necklaces', 'Earrings', 'Bangles', 'Bracelets', 'Pendants'];
  const categories = {};
  for (const name of categoryNames) {
    const slug = name.toLowerCase();
    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({ name, slug, description: `Exquisite ${name.toLowerCase()} collection` });
    }
    categories[name] = cat;
  }
  console.log('Categories ready:', categoryNames.join(', '));

  // --- Sample Products ---
  const sampleProducts = [
    { name: 'Royal Gold Solitaire Ring', category: 'Rings', price: 45999, stock: 12, material: 'Gold', purity: '22K', weight: 4.2, gemstone: 'Diamond' },
    { name: 'Classic Diamond Necklace', category: 'Necklaces', price: 125000, discountPrice: 110000, stock: 5, material: 'Gold', purity: '18K', weight: 15, gemstone: 'Diamond' },
    { name: 'Pearl Drop Earrings', category: 'Earrings', price: 18500, stock: 20, material: 'Silver', purity: '925 Sterling', weight: 3.1, gemstone: 'Pearl' },
    { name: 'Traditional Gold Bangle Set', category: 'Bangles', price: 68000, stock: 8, material: 'Gold', purity: '22K', weight: 22 },
    { name: 'Rose Gold Charm Bracelet', category: 'Bracelets', price: 22500, stock: 15, material: 'Rose Gold', purity: '18K', weight: 6.5 },
    { name: 'Emerald Pendant', category: 'Pendants', price: 34500, stock: 10, material: 'Gold', purity: '22K', weight: 5, gemstone: 'Emerald' },
  ];

  for (const p of sampleProducts) {
    const slug = p.name.toLowerCase().replace(/\s+/g, '-');
    const exists = await Product.findOne({ slug });
    if (!exists) {
      await Product.create({
        ...p,
        slug,
        sku: 'SKU-' + Math.floor(Math.random() * 100000000),
        category: categories[p.category]._id,
        description: `Handcrafted ${p.name.toLowerCase()} made with the finest materials.`,
        images: [],
        isFeatured: true,
      });
    }
  }
  console.log('Sample products seeded');

  await mongoose.connection.close();
  console.log('Seeding complete.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
