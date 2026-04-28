const dotenv = require('dotenv');

dotenv.config();

const DEFAULTS = {
  DATABASE_URL: 'postgres://postgres:change_me_before_deploy@localhost:5432/volant',
  REDIS_URL: 'redis://:change_me_before_deploy@localhost:6379',
  PORT: 3001,
  JWT_SECRET: 'change_me_before_deploy',
};

const CURRENT_OPERATOR_ID = process.env.CURRENT_OPERATOR_ID || '';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECURITY_HARDENED = process.env.SECURITY_HARDENED === 'true';
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'volant_auth';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const ALLOW_MISSING_ORIGIN = process.env.ALLOW_MISSING_ORIGIN !== 'false';

const resolvedJwtSecret = process.env.JWT_SECRET || DEFAULTS.JWT_SECRET;
const insecureDefaultJwt =
  !process.env.VOLANT_ALLOW_INSECURE_DEFAULTS &&
  NODE_ENV !== 'test' &&
  resolvedJwtSecret === DEFAULTS.JWT_SECRET;

if (insecureDefaultJwt) {
  throw new Error(
    'JWT_SECRET is required and cannot use placeholder value "change_me_before_deploy".'
  );
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL || DEFAULTS.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL || DEFAULTS.REDIS_URL,
  PORT: Number(process.env.PORT || DEFAULTS.PORT),
  JWT_SECRET: resolvedJwtSecret,
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  CURRENT_OPERATOR_ID,
  NODE_ENV,
  SECURITY_HARDENED,
  JWT_COOKIE_NAME,
  FRONTEND_ORIGIN,
  ALLOW_MISSING_ORIGIN,
};

