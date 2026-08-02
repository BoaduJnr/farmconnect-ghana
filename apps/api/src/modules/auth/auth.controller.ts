import type { Request, Response } from 'express';
import { z } from 'zod';
import { otpRequestSchema, otpVerifySchema, selectRoleSchema } from '@farmconnect/shared';
import * as authService from './auth.service.js';
import { OtpInvalidError, OtpRateLimitError } from './otp.service.js';
import { InvalidTokenError } from './jwt.util.js';
import { AccountSuspendedError, UserNotFoundError } from './auth.service.js';

const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const roleRequestSchema = z.object({
  preAuthToken: z.string().min(1),
  ...selectRoleSchema.shape,
});

export async function requestOtp(req: Request, res: Response) {
  const { phone } = req.body as z.infer<typeof otpRequestSchema>;
  try {
    const result = await authService.requestOtp(phone);
    res.status(200).json({ message: 'OTP sent', ...result });
  } catch (err) {
    if (err instanceof OtpRateLimitError) {
      res.status(429).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function verifyOtp(req: Request, res: Response) {
  const { phone, code } = req.body as z.infer<typeof otpVerifySchema>;
  try {
    const result = await authService.verifyOtp(phone, code);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof OtpInvalidError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof AccountSuspendedError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function selectRole(req: Request, res: Response) {
  const { preAuthToken, role, locale } = req.body as z.infer<typeof roleRequestSchema>;
  try {
    const result = await authService.selectRole(preAuthToken, role, locale);
    res.status(201).json({ status: 'authenticated', ...result });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  try {
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof InvalidTokenError || err instanceof UserNotFoundError) {
      res.status(401).json({ error: 'Unauthorized', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (err instanceof AccountSuspendedError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as z.infer<typeof refreshSchema>;
  await authService.logout(refreshToken);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  res.status(200).json({ user });
}

export const schemas = { refreshSchema, roleRequestSchema };
