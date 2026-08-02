import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerPhone = uniqueTestPhone('261');
const buyerPhone = uniqueTestPhone('262');
const strangerPhone = uniqueTestPhone('263');

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

describe('ratings flow (integration, real Postgres + Redis)', () => {
  let farmerToken: string;
  let buyerToken: string;
  let strangerToken: string;
  let deliveredOrderId: string;
  let pendingOrderId: string;

  beforeAll(async () => {
    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);
    strangerToken = await registerAndLogin(strangerPhone, Role.BUYER);

    await request(app)
      .patch('/api/users/me/momo')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ momoProvider: MomoProvider.MTN, momoPhone: '0241234567', momoAccountName: 'Rating Farmer' });

    const deliveredListing = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ cropType: 'onions', quantityKg: 40, pricePerKg: 6, lat: 6.6885, lng: -1.6244, regionLabel: 'Kumasi' });
    const deliveredOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: deliveredListing.body.listing.id, quantityKg: 5 });
    deliveredOrderId = deliveredOrderRes.body.order.id;
    await request(app)
      .post(`/api/orders/${deliveredOrderId}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone: '0271112222', transactionId: 'RATETXN01' });
    await request(app)
      .post(`/api/orders/${deliveredOrderId}/confirm-payment`)
      .set('Authorization', `Bearer ${farmerToken}`);
    await request(app)
      .post(`/api/orders/${deliveredOrderId}/confirm-delivery`)
      .set('Authorization', `Bearer ${buyerToken}`);

    const pendingListing = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ cropType: 'onions', quantityKg: 40, pricePerKg: 6, lat: 6.6885, lng: -1.6244, regionLabel: 'Kumasi' });
    const pendingOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: pendingListing.body.listing.id, quantityKg: 5 });
    pendingOrderId = pendingOrderRes.body.order.id;
  });

  afterAll(async () => {
    const phones = [`+233${farmerPhone}`, `+233${buyerPhone}`, `+233${strangerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    await prisma.rating.deleteMany({ where: { raterId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.order.deleteMany({ where: { OR: [{ buyerId: { in: ids } }, { farmerId: { in: ids } }] } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('refuses to rate an order that is not yet delivered', async () => {
    const res = await request(app)
      .post(`/api/ratings/order/${pendingOrderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ stars: 5 });
    expect(res.status).toBe(409);
  });

  it('refuses a rating from someone who was not a party to the order', async () => {
    const res = await request(app)
      .post(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ stars: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects an out-of-range star value', async () => {
    const res = await request(app)
      .post(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ stars: 6 });
    expect(res.status).toBe(400);
  });

  it('lets the buyer rate the farmer, updating the farmer trust score, then refuses a second rating', async () => {
    const res = await request(app)
      .post(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ stars: 4, comment: 'Good produce, on time.' });
    expect(res.status).toBe(201);
    expect(res.body.rating).toMatchObject({ stars: 4, comment: 'Good produce, on time.' });

    const farmerListing = await request(app)
      .get(`/api/orders/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerListing.status).toBe(200);

    const farmerUser = await prisma.user.findUnique({ where: { phone: `+233${farmerPhone}` } });
    expect(farmerUser?.trustScore).toBe(4);
    expect(farmerUser?.ratingCount).toBe(1);

    const farmerNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerNotifs.body.notifications).toContainEqual(expect.objectContaining({ title: 'New rating' }));

    const dupeRes = await request(app)
      .post(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ stars: 3 });
    expect(dupeRes.status).toBe(409);
  });

  it('lets the farmer rate the buyer independently, and averages a second rating into the trust score', async () => {
    const res = await request(app)
      .post(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ stars: 5 });
    expect(res.status).toBe(201);

    const buyerUser = await prisma.user.findUnique({ where: { phone: `+233${buyerPhone}` } });
    expect(buyerUser?.trustScore).toBe(5);
    expect(buyerUser?.ratingCount).toBe(1);

    const buyerNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerNotifs.body.notifications).toContainEqual(expect.objectContaining({ title: 'New rating' }));

    const orderRatings = await request(app)
      .get(`/api/ratings/order/${deliveredOrderId}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(orderRatings.body.myRating).toMatchObject({ stars: 4 });
    expect(orderRatings.body.counterpartRating).toMatchObject({ stars: 5 });
  });

  it('exposes recent ratings received by a user', async () => {
    const farmerUser = await prisma.user.findUnique({ where: { phone: `+233${farmerPhone}` } });
    const res = await request(app)
      .get(`/api/ratings/users/${farmerUser!.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ratings).toHaveLength(1);
    expect(res.body.ratings[0]).toMatchObject({ stars: 4, raterName: expect.any(String) });
  });
});
