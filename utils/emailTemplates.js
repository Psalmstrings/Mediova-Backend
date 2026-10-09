const BRANDING = require('../config/branding');

const getBaseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .header { background: #047857; color: #ffffff; padding: 30px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #a7f3d0; font-size: 14px; }
    .body { padding: 32px 28px; line-height: 1.6; color: #334155; }
    .cta-btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 30px; font-weight: 700; border-radius: 8px; margin: 20px 0; font-size: 15px; }
    .cta-btn:hover { background: #047857; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .tag { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 4px; border: 1px solid #a7f3d0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${BRANDING.APP_NAME}</h1>
      <p>${BRANDING.TAGLINE}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${BRANDING.APP_LEGAL_NAME}. All rights reserved.</p>
      <p>${BRANDING.LOCATION}</p>
    </div>
  </div>
</body>
</html>
`;

const templates = {
  verifyEmail: ({ name, verificationUrl }) => {
    const content = `
      <h2>Verify Your Email Address</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for joining ${BRANDING.APP_NAME}! Please verify your email address to activate your account and start using the platform.</p>
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="cta-btn">Verify Email Address</a>
      </p>
      <p>Or paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0284c7;"><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p><small>This link expires in 24 hours.</small></p>
    `;
    return {
      subject: `Verify Your Email Address - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Verify Email', content),
      text: `Hello ${name}, please verify your email by visiting: ${verificationUrl}`,
    };
  },

  welcome: ({ name, role }) => {
    const isVendor = role === 'vendor';
    const content = `
      <h2>Welcome to ${BRANDING.APP_NAME}!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been successfully verified! You are registered as a <strong>${isVendor ? 'Vendor / Advertiser' : 'WhatsApp Influencer'}</strong>.</p>
      ${isVendor
        ? `<p>You can now create targeted advertising campaigns to reach verified WhatsApp audiences across Nigeria. Submit your order and our brokerage team will distribute it directly to high-performing influencers.</p>`
        : `<p>Your profile is ready! Submit your average WhatsApp Status views and screenshots for verification so our broker team can assign high-paying advertising gigs directly to you.</p>`
      }
      <p style="margin-top: 24px;">Log in to access your dashboard and start today.</p>
    `;
    return {
      subject: `Welcome to ${BRANDING.APP_NAME} Advertising Marketplace!`,
      html: getBaseTemplate(`Welcome to ${BRANDING.APP_NAME}`, content),
      text: `Welcome to ${BRANDING.APP_NAME}, ${name}! Your account is now active.`,
    };
  },

  passwordReset: ({ name, resetUrl }) => {
    const content = `
      <h2>Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password on ${BRANDING.APP_NAME}. Click the button below to set a new password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="cta-btn">Reset Password</a>
      </p>
      <p>Or copy this link into your browser: <br><a href="${resetUrl}">${resetUrl}</a></p>
      <p><small>If you did not make this request, you can safely ignore this email.</small></p>
    `;
    return {
      subject: `Password Reset Request - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Password Reset', content),
      text: `Reset your password: ${resetUrl}`,
    };
  },

  gigAssigned: ({ name, campaignTitle, reward, gigUrl }) => {
    const content = `
      <h2>🎯 New Advertising Gig Assigned!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>The ${BRANDING.APP_NAME} Admin has matched and assigned a new advertising gig to your WhatsApp Status audience!</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Campaign:</strong> ${campaignTitle}</p>
        <p style="margin: 0;"><strong>Reward:</strong> <span style="color: #059669; font-weight: bold; font-size: 18px;">₦${Number(reward).toLocaleString()}</span></p>
      </div>
      <p style="text-align: center;">
        <a href="${gigUrl}" class="cta-btn">View & Accept Gig</a>
      </p>
    `;
    return {
      subject: `New Gig Assigned: ${campaignTitle} (₦${Number(reward).toLocaleString()}) - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('New Gig Assigned', content),
      text: `You have been assigned a new gig: ${campaignTitle} with reward ₦${reward}.`,
    };
  },

  gigApproved: ({ name, campaignTitle, reward }) => {
    const content = `
      <h2>✅ Gig Submission Approved!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your WhatsApp Status proof for <strong>${campaignTitle}</strong> has been reviewed and approved by the Admin broker!</p>
      <p>Your earnings of <strong>₦${Number(reward).toLocaleString()}</strong> have been credited to your approved balance.</p>
    `;
    return {
      subject: `Gig Proof Approved: ${campaignTitle} - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Gig Approved', content),
      text: `Your gig submission for ${campaignTitle} has been approved. ₦${reward} credited!`,
    };
  },

  gigRejected: ({ name, campaignTitle, reason }) => {
    const content = `
      <h2>⚠️ Gig Submission Needs Attention</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your gig submission for <strong>${campaignTitle}</strong> could not be approved due to the following reason:</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 14px 0; color: #991b1b;">
        <strong>Admin Feedback:</strong> ${reason || 'Proof did not meet campaign requirements.'}
      </div>
      <p>Please check your dashboard to review instructions or re-upload valid proof.</p>
    `;
    return {
      subject: `Gig Submission Update: ${campaignTitle} - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Gig Needs Attention', content),
      text: `Your gig submission for ${campaignTitle} was rejected: ${reason}`,
    };
  },

  orderReceived: ({ name, orderNumber, campaignTitle, totalAmount, whatsappUrl }) => {
    const content = `
      <h2>📋 Advertising Order Received</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for placing an advertising request for <strong>${campaignTitle}</strong>.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 6px;"><strong>Order ID:</strong> #${orderNumber}</p>
        <p style="margin: 0 0 6px;"><strong>Campaign:</strong> ${campaignTitle}</p>
        <p style="margin: 0;"><strong>Total Cost:</strong> ₦${Number(totalAmount).toLocaleString()}</p>
      </div>
      <p><strong>Next Step:</strong> Contact our Admin team on WhatsApp to confirm payment and finalize influencer distribution.</p>
      <p style="text-align: center;">
        <a href="${whatsappUrl}" class="cta-btn" style="background: #25D366;">Contact Admin on WhatsApp</a>
      </p>
    `;
    return {
      subject: `Order Received #${orderNumber}: ${campaignTitle} - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Order Received', content),
      text: `Order #${orderNumber} received for ${campaignTitle}. Total: ₦${totalAmount}.`,
    };
  },

  paymentConfirmed: ({ name, orderNumber, campaignTitle }) => {
    const content = `
      <h2>💰 Payment Confirmed!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your payment for order <strong>#${orderNumber}</strong> (${campaignTitle}) has been confirmed by the Admin broker!</p>
      <p>Our team is now actively matching and assigning qualified WhatsApp influencers within your target location.</p>
    `;
    return {
      subject: `Payment Confirmed #${orderNumber} - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Payment Confirmed', content),
      text: `Payment confirmed for order #${orderNumber} (${campaignTitle}).`,
    };
  },

  campaignCompleted: ({ name, campaignTitle, totalViews, influencersCount }) => {
    const content = `
      <h2>🎉 Campaign Completed!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your advertising campaign <strong>${campaignTitle}</strong> has successfully completed!</p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 6px;"><strong>Total Influencers Deployed:</strong> ${influencersCount}</p>
        <p style="margin: 0;"><strong>Verified Views Delivered:</strong> ${Number(totalViews).toLocaleString()}+</p>
      </div>
      <p>Visit your dashboard to view the full campaign performance report and analytics.</p>
    `;
    return {
      subject: `Campaign Completed: ${campaignTitle} - ${BRANDING.APP_NAME}`,
      html: getBaseTemplate('Campaign Completed', content),
      text: `Campaign ${campaignTitle} is complete! ${influencersCount} influencers delivered ${totalViews} views.`,
    };
  },
};

module.exports = templates;
