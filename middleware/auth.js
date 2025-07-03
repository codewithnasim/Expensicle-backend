const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      console.log('Empty token in Authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'No authentication token found',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.name, jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN',
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }
    
    // Verify token structure
    if (!decoded.user || !decoded.user.id) {
      console.error('Invalid token structure:', decoded);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format',
        code: 'MALFORMED_TOKEN'
      });
    }
    
    // Check if user still exists
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Add user to request object
    req.user = {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName
    };
    
    console.log(`Authenticated user: ${req.user.id} (${req.user.email})`);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = auth;