const nodemailer = require('nodemailer');
const { getSetting } = require('../config/settings');

/**
 * Send an email safely (fails gracefully if SMTP is not configured)
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const smtpHost = await getSetting('smtp_host') || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = await getSetting('smtp_port') || process.env.SMTP_PORT || '587';
    const smtpUser = await getSetting('smtp_user') || process.env.SMTP_USER;
    const smtpPass = await getSetting('smtp_pass') || process.env.SMTP_PASS;
    const smtpFrom = await getSetting('smtp_from') || process.env.SMTP_FROM || '"Donate Plea" <noreply@donateplea.com>';

    if (!smtpUser || !smtpPass) {
      console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1e293b; color: #fff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; color: #fff;">Donate Plea</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff; color: #334155; line-height: 1.6;">
            ${htmlContent}
          </div>
          <div style="background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Donate Plea. Every plea deserves an answer.</p>
          </div>
        </div>
      `,
    });
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  // 1. Auth Emails
  sendWelcomeEmail: (email, name) => 
    sendEmail(email, 'Welcome to Donate Plea!', `
      <h3>Welcome, ${name}!</h3>
      <p>Thank you for joining Donate Plea. Your account has been created successfully.</p>
      <p>You can now start a campaign and make a difference.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background-color: #e11d48; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Go to Dashboard</a>
    `),

  // 2. Campaign Emails
  sendCampaignPendingEmail: (email, title) =>
    sendEmail(email, 'Campaign Under Review', `
      <h3>Campaign Submitted</h3>
      <p>Your campaign <strong>"${title}"</strong> has been successfully submitted and is currently pending review by our administration team.</p>
      <p>We will notify you as soon as it is approved!</p>
    `),

  sendCampaignApprovedEmail: (email, title, campaignId) =>
    sendEmail(email, 'Campaign Approved!', `
      <h3>Great News!</h3>
      <p>Your campaign <strong>"${title}"</strong> has been approved and is now live on the platform.</p>
      <a href="${process.env.FRONTEND_URL}/campaigns/${campaignId}" style="display: inline-block; background-color: #10b981; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">View Campaign</a>
    `),

  sendCampaignRejectedEmail: (email, title) =>
    sendEmail(email, 'Campaign Update', `
      <h3>Campaign Status Update</h3>
      <p>Unfortunately, your campaign <strong>"${title}"</strong> did not meet our guidelines and was rejected.</p>
      <p>Please contact support if you believe this was a mistake.</p>
    `),

  // 3. Donation Emails
  sendDonationReceiptEmail: (email, donorName, amount, campaignTitle, trackingUrl) =>
    sendEmail(email, 'Donation Receipt - Thank You!', `
      <h3>Thank You, ${donorName}!</h3>
      <p>Your donation of <strong>$${amount}</strong> to the campaign <strong>"${campaignTitle}"</strong> was successful.</p>
      <p>Your support makes a huge difference. You can track your impact using the link below:</p>
      <a href="${trackingUrl}" style="display: inline-block; background-color: #e11d48; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Track Donation</a>
    `),

  // 4. Withdrawal Emails
  sendWithdrawalRequestEmail: (email, amount, campaignTitle) =>
    sendEmail(email, 'Withdrawal Request Received', `
      <h3>Payout Requested</h3>
      <p>We have received your request to withdraw <strong>$${amount}</strong> from your campaign <strong>"${campaignTitle}"</strong>.</p>
      <p>Our team is reviewing the request, and you will be notified once it is approved and processed.</p>
    `),

  sendWithdrawalApprovedEmail: (email, amount, campaignTitle) =>
    sendEmail(email, 'Withdrawal Approved!', `
      <h3>Funds are on the way!</h3>
      <p>Your withdrawal request for <strong>$${amount}</strong> from your campaign <strong>"${campaignTitle}"</strong> has been approved and processed.</p>
      <p>Please allow 3-5 business days for the funds to reflect in your bank account.</p>
    `),

  sendWithdrawalRejectedEmail: (email, amount, campaignTitle) =>
    sendEmail(email, 'Withdrawal Update', `
      <h3>Withdrawal Request Declined</h3>
      <p>Your request to withdraw <strong>$${amount}</strong> from <strong>"${campaignTitle}"</strong> could not be processed at this time.</p>
      <p>Please log in to your dashboard to review your KYC status or contact support.</p>
    `),

  // 5. Test Emails
  sendTestEmail: (email) =>
    sendEmail(email, 'SMTP Test Successful', `
      <h3>Success!</h3>
      <p>If you are reading this, your SMTP configuration on Donate Plea is working perfectly.</p>
      <p>Automated emails will now be delivered successfully.</p>
    `),

  // 6. Password Reset
  sendPasswordResetEmail: (email, resetUrl) =>
    sendEmail(email, 'Password Reset Request', `
      <h3>Password Reset</h3>
      <p>We received a request to reset your password for Donate Plea.</p>
      <p>Click the button below to choose a new password. This link will expire in 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #1e293b; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">Reset Password</a>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">If you did not request this, please ignore this email.</p>
    `),
};
