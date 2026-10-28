const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - requires valid JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'doptv_jwt_secret_change_in_production_key_2026'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.',
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userRoles = Array.isArray(req.user.roles) && req.user.roles.length > 0 ? req.user.roles : [userRole];

    const hasPermission = roles.some((r) => userRoles.includes(r) || userRole === r);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
