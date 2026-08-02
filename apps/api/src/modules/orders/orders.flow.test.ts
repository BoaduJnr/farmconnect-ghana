import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerPhone = uniqueTestPhone('241');
const farmerNoMomoPhone = uniqueTestPhone('242');
const buyerPhone = uniqueTestPhone('243');
const buyerMomoPhone = uniqueTestPhone('244');

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

async function setMomo(token: string) {
  await request(app)
    .patch('/api/users/me/momo')
    .set('Authorization', `Bearer ${token}`)
    .send({ momoProvider: MomoProvider.MTN, momoPhone: '0241234567', momoAccountName: 'Kofi Mensah' });
}

async function createActiveListing(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      cropType: 'maize',
      quantityKg: 200,
      pricePerKg: 4.5,
      lat: 6.6885,
      lng: -1.6244,
      regionLabel: 'Kumasi, Ashanti',
      ...overrides,
    });
  return res.body.listing as { id: string };
}

describe('orders flow (integration, manual Mobile Money reconciliation — no payment gateway)', () => {
  let farmerToken: string;
  let farmerNoMomoToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    farmerNoMomoToken = await registerAndLogin(farmerNoMomoPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);

    await setMomo(farmerToken);
  });

  afterAll(async () => {
    const phones = [`+233${farmerPhone}`, `+233${farmerNoMomoPhone}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const userIds = users.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({
      where: { OR: [{ buyerId: { in: userIds } }, { farmerId: { in: userIds } }] },
    });
    await prisma.listing.deleteMany({ where: { farmerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('refuses to publish a listing before the farmer links Mobile Money details', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerNoMomoToken}`)
      .send({
        cropType: 'maize',
        quantityKg: 50,
        pricePerKg: 4,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi, Ashanti',
      });
    expect(res.status).toBe(400);
  });

  it('rejects a farmer trying to place an order (role-gated to buyers) and over-quantity orders', async () => {
    const listing = await createActiveListing(farmerToken);

    const farmerOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ listingId: listing.id, quantityKg: 10 });
    expect(farmerOrderRes.status).toBe(403);

    const tooMuchRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing.id, quantityKg: 999999 });
    expect(tooMuchRes.status).toBe(400);
  });

  it('runs the full manual-momo lifecycle: order -> submit payment -> reject -> resubmit -> confirm -> deliver', async () => {
    const listing = await createActiveListing(farmerToken, { cropType: 'rice' });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing.id, quantityKg: 50 });
    expect(createRes.status).toBe(201);
    const order = createRes.body.order;
    expect(order).toMatchObject({
      status: 'pending',
      quantityKg: 50,
      pricePerKg: 4.5,
      subtotal: 225,
      deliveryFee: 15,
      total: 240,
      sellerMomoProvider: 'mtn',
      sellerMomoPhone: '+233241234567',
      sellerMomoAccountName: 'Kofi Mensah',
    });

    const listingDuringOrder = await request(app)
      .get(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(listingDuringOrder.body.listing.status).toBe('PENDING');
    // The checkout screen needs the seller's momo details before the buyer even places the order.
    expect(listingDuringOrder.body.listing.farmer.momoAccountName).toBe('Kofi Mensah');

    const farmerNotifsAfterOrder = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerNotifsAfterOrder.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'New order' }),
    );

    // Farmer can't submit payment (role-gated to buyers), buyer can't confirm/reject (role-gated to farmers).
    const wrongRoleSubmit = await request(app)
      .post(`/api/orders/${order.id}/submit-payment`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ buyerMomoPhone: buyerMomoPhone, transactionId: 'ABC123' });
    expect(wrongRoleSubmit.status).toBe(403);

    const wrongRoleConfirm = await request(app)
      .post(`/api/orders/${order.id}/confirm-payment`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(wrongRoleConfirm.status).toBe(403);

    const submitRes = await request(app)
      .post(`/api/orders/${order.id}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone, transactionId: 'TXN000111' });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.order.status).toBe('payment_submitted');
    expect(submitRes.body.order.transactionId).toBe('TXN000111');

    // A stranger can't see this order at all.
    const strangerRes = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Authorization', `Bearer ${farmerNoMomoToken}`);
    expect(strangerRes.status).toBe(403);

    // Farmer rejects — says the reference doesn't match their momo history.
    const rejectRes = await request(app)
      .post(`/api/orders/${order.id}/reject-payment`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ note: 'No matching transaction in my MoMo statement' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.order.status).toBe('payment_rejected');

    // Can't reject again from a non-submitted state.
    const doubleRejectRes = await request(app)
      .post(`/api/orders/${order.id}/reject-payment`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({});
    expect(doubleRejectRes.status).toBe(409);

    // Buyer resubmits with the corrected transaction ID.
    const resubmitRes = await request(app)
      .post(`/api/orders/${order.id}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone, transactionId: 'TXN000222' });
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.order.status).toBe('payment_submitted');
    expect(resubmitRes.body.order.paymentRejectedNote).toBeNull();

    const confirmRes = await request(app)
      .post(`/api/orders/${order.id}/confirm-payment`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.order.status).toBe('paid');

    const deliverRes = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('delivered');

    // Can't confirm delivery twice.
    const redeliverRes = await request(app)
      .post(`/api/orders/${order.id}/confirm-delivery`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(redeliverRes.status).toBe(409);

    const listingAfterDelivery = await request(app)
      .get(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(listingAfterDelivery.body.listing.status).toBe('SOLD');

    const mineAsBuyer = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(mineAsBuyer.body.orders.map((o: { id: string }) => o.id)).toContain(order.id);

    const mineAsFarmer = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(mineAsFarmer.body.orders.map((o: { id: string }) => o.id)).toContain(order.id);
  });

  it('lets a buyer cancel a pending order (before any payment is submitted), reopening the listing', async () => {
    const listing = await createActiveListing(farmerToken, { cropType: 'yam' });

    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing.id, quantityKg: 20 });
    const order = createRes.body.order;

    const cancelRes = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe('cancelled');

    const listingAfterCancel = await request(app)
      .get(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(listingAfterCancel.body.listing.status).toBe('ACTIVE');

    // Can't cancel a second time.
    const doubleCancelRes = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(doubleCancelRes.status).toBe(409);
  });
});
