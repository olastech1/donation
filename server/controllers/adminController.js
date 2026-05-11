// ============================================================
// ADMIN CONTROLLER — Platform management + Settings
// ============================================================
const pool = require('../config/db');
const { getAllSettings, setSetting, getSetting, getStripePublicKey } = require('../config/settings');
const emailService = require('../services/emailService');

// ─── User Management ──────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, kyc_status, created_at FROM users ORDER BY created_at DESC`
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

const approveCampaign = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE campaigns SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Campaign not found or already processed.' });
    
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [result.rows[0].creator_id]);
    if (user.rows.length > 0) {
      emailService.sendCampaignApprovedEmail(user.rows[0].email, result.rows[0].title, result.rows[0].id);
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
      emailService.sendCampaignRejectedEmail(user.rows[0].email, result.rows[0].title);
    }

    res.json({ success: true, message: 'Campaign rejected.', data: { campaign: result.rows[0], reason: req.body.reason } });
  } catch (err) {
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
      emailService.sendWithdrawalApprovedEmail(user.rows[0].email, wd.amount, camp.rows[0].title);
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
      emailService.sendWithdrawalRejectedEmail(user.rows[0].email, wd.amount, camp.rows[0].title);
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

module.exports = {
  getAllUsers, updateUser,
  getPendingCampaigns, approveCampaign, rejectCampaign,
  getPendingWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllKyc, approveKyc, rejectKyc,
  getAllDonations,
  getPlatformStats,
  getSettings, updateSetting, getStripeStatus, testEmail
};
