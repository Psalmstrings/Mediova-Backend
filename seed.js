require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const InfluencerProfile = require('./models/InfluencerProfile');
const VendorProfile = require('./models/VendorProfile');
const Category = require('./models/Category');
const ReachPackage = require('./models/ReachPackage');
const AdminSettings = require('./models/AdminSettings');
const Campaign = require('./models/Campaign');
const Gig = require('./models/Gig');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doptv';

const adCategories = [
  'Electronics', 'Phones & Gadgets', 'Fashion', 'Beauty & Cosmetics', 'Food & Drinks',
  'Furniture & Home', 'Automobiles', 'Real Estate', 'Finance & Investment', 'Insurance',
  'Logistics & Delivery', 'Digital Services', 'Consulting', 'Events & Concerts',
  'Music & Entertainment', 'Education & Courses', 'Fitness & Health', 'Travel & Tourism',
  'General Advertising', 'E-commerce', 'Lifestyle', 'Jobs & Career',
];

const objectives = [
  'Brand Awareness', 'Product Promotion', 'Generate Sales', 'Generate WhatsApp Leads',
  'Event Promotion', 'Website Traffic', 'Product Launch', 'Location Promotion', 'General Awareness',
];

const influencerCategories = [
  'Fashion', 'Beauty', 'Electronics', 'Technology', 'Food', 'Restaurants', 'Real Estate',
  'Education', 'Finance', 'Business', 'Events', 'Entertainment', 'Sports', 'Travel', 'Fitness',
  'Automobile', 'E-commerce', 'Jobs & Career', 'Lifestyle', 'General Advertising',
];

const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('📦 Connected to MongoDB');

  // Drop database to ensure clean schema indexes
  try {
    await mongoose.connection.db.dropDatabase();
    console.log('🗑️  Dropped database cleanly');
  } catch (e) {
    console.log('Database clean start');
  }

  // === CATEGORIES ===
  const categoryDocs = [
    ...adCategories.map((name, i) => ({ name, type: 'ad', status: 'active', displayOrder: i })),
    ...objectives.map((name, i) => ({ name, type: 'objective', status: 'active', displayOrder: i })),
    ...influencerCategories.map((name, i) => ({ name, type: 'influencer', status: 'active', displayOrder: i })),
  ];
  await Category.insertMany(categoryDocs);
  console.log(`✅ Created ${categoryDocs.length} categories`);

  // === REACH PACKAGES ===
  const packages = [
    { name: '1,000 Views', minimumViews: 1000, price: 5000, description: 'Great for local business awareness', status: 'active', displayOrder: 0 },
    { name: '5,000 Views', minimumViews: 5000, price: 20000, description: 'Ideal for product launches & events', status: 'active', displayOrder: 1 },
    { name: '10,000 Views', minimumViews: 10000, price: 35000, description: 'High-reach campaign for growing brands', status: 'active', displayOrder: 2 },
    { name: '25,000 Views', minimumViews: 25000, price: 75000, description: 'Premium city-wide exposure', status: 'active', displayOrder: 3 },
    { name: '50,000 Views', minimumViews: 50000, price: 130000, description: 'Maximum reach across multiple LGAs', status: 'active', displayOrder: 4 },
    { name: 'Custom Package', minimumViews: 1000, price: 0, description: 'Contact Admin for custom pricing', status: 'active', displayOrder: 5 },
  ];
  await ReachPackage.insertMany(packages);
  console.log(`✅ Created ${packages.length} reach packages`);

  // === ADMIN SETTINGS ===
  await AdminSettings.create({
    platformName: 'MEDIOVA Advertising',
    platformTagline: 'Turn WhatsApp Status views into income. Reach real people through trusted WhatsApp audiences.',
    supportEmail: 'support@mediova.ng',
    supportPhone: '+2348012345678',
    whatsappNumber: '+2348012345678',
    businessAddress: 'Victoria Island, Lagos, Nigeria',
    defaultWhatsAppMessage: 'Hello MEDIOVA Team, I have submitted advertising order #{ORDER_NUMBER} for "{TITLE}" and would like to complete payment.',
    bankDetails: {
      bankName: 'Zenith Bank Nigeria',
      accountName: 'MEDIOVA Media Brokerage Ltd',
      accountNumber: '1012345678',
    },
  });
  console.log('✅ Created admin settings');

  // === ADMIN ACCOUNT ===
  const adminUser = await User.create({
    name: 'MEDIOVA Admin',
    email: 'admin@mediova.ng',
    password: 'Admin@123456',
    role: 'admin',
    emailVerified: true,
    accountStatus: 'active',
  });
  console.log(`✅ Admin account: admin@mediova.ng / Admin@123456`);

  // === INFLUENCERS ===
  const influencerData = [
    { name: 'Amaka Okafor', email: 'amaka@example.com', state: 'Lagos', city: 'Lagos', lga: 'Eti-Osa', area: 'Lekki Phase 1', views: 3200, verifiedViews: 3000, cats: ['Fashion', 'Beauty', 'Lifestyle'] },
    { name: 'Chidi Eze', email: 'chidi@example.com', state: 'Lagos', city: 'Lagos', lga: 'Ikeja', area: 'GRA Ikeja', views: 1800, verifiedViews: 1500, cats: ['Electronics', 'Technology', 'Finance'] },
    { name: 'Ngozi Adeyemi', email: 'ngozi@example.com', state: 'Abuja', city: 'Abuja', lga: 'Garki', area: 'Garki District', views: 2500, verifiedViews: 2200, cats: ['Real Estate', 'Business', 'Finance'] },
    { name: 'Tunde Bakare', email: 'tunde@example.com', state: 'Lagos', city: 'Lagos', lga: 'Surulere', area: 'Aguda', views: 900, verifiedViews: 800, cats: ['Food', 'Lifestyle', 'Events'] },
    { name: 'Blessing Nwachukwu', email: 'blessing@example.com', state: 'Rivers', city: 'Port Harcourt', lga: 'Obio-Akpor', area: 'Rumuola', views: 1400, verifiedViews: 1200, cats: ['Fashion', 'Beauty', 'General Advertising'] },
    { name: 'Emeka Obi', email: 'emeka@example.com', state: 'Lagos', city: 'Lagos', lga: 'Victoria Island', area: 'Victoria Island', views: 4100, verifiedViews: 4000, cats: ['Events', 'Entertainment', 'Business'] },
    { name: 'Fatima Abdullahi', email: 'fatima@example.com', state: 'Kano', city: 'Kano', lga: 'Nassarawa', area: 'Nassarawa', views: 2100, verifiedViews: 2000, cats: ['Fashion', 'Education', 'Lifestyle'] },
    { name: 'Segun Adewale', email: 'segun@example.com', state: 'Oyo', city: 'Ibadan', lga: 'Ibadan North', area: 'Ring Road', views: 1100, verifiedViews: 1000, cats: ['Automobile', 'Finance', 'Business'] },
  ];

  for (let i = 0; i < influencerData.length; i++) {
    const d = influencerData[i];
    const user = await User.create({
      name: d.name,
      email: d.email,
      password: 'Password@123',
      role: 'influencer',
      emailVerified: true,
      accountStatus: 'active',
      phone: `+23480${10000000 + i}`,
    });
    await InfluencerProfile.create({
      userId: user._id,
      whatsappNumber: `+23480${10000000 + i}`,
      state: d.state,
      city: d.city,
      lga: d.lga,
      area: d.area,
      additionalAreas: [],
      averageViews: d.views,
      verifiedViews: d.verifiedViews,
      categories: d.cats,
      availability: true,
      verificationStatus: 'verified',
      reliabilityScore: 90 + Math.floor(Math.random() * 10),
      completedGigs: Math.floor(Math.random() * 12),
      successfulGigs: Math.floor(Math.random() * 10),
    });
  }
  console.log(`✅ Created ${influencerData.length} influencer accounts`);

  // === VENDORS ===
  const vendorData = [
    { name: 'Chukwuemeka Johnson', email: 'vendor1@example.com', business: 'ChocoMart Superstore', category: 'Food & Drinks', state: 'Lagos', area: 'Ikeja' },
    { name: 'Sandra Okonkwo', email: 'vendor2@example.com', business: 'Sandra\'s Boutique', category: 'Fashion', state: 'Lagos', area: 'Lekki' },
    { name: 'Ahmed Ibrahim', email: 'vendor3@example.com', business: 'Prime Properties NG', category: 'Real Estate', state: 'Abuja', area: 'Maitama' },
    { name: 'Grace Uche', email: 'vendor4@example.com', business: 'TechHub Academy', category: 'Education & Courses', state: 'Lagos', area: 'Yaba' },
  ];

  for (let i = 0; i < vendorData.length; i++) {
    const d = vendorData[i];
    const user = await User.create({
      name: d.name,
      email: d.email,
      password: 'Password@123',
      role: 'vendor',
      emailVerified: true,
      accountStatus: 'active',
      phone: `+23481${10000000 + i}`,
    });
    await VendorProfile.create({
      userId: user._id,
      businessName: d.business,
      contactPerson: d.name,
      businessCategory: d.category,
      description: `${d.business} - Your trusted Nigerian ${d.category.toLowerCase()} provider.`,
      phone: `+23481${10000000 + i}`,
      whatsapp: `+23481${10000000 + i}`,
      state: d.state,
      area: d.area,
      verificationStatus: 'verified',
    });
  }
  console.log(`✅ Created ${vendorData.length} vendor accounts`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin Login: admin@mediova.ng / Admin@123456');
  console.log('Influencer Login: amaka@example.com / Password@123');
  console.log('Vendor Login: vendor1@example.com / Password@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
