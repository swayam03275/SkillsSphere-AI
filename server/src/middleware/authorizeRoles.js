import AppError from "../utils/AppError.js";

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This route requires one of the following roles: ${roles.join(", ")}.`,
          403
        )
      );
    }

    next();
  };
};

export default authorizeRoles;
