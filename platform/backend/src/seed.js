const { pool, connectPostgres, resolveOperator } = require('./db');

const AIRCRAFT_SEED = [
  { tail_number: 'N301VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
  { tail_number: 'N302VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
  { tail_number: 'N303VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
  { tail_number: 'N304VL', type: 'evtol', model: 'Midnight', operator: 'Archer Aviation' },
  {
    tail_number: 'N305VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'DFW Inspection Co',
  },
  {
    tail_number: 'N306VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'DFW Inspection Co',
  },
  {
    tail_number: 'N307VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'DFW Inspection Co',
  },
  {
    tail_number: 'N308VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'DFW Inspection Co',
  },
  {
    tail_number: 'N309VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'Alliance Drone Ops',
  },
  {
    tail_number: 'N310VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'Alliance Drone Ops',
  },
];

async function seedAircraft() {
  await connectPostgres();
  await resolveOperator();

  const operatorId = process.env.CURRENT_OPERATOR_ID;
  if (!operatorId) {
    throw new Error('CURRENT_OPERATOR_ID is missing. Run migrations first.');
  }

  const query = `
    INSERT INTO aircraft (operator_id, tail_number, type, model, operator)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tail_number) DO NOTHING
  `;

  for (const aircraft of AIRCRAFT_SEED) {
    await pool.query(query, [
      operatorId,
      aircraft.tail_number,
      aircraft.type,
      aircraft.model,
      aircraft.operator,
    ]);
  }

  const count = await pool.query('SELECT COUNT(*) FROM aircraft WHERE operator_id = $1', [operatorId]);
  console.log(`Seeded 10 aircraft (${count.rows[0].count} total in DB)`);
}

seedAircraft()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
