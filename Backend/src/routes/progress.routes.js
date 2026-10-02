import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../utils/AppError.js';
import { memberIdSchema } from '../validators/gym.schema.js';
import {
  progressListSchema,
  progressCreateSchema,
  progressEditSchema,
  goalSchema,
} from '../validators/progress.schema.js';
export function progressRoutes({ auth, controller, csrf }) {
  const router = Router();
  router.use(['/progress', '/goals'], authenticate(auth));
  router.get(
    '/progress',
    (req, res, next) => {
      const parsed = progressListSchema.safeParse(req.query);
      if (!parsed.success) return next(new AppError(400, 'Choose valid progress filters.'));
      req.input = parsed.data;
      next();
    },
    controller.list,
  );
  const protect = [csrf.protect, csrf.session];
  router.post('/progress', ...protect, validate(progressCreateSchema), controller.create);
  router.put(
    '/progress/:id',
    ...protect,
    (req, res, next) => {
      if (!memberIdSchema.safeParse(req.params).success)
        return next(new AppError(400, 'Invalid progress entry.'));
      next();
    },
    validate(progressEditSchema),
    controller.edit,
  );
  router.post('/goals', ...protect, validate(goalSchema), controller.goal);
  return router;
}
