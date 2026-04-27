exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('aircraft', {
    total_flight_minutes: {
      type: 'numeric(12,2)',
      notNull: true,
      default: 0,
    },
    battery_cycle_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    last_maintenance_at: { type: 'timestamptz' },
  });

  pgm.createTable('maintenance_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: '"operators"',
      onDelete: 'cascade',
    },
    aircraft_id: {
      type: 'uuid',
      notNull: true,
      references: '"aircraft"',
      onDelete: 'cascade',
    },
    event_type: { type: 'varchar(20)', notNull: true },
    summary: { type: 'varchar(200)', notNull: true },
    details: { type: 'text' },
    performed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    recorded_by: { type: 'uuid', references: '"users"', onDelete: 'set null' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addIndex('maintenance_events', 'operator_id');
  pgm.addIndex('maintenance_events', 'aircraft_id');

  pgm.createTable('maintenance_due', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    operator_id: {
      type: 'uuid',
      notNull: true,
      references: '"operators"',
      onDelete: 'cascade',
    },
    aircraft_id: {
      type: 'uuid',
      notNull: true,
      references: '"aircraft"',
      onDelete: 'cascade',
    },
    kind: { type: 'varchar(20)', notNull: true },
    label: { type: 'varchar(200)' },
    due_at: { type: 'timestamptz' },
    due_after_minutes: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addIndex('maintenance_due', 'operator_id');
  pgm.addIndex('maintenance_due', 'aircraft_id');
};

exports.down = (pgm) => {
  pgm.dropTable('maintenance_due', { ifExists: true });
  pgm.dropTable('maintenance_events', { ifExists: true });
  pgm.dropColumn('aircraft', 'last_maintenance_at');
  pgm.dropColumn('aircraft', 'battery_cycle_count');
  pgm.dropColumn('aircraft', 'total_flight_minutes');
};
