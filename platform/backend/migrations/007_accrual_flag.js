exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('missions', {
    maintenance_minutes_applied: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('missions', 'maintenance_minutes_applied');
};
