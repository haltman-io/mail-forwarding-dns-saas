function now() {
  return new Date();
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function toIso(date) {
  return date ? new Date(date).toISOString() : null;
}

const { sanitizeForLogAndEmail, safeJsonStringify } = require('./sanitize');

function log(message, meta) {
  const safeMessage = sanitizeForLogAndEmail(message, 1000);
  if (meta !== undefined) {
    const safeMeta =
      typeof meta === 'string' ? sanitizeForLogAndEmail(meta, 1000) : safeJsonStringify(meta, 2000);
    console.log(`[${new Date().toISOString()}] ${safeMessage}`, safeMeta);
  } else {
    console.log(`[${new Date().toISOString()}] ${safeMessage}`);
  }
}

module.exports = {
  now,
  addSeconds,
  addHours,
  toIso,
  log
};
