const net = require('node:net');

function normalizeTarget(input) {
  if (typeof input !== 'string') {
    throw new Error('target must be a string');
  }

  let target = input.trim().toLowerCase();
  if (target.endsWith('.')) {
    target = target.slice(0, -1);
  }

  if (/[\u0000-\u001F\u007F]/.test(target)) {
    throw new Error('target must not contain control characters');
  }

  if (/[^\x00-\x7F]/.test(target)) {
    throw new Error('target must be ASCII (use punycode for IDNs)');
  }

  if (target.length === 0) {
    throw new Error('target is required');
  }

  if (target.length > 253) {
    throw new Error('target exceeds max length of 253');
  }

  if (target.includes('://')) {
    throw new Error('target must be a domain name without scheme');
  }

  if (/[\s]/.test(target)) {
    throw new Error('target must not contain whitespace');
  }

  if (target.includes('/') || target.includes('\\')) {
    throw new Error('target must not contain paths');
  }

  if (target.includes('?') || target.includes('#') || target.includes('@')) {
    throw new Error('target must not contain URL query, fragments, or userinfo');
  }

  if (target.includes(':')) {
    throw new Error('target must not contain ports or IPv6');
  }

  if (net.isIP(target)) {
    throw new Error('target must not be an IP address');
  }

  const labels = target.split('.');
  if (labels.some((label) => label.length === 0)) {
    throw new Error('target contains empty labels');
  }

  for (const label of labels) {
    if (label.length < 1 || label.length > 63) {
      throw new Error('each label must be between 1 and 63 characters');
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      throw new Error('labels may only contain a-z, 0-9, and hyphen');
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      throw new Error('labels must not start or end with hyphen');
    }
  }

  return target;
}

module.exports = {
  normalizeTarget
};
