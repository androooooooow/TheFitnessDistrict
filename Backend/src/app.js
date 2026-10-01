import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { csrfMiddleware } from './middleware/csrf.js';
import { AppError } from './utils/AppError.js';
import { authService } from './services/auth.service.js';
import { authController } from './controllers/auth.controller.js';
import { authRoutes, meRoutes } from './routes/auth.routes.js';
export async function createApp({ db, models, env, mail, rateLimits = true }) {
  if (!rateLimits && env.NODE_ENV !== 'test')
    throw new Error('Rate limits can only be disabled by integration tests.');
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId);
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(helmet({ strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false }));
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  if (rateLimits)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 120,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { message: 'Too many requests. Please try again later.' },
      }),
    );
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json'))
      return next(new AppError(415, 'Send JSON request data.'));
    next();
  });
  app.use(express.json({ limit: '16kb', strict: true }));
  app.use(cookieParser());
  const service = await authService({ db, models, env, mail });
  const controller = authController(service, env);
  const csrf = csrfMiddleware(env);
  app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', authRoutes({ service, controller, csrf, rateLimits }));
  app.use('/api/v1/me', meRoutes({ service, controller, csrf }));
  app.use((req, res, next) => next(new AppError(404, 'Endpoint not found.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const known = error instanceof AppError;
    const status = known
      ? error.status
      : error.type === 'entity.too.large'
        ? 413
        : error.type === 'entity.parse.failed'
          ? 400
          : 500;
    if (status === 500)
      console.error(JSON.stringify({ event: 'request_failed', requestId: req.requestId }));
    if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
    res
      .status(status)
      .json({
        message: known
          ? error.message
          : status === 400
            ? 'Send valid JSON.'
            : status === 413
              ? 'Request is too large.'
              : 'Something went wrong. Please try again.',
        ...(known && error.fields ? { fields: error.fields } : {}),
        ...(known && error.challengeId ? { challengeId: error.challengeId } : {}),
        requestId: req.requestId,
      });
  });
  return app;
}
