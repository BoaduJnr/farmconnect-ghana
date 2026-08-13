import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Locale, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';
import { ensureSeeded as ensureCropsSeeded } from './crops.service.js';

const app = createApp();

const adminPhone = uniqueTestPhone('331');
const farmerPhone = uniqueTestPhone('332');

async function registerAndLogin(phone: string, role: (typeof Role)[keyof typeof Role]) {
  const otpRes = await request(app).post('/api/auth/otp/request').send({ phone });
  const verifyRes = await request(app)
    .post('/api/auth/otp/verify')
    .send({ phone, code: otpRes.body.devCode });
  const roleRes = await request(app)
    .post('/api/auth/role')
    .send({ preAuthToken: verifyRes.body.preAuthToken, role, locale: 'en' });
  return roleRes.body.accessToken as string;
}

describe('crops flow (integration, real Postgres + Redis)', () => {
  let adminToken: string;
  let farmerToken: string;

  beforeAll(async () => {
    await ensureCropsSeeded();

    await prisma.user.create({
      data: { phone: `+233${adminPhone}`, role: Role.ADMIN, locale: Locale.EN, isVerified: true },
    });
    const adminOtp = await request(app).post('/api/auth/otp/request').send({ phone: adminPhone });
    const adminVerify = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: adminPhone, code: adminOtp.body.devCode });
    adminToken = adminVerify.body.accessToken;

    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
  });

  afterAll(async () => {
    const phones = [`+233${adminPhone}`, `+233${farmerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.crop.deleteMany({ where: { key: { in: ['durian', 'test_admin_crop'] } } });
  });

  it('requires auth for the public crop list', async () => {
    const res = await request(app).get('/api/crops');
    expect(res.status).toBe(401);
  });

  it('lists the seeded crops, at least 30, with maize present and correctly shaped', async () => {
    const res = await request(app).get('/api/crops').set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.crops.length).toBeGreaterThanOrEqual(30);
    expect(res.body.crops).toContainEqual(
      expect.objectContaining({ key: 'maize', category: 'grains', labelEn: 'Maize', isActive: true }),
    );
  });

  it('is role-gated to admins for management endpoints', async () => {
    const listRes = await request(app).get('/api/admin/crops').set('Authorization', `Bearer ${farmerToken}`);
    expect(listRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/admin/crops')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ emoji: '🍈', category: 'fruits', labelEn: 'Durian', labelTw: 'Durian', basePrice: 15 });
    expect(createRes.status).toBe(403);
  });

  it('lets an admin add a new crop, auto-slugifying the key from labelEn', async () => {
    const res = await request(app)
      .post('/api/admin/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ emoji: '🍈', category: 'fruits', labelEn: 'Durian', labelTw: 'Durian', basePrice: 15 });
    expect(res.status).toBe(201);
    expect(res.body.crop).toMatchObject({ key: 'durian', labelEn: 'Durian', isActive: true });

    const listRes = await request(app).get('/api/crops').set('Authorization', `Bearer ${farmerToken}`);
    expect(listRes.body.crops).toContainEqual(expect.objectContaining({ key: 'durian' }));
  });

  it('rejects a duplicate crop key', async () => {
    const res = await request(app)
      .post('/api/admin/crops')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'maize', emoji: '🌽', category: 'grains', labelEn: 'Maize', labelTw: 'Aburoo', basePrice: 4.5 });
    expect(res.status).toBe(409);
  });

  it('deactivating a crop notifies every farmer, and it drops out of the active list', async () => {
    const deactivateRes = await request(app)
      .post('/api/admin/crops/durian/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.crop.isActive).toBe(false);

    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifs.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Crop no longer available' }),
    );

    const listRes = await request(app).get('/api/crops').set('Authorization', `Bearer ${farmerToken}`);
    expect(listRes.body.crops).not.toContainEqual(expect.objectContaining({ key: 'durian' }));
  });

  it('reactivating a crop also notifies farmers and brings it back into the active list', async () => {
    const reactivateRes = await request(app)
      .post('/api/admin/crops/durian/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.crop.isActive).toBe(true);

    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifs.body.notifications).toContainEqual(expect.objectContaining({ title: 'New crop available' }));

    const listRes = await request(app).get('/api/crops').set('Authorization', `Bearer ${farmerToken}`);
    expect(listRes.body.crops).toContainEqual(expect.objectContaining({ key: 'durian' }));
  });

  it('rejects creating a listing with an unknown crop type', async () => {
    await request(app)
      .patch('/api/users/me/momo')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ momoProvider: 'mtn', momoPhone: '0241234567', momoAccountName: 'Crop Test Farmer' });

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        cropType: 'not_a_real_crop',
        quantityKg: 10,
        pricePerKg: 5,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi',
      });
    expect(res.status).toBe(400);
  });

  it('activate/deactivate on an unknown crop returns 404', async () => {
    const res = await request(app)
      .post('/api/admin/crops/not_a_real_crop/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });
});
