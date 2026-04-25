const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/volant';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function connectPostgres() {
  const client = await pool.connect();
  client.release();
  console.log('PostgreSQL connected');
}

async function resolveOperator() {
  const res = await pool.query(
    "SELECT id FROM operators WHERE name = 'Volant Demo Ops' LIMIT 1"
  );

  if (!res.rows[0]?.id) {
    throw new Error("Demo operator 'Volant Demo Ops' not found (did you migrate?)");
  }

  process.env.CURRENT_OPERATOR_ID = res.rows[0].id;
  console.log(`Operator: Volant Demo Ops (${res.rows[0].id})`);
}

async function initSchema() {
  await pool.query('SELECT 1');
}

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
  pool,
  connectPostgres,
  resolveOperator,
  initSchema,
  getAircraft,
  getAircraftById,
};

