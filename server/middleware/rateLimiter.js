const rateLimiters = new Map();

function createRateLimiter({ windowMs, maxRequests }) {
  const key = `${windowMs}:${maxRequests}`;
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key);
  }

  const hits = new Map();

  const cleanup = () => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.resetTime > windowMs) {
        hits.delete(ip);
      }
    }
  };

  const cleanupInterval = setInterval(cleanup, windowMs);
  cleanupInterval.unref();

  const limiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now - record.resetTime > windowMs) {
      record = { count: 0, resetTime: now };
      hits.set(ip, record);
    }

    record.count++;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime + windowMs).toISOString());

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
    }

    next();
  };

  rateLimiters.set(key, limiter);
  return limiter;
}

export { createRateLimiter };
