exports.shorthands = undefined;

exports.up = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS compliance_records (
      id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id            uuid         NOT NULL,
      mission_id             uuid         NOT NULL,
      aircraft_id            uuid         NOT NULL,
      tail_number            varchar(20)  NOT NULL,
      record_type            varchar(20)  NOT NULL DEFAULT 'flight',
      origin_lat             numeric,
      origin_lng             numeric,
      dest_lat               numeric,
      dest_lng               numeric,
      departed_at            timestamptz,
      completed_at           timestamptz,
      flight_duration_minutes numeric(10,2),
      cargo_type             varchar(50),
      priority               varchar(20),
      regulation             varchar(20)  NOT NULL,
      laanc_status           varchar(20)  NOT NULL,
      laanc_auth_code        varchar(50),
      created_at             timestamptz  NOT NULL DEFAULT now()
    )
  `);

  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS compliance_records_operator_created
      ON compliance_records (operator_id, created_at DESC)
  `);

  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS compliance_records_mission_unique
      ON compliance_records (mission_id)
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query('DROP TABLE IF EXISTS compliance_records');
};
