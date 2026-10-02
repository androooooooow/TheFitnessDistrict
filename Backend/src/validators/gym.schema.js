import { z } from 'zod';
const uuid = z.uuid();
export const accessSchema = z
  .strictObject({
    requestId: uuid,
    planId: z.enum(['monthly', 'quarterly', 'half-year', 'annual', 'day']),
    rateCategory: z.enum(['student', 'nonStudent']),
    timeSlot: z.enum(['morning', 'afternoon']).optional(),
    paymentConfirmed: z.literal(true),
  })
  .refine((v) => v.planId !== 'day' || !!v.timeSlot, {
    message: 'Choose the daily entry time.',
    path: ['timeSlot'],
  });
export const scanSchema = z.strictObject({
  requestId: uuid,
  token: z.string().min(40).max(2048),
  action: z.enum(['time-in', 'time-out']),
});
export const accessStatusSchema = z.strictObject({ status: z.enum(['active', 'suspended']) });
const date = z.iso.date();
export const listSchema = z.strictObject({
  scope: z.enum(['today', 'inside', 'all']).default('today'),
  date: date.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export const auditSchema = z.strictObject({
  action: z
    .enum([
      'membership.activate',
      'membership.status',
      'attendance.time_in',
      'attendance.time_out',
      'account.created',
      'account.login',
      'account.logout',
      'profile.updated',
      'progress.recorded',
      'progress.updated',
      'goal.updated',
    ])
    .optional(),
  date: date.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(1000000).default(0),
});
export const memberIdSchema = z.strictObject({ id: uuid });
