exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('missions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: '"operators"',
      onDelete: 'cascade',
    },
    aircraft_id: { type: 'uuid', references: '"aircraft"', onDelete: 'set null' },
    origin_lat: { type: 'decimal(9,6)', notNull: true },
    origin_lng: { type: 'decimal(9,6)', notNull: true },
    dest_lat: { type: 'decimal(9,6)', notNull: true },
    dest_lng: { type: 'decimal(9,6)', notNull: true },
    cargo_type: { type: 'varchar(50)' },
    priority: { type: 'varchar(10)', notNull: true, default: 'normal' },
    status: { type: 'varchar(20)', notNull: true, default: 'queued' },
    conflict_reason: { type: 'text' },
    dispatched_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    assigned_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
  });

  pgm.addIndex('missions', 'operator_id');
  pgm.addIndex('missions', 'status');
};

exports.down = (pgm) => {
  pgm.dropTable('missions', { ifExists: true });
};
