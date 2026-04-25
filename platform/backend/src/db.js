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

module.exports = {
  pool,
  connectPostgres,
};

