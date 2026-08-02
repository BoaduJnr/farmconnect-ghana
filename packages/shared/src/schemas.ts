import { z } from 'zod';
import { Locale, Role } from './enums.js';

/**
 * Accepts local Ghanaian formats ("24 123 4567", "0241234567") or E.164 ("+233241234567")
 * and normalizes to canonical E.164 ("+233241234567") — the form used everywhere downstream
 * (Redis keys, the User.phone column, JWT payloads) so the same number never has two identities.
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+233|0)?\d{9}$/.test(v), {
    message: 'Enter a valid Ghanaian phone number',
  })
  .transform((v) => `+233${v.replace(/^\+233/, '').replace(/^0/, '')}`);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Code must be 6 digits'),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const selectRoleSchema = z.object({
  role: z.enum([Role.FARMER, Role.BUYER]),
  locale: z.enum([Locale.EN, Locale.TW]).default(Locale.EN),
});
export type SelectRoleInput = z.infer<typeof selectRoleSchema>;
