const dns = require('node:dns');
const crypto = require('node:crypto');
const config = require('../config');
const { sanitizeDnsText, sanitizeDnsHost, capArray } = require('../util/sanitize');

const dnsPromises = dns.promises;

if (config.DNS_SERVERS && config.DNS_SERVERS.length > 0) {
  dns.setServers(config.DNS_SERVERS);
}

function normalizeHost(host) {
  if (!host) return host;
  return host.toLowerCase().replace(/\.$/, '');
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`DNS timeout after ${timeoutMs}ms${label ? ` (${label})` : ''}`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function isNotFoundError(err) {
  return err && (err.code === 'ENODATA' || err.code === 'ENOTFOUND' || err.code === 'NXDOMAIN');
}

function hashValues(values) {
  const hash = crypto.createHash('sha256');
  for (const value of values) {
    hash.update(String(value));
    hash.update('\n');
  }
  return hash.digest('hex');
}

async function resolveCnameSafe(target) {
  try {
    const records = await withTimeout(dnsPromises.resolveCname(target), config.DNS_TIMEOUT_MS, 'CNAME');
    return records.map(normalizeHost);
  } catch (err) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

async function resolveMxSafe(target) {
  try {
    const records = await withTimeout(dnsPromises.resolveMx(target), config.DNS_TIMEOUT_MS, 'MX');
    return records.map((rec) => ({
      exchange: normalizeHost(rec.exchange),
      priority: rec.priority
    }));
  } catch (err) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

async function resolveTxtSafe(target) {
  try {
    const records = await withTimeout(dnsPromises.resolveTxt(target), config.DNS_TIMEOUT_MS, 'TXT');
    return records.map((chunks) => chunks.join(''));
  } catch (err) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

function capAndSanitizeHosts(rawHosts) {
  const normalized = rawHosts.map(normalizeHost);
  const capped = capArray(normalized, config.DNS_MAX_RECORDS);
  let valueTruncated = false;

  const sanitized = capped.values.map((host) => {
    const result = sanitizeDnsHost(host, config.DNS_MAX_HOST_LENGTH);
    if (result.truncated) valueTruncated = true;
    return result.value;
  });

  return {
    values: sanitized,
    total: capped.total,
    truncated: capped.truncated,
    valueTruncated,
    hash: capped.truncated || valueTruncated ? hashValues(normalized) : null
  };
}

function capAndSanitizeMx(rawMx) {
  const capped = capArray(rawMx, config.DNS_MAX_RECORDS);
  let valueTruncated = false;

  const sanitized = capped.values.map((rec) => {
    const result = sanitizeDnsHost(rec.exchange, config.DNS_MAX_HOST_LENGTH);
    if (result.truncated) valueTruncated = true;
    return {
      exchange: result.value,
      priority: rec.priority
    };
  });

  return {
    values: sanitized,
    total: capped.total,
    truncated: capped.truncated,
    valueTruncated,
    hash: capped.truncated || valueTruncated ? hashValues(rawMx.map((rec) => rec.exchange)) : null
  };
}

function capAndSanitizeTxt(rawTxt) {
  const capped = capArray(rawTxt, config.DNS_MAX_TXT_RECORDS);
  let valueTruncated = false;

  const sanitized = capped.values.map((txt) => {
    const result = sanitizeDnsText(txt, config.DNS_MAX_TXT_LENGTH);
    if (result.truncated) valueTruncated = true;
    return result.value;
  });

  return {
    values: sanitized,
    total: capped.total,
    truncated: capped.truncated,
    valueTruncated,
    hash: capped.truncated || valueTruncated ? hashValues(rawTxt) : null
  };
}

async function checkUi(target) {
  return checkEmail(target);
}

async function checkEmail(target) {
  const apexName = normalizeHost(target);
  const dmarcName = `_dmarc.${apexName}`;
  const expectedCname = normalizeHost(config.UI_CNAME_EXPECTED);
  const expectedMxHost = normalizeHost(config.EMAIL_MX_EXPECTED_HOST);
  const expectedMxPriority = config.EMAIL_MX_EXPECTED_PRIORITY;
  const expectedSpf = config.EMAIL_SPF_EXPECTED;
  const expectedDmarc = config.EMAIL_DMARC_EXPECTED;

  const cnameRecords = await resolveCnameSafe(apexName);
  const mxRecords = await resolveMxSafe(apexName);
  const txtApex = await resolveTxtSafe(apexName);
  const txtDmarc = await resolveTxtSafe(dmarcName);

  const cnameOk = cnameRecords.some((record) => normalizeHost(record) === expectedCname);
  const mxOk = mxRecords.some(
    (rec) => rec.exchange === expectedMxHost && rec.priority === expectedMxPriority
  );
  const spfOk = txtApex.includes(expectedSpf);
  const dmarcOk = txtDmarc.includes(expectedDmarc);

  const cnameMeta = capAndSanitizeHosts(cnameRecords);
  const mxMeta = capAndSanitizeMx(mxRecords);
  const txtApexMeta = capAndSanitizeTxt(txtApex);
  const txtDmarcMeta = capAndSanitizeTxt(txtDmarc);

  const cnameTruncated = cnameMeta.truncated || cnameMeta.valueTruncated;
  const mxTruncated = mxMeta.truncated || mxMeta.valueTruncated;
  const spfTruncated = txtApexMeta.truncated || txtApexMeta.valueTruncated;
  const dmarcTruncated = txtDmarcMeta.truncated || txtDmarcMeta.valueTruncated;

  const missing = [
    {
      key: 'CNAME',
      type: 'CNAME',
      name: apexName,
      expected: expectedCname,
      found: cnameMeta.values,
      ok: cnameOk,
      found_truncated: cnameTruncated
    },
    {
      key: 'MX',
      type: 'MX',
      name: apexName,
      expected: { host: expectedMxHost, priority: expectedMxPriority },
      found: mxMeta.values,
      ok: mxOk,
      found_truncated: mxTruncated
    },
    {
      key: 'SPF',
      type: 'TXT',
      name: apexName,
      expected: expectedSpf,
      found: txtApexMeta.values,
      ok: spfOk,
      found_truncated: spfTruncated
    },
    {
      key: 'DMARC',
      type: 'TXT',
      name: dmarcName,
      expected: expectedDmarc,
      found: txtDmarcMeta.values,
      ok: dmarcOk,
      found_truncated: dmarcTruncated
    }
  ];

  const snapshot = {
    cname: cnameMeta.values,
    cname_count: cnameMeta.total,
    cname_truncated: cnameTruncated,
    mx: mxMeta.values,
    mx_count: mxMeta.total,
    mx_truncated: mxTruncated,
    txt_apex: txtApexMeta.values,
    txt_apex_count: txtApexMeta.total,
    txt_apex_truncated: spfTruncated,
    txt_dmarc: txtDmarcMeta.values,
    txt_dmarc_count: txtDmarcMeta.total,
    txt_dmarc_truncated: dmarcTruncated
  };

  if (cnameMeta.hash) snapshot.cname_hash = cnameMeta.hash;
  if (mxMeta.hash) snapshot.mx_hash = mxMeta.hash;
  if (txtApexMeta.hash) snapshot.txt_apex_hash = txtApexMeta.hash;
  if (txtDmarcMeta.hash) snapshot.txt_dmarc_hash = txtDmarcMeta.hash;

  return {
    ok: cnameOk && mxOk && spfOk && dmarcOk,
    missing,
    snapshot
  };
}

module.exports = {
  checkUi,
  checkEmail
};
