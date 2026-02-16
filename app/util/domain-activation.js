const db = require('../db');
const { log } = require('./time');

async function markDomainAsActive(target) {
  try {
    await db.query('INSERT INTO domain (name, active) VALUES (?, ?)', [target, 1]);
    log(`Domain inserted as active: ${target}`);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      log(`Domain already active: ${target}`);
      return;
    }

    log(`Failed to insert active domain ${target}: ${err.message}`);
  }
}

module.exports = {
  markDomainAsActive
};
