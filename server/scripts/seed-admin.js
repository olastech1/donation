/**
 * Admin Account Seeder for Donate Plea
 * 
 * Usage: node scripts/seed-admin.js
 * 
 * This creates the admin account with a bcrypt-hashed password.
 * Run this AFTER creating the schema in your Neon database.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const ADMIN_EMAIL = 'admin@donateplea.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Platform Admin';

async function seedAdmin() {
  try {
    console.log('🔐 Hashing admin password...');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    console.log('📝 Creating admin account...');
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, kyc_status)
       VALUES ($1, $2, $3, 'admin', 'verified')
       ON CONFLICT (email) DO UPDATE SET password_hash = $3
       RETURNING id, name, email, role`,
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );

    const admin = result.rows[0];
    console.log('\n✅ Admin account ready!');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   ID:       ${admin.id}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedAdmin();
