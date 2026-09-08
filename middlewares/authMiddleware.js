/**
 * @file authMiddleware.js
 * @description Express middleware for protecting routes using JSON Web Tokens (JWT).
 * Validates the Authorization header and attaches decoded token payload to `req.user`.
 */

const jwt = require('jsonwebtoken');

// Ensure JWT secret is present in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

/**
 * Authentication Middleware
 * Validates bearer token from HTTP Authorization header.
 * 
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {void}
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verify presence of Authorization header with Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Extract token string after 'Bearer ' prefix
  const token = authHeader.split(' ')[1];

  try {
    // Verify token validity against secret
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach decoded user payload (e.g. id, username, or table info) to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

