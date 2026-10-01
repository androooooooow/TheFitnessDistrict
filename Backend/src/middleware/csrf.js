import { opaque, hmac, equal, digest } from '../utils/security.js';
import { AppError } from '../utils/AppError.js';
export const cookieOptions = (env) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1',
});
export function csrfMiddleware(env) {
  const read = (req) => {
    const value = req.cookies?.fd_csrf;
    if (typeof value !== 'string') return null;
    const [token, signature] = value.split('.');
    return /^[a-f\d]{64}$/.test(token) && equal(signature, hmac(env.CSRF_SECRET, token))
      ? token
      : null;
  };
  return {
    issue(req, res) {
      const token = read(req) || opaque();
      res.cookie('fd_csrf', `${token}.${hmac(env.CSRF_SECRET, token)}`, {
        ...cookieOptions(env),
        maxAge: 7 * 86400000,
      });
      res.json({ csrfToken: token });
    },
    protect(req, res, next) {
      if (req.get('origin') !== env.FRONTEND_ORIGIN)
        return next(new AppError(403, 'Request origin is not allowed.'));
      const token = read(req);
      if (!token || !equal(token, req.get('x-csrf-token')))
        return next(new AppError(403, 'Refresh the page before submitting this request.'));
      req.csrfToken = token;
      next();
    },
    session(req, res, next) {
      if (!equal(req.auth.session.csrfHash, digest(req.csrfToken)))
        return next(new AppError(403, 'Refresh the page before submitting this request.'));
      next();
    },
  };
}
