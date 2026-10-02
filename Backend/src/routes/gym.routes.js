import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import {
  accessSchema,
  accessStatusSchema,
  scanSchema,
  listSchema,
  auditSchema,
  memberIdSchema,
} from '../validators/gym.schema.js';
function read(schema, source) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(new AppError(400, 'Choose valid filters or a valid member.'));
    if (source === 'query') req.input = parsed.data;
    next();
  };
}
export function gymRoutes({ service, controller, csrf, rateLimits }) {
  const router = Router();
  const auth = authenticate(service);
  const admin = requireRole('admin');
  const user = requireRole('user');
  const limited = rateLimits
    ? [
        rateLimit({
          windowMs: 60000,
          limit: 30,
          standardHeaders: 'draft-8',
          legacyHeaders: false,
          message: { message: 'Too many QR requests. Please wait a minute.' },
        }),
      ]
    : [];
  router.use(auth);
  router.get('/state', controller.state);
  router.get('/attendance', read(listSchema, 'query'), controller.attendance);
  router.get('/attendance/qr', admin, ...limited, controller.qr);
  router.post(
    '/attendance/scan',
    csrf.protect,
    user,
    csrf.session,
    ...limited,
    validate(scanSchema),
    controller.scan,
  );
  router.post(
    '/members/:id/access',
    csrf.protect,
    admin,
    csrf.session,
    read(memberIdSchema, 'params'),
    validate(accessSchema),
    controller.activate,
  );
  router.put(
    '/members/:id/access/status',
    csrf.protect,
    admin,
    csrf.session,
    read(memberIdSchema, 'params'),
    validate(accessStatusSchema),
    controller.status,
  );
  router.get('/audit', admin, read(auditSchema, 'query'), controller.audit);
  return router;
}
