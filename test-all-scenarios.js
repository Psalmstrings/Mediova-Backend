require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const transporter = require('./config/email');
const User = require('./models/User');
const InfluencerProfile = require('./models/InfluencerProfile');
const VendorProfile = require('./models/VendorProfile');
const Campaign = require('./models/Campaign');
const Gig = require('./models/Gig');
const GigSubmission = require('./models/GigSubmission');
const VerificationToken = require('./models/VerificationToken');
const Transaction = require('./models/Transaction');

// Routes
const authRoutes = require('./routes/auth');
const influencerRoutes = require('./routes/influencers');
const vendorRoutes = require('./routes/vendors');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require('./middleware/errorHandler');

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

const req = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
};

const runAllTests = async () => {
  console.log('\n================================================================');
  console.log('🧪 MEDIOVA - MANDATORY ACCEPTANCE TEST SUITE (SCENARIOS A - J)');
  console.log('================================================================\n');

  // 1. Initialize Express App
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/influencers', influencerRoutes);
  app.use('/api/vendors', vendorRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use(errorHandler);

  await connectDB();
  const server = app.listen(PORT);
  console.log(`🚀 Test server listening on ${BASE_URL}\n`);

  const results = {};
  const testTimestamp = Date.now().toString(36);

  try {
    // -----------------------------------------------------------------
    // TEST A: New influencer registration
    // -----------------------------------------------------------------
    console.log('--- TEST A: New Influencer Registration ---');
    const infEmail = `test_inf_${testTimestamp}@mediova.com`;
    const infPassword = 'Password@1234';

    const regInfRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Chioma Test Influencer',
        email: infEmail,
        phone: '08031112233',
        password: infPassword,
        role: 'influencer',
        state: 'Lagos',
        city: 'Ikeja',
        area: 'Allen Avenue',
        whatsappNumber: '08031112233',
        averageViews: 2500,
        selectedCategories: ['Fashion', 'Lifestyle'],
      }),
    });

    const infUserInDb = await User.findOne({ email: infEmail });
    const infTokens = await VerificationToken.find({ userId: infUserInDb?._id, type: 'email_verify' });

    if (
      regInfRes.status === 201 &&
      regInfRes.data.success === true &&
      regInfRes.data.token &&
      infUserInDb &&
      infUserInDb.emailVerified === true &&
      infTokens.length === 0
    ) {
      console.log('✅ Test A PASSED: Influencer registered successfully without verification token or email requirement.');
      results.testA = { status: 'PASSED', details: `User created (ID: ${infUserInDb._id}), emailVerified: true, token generated` };
    } else {
      throw new Error(`Test A FAILED: ${JSON.stringify(regInfRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST B: Immediate influencer login & dashboard access
    // -----------------------------------------------------------------
    console.log('\n--- TEST B: Immediate Influencer Login ---');
    const loginInfRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: infEmail, password: infPassword }),
    });

    const infToken = loginInfRes.data.token;
    const infProfileRes = await req('/influencers/profile', {
      headers: { Authorization: `Bearer ${infToken}` },
    });

    if (
      loginInfRes.status === 200 &&
      loginInfRes.data.success === true &&
      infToken &&
      loginInfRes.data.user.role === 'influencer' &&
      infProfileRes.status === 200 &&
      infProfileRes.data.profile
    ) {
      console.log('✅ Test B PASSED: Immediate login succeeded. Influencer accessed profile/dashboard without email verification.');
      results.testB = { status: 'PASSED', details: `Logged in immediately. Profile loaded: ${infProfileRes.data.profile.area}, views: ${infProfileRes.data.profile.averageViews}` };
    } else {
      throw new Error(`Test B FAILED: ${JSON.stringify(loginInfRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST C: New vendor registration & immediate login
    // -----------------------------------------------------------------
    console.log('\n--- TEST C: New Vendor Registration & Immediate Access ---');
    const venEmail = `test_ven_${testTimestamp}@mediova.com`;
    const venPassword = 'Password@1234';

    const regVenRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Oluwaseun Business',
        email: venEmail,
        phone: '08092223344',
        password: venPassword,
        role: 'vendor',
        businessName: 'Oluwa Tech Ventures',
        contactPerson: 'Oluwaseun',
        businessCategory: 'Technology',
        state: 'Lagos',
        area: 'Victoria Island',
      }),
    });

    const venUserInDb = await User.findOne({ email: venEmail });
    const venTokens = await VerificationToken.find({ userId: venUserInDb?._id, type: 'email_verify' });

    const loginVenRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: venEmail, password: venPassword }),
    });

    const venToken = loginVenRes.data.token;
    const venProfileRes = await req('/vendors/profile', {
      headers: { Authorization: `Bearer ${venToken}` },
    });

    if (
      regVenRes.status === 201 &&
      regVenRes.data.success === true &&
      venUserInDb?.emailVerified === true &&
      venTokens.length === 0 &&
      loginVenRes.status === 200 &&
      venProfileRes.status === 200 &&
      venProfileRes.data.profile.businessName === 'Oluwa Tech Ventures'
    ) {
      console.log('✅ Test C PASSED: Vendor registered and logged in immediately without email verification.');
      results.testC = { status: 'PASSED', details: `Vendor account created and verified immediately. Business: ${venProfileRes.data.profile.businessName}` };
    } else {
      throw new Error(`Test C FAILED: ${JSON.stringify(regVenRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST D: Existing unverified account login
    // -----------------------------------------------------------------
    console.log('\n--- TEST D: Existing Unverified Account Login ---');
    const unverifiedEmail = `legacy_unverified_${testTimestamp}@mediova.com`;
    const unverifiedPassword = 'LegacyPassword@123';

    // Directly seed an account with emailVerified: false (as if registered before the update)
    const legacyUser = await User.create({
      name: 'Legacy Unverified User',
      email: unverifiedEmail,
      phone: '08088889999',
      password: unverifiedPassword,
      role: 'influencer',
      emailVerified: false,
      accountStatus: 'active',
    });

    await InfluencerProfile.create({
      userId: legacyUser._id,
      whatsappNumber: '08088889999',
      state: 'Lagos',
      area: 'Yaba',
      verificationStatus: 'pending',
    });

    // Verify it is initially false
    const checkBefore = await User.findById(legacyUser._id);
    console.log(`   Initial legacy user in DB emailVerified: ${checkBefore.emailVerified}`);

    // Attempt login with valid credentials
    const legacyLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: unverifiedEmail, password: unverifiedPassword }),
    });

    const checkAfter = await User.findById(legacyUser._id);

    if (
      legacyLoginRes.status === 200 &&
      legacyLoginRes.data.success === true &&
      legacyLoginRes.data.token &&
      !legacyLoginRes.data.requiresVerification &&
      checkAfter.emailVerified === true
    ) {
      console.log('✅ Test D PASSED: Existing unverified account was NOT blocked, logged in successfully, and auto-updated to emailVerified: true.');
      results.testD = { status: 'PASSED', details: `Unverified account unblocked. emailVerified auto-updated from false to true in DB.` };
    } else {
      throw new Error(`Test D FAILED: status=${legacyLoginRes.status}, data=${JSON.stringify(legacyLoginRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST E: Invalid credentials rejected
    // -----------------------------------------------------------------
    console.log('\n--- TEST E: Invalid Credentials Rejection ---');
    const badLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: infEmail, password: 'WrongPassword999!' }),
    });

    if (badLoginRes.status === 401 && badLoginRes.data.success === false) {
      console.log('✅ Test E PASSED: Incorrect password was properly rejected with HTTP 401.');
      results.testE = { status: 'PASSED', details: 'Invalid credentials rejected with 401 and secure error message.' };
    } else {
      throw new Error(`Test E FAILED: Expected 401, got ${badLoginRes.status}`);
    }

    // -----------------------------------------------------------------
    // TEST F: Duplicate email registration handled safely
    // -----------------------------------------------------------------
    console.log('\n--- TEST F: Duplicate Email Handling ---');
    const dupRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Imposter User',
        email: infEmail, // duplicate
        phone: '08099990000',
        password: 'Password@123',
        role: 'influencer',
        state: 'Lagos',
        area: 'Ikeja',
      }),
    });

    if (
      dupRes.status === 400 &&
      dupRes.data.success === false &&
      !dupRes.data.requiresVerification &&
      dupRes.data.message.includes('already exists')
    ) {
      console.log('✅ Test F PASSED: Duplicate registration rejected safely without creating duplicate account or requiring verification.');
      results.testF = { status: 'PASSED', details: dupRes.data.message };
    } else {
      throw new Error(`Test F FAILED: ${JSON.stringify(dupRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST G: WhatsApp verification remains fully functional
    // -----------------------------------------------------------------
    console.log('\n--- TEST G: WhatsApp Verification Preservation ---');
    // Create dedicated test admin
    const testAdminEmail = `admin_${testTimestamp}@mediova.com`;
    const testAdminPass = 'Admin@123456';
    await User.create({
      name: 'Test Administrator',
      email: testAdminEmail,
      password: testAdminPass,
      role: 'admin',
      emailVerified: true,
      accountStatus: 'active',
    });

    const adminLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testAdminEmail, password: testAdminPass }),
    });

    const adminToken = adminLoginRes.data.token;

    // Influencer profile
    const infProfileInDb = await InfluencerProfile.findOne({ userId: infUserInDb._id });
    console.log(`   Influencer initial WhatsApp status: ${infProfileInDb.verificationStatus}`);

    // Admin verifies influencer's WhatsApp reach using influencer's userId
    const verifyRes = await req(`/admin/influencers/${infUserInDb._id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        verificationStatus: 'verified',
        verifiedViews: 2450,
        adminNotes: 'Verified via WhatsApp Status screenshot review',
      }),
    });

    const updatedProfile = await InfluencerProfile.findById(infProfileInDb._id);

    if (
      verifyRes.status === 200 &&
      updatedProfile.verificationStatus === 'verified' &&
      updatedProfile.verifiedViews === 2450 &&
      updatedProfile.whatsappNumber === '08031112233'
    ) {
      console.log('✅ Test G PASSED: WhatsApp reach verification workflow functions completely and independently.');
      results.testG = { status: 'PASSED', details: `WhatsApp reach verified to 2,450 views. Status: ${updatedProfile.verificationStatus}` };
    } else {
      throw new Error(`Test G FAILED: ${JSON.stringify(verifyRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST H: Admin task assignment triggers Nodemailer notification
    // -----------------------------------------------------------------
    console.log('\n--- TEST H: Admin Task Assignment with Nodemailer Notification ---');
    // Create Campaign Order as Vendor
    const campRes = await req('/vendors/campaigns', {
      method: 'POST',
      headers: { Authorization: `Bearer ${venToken}` },
      body: JSON.stringify({
        title: `Lagos Mega Sales Campaign ${testTimestamp}`,
        description: 'Promote 50% weekend fashion discount on your WhatsApp status.',
        category: 'Fashion',
        objective: 'Sales Conversion',
        adCopy: 'Flash Sale! Use code LAGOS50 on fashion items this weekend!',
        callToAction: { actionType: 'WhatsApp', targetValue: '+2348092223344' },
        targetLocation: { state: 'Lagos', area: 'Allen Avenue' },
        requiredViews: 2000,
        price: 15000,
        duration: '24 Hours',
        instructions: 'Post at 10:00 AM on Saturday. Keep active for 24 hours full duration.',
      }),
    });

    const campaignId = campRes.data.campaign._id;
    console.log(`   Created Campaign ID: ${campaignId}`);

    // Admin confirms payment
    await req(`/admin/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'confirmed', status: 'Payment Confirmed' }),
    });

    // Intercept/Spy on transporter.sendMail to verify email dispatch
    let capturedEmail = null;
    const originalSendMail = transporter.sendMail.bind(transporter);
    transporter.sendMail = async (mailOptions) => {
      capturedEmail = mailOptions;
      return { messageId: 'test-msg-12345', accepted: [mailOptions.to] };
    };

    const assignRes = await req('/admin/gigs/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        campaignId,
        assignments: [
          {
            influencerId: infUserInDb._id.toString(),
            assignedViews: 2000,
            reward: 6000,
          },
        ],
      }),
    });

    // Restore transporter.sendMail
    transporter.sendMail = originalSendMail;

    const assignedGig = await Gig.findOne({ campaignId, influencerId: infUserInDb._id });

    if (
      assignRes.status === 201 &&
      assignedGig &&
      assignedGig.reward === 6000 &&
      capturedEmail &&
      capturedEmail.to === infEmail &&
      capturedEmail.subject.includes('New Gig Assigned') &&
      capturedEmail.html.includes(assignedGig._id.toString())
    ) {
      console.log('✅ Test H PASSED: Task assignment saved to DB, gig created, and Nodemailer email notification triggered with campaign details and URL.');
      results.testH = {
        status: 'PASSED',
        details: `Gig #${assignedGig.gigNumber} created. Email dispatched to ${capturedEmail.to} with subject: "${capturedEmail.subject}"`,
      };
    } else {
      throw new Error(`Test H FAILED: assignRes=${JSON.stringify(assignRes.data)}, capturedEmail=${JSON.stringify(capturedEmail)}`);
    }

    // -----------------------------------------------------------------
    // TEST I: Email service failure does NOT roll back gig assignment
    // -----------------------------------------------------------------
    console.log('\n--- TEST I: Email Service Failure Resilience ---');
    // Create a 2nd influencer
    const inf2Email = `test_inf2_${testTimestamp}@mediova.com`;
    const regInf2 = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Emeka Resilience Test',
        email: inf2Email,
        phone: '08077778899',
        password: 'Password@123',
        role: 'influencer',
        state: 'Lagos',
        area: 'Surulere',
        whatsappNumber: '08077778899',
        averageViews: 1800,
      }),
    });

    const inf2UserId = regInf2.data.user.id;

    // Simulate SMTP failure by forcing transporter.sendMail to throw/reject
    transporter.sendMail = async () => {
      throw new Error('Simulated Gmail SMTP connection timeout [ECONNREFUSED]');
    };

    const assignFailEmailRes = await req('/admin/gigs/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        campaignId,
        assignments: [
          {
            influencerId: inf2UserId,
            assignedViews: 1500,
            reward: 4500,
          },
        ],
      }),
    });

    // Restore transporter
    transporter.sendMail = originalSendMail;

    const assignedGig2 = await Gig.findOne({ campaignId, influencerId: inf2UserId });

    // Influencer 2 fetches their gigs
    const inf2Token = regInf2.data.token;
    const inf2GigsRes = await req('/influencers/gigs', {
      headers: { Authorization: `Bearer ${inf2Token}` },
    });

    if (
      assignFailEmailRes.status === 201 &&
      assignedGig2 &&
      assignedGig2.reward === 4500 &&
      inf2GigsRes.status === 200 &&
      inf2GigsRes.data.gigs.some((g) => g._id.toString() === assignedGig2._id.toString())
    ) {
      console.log('✅ Test I PASSED: When email delivery failed, assignment was NOT rolled back. Gig was safely saved and visible in influencer dashboard.');
      results.testI = {
        status: 'PASSED',
        details: 'Assignment succeeded with HTTP 201 despite SMTP failure. Gig confirmed visible in influencer dashboard.',
      };
    } else {
      throw new Error(`Test I FAILED: ${JSON.stringify(assignFailEmailRes.data)}`);
    }

    // -----------------------------------------------------------------
    // TEST J: End-to-end platform workflows intact
    // -----------------------------------------------------------------
    console.log('\n--- TEST J: End-to-End Workflow Verification ---');
    // 1. Influencer accepts gig
    const acceptRes = await req(`/influencers/gigs/${assignedGig._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${infToken}` },
    });

    // 2. Influencer submits proof
    const submitRes = await req(`/influencers/gigs/${assignedGig._id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${infToken}` },
      body: JSON.stringify({
        reportedViews: 2150,
        notes: 'Broadcasted to 2,150 views for 24h. Screenshot uploaded.',
      }),
    });

    // 3. Admin reviews & approves gig proof
    const reviewRes = await req('/admin/gigs/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        gigId: assignedGig._id.toString(),
        reviewStatus: 'approved',
        reviewComment: 'Verified 2,150 views.',
      }),
    });

    // 4. Influencer checks updated earnings
    const earningsRes = await req('/influencers/earnings', {
      headers: { Authorization: `Bearer ${infToken}` },
    });

    if (
      acceptRes.status === 200 &&
      acceptRes.data.gig.status === 'accepted' &&
      submitRes.status === 200 &&
      submitRes.data.gig.status === 'submitted' &&
      reviewRes.status === 200 &&
      reviewRes.data.gig.status === 'approved' &&
      earningsRes.status === 200 &&
      earningsRes.data.summary.totalEarned >= 6000
    ) {
      console.log('✅ Test J PASSED: Full lifecycle (Accept Gig -> Submit Proof -> Admin Review -> Earnings Credited) works flawlessly.');
      results.testJ = {
        status: 'PASSED',
        details: `Gig accepted, submitted, approved, and earnings credited: ₦${earningsRes.data.summary.totalEarned.toLocaleString()}`,
      };
    } else {
      throw new Error(`Test J FAILED: ${JSON.stringify(reviewRes.data)}`);
    }

    // -----------------------------------------------------------------
    // FINAL SUMMARY
    // -----------------------------------------------------------------
    console.log('\n================================================================');
    console.log('🏆 ALL 10 MANDATORY TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');
    console.table(results);
  } catch (error) {
    console.error('\n❌ TEST RUNNER FAILED:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    console.log('\nServer & Database connections closed.');
    process.exit(0);
  }
};

runAllTests();
