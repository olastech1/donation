-- ============================================================
-- DONATE PLEA — Neon PSQL Schema (Stripe Edition)
-- A crowdfunding donation platform
-- ============================================================

-- Enable UUID generation (Neon supports this natively)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS TABLE
-- Stores registered users: Admins and Campaign Creators.
-- Donors do NOT need accounts (guest checkout is default).
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'creator'
                        CHECK (role IN ('admin', 'creator')),
    kyc_status      VARCHAR(30) NOT NULL DEFAULT 'not_submitted'
                        CHECK (kyc_status IN ('not_submitted', 'pending', 'verified', 'rejected')),
    kyc_full_name   VARCHAR(255),
    kyc_dob         DATE,
    kyc_address     TEXT,
    kyc_document_type VARCHAR(50),
    kyc_document_url TEXT,
    avatar_url      TEXT,
    reset_token     VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);


-- ============================================================
-- 2. PLATFORM SETTINGS TABLE
-- Stores admin-configurable settings, including Stripe keys.
--
-- SECURITY APPROACH:
--   Stripe keys are stored encrypted using pgcrypto's PGP
--   symmetric encryption. The encryption passphrase is stored
--   ONLY in the server's .env file (SETTINGS_ENCRYPTION_KEY),
--   never in the database itself. This means:
--     - The DB alone cannot decrypt the keys
--     - The server needs the .env passphrase to read them
--     - Admins can update keys from the UI without code changes
--
--   We use pgp_sym_encrypt() to write and pgp_sym_decrypt() to read.
-- ============================================================
CREATE TABLE platform_settings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key             VARCHAR(100) UNIQUE NOT NULL,
    setting_value           TEXT NOT NULL,  -- Encrypted via pgcrypto for sensitive values
    is_encrypted            BOOLEAN NOT NULL DEFAULT FALSE,
    description             TEXT,
    updated_by              UUID REFERENCES users(id),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings rows (values will be encrypted at write-time by the API)
INSERT INTO platform_settings (setting_key, setting_value, is_encrypted, description) VALUES
    ('stripe_public_key', '', TRUE, 'Stripe Publishable Key (pk_live_... or pk_test_...)'),
    ('stripe_secret_key', '', TRUE, 'Stripe Secret Key (sk_live_... or sk_test_...)'),
    ('stripe_webhook_secret', '', TRUE, 'Stripe Webhook Signing Secret (whsec_...)'),
    ('platform_fee_percent', '2.5', FALSE, 'Platform fee percentage deducted from donations'),
    ('platform_name', 'Donate Plea', FALSE, 'Display name of the platform'),
    ('support_email', 'support@donateplea.com', FALSE, 'Platform support email');

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);


-- ============================================================
-- 3. CAMPAIGNS TABLE
-- Each campaign is created by a registered user (creator).
-- Campaigns start as 'pending' until an admin approves them.
-- ============================================================
CREATE TABLE campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title           VARCHAR(150) NOT NULL,
    description     TEXT NOT NULL,
    cover_image_url TEXT,

    category        VARCHAR(50) NOT NULL DEFAULT 'general'
                        CHECK (category IN (
                            'medical', 'education', 'community',
                            'crisis_relief', 'personal', 'general'
                        )),

    goal_amount     DECIMAL(12, 2) NOT NULL CHECK (goal_amount > 0),
    current_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'paused', 'closed', 'rejected')),

    deadline        TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_creator ON campaigns(creator_id);


-- ============================================================
-- 4. DONATIONS TABLE
-- Core transaction ledger. Supports both registered and guest donors.
--
-- STRIPE INTEGRATION:
--   stripe_checkout_session_id — The Checkout Session ID returned when
--       we create a session. Used to match the webhook event.
--   stripe_payment_intent_id  — The PaymentIntent ID from the webhook
--       event. This is the definitive proof of payment.
-- ============================================================
CREATE TABLE donations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id                 UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Nullable: NULL = guest donor
    user_id                     UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Guest donor fields
    guest_name                  VARCHAR(150),
    guest_email                 VARCHAR(255),

    amount                      DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    platform_fee                DECIMAL(12, 2) DEFAULT 0.00,
    is_anonymous                BOOLEAN NOT NULL DEFAULT FALSE,

    -- Stripe references
    stripe_checkout_session_id  VARCHAR(255) UNIQUE,
    stripe_payment_intent_id    VARCHAR(255) UNIQUE,

    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),

    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_stripe_session ON donations(stripe_checkout_session_id);
CREATE INDEX idx_donations_stripe_pi ON donations(stripe_payment_intent_id);
CREATE INDEX idx_donations_user ON donations(user_id) WHERE user_id IS NOT NULL;


-- ============================================================
-- 5. CAMPAIGN UPDATES TABLE
-- ============================================================
CREATE TABLE updates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title           VARCHAR(200),
    message         TEXT NOT NULL,
    image_url       TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_updates_campaign ON updates(campaign_id);


-- ============================================================
-- 6. WITHDRAWALS TABLE
-- ============================================================
CREATE TABLE withdrawals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    bank_name       VARCHAR(150),
    account_number  VARCHAR(30),
    account_name    VARCHAR(150),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_creator ON withdrawals(creator_id);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Auto-update campaign.current_amount on donation success
CREATE OR REPLACE FUNCTION update_campaign_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') THEN
        UPDATE campaigns
        SET current_amount = current_amount + NEW.amount
        WHERE id = NEW.campaign_id;
    END IF;

    IF NEW.status = 'refunded' AND OLD.status = 'success' THEN
        UPDATE campaigns
        SET current_amount = current_amount - NEW.amount
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donation_update_campaign_total
    AFTER INSERT OR UPDATE OF status ON donations
    FOR EACH ROW EXECUTE FUNCTION update_campaign_total();
