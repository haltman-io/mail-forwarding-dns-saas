const dotenv = require('dotenv');
const net = require('node:net');

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toInt(value, name) {
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid integer for ${name}`);
  }
  return num;
}

function toBool(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
}

const dnsServers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

const invalidServers = dnsServers.filter((server) => net.isIP(server) === 0);
if (invalidServers.length > 0) {
  throw new Error(`Invalid DNS_SERVERS entries (must be IPs): ${invalidServers.join(', ')}`);
}

const config = {
  PORT: toInt(requireEnv('PORT'), 'PORT'),
  DB_HOST: requireEnv('DB_HOST'),
  DB_USER: requireEnv('DB_USER'),
  DB_PASS: requireEnv('DB_PASS'),
  DB_NAME: requireEnv('DB_NAME'),
  DB_PORT: toInt(requireEnv('DB_PORT'), 'DB_PORT'),

  ADMIN_EMAIL_TO: requireEnv('ADMIN_EMAIL_TO'),
  SMTP_HOST: requireEnv('SMTP_HOST'),
  SMTP_PORT: toInt(requireEnv('SMTP_PORT'), 'SMTP_PORT'),
  SMTP_SECURE: toBool(process.env.SMTP_SECURE, false),
  SMTP_USER: requireEnv('SMTP_USER'),
  SMTP_PASS: requireEnv('SMTP_PASS'),
  SMTP_FROM: requireEnv('SMTP_FROM'),

  DNS_SERVERS: dnsServers,
  DNS_POLL_INTERVAL_SECONDS: toInt(requireEnv('DNS_POLL_INTERVAL_SECONDS'), 'DNS_POLL_INTERVAL_SECONDS'),
  DNS_JOB_MAX_AGE_HOURS: toInt(process.env.DNS_JOB_MAX_AGE_HOURS || '24', 'DNS_JOB_MAX_AGE_HOURS'),
  DNS_TIMEOUT_MS: toInt(requireEnv('DNS_TIMEOUT_MS'), 'DNS_TIMEOUT_MS'),
  DNS_MAX_RECORDS: toInt(process.env.DNS_MAX_RECORDS || '20', 'DNS_MAX_RECORDS'),
  DNS_MAX_TXT_RECORDS: toInt(process.env.DNS_MAX_TXT_RECORDS || '50', 'DNS_MAX_TXT_RECORDS'),
  DNS_MAX_TXT_LENGTH: toInt(process.env.DNS_MAX_TXT_LENGTH || '512', 'DNS_MAX_TXT_LENGTH'),
  DNS_MAX_HOST_LENGTH: toInt(process.env.DNS_MAX_HOST_LENGTH || '253', 'DNS_MAX_HOST_LENGTH'),
  CHECKDNS_MIN_INTERVAL_SECONDS: toInt(
    process.env.CHECKDNS_MIN_INTERVAL_SECONDS || process.env.DNS_POLL_INTERVAL_SECONDS || '300',
    'CHECKDNS_MIN_INTERVAL_SECONDS'
  ),

  MAX_ACTIVE_JOBS: toInt(process.env.MAX_ACTIVE_JOBS || '100', 'MAX_ACTIVE_JOBS'),
  TARGET_COOLDOWN_SECONDS: toInt(process.env.TARGET_COOLDOWN_SECONDS || '60', 'TARGET_COOLDOWN_SECONDS'),
  RESULT_JSON_MAX_BYTES: toInt(process.env.RESULT_JSON_MAX_BYTES || '20000', 'RESULT_JSON_MAX_BYTES'),
  EMAIL_BODY_MAX_LENGTH: toInt(process.env.EMAIL_BODY_MAX_LENGTH || '8000', 'EMAIL_BODY_MAX_LENGTH'),
  CHECKDNS_TOKEN: process.env.CHECKDNS_TOKEN ? process.env.CHECKDNS_TOKEN.trim() : '',

  UI_CNAME_EXPECTED: (process.env.UI_CNAME_EXPECTED || 'forward.haltman.io').toLowerCase(),
  EMAIL_MX_EXPECTED_HOST: (process.env.EMAIL_MX_EXPECTED_HOST || 'mail.abin.lat').toLowerCase(),
  EMAIL_MX_EXPECTED_PRIORITY: toInt(process.env.EMAIL_MX_EXPECTED_PRIORITY || '10', 'EMAIL_MX_EXPECTED_PRIORITY'),
  EMAIL_SPF_EXPECTED: process.env.EMAIL_SPF_EXPECTED || 'v=spf1 mx -all',
  EMAIL_DMARC_EXPECTED: process.env.EMAIL_DMARC_EXPECTED || 'v=DMARC1; p=none'
};

module.exports = config;
