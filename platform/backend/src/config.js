const dotenv = require('dotenv');

dotenv.config();

const DEFAULTS = {
  DATABASE_URL: 'postgres://postgres:change_me_before_deploy@localhost:5432/volant',
  REDIS_URL: 'redis://:change_me_before_deploy@localhost:6379',
  PORT: 3001,
  JWT_SECRET: 'change_me_before_deploy',
};

const CURRENT_OPERATOR_ID = process.env.CURRENT_OPERATOR_ID || '';

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL || DEFAULTS.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || DEFAULTS.REDIS_URL,
  PORT: Number(process.env.PORT || DEFAULTS.PORT),
  JWT_SECRET: process.env.JWT_SECRET || DEFAULTS.JWT_SECRET,
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  CURRENT_OPERATOR_ID,
};

