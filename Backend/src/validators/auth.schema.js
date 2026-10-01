import { z } from 'zod';
const text = (min, max) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (s) => !/[<>\u0000-\u001f\u007f]/u.test(s),
      'Use plain text without control characters.',
    );
export const emailSchema = z.string().trim().toLowerCase().max(254).email();
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(d.getTime()) &&
      d.toISOString().slice(0, 10) === value &&
      value >= '1900-01-01' &&
      value <= today()
    );
  }, 'Enter a real birthday on or before today.');
export const profileFields = {
  fullName: text(2, 100),
  birthday: birthdaySchema,
  sex: z.enum(['male', 'female', 'prefer-not-to-say']),
  address: text(5, 300),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{9,25}$/, 'Enter a valid phone number.')
    .transform((s) => s.replace(/[\s()-]/g, ''))
    .refine((s) => /^\+?\d{9,15}$/.test(s), 'Use 9–15 digits.'),
  weight: z.number().finite().min(20).max(500),
  height: z.number().finite().min(50).max(250),
};
export const signupSchema = z.strictObject({
  ...profileFields,
  email: emailSchema,
  membership: z.enum(['monthly', 'quarterly', 'half-year', 'annual', 'day']),
  rateCategory: z.enum(['student', 'nonStudent']),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
});
export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const verifySchema = z.strictObject({
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
});
export const resendSchema = z.strictObject({ challengeId: z.uuid() });
export const profileSchema = z.strictObject(profileFields);
export function bmi(weight, height) {
  return Number((weight / (height / 100) ** 2).toFixed(1));
}
