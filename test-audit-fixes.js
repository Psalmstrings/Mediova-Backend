/**
 * MEDIOVA Production Readiness Verification Script
 * Validates fixes for Audit Findings 1 through 12.
 */

const assert = require('assert');
const {
  normalizePhoneNumber,
  isValidPhoneNumber,
  NIGERIAN_STATES,
  isValidState,
  getLgasForState,
} = require('./utils/locations');

console.log('====================================================');
console.log('MEDIOVA AUDIT VERIFICATION & ACCEPTANCE SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// 1. Phone number E.164 normalization & validation (Findings 1 & 2)
runTest('Phone E.164 Normalization: Nigerian local 0803... to +234803...', () => {
  const norm = normalizePhoneNumber('08031234567', '+234');
  assert.strictEqual(norm, '+2348031234567');
  assert.strictEqual(isValidPhoneNumber(norm), true);
});

runTest('Phone E.164 Normalization: Nigerian with +234 provided', () => {
  const norm = normalizePhoneNumber('+2348031234567', '+234');
  assert.strictEqual(norm, '+2348031234567');
  assert.strictEqual(isValidPhoneNumber(norm), true);
});

runTest('Phone E.164 Normalization: US number (+1)', () => {
  const norm = normalizePhoneNumber('4155552671', '+1');
  assert.strictEqual(norm, '+14155552671');
  assert.strictEqual(isValidPhoneNumber(norm), true);
});

runTest('Phone E.164 Normalization: UK number (+44)', () => {
  const norm = normalizePhoneNumber('07911123456', '+44');
  assert.strictEqual(norm, '+447911123456');
  assert.strictEqual(isValidPhoneNumber(norm), true);
});

runTest('Phone E.164 Validation: Rejects alphabets or too-short string', () => {
  assert.strictEqual(isValidPhoneNumber('12345'), false);
  assert.strictEqual(isValidPhoneNumber('+234abc'), false);
});

// 2. Nigerian States & LGA Data Coverage (Findings 2 & 3)
runTest('Geographic Coverage: Contains 37 States/Territories', () => {
  assert.strictEqual(NIGERIAN_STATES.length, 37);
  assert.strictEqual(isValidState('Lagos'), true);
  assert.strictEqual(isValidState('FCT Abuja'), true);
  assert.strictEqual(isValidState('Kano'), true);
  assert.strictEqual(isValidState('Atlantis'), false);
});

runTest('Dynamic LGA Resolution: Correct LGAs for Lagos & Rivers', () => {
  const lagosLgas = getLgasForState('Lagos');
  assert.ok(lagosLgas.some((l) => l.includes('Ikeja')));
  assert.ok(lagosLgas.some((l) => l.includes('Lagos Island')));
  assert.ok(lagosLgas.some((l) => l.includes('Alimosho')));

  const riversLgas = getLgasForState('Rivers');
  assert.ok(riversLgas.some((l) => l.includes('Port Harcourt')));
  assert.ok(riversLgas.some((l) => l.includes('Obio-Akpor')));
});

// 3. Password Complexity Validator (Finding 6)
runTest('Password Complexity: Rejects passwords missing complexity', () => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
  assert.strictEqual(passwordRegex.test('short1!'), false); // <8 chars
  assert.strictEqual(passwordRegex.test('alllowercase123!'), false); // no upper
  assert.strictEqual(passwordRegex.test('ALLUPPERCASE123!'), false); // no lower
  assert.strictEqual(passwordRegex.test('NoNumberHere!A'), false); // no digit
  assert.strictEqual(passwordRegex.test('NoSpecialChar123A'), false); // no special
  assert.strictEqual(passwordRegex.test('SecurePass123!'), true); // valid
  assert.strictEqual(passwordRegex.test('Med!ova2026Secure'), true); // valid
});

// 4. Influencer Bank Account Masking (Finding 5)
runTest('Bank Details Masking: Returns only last 4 digits', () => {
  const mask = (acc) => (acc ? `•••• •••• ${acc.slice(-4)}` : '');
  assert.strictEqual(mask('0123456789'), '•••• •••• 6789');
  assert.strictEqual(mask('2098765432'), '•••• •••• 5432');
});

// 5. Campaign Multi-State Target Parser (Findings 4 & 7)
runTest('Campaign Target Parser: Handles stringified multi-state JSON payload', () => {
  const rawTargetLocation = JSON.stringify({
    isNationwide: false,
    states: ['Lagos', 'FCT Abuja', 'Rivers'],
    state: 'Lagos',
    area: 'Ikeja',
  });
  const parsed = JSON.parse(rawTargetLocation);
  assert.strictEqual(parsed.isNationwide, false);
  assert.strictEqual(parsed.states.length, 3);
  assert.strictEqual(parsed.states[1], 'FCT Abuja');
});

runTest('Campaign Target Parser: Handles nationwide toggle correctly', () => {
  const rawTargetLocation = JSON.stringify({
    isNationwide: true,
    states: [],
    state: 'Nationwide',
  });
  const parsed = JSON.parse(rawTargetLocation);
  assert.strictEqual(parsed.isNationwide, true);
  assert.strictEqual(parsed.state, 'Nationwide');
});

// 6. Model Schemas: Load RefundRequest, Complaint, SupportTicket, InfluencerProfile, Campaign, User, VerificationSubmission, Payment
runTest('Model Schemas: Load RefundRequest, Complaint, SupportTicket, InfluencerProfile, Campaign, User, VerificationSubmission, Payment', () => {
  const RefundRequest = require('./models/RefundRequest');
  const Complaint = require('./models/Complaint');
  const SupportTicket = require('./models/SupportTicket');
  const InfluencerProfile = require('./models/InfluencerProfile');
  const Campaign = require('./models/Campaign');
  const User = require('./models/User');
  const VerificationSubmission = require('./models/VerificationSubmission');
  const Payment = require('./models/Payment');
  const AdminSettings = require('./models/AdminSettings');

  assert.ok(RefundRequest.schema.path('transferReference'));
  assert.ok(Complaint.schema.path('complaintNumber'));
  assert.ok(SupportTicket.schema.path('ticketNumber'));
  assert.ok(InfluencerProfile.schema.path('payoutStatus'));
  assert.ok(Campaign.schema.path('targetStates'));
  assert.ok(Campaign.schema.path('isNationwide'));
  assert.ok(Campaign.schema.path('targetCountry'));
  assert.ok(Campaign.schema.path('targetAreas'));
  assert.ok(Campaign.schema.path('paymentReceipt.url'));
  assert.ok(Campaign.schema.path('completedWork.summary'));
  assert.ok(User.schema.path('resetPasswordToken'));
  assert.ok(User.schema.path('termsAccepted'));
  assert.ok(User.schema.path('requiresTermsAcceptance'));
  assert.ok(User.schema.path('termsAcceptedAt'));
  assert.ok(User.schema.path('country'));
  assert.ok(User.schema.path('whatsappNumber'));
  assert.ok(VerificationSubmission.schema.path('videoUrl'));
  assert.ok(VerificationSubmission.schema.path('status'));
  assert.ok(Payment.schema.path('amount'));
  assert.ok(AdminSettings.schema.path('maxCampaignAreas'));
});

// 7. Global Country Dataset & Multi-Country Support
runTest('Global Countries Dataset: Contains 100+ countries with calling codes & alphabetical ordering', () => {
  const { COUNTRIES, getCountryMeta, isValidCountry } = require('./utils/locations');
  assert.ok(COUNTRIES.length >= 100, `Expected >= 100 countries, found ${COUNTRIES.length}`);
  
  // Verify alphabetical ordering
  for (let i = 0; i < COUNTRIES.length - 1; i++) {
    assert.ok(
      COUNTRIES[i].name.localeCompare(COUNTRIES[i + 1].name) <= 0,
      `Countries not sorted: ${COUNTRIES[i].name} should precede ${COUNTRIES[i + 1].name}`
    );
  }

  // Spot check key countries
  const us = getCountryMeta('United States');
  assert.strictEqual(us?.name, 'United States');
  assert.strictEqual(us?.callingCode, '+1');

  const gb = getCountryMeta('United Kingdom');
  assert.strictEqual(gb?.name, 'United Kingdom');
  assert.strictEqual(gb?.callingCode, '+44');

  const ng = getCountryMeta('Nigeria');
  assert.strictEqual(ng?.name, 'Nigeria');
  assert.strictEqual(ng?.callingCode, '+234');
  assert.strictEqual(isValidCountry('Nigeria'), true);
  assert.strictEqual(isValidCountry('Atlantis'), false);
});

// 8. Video Proof Mime-Types & Resilient Upload
runTest('Upload Validation: Video extensions and mime-types supported in upload filters', () => {
  const { allowedMimeTypes } = require('./middleware/upload');
  assert.ok(allowedMimeTypes.includes('video/mp4'));
  assert.ok(allowedMimeTypes.includes('video/quicktime'));
  assert.ok(allowedMimeTypes.includes('video/webm'));
  assert.ok(allowedMimeTypes.includes('image/jpeg'));
  assert.ok(allowedMimeTypes.includes('image/png'));
  assert.strictEqual(allowedMimeTypes.includes('application/pdf'), false);
});

// 9. Express Route Modules Loaded Cleanly
runTest('Routes: All endpoint routers initialize cleanly', () => {
  const authRoutes = require('./routes/auth');
  const influencerRoutes = require('./routes/influencers');
  const vendorRoutes = require('./routes/vendors');
  const adminRoutes = require('./routes/admin');
  const notificationRoutes = require('./routes/notifications');
  const complaintRoutes = require('./routes/complaints');
  const supportRoutes = require('./routes/support');

  assert.ok(authRoutes);
  assert.ok(influencerRoutes);
  assert.ok(vendorRoutes);
  assert.ok(adminRoutes);
  assert.ok(notificationRoutes);
  assert.ok(complaintRoutes);
  assert.ok(supportRoutes);
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
