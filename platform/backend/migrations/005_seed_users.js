exports.shorthands = undefined;

const DISPATCHER_HASH =
  '$2b$10$8HNwsoFeRUSLcIkNUYGiDOn0b/7JWIZPLLAWu/dGuMQwYx37eX/xu';
const ADMIN_HASH =
  '$2b$10$sehCFm7zt6Fne3bOMJ7WI.2t6pxbMhxpZLFt08bS1GrYTpJNxgXMm';
const DEMO_OPERATOR_ID = '00000000-0000-0000-0000-000000000001';

exports.up = (pgm) => {
  pgm.sql(
    `INSERT INTO users (operator_id, email, password_hash, role)
     VALUES
       ('${DEMO_OPERATOR_ID}', 'dispatcher@volant.demo', '${DISPATCHER_HASH}', 'dispatcher'),
       ('${DEMO_OPERATOR_ID}', 'admin@volant.demo', '${ADMIN_HASH}', 'admin')
     ON CONFLICT (email) DO NOTHING;`
  );
};

exports.down = (pgm) => {
  pgm.sql(
    `DELETE FROM users
     WHERE email IN ('dispatcher@volant.demo', 'admin@volant.demo');`
  );
};
