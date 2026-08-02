import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const phoneA = uniqueTestPhone('311');
const phoneB = uniqueTestPhone('312');
const phoneC = uniqueTestPhone('313');
const buyerPhone = uniqueTestPhone('314');

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

describe('coops flow (integration, real Postgres + Redis)', () => {
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let buyerToken: string;
  let joinCode: string;

  beforeAll(async () => {
    tokenA = await registerAndLogin(phoneA, Role.FARMER);
    tokenB = await registerAndLogin(phoneB, Role.FARMER);
    tokenC = await registerAndLogin(phoneC, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);

    await request(app)
      .patch('/api/users/me/momo')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ momoProvider: MomoProvider.MTN, momoPhone: '0241234567', momoAccountName: 'Farmer A' });
  });

  afterAll(async () => {
    const phones = [`+233${phoneA}`, `+233${phoneB}`, `+233${phoneC}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: ids } } });
    await prisma.coopMember.deleteMany({ where: { userId: { in: ids } } });
    await prisma.coopGroup.deleteMany({ where: { name: 'Kumasi Farmers Co-op' } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('is role-gated to farmers', async () => {
    const res = await request(app)
      .post('/api/coops')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ name: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('lets a farmer create a co-op and become its leader', async () => {
    const res = await request(app)
      .post('/api/coops')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Kumasi Farmers Co-op' });
    expect(res.status).toBe(201);
    expect(res.body.coop).toMatchObject({ name: 'Kumasi Farmers Co-op', myRole: 'LEADER' });
    expect(res.body.coop.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    joinCode = res.body.coop.joinCode;
  });

  it('refuses to create or join a second co-op while already in one', async () => {
    const createRes = await request(app)
      .post('/api/coops')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Another One' });
    expect(createRes.status).toBe(409);

    const joinRes = await request(app)
      .post('/api/coops/join')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ joinCode });
    expect(joinRes.status).toBe(409);
  });

  it('rejects an unknown join code', async () => {
    const res = await request(app)
      .post('/api/coops/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ joinCode: 'ZZZZZZ' });
    expect(res.status).toBe(404);
  });

  it('lets other farmers join by code, in order', async () => {
    const joinB = await request(app)
      .post('/api/coops/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ joinCode });
    expect(joinB.status).toBe(200);
    expect(joinB.body.coop.myRole).toBe('MEMBER');

    const notifsAfterJoinB = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(notifsAfterJoinB.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'New co-op member' }),
    );

    const joinC = await request(app)
      .post('/api/coops/join')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ joinCode });
    expect(joinC.status).toBe(200);

    const notifsAfterJoinC = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(notifsAfterJoinC.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'New co-op member' }),
    );

    const mine = await request(app).get('/api/coops/mine').set('Authorization', `Bearer ${tokenA}`);
    expect(mine.body.coop.members).toHaveLength(3);
  });

  it('attributes a listing to the co-op when sellAsCoop is set', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        cropType: 'maize',
        quantityKg: 500,
        pricePerKg: 4.5,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi',
        sellAsCoop: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.listing.coop).toMatchObject({ name: 'Kumasi Farmers Co-op' });
  });

  it('promotes the earliest remaining member to leader when the leader leaves', async () => {
    const leaveRes = await request(app).post('/api/coops/leave').set('Authorization', `Bearer ${tokenA}`);
    expect(leaveRes.status).toBe(204);

    const mineA = await request(app).get('/api/coops/mine').set('Authorization', `Bearer ${tokenA}`);
    expect(mineA.body.coop).toBeNull();

    const mineB = await request(app).get('/api/coops/mine').set('Authorization', `Bearer ${tokenB}`);
    expect(mineB.body.coop.myRole).toBe('LEADER');
    expect(mineB.body.coop.members).toHaveLength(2);

    const notifsB = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenB}`);
    expect(notifsB.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'You are now co-op leader' }),
    );

    const notifsC = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenC}`);
    expect(notifsC.body.notifications).toContainEqual(expect.objectContaining({ title: 'Co-op member left' }));
  });

  it('dissolves the co-op when its sole remaining member leaves', async () => {
    await request(app).post('/api/coops/leave').set('Authorization', `Bearer ${tokenB}`);

    const mineC = await request(app).get('/api/coops/mine').set('Authorization', `Bearer ${tokenC}`);
    expect(mineC.body.coop.myRole).toBe('LEADER');
    expect(mineC.body.coop.members).toHaveLength(1);

    const notifsC = await request(app).get('/api/notifications').set('Authorization', `Bearer ${tokenC}`);
    expect(notifsC.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'You are now co-op leader' }),
    );

    const leaveRes = await request(app).post('/api/coops/leave').set('Authorization', `Bearer ${tokenC}`);
    expect(leaveRes.status).toBe(204);

    const mineCAfter = await request(app).get('/api/coops/mine').set('Authorization', `Bearer ${tokenC}`);
    expect(mineCAfter.body.coop).toBeNull();

    const leftover = await prisma.coopGroup.findMany({ where: { name: 'Kumasi Farmers Co-op' } });
    expect(leftover).toHaveLength(0);
  });
});
