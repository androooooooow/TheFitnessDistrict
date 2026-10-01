import { AppError } from '../utils/AppError.js';
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return next(
      new AppError(
        400,
        'Please check the highlighted fields.',
        Object.fromEntries(result.error.issues.map((i) => [i.path.join('.') || 'form', i.message])),
      ),
    );
  req.input = result.data;
  next();
};
