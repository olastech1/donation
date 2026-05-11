const pool = require('../config/db');
const emailService = require('../services/emailService');

const requestWithdrawal = async (req, res) => {
  try {
    const { campaign_id, amount, bank_name, account_number, account_name } = req.body;
    const creatorId = req.user.id;

    if (!campaign_id || !amount || !bank_name || !account_number || !account_name) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Verify campaign ownership
    const campaignResult = await pool.query(
      `SELECT id, current_amount, status FROM campaigns WHERE id = $1 AND creator_id = $2`,
      [campaign_id, creatorId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Campaign not found or you are not the creator.' });
    }

    // Verify KYC status
    const userResult = await pool.query(`SELECT kyc_status FROM users WHERE id = $1`, [creatorId]);
    if (userResult.rows[0].kyc_status !== 'verified') {
      return res.status(403).json({ success: false, message: 'You must complete KYC verification before requesting a payout.' });
    }

    const campaign = campaignResult.rows[0];

    // Check if they have enough balance
    // In a real app we'd also check pending withdrawals sum
    const pendingWithdrawalsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_pending FROM withdrawals WHERE campaign_id = $1 AND status = 'pending'`,
      [campaign_id]
    );
    const totalPending = parseFloat(pendingWithdrawalsResult.rows[0].total_pending);

    const availableToWithdraw = parseFloat(campaign.current_amount) - totalPending;

    if (parseFloat(amount) > availableToWithdraw) {
      return res.status(400).json({ 
        success: false, 
        message: `Requested amount exceeds available balance. Max available: $${availableToWithdraw.toFixed(2)}` 
      });
    }

    const result = await pool.query(
      `INSERT INTO withdrawals (campaign_id, creator_id, amount, bank_name, account_number, account_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [campaign_id, creatorId, amount, bank_name, account_number, account_name]
    );

    // Send email to creator
    emailService.sendWithdrawalRequestEmail(req.user.email, amount, campaign.title);

    res.status(201).json({
      success: true,
      message: 'Withdrawal requested successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Request withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getMyWithdrawals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, c.title AS campaign_title 
       FROM withdrawals w 
       JOIN campaigns c ON w.campaign_id = c.id
       WHERE w.creator_id = $1 
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { requestWithdrawal, getMyWithdrawals };
