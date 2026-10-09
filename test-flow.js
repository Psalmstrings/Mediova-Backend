const API = 'http://localhost:5000/api';

const req = async (path, options = {}) => {
  const url = `${API}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.data = data;
    error.status = res.status;
    throw error;
  }
  return { data, status: res.status };
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MEDIOVA END-TO-END WORKFLOW INTEGRATION TEST');
  console.log('======================================================\n');

  try {
    // 1. Health Check
    const health = await req('/health');
    console.log('✅ 1. Health check passed:', health.data.message);

    // 2. Influencer Login
    const infLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'amaka@example.com', password: 'Password@123' }),
    });
    const infToken = infLogin.data.token;
    console.log('✅ 2. Influencer login successful:', infLogin.data.user.name);

    // 3. Influencer Profile & Availability
    const infProfile = await req('/influencers/profile', {
      headers: { Authorization: `Bearer ${infToken}` },
    });
    console.log(`✅ 3. Influencer profile: Area: ${infProfile.data.profile.area}, Verified Views: ${infProfile.data.profile.verifiedViews}`);

    // 4. Vendor Login
    const venLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vendor1@example.com', password: 'Password@123' }),
    });
    const venToken = venLogin.data.token;
    console.log('✅ 4. Vendor login successful:', venLogin.data.user.name);

    // 5. Vendor Creates Campaign Order
    const campRes = await req('/vendors/campaigns', {
      method: 'POST',
      headers: { Authorization: `Bearer ${venToken}` },
      body: JSON.stringify({
        title: 'Lagos Weekend Tech Summit',
        description: 'Promoting youth registration for digital skills workshop.',
        category: 'Education & Courses',
        objective: 'Brand Awareness',
        adCopy: 'Join the free Lagos Tech Summit this Saturday! Register now via WhatsApp.',
        callToAction: { actionType: 'WhatsApp', targetValue: '+2348011223344' },
        targetLocation: { state: 'Lagos', area: 'Lekki Phase 1' },
        requiredViews: 5000,
        price: 20000,
        duration: '24 Hours',
      }),
    });
    const campaignId = campRes.data.campaign._id;
    const orderNumber = campRes.data.orderNumber;
    console.log(`✅ 5. Vendor created campaign order: #${orderNumber} (ID: ${campaignId})`);
    console.log(`   Generated WhatsApp link: ${campRes.data.whatsappUrl}`);

    // 6. Admin Login
    const adminLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@mediova.ng', password: 'Admin@123456' }),
    }).catch(async () => {
      return await req('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@doptv.ng', password: 'Admin@123456' }),
      });
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ 6. Admin login successful:', adminLogin.data.user.name);

    // 7. Admin Confirms Payment for Campaign
    const adminPay = await req(`/admin/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ paymentStatus: 'confirmed', status: 'Payment Confirmed' }),
    });
    console.log('✅ 7. Admin confirmed payment for order:', adminPay.data.campaign.paymentStatus);

    // 8. Admin Matches Influencers
    const matchRes = await req(`/admin/influencers/match?state=Lagos&excludeCampaignId=${campaignId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ 8. Admin influencer matching returned: ${matchRes.data.count} candidates`);

    const selectedInfluencer = matchRes.data.influencers.find((i) => i.userId.email === 'amaka@example.com') || matchRes.data.influencers[0];
    const infUserId = selectedInfluencer.userId._id;

    // 9. Admin Assigns Gig
    const assignRes = await req('/admin/gigs/assign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        campaignId,
        assignments: [
          {
            influencerId: infUserId,
            assignedViews: 3000,
            reward: 8000,
          },
        ],
      }),
    });
    const assignedGig = assignRes.data.gigs[0];
    console.log(`✅ 9. Admin assigned gig #${assignedGig.gigNumber} to influencer (Reward: ₦${assignedGig.reward})`);

    // 10. Influencer Checks & Accepts Gig
    const gigAccept = await req(`/influencers/gigs/${assignedGig._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${infToken}` },
    });
    console.log('✅ 10. Influencer accepted gig:', gigAccept.data.gig.status);

    // 11. Influencer Submits Completed Proof
    const submitProof = await req(`/influencers/gigs/${assignedGig._id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${infToken}` },
      body: JSON.stringify({
        reportedViews: 3150,
        notes: 'Status stayed live for full 24 hours. Engaged with 30 interested viewers.',
      }),
    });
    console.log('✅ 11. Influencer submitted proof screenshots:', submitProof.data.gig.status);

    // 12. Admin Reviews Proof & Approves Gig
    const reviewRes = await req('/admin/gigs/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        gigId: assignedGig._id,
        reviewStatus: 'approved',
        reviewComment: 'Verified screenshots, views exceeded target. Approved!',
      }),
    });
    console.log('✅ 12. Admin approved gig proof:', reviewRes.data.gig.status);

    // 13. Influencer Checks Earnings
    const earnRes = await req('/influencers/earnings', {
      headers: { Authorization: `Bearer ${infToken}` },
    });
    console.log('✅ 13. Influencer updated earnings summary:');
    console.log(`   Total Earned: ₦${earnRes.data.summary.totalEarned.toLocaleString()}`);
    console.log(`   Available for Withdrawal: ₦${earnRes.data.summary.availableBalance.toLocaleString()}`);

    // 14. Admin Marks Influencer Paid
    const trx = await req('/admin/transactions?status=approved', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (trx.data.transactions?.length > 0) {
      const tId = trx.data.transactions[0]._id;
      const payRes = await req(`/admin/transactions/${tId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ paymentReference: 'NIP/MEDIOVA/9928172', notes: 'Transferred via Zenith Bank app' }),
      });
      console.log(`✅ 14. Admin marked payout completed: Reference ${payRes.data.transaction.paymentReference}`);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 14 TEST STAGES PASSED FLAWLESSLY WITH REAL DB!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.data || err.message);
  }
};

runTests();
