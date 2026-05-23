// ============================================================
// ADMIN CONTROLLER — Platform management + Settings
// ============================================================
const pool = require('../config/db');
const { getAllSettings, setSetting, getSetting, getStripePublicKey, getStripeSecretKey } = require('../config/settings');
const emailService = require('../services/emailService');

// ─── User Management ──────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, kyc_status, is_banned, ban_type, ban_expires_at, ban_reason, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // Optional: add validation here

    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2, role = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, name, email, role, kyc_status, created_at`,
      [name, email, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User updated successfully.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
    }

    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Campaign Vetting ─────────────────────────────────────

const getPendingCampaigns = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS creator_name, u.email AS creator_email, u.kyc_status
       FROM campaigns c JOIN users u ON c.creator_id = u.id
       WHERE c.status = 'pending' ORDER BY c.created_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Pending campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS creator_name, u.email AS creator_email, u.kyc_status
       FROM campaigns c JOIN users u ON c.creator_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('All campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const approveCampaign = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE campaigns SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found or already processed.' });
    
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [result.rows[0].creator_id]);
    if (user.rows.length > 0) {
      await emailService.sendCampaignApprovedEmail(user.rows[0].email, result.rows[0].title, result.rows[0].id);
    }

    res.json({ success: true, message: 'Campaign approved.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const rejectCampaign = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE campaigns SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [result.rows[0].creator_id]);
    if (user.rows.length > 0) {
      await emailService.sendCampaignRejectedEmail(user.rows[0].email, result.rows[0].title);
    }

    res.json({ success: true, message: 'Campaign rejected.', data: { campaign: result.rows[0], reason: req.body.reason } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    
    res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const toggleCampaign = async (req, res) => {
  try {
    // Get current status first
    const current = await pool.query('SELECT status FROM campaigns WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found.' });

    const currentStatus = current.rows[0].status;
    // Toggle between active <-> paused. Rejected/pending stay as-is unless forced.
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    const result = await pool.query(
      `UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, req.params.id]
    );

    res.json({ success: true, message: `Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully.`, data: result.rows[0] });
  } catch (err) {
    console.error('Toggle campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const toggleSeoVisibility = async (req, res) => {
  try {
    const current = await pool.query('SELECT seo_visible FROM campaigns WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found.' });

    const newVal = !current.rows[0].seo_visible;
    const result = await pool.query(
      `UPDATE campaigns SET seo_visible = $1 WHERE id = $2 RETURNING *`,
      [newVal, req.params.id]
    );

    res.json({
      success: true,
      message: `SEO visibility ${newVal ? 'enabled' : 'disabled'}.`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Toggle SEO error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── KYC Verification ─────────────────────────────────────

const getAllKyc = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, kyc_status, kyc_full_name, kyc_dob, kyc_document_type, kyc_document_url, created_at 
       FROM users 
       WHERE kyc_status IN ('pending', 'verified', 'rejected') 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const approveKyc = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET kyc_status = 'verified' WHERE id = $1 AND kyc_status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found or already verified.' });
    res.json({ success: true, message: 'User KYC verified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const rejectKyc = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET kyc_status = 'rejected' WHERE id = $1 AND kyc_status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'User KYC rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Donations ──────────────────────────────────────────────

const getAllDonations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, c.title AS campaign_title, u.name AS donor_user_name
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const deleteDonation = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM donations WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    res.json({ success: true, message: 'Donation deleted successfully.' });
  } catch (err) {
    console.error('Delete donation error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Withdrawals ──────────────────────────────────────────

const getPendingWithdrawals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, u.name AS creator_name, c.title AS campaign_title
       FROM withdrawals w JOIN users u ON w.creator_id = u.id JOIN campaigns c ON w.campaign_id = c.id
       WHERE w.status = 'pending' ORDER BY w.created_at ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const approveWithdrawal = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE withdrawals SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });

    const wd = result.rows[0];
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [wd.creator_id]);
    const camp = await pool.query('SELECT title FROM campaigns WHERE id = $1', [wd.campaign_id]);
    if (user.rows.length > 0 && camp.rows.length > 0) {
      await emailService.sendWithdrawalApprovedEmail(user.rows[0].email, wd.amount, camp.rows[0].title);
    }

    res.json({ success: true, message: 'Withdrawal approved.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const rejectWithdrawal = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE withdrawals SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending' RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });

    const wd = result.rows[0];
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [wd.creator_id]);
    const camp = await pool.query('SELECT title FROM campaigns WHERE id = $1', [wd.campaign_id]);
    if (user.rows.length > 0 && camp.rows.length > 0) {
      await emailService.sendWithdrawalRejectedEmail(user.rows[0].email, wd.amount, camp.rows[0].title);
    }

    res.json({ success: true, message: 'Withdrawal rejected.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Platform Stats ───────────────────────────────────────

const getPlatformStats = async (req, res) => {
  try {
    const [campaigns, donations, users] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active, COUNT(*) FILTER (WHERE status = 'pending') AS pending FROM campaigns`),
      pool.query(`SELECT COUNT(*) AS total_donations, COALESCE(SUM(amount), 0) AS total_raised, COUNT(DISTINCT COALESCE(user_id::text, guest_email)) AS unique_donors FROM donations WHERE status = 'success'`),
      pool.query(`SELECT COUNT(*) AS total_users, COUNT(*) FILTER (WHERE role = 'creator') AS creators FROM users`)
    ]);
    res.json({ success: true, data: { campaigns: campaigns.rows[0], donations: donations.rows[0], users: users.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Platform Settings (Dynamic Stripe Keys) ──────────────

/**
 * GET /api/admin/settings
 * Returns all platform settings. Encrypted values are masked.
 */
const getSettings = async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * PUT /api/admin/settings/:key
 * Update a single platform setting. Encrypted values are auto-encrypted.
 */
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'Value is required.' });
    }

    await setSetting(key, value, req.user.id);

    res.json({
      success: true,
      message: `Setting "${key}" updated successfully.`
    });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

/**
 * GET /api/admin/settings/stripe-status
 * Returns whether Stripe keys are configured (without exposing them).
 */
const getStripeStatus = async (req, res) => {
  try {
    const publicKey = await getStripePublicKey();
    const hasPublic = publicKey && publicKey.length > 0 && publicKey.startsWith('pk_');

    res.json({
      success: true,
      data: {
        stripe_configured: hasPublic,
        public_key_preview: hasPublic ? `${publicKey.substring(0, 12)}...` : 'Not set'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/admin/settings/test-email
 * Sends a test email to verify SMTP configuration
 */
const testEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    await emailService.sendTestEmail(to);
    
    res.json({ success: true, message: 'Test email sent.' });
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ success: false, message: 'Failed to send test email.' });
  }
};

/**
 * POST /api/admin/donations/verify-pending
 * Loops through all 'pending' donations, checks their status on Stripe,
 * and marks them 'success' if Stripe confirms payment was completed.
 */
const verifyPendingDonations = async (req, res) => {
  try {
    const stripeSecretKey = await getStripeSecretKey();
    const stripe = require('stripe')(stripeSecretKey);

    // Fetch all pending donations that have a Stripe session ID
    const pending = await pool.query(
      `SELECT id, stripe_checkout_session_id, campaign_id, guest_email, guest_name, amount
       FROM donations
       WHERE status = 'pending' AND stripe_checkout_session_id IS NOT NULL`
    );

    if (pending.rows.length === 0) {
      return res.json({ success: true, message: 'No pending donations to verify.', verified: 0 });
    }

    let verified = 0;
    let failed = 0;
    const results = [];

    for (const donation of pending.rows) {
      try {
        const session = await stripe.checkout.sessions.retrieve(donation.stripe_checkout_session_id);

        if (session.payment_status === 'paid') {
          // Mark as success in DB
          await pool.query(
            `UPDATE donations
             SET status = 'success',
                 stripe_payment_intent_id = $1
             WHERE id = $2`,
            [session.payment_intent, donation.id]
          );
          verified++;
          results.push({ id: donation.id, result: 'verified', amount: donation.amount });

          // Send receipt email if we have the donor's email
          const donorEmail = donation.guest_email || session.customer_email;
          if (donorEmail) {
            const camp = await pool.query('SELECT title FROM campaigns WHERE id = $1', [donation.campaign_id]);
            if (camp.rows.length > 0) {
              const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${donation.stripe_checkout_session_id}`;
              await emailService.sendDonationReceiptEmail(
                donorEmail,
                donation.guest_name || 'Generous Donor',
                donation.amount,
                camp.rows[0].title,
                trackingUrl
              );
            }
          }
        } else {
          failed++;
          results.push({ id: donation.id, result: 'not_paid', status: session.payment_status });
        }
      } catch (err) {
        console.error(`Failed to verify session ${donation.stripe_checkout_session_id}:`, err.message);
        failed++;
        results.push({ id: donation.id, result: 'error', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Verification complete. ${verified} marked as success, ${failed} not paid or errored.`,
      verified,
      failed,
      results
    });
  } catch (err) {
    console.error('Verify pending donations error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

/**
 * POST /api/admin/campaigns/:id/add-funds
 * Allows an admin to add mock/manual funds to a campaign's balance.
 * Inserts a success donation record set in the past so that it is immediately available to withdraw.
 */
const addFundsToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    // Verify campaign exists
    const campaignRes = await pool.query('SELECT title, creator_id FROM campaigns WHERE id = $1', [id]);
    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    const campaign = campaignRes.rows[0];
    const { v4: uuidv4 } = require('uuid');
    const mockSessionId = `admin_add_${uuidv4()}`;
    const mockIntentId = `pi_admin_add_${uuidv4()}`;

    // Insert donation record in the past (e.g. 2 months ago) to ensure it is immediately available for withdrawal
    const result = await pool.query(
      `INSERT INTO donations (campaign_id, amount, guest_name, guest_email, status, stripe_checkout_session_id, stripe_payment_intent_id, created_at)
       VALUES ($1, $2, 'Platform Adjustment', 'admin@donateplea.com', 'success', $3, $4, NOW() - INTERVAL '2 months')
       RETURNING id, amount, created_at`,
      [id, parsedAmount, mockSessionId, mockIntentId]
    );

    res.json({
      success: true,
      message: `Successfully added $${parsedAmount.toFixed(2)} to campaign "${campaign.title}".`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Add funds error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

/**
 * POST /api/admin/users/:id/add-funds
 * Allows an admin to add funds directly to a user's balance.
 * Finds or automatically creates an active campaign for the user, and inserts a successful past donation.
 */
const addFundsToUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    // Verify user exists and is a creator or admin
    const userRes = await pool.query('SELECT name, role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const targetUser = userRes.rows[0];
    if (targetUser.role !== 'creator' && targetUser.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Funds can only be added to creators or admins.' });
    }

    let campaignId = req.body.campaign_id;

    if (!campaignId) {
      // Find if this user already has an active or paused campaign
      const campaignRes = await pool.query(
        `SELECT id FROM campaigns 
         WHERE creator_id = $1 AND status IN ('active', 'paused') 
         ORDER BY created_at DESC LIMIT 1`,
        [id]
      );

      if (campaignRes.rows.length > 0) {
        campaignId = campaignRes.rows[0].id;
      } else {
        // Create a default adjustment campaign for the user so they have a place to withdraw from
        console.log(`[ADMIN ADJUSTMENT] Creator ${id} has no campaign. Creating 'General Balance Adjustment' campaign.`);
        const newCampaign = await pool.query(
          `INSERT INTO campaigns (creator_id, title, description, category, goal_amount, status)
           VALUES ($1, $2, $3, 'general', 1000000.00, 'active')
           RETURNING id`,
          [id, 'General Balance Adjustment', 'System-generated campaign for platform wallet balance adjustments.']
        );
        campaignId = newCampaign.rows[0].id;
      }
    } else {
       // Verify the provided campaign belongs to the user
       const campaignRes = await pool.query('SELECT id FROM campaigns WHERE id = $1 AND creator_id = $2', [campaignId, id]);
       if (campaignRes.rows.length === 0) {
         return res.status(404).json({ success: false, message: 'Provided campaign not found or does not belong to this user.' });
       }
    }

    const { v4: uuidv4 } = require('uuid');
    const mockSessionId = `admin_add_user_${uuidv4()}`;
    const mockIntentId = `pi_admin_add_user_${uuidv4()}`;

    // Insert successful donation record in the past (2 months ago) to ensure it is immediately available
    await pool.query(
      `INSERT INTO donations (campaign_id, amount, guest_name, guest_email, status, stripe_checkout_session_id, stripe_payment_intent_id, created_at)
       VALUES ($1, $2, 'Platform Adjustment', 'admin@donateplea.com', 'success', $3, $4, NOW() - INTERVAL '2 months')`,
      [campaignId, parsedAmount, mockSessionId, mockIntentId]
    );

    res.json({
      success: true,
      message: `Successfully added $${parsedAmount.toFixed(2)} to ${targetUser.name}'s balance.`
    });
  } catch (err) {
    console.error('Add funds to user error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { ban_type, duration_days, reason } = req.body;

    if (!['temporary', 'permanent'].includes(ban_type)) {
      return res.status(400).json({ success: false, message: 'Invalid ban type. Must be temporary or permanent.' });
    }

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot ban yourself.' });
    }

    let ban_expires_at = null;
    if (ban_type === 'temporary') {
      if (!duration_days || isNaN(duration_days) || duration_days <= 0) {
        return res.status(400).json({ success: false, message: 'Valid duration in days is required for temporary bans.' });
      }
      ban_expires_at = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000);
    }

    const userRes = await pool.query(
      `UPDATE users 
       SET is_banned = TRUE, 
           ban_type = $1, 
           ban_expires_at = $2, 
           ban_reason = $3, 
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, kyc_status, is_banned, ban_type, ban_expires_at, ban_reason, created_at`,
      [ban_type, ban_expires_at, reason || null, id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];

    // Send email notification
    await emailService.sendUserBannedEmail(
      user.email,
      user.name,
      user.ban_type,
      user.ban_expires_at,
      user.ban_reason
    );

    res.json({ success: true, message: 'User banned successfully.', data: user });
  } catch (err) {
    console.error('Ban user error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      `UPDATE users 
       SET is_banned = FALSE, 
           ban_type = 'none', 
           ban_expires_at = NULL, 
           ban_reason = NULL, 
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, kyc_status, is_banned, ban_type, ban_expires_at, ban_reason, created_at`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];

    // Send email notification
    await emailService.sendUserUnbannedEmail(user.email, user.name);

    res.json({ success: true, message: 'User unbanned successfully.', data: user });
  } catch (err) {
    console.error('Unban user error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getAllUsers, updateUser, deleteUser, banUser, unbanUser,
  getPendingCampaigns, getAllCampaigns, approveCampaign, rejectCampaign, deleteCampaign, toggleCampaign,
  toggleSeoVisibility,
  getPendingWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllKyc, approveKyc, rejectKyc,
  getAllDonations,
  getPlatformStats,
  getSettings, updateSetting, getStripeStatus, testEmail,
  verifyPendingDonations,
  addFundsToCampaign,
  addFundsToUser,
  deleteDonation
};
