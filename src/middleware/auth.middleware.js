const prisma = require('../config/prisma');
const { verifyToken, extractTokenFromHeader } = require('../utils/token');

/**
 * Middleware to protect routes and verify JWT tokens
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      return res.status(401).json({
        message: 'Not authorized, no token provided',
      });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        message: 'Not authorized, invalid token',
        error: error.message,
      });
    }

    // 3. Fetch user from DB (excluding password)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Not authorized, user no longer exists',
      });
    }

    // 4. Attach user to req object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Middleware to authorize users based on their role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized, user information missing',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden, your role (${req.user.role}) does not have permission to access this resource`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
