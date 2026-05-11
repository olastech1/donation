const pool = require('../config/db');

// Update KYC status to pending
const submitKyc = async (req, res) => {
  try {
    const { id } = req.user;
    const { full_name, dob, address, document_type, document_url } = req.body;
    
    // Simple Auto-Verification rule: If name contains "AUTO VERIFY" or document is "AUTO_VERIFY", verify instantly
    const isAutoVerify = 
      (full_name && full_name.toUpperCase().includes('AUTO VERIFY')) || 
      (document_url && document_url.includes('AUTO_VERIFY'));

    const newStatus = isAutoVerify ? 'verified' : 'pending';
    
    const result = await pool.query(
      `UPDATE users 
       SET kyc_status = $1, 
           kyc_full_name = $2, 
           kyc_dob = $3, 
           kyc_address = $4, 
           kyc_document_type = $5, 
           kyc_document_url = $6,
           updated_at = NOW()
       WHERE id = $7 RETURNING id, name, email, role, kyc_status`,
      [newStatus, full_name, dob, address, document_type, document_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    res.json({
      success: true,
      message: isAutoVerify ? 'KYC verified automatically!' : 'KYC submitted successfully. Pending admin approval.',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Submit KYC error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const { id } = req.user;
    const result = await pool.query(
      `SELECT id, name, email, role, kyc_status, avatar_url, created_at FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { submitKyc, getMe };
