const mariadb = require('mariadb');
const config = require('./config');

const pool = mariadb.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASS,
  database: config.DB_NAME,
  port: config.DB_PORT,
  connectionLimit: config.DB_POOL_CONNECTION_LIMIT,
  acquireTimeout: config.DB_POOL_ACQUIRE_TIMEOUT_MS,
  connectTimeout: config.DB_POOL_CONNECT_TIMEOUT_MS,
  timezone: 'Z',
  supportBigNumbers: true,
  bigIntAsNumber: true
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(err) {
  if (!err || typeof err !== 'object') return false;
  if (err.errno === 45028) return true; // ER_GET_CONNECTION_TIMEOUT (pool timeout)

  const code = typeof err.code === 'string' ? err.code : '';
  if (
    code === 'ER_GET_CONNECTION_TIMEOUT' ||
    code === 'ER_SOCKET_TIMEOUT' ||
    code === 'ER_CONNECTION_TIMEOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EHOSTUNREACH' ||
    code === 'ECONNREFUSED'
  ) {
    return true;
  }

  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return message.includes('pool timeout') || message.includes('connection timeout');
}

async function query(sql, params) {
  const retries = config.DB_QUERY_RETRY_COUNT;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const isLastAttempt = attempt >= retries;
      if (isLastAttempt || !isRetryableDbError(err)) {
        throw err;
      }

      const waitMs = config.DB_QUERY_RETRY_DELAY_MS * (attempt + 1);
      await delay(waitMs);
    }
  }

  throw new Error('Unreachable: exhausted DB query retry loop');
}

module.exports = {
  pool,
  query
};
