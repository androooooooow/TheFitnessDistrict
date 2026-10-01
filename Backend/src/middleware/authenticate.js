import { AppError } from '../utils/AppError.js';
export const authenticate = (service) => async (req, res, next) => {
  req.auth = await service.authenticate(req.cookies?.fd_access);
  next();
};
export const requireRole = (role) => (req, res, next) =>
  req.auth?.user.role === role ? next() : next(new AppError(403, 'This action is not allowed.'));
