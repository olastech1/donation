-- ============================================================
-- DONATE PLEA — Seed Data (Stripe Edition)
-- Run AFTER schema.sql
-- ============================================================

-- 1. Admin user (password: "admin123" — replace hash with real bcrypt)
INSERT INTO users (id, name, email, password_hash, role, kyc_status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Platform Admin', 'admin@donateplea.com',
     '$2b$12$PLACEHOLDER_REPLACE_WITH_BCRYPT', 'admin', 'verified');

-- 2. Campaign Creators
INSERT INTO users (id, name, email, password_hash, role, kyc_status) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Amara Osei', 'amara@example.com',
     '$2b$12$PLACEHOLDER_REPLACE_WITH_BCRYPT', 'creator', 'verified'),
    ('c0000000-0000-0000-0000-000000000002', 'David Kimani', 'david@example.com',
     '$2b$12$PLACEHOLDER_REPLACE_WITH_BCRYPT', 'creator', 'pending');

-- 3. Sample Campaigns
INSERT INTO campaigns (id, creator_id, title, description, category, goal_amount, status) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000001',
     'Help Build a Community Library in Accra',
     'Our neighbourhood has no library. We are raising funds to convert an empty building into a safe learning space for over 200 children.',
     'education', 15000.00, 'active'),

    ('d0000000-0000-0000-0000-000000000002',
     'c0000000-0000-0000-0000-000000000002',
     'Emergency Surgery for Baby Kwame',
     'Baby Kwame was born with a heart condition that requires immediate surgery. His family cannot afford the procedure.',
     'medical', 8500.00, 'active');

-- 4. Sample Donations (simulating completed Stripe payments)
INSERT INTO donations (campaign_id, user_id, guest_name, guest_email, amount, stripe_checkout_session_id, stripe_payment_intent_id, status) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'c0000000-0000-0000-0000-000000000002', NULL, NULL,
     250.00, 'cs_test_seed001', 'pi_test_seed001', 'success'),

    ('d0000000-0000-0000-0000-000000000001',
     NULL, 'Grace Mensah', 'grace@example.com',
     100.00, 'cs_test_seed002', 'pi_test_seed002', 'success');

-- 5. Sample Updates
INSERT INTO updates (campaign_id, title, message) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'Land Secured!',
     'Great news! We have officially secured the building. Renovations begin next month.');
