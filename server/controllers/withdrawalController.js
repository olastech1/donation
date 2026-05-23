const pool = require('../config/db');
const emailService = require('../services/emailService');

const requestWithdrawal = async (req, res) => {
  try {
    const { 
      campaign_id, 
      amount, 
      payout_method = 'bank', 
      bank_name, 
      account_number, 
      account_name, 
      crypto_network, 
      crypto_address 
    } = req.body;
    const creatorId = req.user.id;

    if (!campaign_id || !amount) {
      return res.status(400).json({ success: false, message: 'Campaign and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 50) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is $50.' });
    }

    if (payout_method === 'crypto') {
      if (!crypto_network || !crypto_address) {
        return res.status(400).json({ success: false, message: 'Crypto network and wallet address are required.' });
      }
    } else if (payout_method === 'bank') {
      if (!bank_name || !account_number || !account_name) {
        return res.status(400).json({ success: false, message: 'Bank name, account number, and account name are required.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payout method.' });
    }

    // Verify campaign ownership
    const campaignResult = await pool.query(
      `SELECT id, title, current_amount, status FROM campaigns WHERE id = $1 AND creator_id = $2`,
      [campaign_id, creatorId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Campaign not found or you are not the creator.' });
    }

    const campaign = campaignResult.rows[0];

    // Verify KYC status
    const userResult = await pool.query(`SELECT kyc_status FROM users WHERE id = $1`, [creatorId]);
    if (userResult.rows[0].kyc_status !== 'verified') {
      return res.status(403).json({ success: false, message: 'You must complete KYC verification before requesting a payout.' });
    }

    // Calculate cutoff date for available donations
    // (Donations made in the current month or pending window are locked)
    const now = new Date();
    let cutoffDate;
    if (now.getDate() >= 15) {
      // Cutoff is the start of this month (e.g. May 1st)
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Cutoff is the start of previous month (e.g. April 1st)
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    // Sum available donations (successful, created before cutoff)
    const availableDonationsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE campaign_id = $1 AND status = 'success' AND created_at < $2`,
      [campaign_id, cutoffDate]
    );
    const availableRaised = parseFloat(availableDonationsResult.rows[0].total);

    // Sum all withdrawals already requested (pending, approved, processed)
    const withdrawalsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE campaign_id = $1 AND status IN ('pending', 'approved', 'processed')`,
      [campaign_id]
    );
    const totalWithdrawn = parseFloat(withdrawalsResult.rows[0].total);

    const availableToWithdraw = Math.max(0, availableRaised - totalWithdrawn);

    if (parsedAmount > availableToWithdraw) {
      return res.status(400).json({ 
        success: false, 
        message: `Requested amount exceeds available balance. Max available: $${availableToWithdraw.toFixed(2)}` 
      });
    }

    const result = await pool.query(
      `INSERT INTO withdrawals (
        campaign_id, creator_id, amount, payout_method,
        bank_name, account_number, account_name,
        crypto_network, crypto_address
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        campaign_id, 
        creatorId, 
        parsedAmount, 
        payout_method,
        payout_method === 'bank' ? bank_name : null,
        payout_method === 'bank' ? account_number : null,
        payout_method === 'bank' ? account_name : null,
        payout_method === 'crypto' ? crypto_network : null,
        payout_method === 'crypto' ? crypto_address : null
      ]
    );

    // Send email to creator
    await emailService.sendWithdrawalRequestEmail(req.user.email, parsedAmount, campaign.title);

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
