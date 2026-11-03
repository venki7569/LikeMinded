import ApiError from '../utils/ApiError.js';

export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (req.user.role !== 'admin') {
    return next(ApiError.forbidden('Admin privileges required to access this resource'));
  }
  next();
}

export default requireAdmin;
