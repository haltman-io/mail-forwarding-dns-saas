const mariadb = require('mariadb');
const config = require('./config');

const pool = mariadb.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASS,
  database: config.DB_NAME,
  port: config.DB_PORT,
  connectionLimit: 10,
  timezone: 'Z',
  supportBigNumbers: true,
  bigIntAsNumber: true
});

async function query(sql, params) {
  return pool.query(sql, params);
}

module.exports = {
  pool,
  query
};
