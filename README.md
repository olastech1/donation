# Donate Plea

A modern crowdfunding donation platform built with React, Node.js/Express, Stripe, and Neon PostgreSQL.

## Architecture

```
donate-plea/
├── database/          # Neon PSQL schema & seed scripts
│   ├── schema.sql     # Tables, indexes, triggers, platform_settings
│   └── seed.sql       # Development test data
│
├── server/            # Express.js API (Port 5000)
│   ├── config/        # Neon DB connection pool + settings helper
│   ├── middleware/     # JWT auth (4-tier: public/optional/auth/admin)
│   ├── controllers/   # Business logic (auth, campaigns, donations, admin)
│   ├── routes/        # API route definitions
│   └── index.js       # Server entry point
│
└── client/            # React + Vite Frontend (Port 3000)
    └── src/
        ├── components/  # Reusable UI (CampaignCard, GuestCheckoutForm, etc.)
        ├── pages/       # Route pages (Home, Explore, Campaign, Tracking)
        ├── context/     # AuthContext (React Context API)
        └── services/    # Axios API layer with JWT interceptor
```

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/olastech1/donation.git
cd donation

# 2. Set up environment
cp server/.env.example server/.env
# Fill in: Neon DATABASE_URL, Stripe keys, JWT_SECRET, SETTINGS_ENCRYPTION_KEY

# 3. Initialize Neon database
# Paste database/schema.sql into the Neon SQL Editor, then seed.sql

# 4. Start backend
cd server && npm install && npm run dev

# 5. Start frontend (new terminal)
cd client && npm install && npm run dev
```

## Key Features

- **Frictionless Guest Donations** via Stripe Checkout (no account required)
- **Donation Tracking** via unique secure links for guest donors
- **Admin Dashboard** with campaign vetting, withdrawal management, and dynamic Stripe key updates
- **Campaign Progress** with real-time funding bars and donor timelines
- **Multi-step Campaign Creator** for campaign organizers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL on Neon (serverless) |
| Payments | Stripe Checkout + Webhooks |
| Auth | JWT + bcrypt |
| Deployment | Vercel |
