// ============================================================
// CAMPAIGN CONTROLLER
// Handles CRUD for campaigns + public browsing.
// ============================================================
const pool = require('../config/db');
const emailService = require('../services/emailService');

/**
 * GET /api/campaigns
 * List all active campaigns (public). Supports pagination & category filtering.
 * Query params: ?page=1&limit=12&category=medical&search=library
 */
const getPublicStats = async (req, res) => {
  try {
    const [campaigns, donations] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'active') AS active, COUNT(*) FILTER (WHERE current_amount >= goal_amount AND goal_amount > 0) AS funded FROM campaigns`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total_raised, COUNT(DISTINCT COALESCE(user_id::text, guest_email)) AS unique_donors FROM donations WHERE status = 'success'`)
    ]);
    res.json({ success: true, data: { campaigns: campaigns.rows[0], donations: donations.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/campaigns
 * List all active campaigns (public). Supports pagination & category filtering.
 * Query params: ?page=1&limit=12&category=medical&search=library
 */
const listActiveCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { category, search } = req.query;

    let query = `
      SELECT c.*, u.name AS creator_name, u.avatar_url AS creator_avatar
      FROM campaigns c
      JOIN users u ON c.creator_id = u.id
      WHERE c.status = 'active' AND u.is_banned = FALSE
    `;
    const params = [];
    let paramIndex = 1;

    // Category filter
    if (category && category !== 'all') {
      query += ` AND c.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Text search filter
    if (search) {
      query += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total for pagination
    const countQuery = query.replace(
      /SELECT c\.\*, u\.name AS creator_name, u\.avatar_url AS creator_avatar/,
      'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('List campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/campaigns/:id
 * Get a single campaign by ID (public).
 */
const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.*, u.name AS creator_name, u.avatar_url AS creator_avatar, u.is_banned AS creator_is_banned
       FROM campaigns c
       JOIN users u ON c.creator_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found.'
      });
    }

    if (result.rows[0].creator_is_banned) {
      return res.status(403).json({
        success: false,
        message: 'This campaign is suspended because the creator account has been banned.'
      });
    }

    // Also fetch the donation count
    const donationStats = await pool.query(
      `SELECT COUNT(*) AS donor_count, COALESCE(SUM(amount), 0) AS total_raised
       FROM donations
       WHERE campaign_id = $1 AND status = 'success'`,
      [id]
    );

    const campaign = {
      ...result.rows[0],
      donor_count: parseInt(donationStats.rows[0].donor_count),
      total_raised: parseFloat(donationStats.rows[0].total_raised)
    };

    res.json({ success: true, data: campaign });
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/campaigns/:id/donors
 * Get the public donor list for a campaign.
 * Anonymous donors are shown as "Anonymous".
 */
const getCampaignDonors = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
        d.id,
        d.amount,
        d.created_at,
        CASE
          WHEN d.is_anonymous THEN 'Anonymous'
          WHEN d.user_id IS NOT NULL THEN u.name
          ELSE d.guest_name
        END AS donor_name,
        d.comment
       FROM donations d
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.campaign_id = $1 AND d.status = 'success'
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get donors error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * POST /api/campaigns
 * Create a new campaign (creator only). Starts as 'pending'.
 */
const createCampaign = async (req, res) => {
  try {
    const { title, description, cover_image_url, category, goal_amount, deadline } = req.body;
    const creatorId = req.user.id;

    // Validate required fields
    if (!title || !description || !goal_amount) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and goal amount are required.'
      });
    }

    if (parseFloat(goal_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Goal amount must be greater than zero.'
      });
    }

    const result = await pool.query(
      `INSERT INTO campaigns (creator_id, title, description, cover_image_url, category, goal_amount, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [creatorId, title, description, cover_image_url, category || 'general', goal_amount, deadline || null]
    );

    // Send email notification to creator
    await emailService.sendCampaignPendingEmail(req.user.email, title);

    res.status(201).json({
      success: true,
      message: 'Campaign submitted for review. An admin will approve it shortly.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * PUT /api/campaigns/:id
 * Update a campaign (creator who owns it, or admin).
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, cover_image_url, category, goal_amount, deadline } = req.body;

    // Verify ownership (unless admin)
    if (req.user.role !== 'admin') {
      const ownership = await pool.query(
        'SELECT id FROM campaigns WHERE id = $1 AND creator_id = $2',
        [id, req.user.id]
      );
      if (ownership.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own campaigns.'
        });
      }
    }

    const result = await pool.query(
      `UPDATE campaigns
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           cover_image_url = COALESCE($3, cover_image_url),
           category = COALESCE($4, category),
           goal_amount = COALESCE($5, goal_amount),
           deadline = COALESCE($6, deadline)
       WHERE id = $7
       RETURNING *`,
      [title, description, cover_image_url, category, goal_amount, deadline, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }

    res.json({
      success: true,
      message: 'Campaign updated.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update campaign error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/campaigns/:id/my-campaigns
 * Get all campaigns created by the authenticated user.
 */
const getMyCampaigns = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(d_avail.available_raised, 0) AS available_raised,
              COALESCE(d_pend.pending_raised, 0) AS pending_raised,
              COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
              GREATEST(0, COALESCE(d_avail.available_raised, 0) - COALESCE(w.total_withdrawn, 0)) AS available_balance,
              COALESCE(d_pend.pending_raised, 0) AS pending_balance
       FROM campaigns c
       LEFT JOIN (
         SELECT campaign_id, SUM(amount) AS available_raised
         FROM donations
         WHERE status = 'success'
           AND created_at < (CASE WHEN EXTRACT(DAY FROM NOW()) >= 15 THEN DATE_TRUNC('month', NOW()) ELSE DATE_TRUNC('month', NOW()) - INTERVAL '1 month' END)
         GROUP BY campaign_id
       ) d_avail ON c.id = d_avail.campaign_id
       LEFT JOIN (
         SELECT campaign_id, SUM(amount) AS pending_raised
         FROM donations
         WHERE status = 'success'
           AND created_at >= (CASE WHEN EXTRACT(DAY FROM NOW()) >= 15 THEN DATE_TRUNC('month', NOW()) ELSE DATE_TRUNC('month', NOW()) - INTERVAL '1 month' END)
         GROUP BY campaign_id
       ) d_pend ON c.id = d_pend.campaign_id
       LEFT JOIN (
         SELECT campaign_id, SUM(amount) AS total_withdrawn
         FROM withdrawals
         WHERE status IN ('pending', 'approved', 'processed')
         GROUP BY campaign_id
       ) w ON c.id = w.campaign_id
       WHERE c.creator_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('My campaigns error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  listActiveCampaigns,
  getPublicStats,
  getCampaignById,
  getCampaignDonors,
  createCampaign,
  updateCampaign,
  getMyCampaigns
};
