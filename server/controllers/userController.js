const pool = require('../config/db');

// Update KYC status
const submitKyc = async (req, res) => {
  try {
    const { id } = req.user;
    const { full_name, dob, address, document_type, document_url } = req.body;
    
    if (!document_url) {
      return res.status(400).json({ success: false, message: 'Document upload is required.' });
    }

    // Check if the document is a valid Base64 image/pdf string
    const isValidFormat = /^data:(image\/jpeg|image\/png|image\/jpg|application\/pdf);base64,/.test(document_url);
    if (!isValidFormat) {
      return res.status(400).json({ success: false, message: 'Invalid document format. Please upload a valid JPG, PNG, or PDF file.' });
    }

    // Check if the file is too small (e.g., less than ~5KB) which indicates a fake or corrupted file
    if (document_url.length < 5000) {
      return res.status(400).json({ success: false, message: 'The uploaded document is invalid or unreadable. Please upload a clear photo or PDF.' });
    }

    // Simulate Automatic Document Verification
    // In a real production system, this would integrate with Stripe Identity, Onfido, etc.
    let newStatus = 'verified';
    let message = 'Document automatically verified by system. KYC Approved!';
    
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
      message,
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
