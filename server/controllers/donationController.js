// ============================================================
// DONATION CONTROLLER — Stripe Checkout + Webhook Edition
// ============================================================
const pool = require('../config/db');
const { getStripeSecretKey, getStripeWebhookSecret, getSetting } = require('../config/settings');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');

/**
 * POST /api/donations/initiate
 * Creates a Stripe Checkout Session and returns the URL.
 * Works for both guests and registered users.
 */
const initiateDonation = async (req, res) => {
  try {
    const { campaign_id, amount, guest_name, guest_email, is_anonymous } = req.body;

    if (!campaign_id || !amount) {
      return res.status(400).json({ success: false, message: 'Campaign ID and amount are required.' });
    }
    if (!req.user && !guest_email) {
      return res.status(400).json({ success: false, message: 'Email is required for guest donations.' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero.' });
    }

    // Verify campaign is active
    const campResult = await pool.query(
      'SELECT id, title, status FROM campaigns WHERE id = $1', [campaign_id]
    );
    if (campResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found.' });
    }
    if (campResult.rows[0].status !== 'active') {
      return res.status(400).json({ success: false, message: 'Campaign not accepting donations.' });
    }

    const campaign = campResult.rows[0];
    const donorEmail = req.user ? req.user.email : guest_email;
    const donorName = req.user ? null : (guest_name || 'Guest Donor');

    // Calculate platform fee
    const feePercent = parseFloat(await getSetting('platform_fee_percent') || process.env.PLATFORM_FEE_PERCENT || '2.5');
    const platformFee = parseFloat((amount * feePercent / 100).toFixed(2));

    // Get Stripe secret key (from DB or .env fallback)
    const stripeSecretKey = await getStripeSecretKey();
    const stripe = require('stripe')(stripeSecretKey);

    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: donorEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Donate to: ${campaign.title}`,
            description: `Supporting "${campaign.title}" on Donate Plea`
          },
          unit_amount: Math.round(parseFloat(amount) * 100)  // Stripe uses cents
        },
        quantity: 1
      }],
      metadata: {
        campaign_id: campaign.id,
        donor_name: donorName || '',
        donor_email: donorEmail,
        is_anonymous: is_anonymous ? 'true' : 'false',
        user_id: req.user ? req.user.id : '',
        platform_fee: platformFee.toString()
      },
      success_url: `${frontendUrl}/donation/callback?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/campaigns/${campaign.id}`
    });

    // Insert pending donation record
    await pool.query(
      `INSERT INTO donations
        (campaign_id, user_id, guest_name, guest_email, amount, platform_fee, is_anonymous, stripe_checkout_session_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        campaign_id,
        req.user ? req.user.id : null,
        req.user ? null : donorName,
        req.user ? null : guest_email,
        amount,
        platformFee,
        is_anonymous || false,
        session.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Checkout session created. Redirect to Stripe.',
      data: {
        checkout_url: session.url,
        session_id: session.id
      }
    });
  } catch (err) {
    console.error('Initiate donation error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
};

/**
 * POST /api/donations/webhook/stripe
 * Stripe sends this when a payment event occurs.
 * We listen for `checkout.session.completed`.
 *
 * IMPORTANT: This route must receive the RAW body (not parsed JSON)
 * for Stripe signature verification to work.
 */
const stripeWebhook = async (req, res) => {
  try {
    const stripeSecretKey = await getStripeSecretKey();
    const webhookSecret = await getStripeWebhookSecret();
    const stripe = require('stripe')(stripeSecretKey);

    const signature = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const { campaign_id, donor_name, donor_email, is_anonymous, user_id, platform_fee } = session.metadata;

      // Update the donation record
      const result = await pool.query(
        `UPDATE donations
         SET status = 'success',
             stripe_payment_intent_id = $1
         WHERE stripe_checkout_session_id = $2
         RETURNING *`,
        [session.payment_intent, session.id]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Donation confirmed: ${session.id} → $${result.rows[0].amount}`);
      } else {
        // Donation record might not exist yet (race condition) — create it
        await pool.query(
          `INSERT INTO donations
            (campaign_id, user_id, guest_name, guest_email, amount, platform_fee, is_anonymous, stripe_checkout_session_id, stripe_payment_intent_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'success')
           ON CONFLICT (stripe_checkout_session_id) DO UPDATE SET status = 'success', stripe_payment_intent_id = $9`,
          [
            campaign_id,
            user_id || null,
            donor_name || null,
            donor_email || null,
            session.amount_total / 100,
            parseFloat(platform_fee || 0),
            is_anonymous === 'true',
            session.id,
            session.payment_intent
          ]
        );
      }

      // The DB trigger automatically updates campaigns.current_amount

      // Send email receipt
      if (donor_email) {
        const camp = await pool.query('SELECT title FROM campaigns WHERE id = $1', [campaign_id]);
        if (camp.rows.length > 0) {
          const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaigns/${campaign_id}`;
          emailService.sendDonationReceiptEmail(donor_email, donor_name || 'Generous Donor', session.amount_total / 100, camp.rows[0].title, trackingUrl);
        }
      }
    }

    // Always respond 200
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(200).json({ received: true });
  }
};

/**
 * GET /api/donations/track/:sessionId
 * Guest tracking by Stripe Checkout Session ID.
 */
const trackDonation = async (req, res) => {
  try {
    const { sessionId } = req.params;

    let query = `
      SELECT d.*, c.title AS campaign_title, c.description AS campaign_description,
              c.goal_amount, c.current_amount, c.status AS campaign_status, c.cover_image_url
       FROM donations d JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.stripe_checkout_session_id = $1
    `;

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      query = `
        SELECT d.*, c.title AS campaign_title, c.description AS campaign_description,
                c.goal_amount, c.current_amount, c.status AS campaign_status, c.cover_image_url
         FROM donations d JOIN campaigns c ON d.campaign_id = c.id
         WHERE d.id = $1 OR d.stripe_checkout_session_id = $1
      `;
    }

    const result = await pool.query(query, [sessionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    const d = result.rows[0];
    const updates = await pool.query(
      'SELECT * FROM updates WHERE campaign_id = $1 ORDER BY created_at DESC LIMIT 5',
      [d.campaign_id]
    );
    const progress = d.goal_amount > 0
      ? Math.min(100, ((d.current_amount / d.goal_amount) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        donation: {
          id: d.id, amount: d.amount, status: d.status,
          created_at: d.created_at, session_id: d.stripe_checkout_session_id
        },
        campaign: {
          id: d.campaign_id,
          title: d.campaign_title, description: d.campaign_description,
          goal_amount: d.goal_amount, current_amount: d.current_amount,
          progress_percent: progress, status: d.campaign_status,
          cover_image_url: d.cover_image_url
        },
        updates: updates.rows
      }
    });
  } catch (err) {
    console.error('Track donation error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/donations/callback
 * Called after Stripe redirect — verifies the session and returns tracking info.
 */
const donationCallback = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: 'Missing session_id.' });
    }

    const result = await pool.query(
      `SELECT id, status, stripe_checkout_session_id FROM donations
       WHERE stripe_checkout_session_id = $1`,
      [session_id]
    );

    res.json({
      success: true,
      data: {
        found: result.rows.length > 0,
        status: result.rows[0]?.status || 'pending',
        tracking_url: `${process.env.FRONTEND_URL}/track/${session_id}`
      }
    });
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/**
 * GET /api/donations/recent
 * Public list of recent successful donations across the platform.
 */
const getRecentDonations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.amount, d.created_at, c.title AS campaign_title, c.status AS campaign_status,
              CASE
                WHEN d.is_anonymous THEN 'Anonymous'
                WHEN d.user_id IS NOT NULL THEN u.name
                ELSE d.guest_name
              END AS donor_name
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.status = 'success'
       ORDER BY d.created_at DESC
       LIMIT 10`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Recent donations error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { initiateDonation, stripeWebhook, trackDonation, donationCallback, getRecentDonations };
