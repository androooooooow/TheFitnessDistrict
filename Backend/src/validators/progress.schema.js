import { z } from 'zod';
import { today } from './auth.schema.js';
export const metrics = ['Weight', 'Bench press', 'Waist'];
export const measurementRanges = {
  Weight: [20, 500],
  'Bench press': [0.1, 1000],
  Waist: [20, 300],
};
const metric = z.enum(metrics);
const date = z.iso
  .date()
  .refine(
    (v) => v >= '1900-01-01' && v <= today(),
    'Choose a real measurement date on or before today.',
  );
const fields = {
  metric,
  date,
  value: z.number().finite(),
  notes: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v),
      'Use plain text notes.',
    )
    .default(''),
};
const checkRange = (v, ctx) => {
  const [min, max] = measurementRanges[v.metric];
  const value = v.value ?? v.target;
  if (value < min || value > max)
    ctx.addIssue({
      code: 'custom',
      path: [v.value !== undefined ? 'value' : 'target'],
      message: `Use a value between ${min} and ${max} ${v.metric === 'Waist' ? 'cm' : 'kg'}.`,
    });
};
export const progressCreateSchema = z
  .strictObject({ ...fields, memberId: z.uuid(), requestId: z.uuid() })
  .superRefine(checkRange);
export const progressEditSchema = z
  .strictObject({ ...fields, version: z.number().int().positive() })
  .superRefine(checkRange);
export const goalSchema = z
  .strictObject({
    memberId: z.uuid(),
    metric,
    target: z.number().finite(),
    requestId: z.uuid(),
    version: z.number().int().positive().optional(),
  })
  .superRefine(checkRange);
export const progressListSchema = z.strictObject({
  memberId: z.uuid().optional(),
  metric: metric.default('Weight'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
