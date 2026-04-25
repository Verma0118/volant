exports.shorthands = undefined;

exports.up = (pgm) => {
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
};

exports.down = (pgm) => {
  pgm.dropTable('aircraft', { ifExists: true });
};

