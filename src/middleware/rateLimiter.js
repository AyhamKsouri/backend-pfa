const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // per IP
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, try again later',
  },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5, // aggressive limit
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts',
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
};
