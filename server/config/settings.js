// ============================================================
// SETTINGS HELPER — Encrypted read/write for platform_settings
// Uses pgcrypto's pgp_sym_encrypt/pgp_sym_decrypt
// ============================================================
const pool = require('./db');

const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY;

/**
 * Get a setting value by key. Automatically decrypts if is_encrypted = true.
 */
async function getSetting(key) {
  const result = await pool.query(
    `SELECT setting_value, is_encrypted FROM platform_settings WHERE setting_key = $1`,
    [key]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  if (row.is_encrypted && row.setting_value) {
    try {
      const decrypted = await pool.query(
        `SELECT pgp_sym_decrypt($1::bytea, $2) AS val`,
        [row.setting_value, ENCRYPTION_KEY]
      );
      return decrypted.rows[0].val;
    } catch (err) {
      if (typeof row.setting_value === 'string' && row.setting_value.startsWith('\\x')) {
        console.error(`[SETTINGS] Decryption failed for key "${key}". Returning null:`, err.message);
        return null;
      }
      // Value may not be encrypted yet (empty or plaintext)
      return row.setting_value;
    }
  }

  return row.setting_value;
}

/**
 * Set a setting value by key. Automatically encrypts if is_encrypted = true.
 */
async function setSetting(key, value, updatedBy = null) {
  // Check if this setting should be encrypted
  const check = await pool.query(
    `SELECT is_encrypted FROM platform_settings WHERE setting_key = $1`,
    [key]
  );

  if (check.rows.length === 0) {
    throw new Error(`Setting "${key}" does not exist.`);
  }

  const isEncrypted = check.rows[0].is_encrypted;

  if (isEncrypted) {
    await pool.query(
      `UPDATE platform_settings
       SET setting_value = pgp_sym_encrypt($1, $2), updated_by = $3, updated_at = NOW()
       WHERE setting_key = $4`,
      [value, ENCRYPTION_KEY, updatedBy, key]
    );
  } else {
    await pool.query(
      `UPDATE platform_settings
       SET setting_value = $1, updated_by = $2, updated_at = NOW()
       WHERE setting_key = $3`,
      [value, updatedBy, key]
    );
  }
}

/**
 * Get the active Stripe secret key.
 * Falls back to .env if the DB value is empty.
 */
async function getStripeSecretKey() {
  const dbKey = await getSetting('stripe_secret_key');
  return (dbKey && dbKey.length > 0) ? dbKey : process.env.STRIPE_SECRET_KEY;
}

/**
 * Get the active Stripe public key.
 */
async function getStripePublicKey() {
  const dbKey = await getSetting('stripe_public_key');
  return (dbKey && dbKey.length > 0) ? dbKey : process.env.STRIPE_PUBLIC_KEY;
}

/**
 * Get the active Stripe webhook secret.
 */
async function getStripeWebhookSecret() {
  const dbKey = await getSetting('stripe_webhook_secret');
  return (dbKey && dbKey.length > 0) ? dbKey : process.env.STRIPE_WEBHOOK_SECRET;
}

/**
 * Get all settings (non-sensitive values in plain text, encrypted shown as masked).
 */
async function getAllSettings() {
  const result = await pool.query(
    `SELECT id, setting_key, is_encrypted, description, updated_at,
            CASE WHEN is_encrypted THEN '••••••••' ELSE setting_value END AS display_value
     FROM platform_settings
     ORDER BY setting_key`
  );
  return result.rows;
}

module.exports = {
  getSetting,
  setSetting,
  getStripeSecretKey,
  getStripePublicKey,
  getStripeWebhookSecret,
  getAllSettings
};
