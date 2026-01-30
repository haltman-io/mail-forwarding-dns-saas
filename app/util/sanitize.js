function stripControlChars(value) {
  return value.replace(/[\u0000-\u001F\u007F]/g, '');
}

function sanitizeForLogAndEmail(input, maxLen = 500) {
  let value = input === undefined || input === null ? '' : String(input);
  value = value.replace(/[\r\n\t]+/g, ' ');
  value = stripControlChars(value).replace(/\s{2,}/g, ' ').trim();
  if (value.length > maxLen) {
    value = `${value.slice(0, maxLen)}...`;
  }
  return value;
}

function sanitizeHeaderValue(input, maxLen = 200) {
  let value = input === undefined || input === null ? '' : String(input);
  value = value.replace(/[\r\n]+/g, '');
  value = stripControlChars(value);
  if (value.length > maxLen) {
    value = value.slice(0, maxLen);
  }
  return value;
}

function sanitizeDnsText(input, maxLen) {
  let value = input === undefined || input === null ? '' : String(input);
  value = stripControlChars(value);
  let truncated = false;
  if (maxLen && value.length > maxLen) {
    value = value.slice(0, maxLen);
    truncated = true;
  }
  return { value, truncated };
}

function sanitizeDnsHost(input, maxLen) {
  let value = input === undefined || input === null ? '' : String(input);
  value = stripControlChars(value).replace(/\s+/g, '');
  let truncated = false;
  if (maxLen && value.length > maxLen) {
    value = value.slice(0, maxLen);
    truncated = true;
  }
  return { value, truncated };
}

function capArray(values, max) {
  const total = Array.isArray(values) ? values.length : 0;
  if (!Array.isArray(values)) return { values: [], total: 0, truncated: false };
  const truncated = total > max;
  const capped = truncated ? values.slice(0, max) : values;
  return { values: capped, total, truncated };
}

function safeJsonStringify(value, maxLen = 2000) {
  try {
    const json = JSON.stringify(value, (key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (typeof val === 'string') {
        return sanitizeForLogAndEmail(val, maxLen);
      }
      return val;
    });
    return sanitizeForLogAndEmail(json, maxLen);
  } catch (err) {
    return '[unserializable]';
  }
}

function byteLength(str) {
  return Buffer.byteLength(str, 'utf8');
}

module.exports = {
  sanitizeForLogAndEmail,
  sanitizeHeaderValue,
  sanitizeDnsText,
  sanitizeDnsHost,
  capArray,
  safeJsonStringify,
  byteLength
};
