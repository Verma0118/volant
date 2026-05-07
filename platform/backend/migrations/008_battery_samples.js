exports.shorthands = undefined;

exports.up = async (pgm) => {
  await pgm.db.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS battery_samples (
      aircraft_id  uuid         NOT NULL REFERENCES aircraft(id)  ON DELETE CASCADE,
      operator_id  uuid         NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
      recorded_at  timestamptz  NOT NULL DEFAULT now(),
      battery_pct  numeric(5,2) NOT NULL,
      status       varchar(20)  NOT NULL
    )
  `);

  await pgm.db.query(
    `CREATE INDEX IF NOT EXISTS battery_samples_aircraft_time
     ON battery_samples (aircraft_id, recorded_at DESC)`
  );

  await pgm.db.query(`
    SELECT create_hypertable(
      'battery_samples',
      'recorded_at',
      chunk_time_interval => INTERVAL '1 day',
      if_not_exists => TRUE
    )
  `);

  await pgm.db.query(`
    SELECT add_retention_policy(
      'battery_samples',
      INTERVAL '30 days',
      if_not_exists => TRUE
    )
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query('DROP TABLE IF EXISTS battery_samples');
};
