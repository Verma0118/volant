const { pool } = require('../db');

async function getAircraft(operatorId) {
  const res = await pool.query(
    'SELECT * FROM aircraft WHERE operator_id = $1 ORDER BY tail_number',
    [operatorId]
  );
  return res.rows;
}

async function getAircraftById(id, operatorId) {
  const res = await pool.query(
    'SELECT * FROM aircraft WHERE id = $1 AND operator_id = $2',
    [id, operatorId]
  );
  return res.rows[0] || null;
}

module.exports = {
  getAircraft,
  getAircraftById,
};
