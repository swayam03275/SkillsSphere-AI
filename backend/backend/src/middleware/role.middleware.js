export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check role match
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: insufficient role"
      });
    }

    next();
  };
};