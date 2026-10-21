require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in server/.env');
  process.exit(1);
}

async function clearSeedData() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  const db = mongoose.connection.db;

  // 1. Find all seed dummy users (@example.com) and test users
  const usersCollection = db.collection('users');
  const allUsers = await usersCollection.find({}).toArray();
  console.log(`Total users in DB before clean: ${allUsers.length}`);

  // We keep Admin users (role === 'admin' or email === 'admin@mediova.ng')
  const adminUsers = allUsers.filter(u => u.role === 'admin' || u.email === 'admin@mediova.ng');
  const nonAdminUsers = allUsers.filter(u => u.role !== 'admin' && u.email !== 'admin@mediova.ng');

  console.log(`Admin accounts to keep: ${adminUsers.length} (${adminUsers.map(u => u.email).join(', ')})`);
  console.log(`Non-admin accounts to remove: ${nonAdminUsers.length} (${nonAdminUsers.map(u => u.email).join(', ')})`);

  const nonAdminIds = nonAdminUsers.map(u => u._id);

  // 2. Remove non-admin users
  if (nonAdminIds.length > 0) {
    const deleteUsersRes = await usersCollection.deleteMany({ _id: { $in: nonAdminIds } });
    console.log(`🗑️ Deleted ${deleteUsersRes.deletedCount} non-admin user(s)`);

    // 3. Remove corresponding influencer profiles
    const deleteInfRes = await db.collection('influencerprofiles').deleteMany({ userId: { $in: nonAdminIds } });
    console.log(`🗑️ Deleted ${deleteInfRes.deletedCount} influencer profile(s)`);

    // 4. Remove corresponding vendor profiles
    const deleteVenRes = await db.collection('vendorprofiles').deleteMany({ userId: { $in: nonAdminIds } });
    console.log(`🗑️ Deleted ${deleteVenRes.deletedCount} vendor profile(s)`);

    // 5. Remove campaigns, gigs, submissions, transactions
    const deleteCampRes = await db.collection('campaigns').deleteMany({});
    console.log(`🗑️ Deleted ${deleteCampRes.deletedCount} campaign(s)`);

    const deleteGigsRes = await db.collection('gigs').deleteMany({});
    console.log(`🗑️ Deleted ${deleteGigsRes.deletedCount} gig(s)`);

    const deleteSubRes = await db.collection('gigsubmissions').deleteMany({});
    console.log(`🗑️ Deleted ${deleteSubRes.deletedCount} gig submission(s)`);

    const deleteTxRes = await db.collection('transactions').deleteMany({});
    console.log(`🗑️ Deleted ${deleteTxRes.deletedCount} transaction(s)`);

    const deleteNotifRes = await db.collection('notifications').deleteMany({});
    console.log(`🗑️ Deleted ${deleteNotifRes.deletedCount} notification(s)`);
  } else {
    console.log('No non-admin users to remove.');
  }

  // Verify Admin user still exists and password is valid
  const User = require('./models/User');
  let admin = await User.findOne({ email: 'admin@mediova.ng' }).select('+password');
  if (!admin) {
    console.log('⚠️ Admin user not found! Re-creating admin user...');
    admin = await User.create({
      name: 'MEDIOVA Admin',
      email: 'admin@mediova.ng',
      password: 'Admin@123456',
      role: 'admin',
      emailVerified: true,
      accountStatus: 'active',
    });
    console.log('✅ Created Admin user: admin@mediova.ng / Admin@123456');
  } else {
    // Ensure password matches Admin@123456
    const valid = await admin.matchPassword('Admin@123456');
    if (!valid) {
      console.log('Updating Admin password to Admin@123456...');
      admin.password = 'Admin@123456';
      await admin.save();
      console.log('✅ Admin password updated to Admin@123456');
    } else {
      console.log('✅ Verified Admin account password is valid: Admin@123456');
    }
  }

  // Summary of remaining collections
  const collections = await db.listCollections().toArray();
  console.log('\n📊 Database Status After Cleanup:');
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count}`);
  }

  console.log('\n✨ Database cleanup complete! Only Admin details and platform configurations remain.');
  process.exit(0);
}

clearSeedData().catch(err => {
  console.error('❌ Error clearing seed data:', err);
  process.exit(1);
});
