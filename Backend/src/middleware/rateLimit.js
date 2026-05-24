const config = require("../config");
const { fail } = require("../utils/http");

const buckets = new Map();

function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    return next();
  }

  current.count += 1;
  if (current.count > config.rateLimitMax) {
    res.setHeader("retry-after", Math.ceil((current.resetAt - now) / 1000));
    return fail(res, 429, "Too many requests");
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, config.rateLimitWindowMs).unref();

module.exports = rateLimit;
