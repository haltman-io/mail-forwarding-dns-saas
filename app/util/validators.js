const { normalizeTarget } = require('./domain');

function extractTargetFromBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('body must be a JSON object');
    err.status = 400;
    throw err;
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'target')) {
    const err = new Error('body must only contain "target"');
    err.status = 400;
    throw err;
  }

  try {
    return normalizeTarget(body.target);
  } catch (err) {
    err.status = 400;
    throw err;
  }
}

module.exports = {
  extractTargetFromBody
};
