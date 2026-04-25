const DEMO_OPERATOR_ID = '00000000-0000-0000-0000-000000000001';

exports.shorthands = undefined;

exports.up = (pgm) => {
  // For gen_random_uuid()
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('operators', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('aircraft', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: '"operators"',
      onDelete: 'cascade',
    },
    tail_number: { type: 'varchar(10)', notNull: true, unique: true },
    type: { type: 'varchar(20)', notNull: true },
    model: { type: 'varchar(50)' },
    operator: { type: 'varchar(100)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Seed demo operator with a stable UUID so Slice 1 can be env-var stubbed.
  pgm.sql(
    `INSERT INTO operators (id, name)
     VALUES ('${DEMO_OPERATOR_ID}', 'Volant Demo Ops')
     ON CONFLICT (id) DO NOTHING;`
  );
};

exports.down = (pgm) => {
  pgm.dropTable('aircraft', { ifExists: true });
  pgm.dropTable('operators', { ifExists: true });
};

