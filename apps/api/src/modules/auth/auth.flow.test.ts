import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const testPhone = uniqueTestPhone('241');

describe('auth flow (integration, real Postgres + Redis)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: `+233${testPhone}` } });
  });

  it('rejects verifying a code that was never requested', async () => {
    const res = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: '000000' });
    expect(res.status).toBe(400);
  });

  it('registers a brand-new phone end-to-end: request OTP -> verify -> select role -> access protected route -> refresh -> logout', async () => {
    const requestRes = await request(app).post('/api/auth/otp/request').send({ phone: testPhone });
    expect(requestRes.status).toBe(200);
    const devCode = requestRes.body.devCode;
    expect(devCode).toMatch(/^\d{6}$/);

    // Wrong code is rejected without consuming the real one.
    const wrongRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: '111111' });
    expect(wrongRes.status).toBe(400);

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: devCode });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('needs_role');
    const { preAuthToken } = verifyRes.body;
    expect(typeof preAuthToken).toBe('string');

    // The OTP is single-use — verifying again must fail even with the right code.
    const replayRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: devCode });
    expect(replayRes.status).toBe(400);

    const roleRes = await request(app)
      .post('/api/auth/role')
      .send({ preAuthToken, role: Role.FARMER, locale: 'en' });
    expect(roleRes.status).toBe(201);
    expect(roleRes.body.user).toMatchObject({ phone: `+233${testPhone}`, role: Role.FARMER });
    const { accessToken, refreshToken } = roleRes.body;

    const pingRes = await request(app)
      .get('/api/protected/ping')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(pingRes.status).toBe(200);
    expect(pingRes.body.role).toBe(Role.FARMER);

    const noAuthRes = await request(app).get('/api/protected/ping');
    expect(noAuthRes.status).toBe(401);

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.accessToken).toBe('string');

    // Refresh tokens rotate — the old one must no longer work.
    const reusedRefreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reusedRefreshRes.status).toBe(401);

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: refreshRes.body.refreshToken });
    expect(logoutRes.status).toBe(204);
  });

  it('logs an existing user straight in via OTP (no role selection)', async () => {
    const requestRes = await request(app).post('/api/auth/otp/request').send({ phone: testPhone });
    const devCode = requestRes.body.devCode;

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: testPhone, code: devCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe('authenticated');
    expect(verifyRes.body.user.role).toBe(Role.FARMER);
    expect(typeof verifyRes.body.accessToken).toBe('string');
  });
});
