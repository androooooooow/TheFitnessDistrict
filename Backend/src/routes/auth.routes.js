import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import {
  signupSchema,
  loginSchema,
  verifySchema,
  resendSchema,
  profileSchema,
} from '../validators/auth.schema.js';
export function authRoutes({ service, controller, csrf, rateLimits = true }) {
  const router = Router();
  const limiter = (limit, windowMs) =>
    rateLimits
      ? rateLimit({
          limit,
          windowMs,
          standardHeaders: 'draft-8',
          legacyHeaders: false,
          message: { message: 'Too many requests. Please try again later.' },
        })
      : (req, res, next) => next();
  router.get('/csrf', csrf.issue);
  router.post(
    '/signup',
    limiter(5, 3600000),
    csrf.protect,
    validate(signupSchema),
    controller.signup,
  );
  router.post(
    '/verify-email',
    limiter(30, 900000),
    csrf.protect,
    validate(verifySchema),
    controller.verify,
  );
  router.post(
    '/resend-code',
    limiter(15, 3600000),
    csrf.protect,
    validate(resendSchema),
    controller.resend,
  );
  router.post('/login', limiter(30, 900000), csrf.protect, validate(loginSchema), controller.login);
  router.post('/refresh', limiter(60, 900000), csrf.protect, controller.refresh);
  router.post('/logout', csrf.protect, controller.logout);
  router.get('/me', authenticate(service), controller.me);
  return router;
}
export function meRoutes({ service, controller, csrf }) {
  const router = Router();
  router.get('/', authenticate(service), controller.me);
  router.put(
    '/profile',
    csrf.protect,
    authenticate(service),
    requireRole('user'),
    csrf.session,
    validate(profileSchema),
    controller.updateProfile,
  );
  return router;
}
