const nodemailer = require('nodemailer');
const { getSetting } = require('../config/settings');

const getEmailTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; color: transparent; opacity: 0;">
    ${previewText}
  </div>
  
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); padding: 32px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">💜 Donate Plea</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px; color: #334155; font-size: 16px; line-height: 1.6;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
        © ${new Date().getFullYear()} Donate Plea.<br>
        Every plea deserves an answer.
      </p>
    </div>
    
  </div>
</body>
</html>
`;

const getButtonHtml = (url, text) => `
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; margin-bottom: 24px;">
    <tr>
      <td align="left">
        <a href="${url}" style="display: inline-block; background-color: #9333ea; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

/**
 * Send an email safely (fails gracefully if SMTP is not configured)
 */
const sendEmail = async (to, subject, htmlContent, previewText = '') => {
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
      html: getEmailTemplate(htmlContent, previewText),
    });
    console.log(`Email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  // 1. Auth Emails
  sendEmailVerificationEmail: (email, name, verifyUrl) =>
    sendEmail(
      email,
      'Verify your email address — Donate Plea',
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Almost there, ${name}! 🎉</h3>
        <p style="margin: 0 0 16px;">Thanks for signing up for Donate Plea. Before you can log in, we need to confirm your email address.</p>
        <p style="margin: 0 0 16px;">Click the button below to verify your email. This link expires in <strong>24 hours</strong>.</p>
        ${getButtonHtml(verifyUrl, '✅ Verify My Email Address')}
        <p style="margin-top: 32px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">If you did not create an account, you can safely ignore this email.</p>
      `,
      'Confirm your email to activate your Donate Plea account.'
    ),

  sendWelcomeEmail: (email, name) =>
    sendEmail(
      email,
      'Welcome to Donate Plea!',
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Welcome, ${name}!</h3>
        <p style="margin: 0 0 16px;">Your email has been verified and your Donate Plea account is now fully active.</p>
        <p style="margin: 0 0 16px;">You can now create campaigns and start raising funds for causes that matter to you.</p>
        ${getButtonHtml(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`, 'Go to Dashboard')}
      `,
      'Your account has been verified and is ready to use.'
    ),

  // 2. Campaign Emails
  sendCampaignPendingEmail: (email, title) =>
    sendEmail(
      email, 
      'Campaign Under Review', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Campaign Submitted</h3>
        <p style="margin: 0 0 16px;">Your campaign <strong style="color: #9333ea;">"${title}"</strong> has been successfully submitted!</p>
        <p style="margin: 0 0 16px;">It is currently pending review by our administration team to ensure it meets platform guidelines. This process usually takes less than 24 hours.</p>
        <p style="margin: 0 0 16px;">We will notify you the moment it is approved and live.</p>
      `,
      'Your campaign has been successfully submitted and is pending review.'
    ),

  sendCampaignApprovedEmail: (email, title, campaignId) =>
    sendEmail(
      email, 
      'Campaign Approved!', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Great News! 🎉</h3>
        <p style="margin: 0 0 16px;">Your campaign <strong style="color: #9333ea;">"${title}"</strong> has been officially approved and is now live on the platform.</p>
        <p style="margin: 0 0 16px;">You can now start sharing your campaign link with your network to begin raising funds.</p>
        ${getButtonHtml(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/campaigns/${campaignId}`, 'View Your Campaign')}
      `,
      'Your campaign has been approved and is now live!'
    ),

  sendCampaignRejectedEmail: (email, title) =>
    sendEmail(
      email, 
      'Campaign Status Update', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Campaign Update</h3>
        <p style="margin: 0 0 16px;">Unfortunately, your campaign <strong style="color: #9333ea;">"${title}"</strong> could not be approved at this time as it did not meet our community guidelines.</p>
        <p style="margin: 0 0 16px;">Please log in to your dashboard to review the feedback, or contact our support team if you believe this was a mistake.</p>
      `,
      'Important update regarding your recent campaign submission.'
    ),

  // 3. Donation Emails
  sendDonationReceiptEmail: (email, donorName, amount, campaignTitle, trackingUrl) =>
    sendEmail(
      email, 
      'Donation Receipt - Thank You!', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Thank You, ${donorName}! 💜</h3>
        <p style="margin: 0 0 16px;">We successfully processed your donation of <strong style="color: #10b981; font-size: 18px;">$${amount}</strong> to support <strong style="color: #9333ea;">"${campaignTitle}"</strong>.</p>
        <p style="margin: 0 0 16px;">Your generosity is what makes our community so powerful. You can track the impact of your donation at any time using the link below:</p>
        ${getButtonHtml(trackingUrl, 'Track Your Donation')}
      `,
      `Your donation of $${amount} to ${campaignTitle} was successful.`
    ),

  // 4. Withdrawal Emails
  sendWithdrawalRequestEmail: (email, amount, campaignTitle) =>
    sendEmail(
      email, 
      'Withdrawal Request Received', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Payout Requested</h3>
        <p style="margin: 0 0 16px;">We have received your request to withdraw <strong style="color: #10b981; font-size: 18px;">$${amount}</strong> from your campaign <strong style="color: #9333ea;">"${campaignTitle}"</strong>.</p>
        <p style="margin: 0 0 16px;">Our financial team is reviewing the request. You will receive an email once it is approved and the transfer has been initiated.</p>
      `,
      `We received your request to withdraw $${amount}.`
    ),

  sendWithdrawalApprovedEmail: (email, amount, campaignTitle) =>
    sendEmail(
      email, 
      'Withdrawal Approved!', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Funds are on the way! 💸</h3>
        <p style="margin: 0 0 16px;">Your withdrawal request for <strong style="color: #10b981; font-size: 18px;">$${amount}</strong> from <strong style="color: #9333ea;">"${campaignTitle}"</strong> has been approved and processed.</p>
        <p style="margin: 0 0 16px;">Please allow 3-5 business days for the funds to reflect in your bank account, depending on your financial institution.</p>
      `,
      `Your withdrawal for $${amount} has been processed and is on the way.`
    ),

  sendWithdrawalRejectedEmail: (email, amount, campaignTitle) =>
    sendEmail(
      email, 
      'Withdrawal Update', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Withdrawal Request Declined</h3>
        <p style="margin: 0 0 16px;">Your request to withdraw <strong style="color: #10b981; font-size: 18px;">$${amount}</strong> from <strong style="color: #9333ea;">"${campaignTitle}"</strong> could not be processed at this time.</p>
        <p style="margin: 0 0 16px;">Please log in to your dashboard to review your KYC verification status, or reach out to support for more details.</p>
      `,
      'Your recent withdrawal request could not be processed.'
    ),

  // 5. Test Emails
  sendTestEmail: (email) =>
    sendEmail(
      email, 
      'SMTP Test Successful', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Success! ✉️</h3>
        <p style="margin: 0 0 16px;">If you are reading this, your SMTP configuration on Donate Plea is working perfectly.</p>
        <p style="margin: 0 0 16px;">All automated system emails will now be delivered successfully.</p>
      `,
      'Your SMTP configuration on Donate Plea is working perfectly.'
    ),

  // 6. Password Reset
  sendPasswordResetEmail: (email, resetUrl) =>
    sendEmail(
      email, 
      'Password Reset Request', 
      `
        <h3 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">Password Reset</h3>
        <p style="margin: 0 0 16px;">We received a request to reset your password for your Donate Plea account.</p>
        <p style="margin: 0 0 16px;">Click the button below to choose a new secure password. This link will safely expire in 1 hour.</p>
        ${getButtonHtml(resetUrl, 'Reset Your Password')}
        <p style="margin-top: 32px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
      `,
      'Instructions to reset your Donate Plea password.'
    ),
};
