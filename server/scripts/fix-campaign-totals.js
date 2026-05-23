const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixTotals() {
  try {
    const res = await pool.query(`
      UPDATE campaigns c
      SET current_amount = COALESCE(
        (SELECT SUM(amount) FROM donations d WHERE d.campaign_id = c.id AND d.status = 'success'),
        0
      )
      RETURNING id, current_amount;
    `);
    console.log('Fixed campaigns:', res.rows.length);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixTotals();
