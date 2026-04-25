const DEMO_OPERATOR_ID = '00000000-0000-0000-0000-000000000001';

exports.shorthands = undefined;

exports.up = (pgm) => {
  // For gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('operators', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.sql(
    `INSERT INTO operators (id, name)
     VALUES ('${DEMO_OPERATOR_ID}', 'Volant Demo Ops')
     ON CONFLICT (id) DO NOTHING;`
  );
};

exports.down = (pgm) => {
  pgm.dropTable('operators', { ifExists: true });
};

