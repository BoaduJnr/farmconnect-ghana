import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { ensureSeeded as ensureCropsSeeded, listAll as listAllCrops } from '../crops/crops.service.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';
import { ensureSeeded, runPriceTick } from './prices.service.js';

const app = createApp();
const phone = uniqueTestPhone('291');

describe('prices flow (integration, real Postgres + Redis)', () => {
  let token: string;
  let cropCount: number;

  beforeAll(async () => {
    await ensureCropsSeeded();
    cropCount = (await listAllCrops()).length;
    await ensureSeeded();

    const otpRes = await request(app).post('/api/auth/otp/request').send({ phone });
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone, code: otpRes.body.devCode });
    const roleRes = await request(app)
      .post('/api/auth/role')
      .send({ preAuthToken: verifyRes.body.preAuthToken, role: Role.BUYER, locale: 'en' });
    token = roleRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: `+233${phone}` } });
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/prices');
    expect(res.status).toBe(401);
  });

  it('returns a price row for every seeded crop', async () => {
    const res = await request(app).get('/api/prices').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.prices).toHaveLength(cropCount);
    expect(res.body.prices[0]).toMatchObject({
      cropType: expect.any(String),
      emoji: expect.any(String),
      price: expect.any(Number),
      changePct: expect.any(Number),
      up: expect.any(Boolean),
    });
  });

  it('reflects a price tick with a computed change%', async () => {
    const before = await request(app).get('/api/prices').set('Authorization', `Bearer ${token}`);
    const maizeBefore = before.body.prices.find((p: { cropType: string }) => p.cropType === 'maize');

    await runPriceTick();

    const after = await request(app).get('/api/prices').set('Authorization', `Bearer ${token}`);
    const maizeAfter = after.body.prices.find((p: { cropType: string }) => p.cropType === 'maize');

    expect(maizeAfter.price).not.toBe(maizeBefore.price);
    // A single ±3% tick should never reasonably jump the change% past ±5%.
    expect(Math.abs(maizeAfter.changePct)).toBeLessThan(5);
  });
});
