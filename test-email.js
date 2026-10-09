require('dotenv').config();
const transporter = require('./config/email');
const { sendEmail, verifyTransporter } = transporter;

const targetEmail = process.argv[2];

const runTest = async () => {
  console.log('====================================================');
  console.log('📧 DOPtv - Gmail SMTP Nodemailer Verification Test');
  console.log('====================================================\n');

  console.log(`Configured Sender: ${process.env.NODEMAILER_EMAIL ? process.env.NODEMAILER_EMAIL.replace(/(.{3})(.*)(@.*)/, '$1***$3') : '(None)'}`);

  console.log('\n[1/2] Verifying SMTP connection...');
  const isVerified = await verifyTransporter();

  if (!isVerified) {
    console.error('\n❌ SMTP verification failed. Please check your credentials in server/.env:');
    console.error('   NODEMAILER_EMAIL=yourgmail@gmail.com');
    console.error('   NODEMAILER_PASS=your-16-character-app-password\n');
    process.exit(1);
  }

  if (!targetEmail) {
    console.log('\n✅ Transporter is verified and ready to send emails!');
    console.log('\n💡 To send a live test email to a real recipient, provide the recipient address:');
    console.log('   node test-email.js your-actual-email@gmail.com\n');
    process.exit(0);
  }

  console.log(`\n[2/2] Sending test email to: ${targetEmail}...`);
  const result = await sendEmail({
    to: targetEmail,
    subject: 'DOPtv Gmail SMTP Verification Test',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #047857; margin-top: 0;">DOPtv Email Test Successful!</h2>
        <p>This message confirms that <strong>Gmail SMTP with Nodemailer</strong> is successfully configured and sending real emails for DOPtv.</p>
        <p><strong>Recipient:</strong> ${targetEmail}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    `,
    text: `DOPtv Email Test Successful!\nRecipient: ${targetEmail}\nTimestamp: ${new Date().toISOString()}`,
  });

  if (result.error) {
    console.error('\n❌ Email delivery failed:', result.error);
    process.exit(1);
  }

  console.log('\n🎉 Real test email successfully sent and accepted by Gmail!');
  console.log(`   Message ID: ${result.messageId}`);
  console.log(`   Accepted:   ${JSON.stringify(result.accepted)}`);
  console.log('\n====================================================\n');
  process.exit(0);
};

runTest();
