const express = require('express');
const config = require('./config');
const requestRoutes = require('./routes/request');
const checkdnsRoutes = require('./routes/checkdns');
const jobs = require('./jobs/runner');
const { log } = require('./util/time');
const { sanitizeForLogAndEmail } = require('./util/sanitize');
var cors = require('cors')


const app = express();

app.use(cors());

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateLimitMap = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.lastSeen > RATE_LIMIT_WINDOW_MS * 10) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS * 5);

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/request/')) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'unsupported_media_type' });
    }
  }
  return next();
});

app.use((req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS, lastSeen: now };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count += 1;
  entry.lastSeen = now;
  rateLimitMap.set(ip, entry);

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
  }

  return next();
});

app.use(requestRoutes);
app.use(checkdnsRoutes);

app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  const isClientError = status >= 400 && status < 500;
  const message = err.type === 'entity.parse.failed'
    ? 'invalid_json'
    : isClientError
      ? sanitizeForLogAndEmail(err.message, 500)
      : 'internal_error';

  log(`Error ${status}: ${err.message}`);
  return res.status(status).json({ error: message });
});

app.listen(config.PORT, () => {
  log(`Server listening on port ${config.PORT}`);
  jobs.resumePending().catch((err) => {
    log(`Failed to resume jobs: ${err.message}`);
  });
});
