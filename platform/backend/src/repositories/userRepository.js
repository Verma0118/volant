const { pool } = require('../db');

async function getUserByEmail(email) {
  const result = await pool.query(
    'SELECT id, operator_id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return result.rows[0] || null;
}

module.exports = {
  getUserByEmail,
};
