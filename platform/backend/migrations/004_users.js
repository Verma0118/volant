exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: '"operators"',
      onDelete: 'cascade',
    },
    email: { type: 'varchar(100)', notNull: true, unique: true },
    password_hash: { type: 'varchar(100)', notNull: true },
    role: { type: 'varchar(20)', notNull: true, default: 'dispatcher' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users', { ifExists: true });
};
