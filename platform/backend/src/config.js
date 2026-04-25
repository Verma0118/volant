const dotenv = require('dotenv');

dotenv.config();

const CURRENT_OPERATOR_ID = process.env.CURRENT_OPERATOR_ID;

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  PORT: Number(process.env.PORT || 3001),
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  CURRENT_OPERATOR_ID,
};

