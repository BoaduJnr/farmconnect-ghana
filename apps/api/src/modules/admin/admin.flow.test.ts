import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Locale, MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const adminPhone = uniqueTestPhone('321');
const farmerPhone = uniqueTestPhone('322');
const buyerPhone = uniqueTestPhone('323');

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

async function loginExisting(phone: string) {
  const otpRes = await request(app).post('/api/auth/otp/request').send({ phone });
  return request(app).post('/api/auth/otp/verify').send({ phone, code: otpRes.body.devCode });
}

describe('admin flow (integration, real Postgres + Redis)', () => {
  let adminToken: string;
  let farmerToken: string;
  let buyerToken: string;
  let farmerId: string;
  let listingId: string;

  beforeAll(async () => {
    // No self-service admin signup — seed the ADMIN row directly, exactly like prisma/seed.ts does.
    await prisma.user.create({
      data: { phone: `+233${adminPhone}`, role: Role.ADMIN, locale: Locale.EN, isVerified: true },
    });
    const adminVerify = await loginExisting(adminPhone);
    adminToken = adminVerify.body.accessToken;

    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);

    const farmerUser = await prisma.user.findUnique({ where: { phone: `+233${farmerPhone}` } });
    farmerId = farmerUser!.id;

    await request(app)
      .patch('/api/users/me/momo')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ momoProvider: MomoProvider.MTN, momoPhone: '0241234567', momoAccountName: 'Admin Test Farmer' });

    const listingRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ cropType: 'cassava', quantityKg: 100, pricePerKg: 2.05, lat: 6.6885, lng: -1.6244, regionLabel: 'Kumasi' });
    listingId = listingRes.body.listing.id;
  });

  afterAll(async () => {
    const phones = [`+233${adminPhone}`, `+233${farmerPhone}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.order.deleteMany({ where: { OR: [{ buyerId: { in: ids } }, { farmerId: { in: ids } }] } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('is role-gated to admins', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(403);
  });

  it('lists users filtered by role', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=FARMER')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { id: string }) => u.id)).toContain(farmerId);
  });

  it('verifies and suspends a user, and a suspended user cannot log in', async () => {
    const verifyRes = await request(app)
      .post(`/api/admin/users/${farmerId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVerified: true });
    expect(verifyRes.body.user.isVerified).toBe(true);

    const notifsAfterVerify = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifsAfterVerify.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Account verified' }),
    );

    const suspendRes = await request(app)
      .post(`/api/admin/users/${farmerId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isSuspended: true });
    expect(suspendRes.body.user.isSuspended).toBe(true);

    const notifsAfterSuspend = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifsAfterSuspend.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Account suspended' }),
    );

    const blockedLogin = await loginExisting(farmerPhone);
    expect(blockedLogin.status).toBe(403);

    const unsuspendRes = await request(app)
      .post(`/api/admin/users/${farmerId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isSuspended: false });
    expect(unsuspendRes.body.user.isSuspended).toBe(false);

    const notifsAfterRestore = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifsAfterRestore.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Account restored' }),
    );

    const restoredLogin = await loginExisting(farmerPhone);
    expect(restoredLogin.status).toBe(200);
    expect(restoredLogin.body.status).toBe('authenticated');
  });

  it('moderates a listing (suspend/remove, then reactivate)', async () => {
    const removeRes = await request(app)
      .post(`/api/admin/listings/${listingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REMOVED' });
    expect(removeRes.body.listing.status).toBe('REMOVED');

    const notifsAfterRemove = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifsAfterRemove.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Listing removed' }),
    );

    const listRes = await request(app)
      .get('/api/admin/listings?status=REMOVED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.listings.map((l: { id: string }) => l.id)).toContain(listingId);

    const reactivateRes = await request(app)
      .post(`/api/admin/listings/${listingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });
    expect(reactivateRes.body.listing.status).toBe('ACTIVE');

    const notifsAfterReactivate = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(notifsAfterReactivate.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Listing reactivated' }),
    );
  });

  it('resolves a payment dispute in the buyer\'s favor (uphold_payment)', async () => {
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId, quantityKg: 5 });
    const orderId = orderRes.body.order.id;

    await request(app)
      .post(`/api/orders/${orderId}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone: '0271112222', transactionId: 'DISPUTE01' });
    await request(app)
      .post(`/api/orders/${orderId}/reject-payment`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ note: 'Not seeing it' });

    const wrongRoleDispute = await request(app)
      .post(`/api/orders/${orderId}/dispute`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ reason: 'I sent it' });
    expect(wrongRoleDispute.status).toBe(403);

    const disputeRes = await request(app)
      .post(`/api/orders/${orderId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'My Mobile Money SMS confirms the transfer went through' });
    expect(disputeRes.status).toBe(200);
    expect(disputeRes.body.order.status).toBe('disputed');

    const adminNotifsAfterDispute = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminNotifsAfterDispute.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Payment dispute raised' }),
    );

    const nonAdminResolve = await request(app)
      .post(`/api/admin/orders/${orderId}/resolve-dispute`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ resolution: 'uphold_payment' });
    expect(nonAdminResolve.status).toBe(403);

    const disputedList = await request(app)
      .get('/api/admin/orders/disputed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(disputedList.body.orders.map((o: { id: string }) => o.id)).toContain(orderId);

    const resolveRes = await request(app)
      .post(`/api/admin/orders/${orderId}/resolve-dispute`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'uphold_payment', note: 'MoMo statement confirmed' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.order.status).toBe('paid');

    const disputedListAfter = await request(app)
      .get('/api/admin/orders/disputed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(disputedListAfter.body.orders.map((o: { id: string }) => o.id)).not.toContain(orderId);
  });

  it('resolves a payment dispute in the farmer\'s favor (uphold_rejection), reopening the listing', async () => {
    const listingRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ cropType: 'yam', quantityKg: 60, pricePerKg: 3.3, lat: 6.6885, lng: -1.6244, regionLabel: 'Kumasi' });
    const disputedListingId = listingRes.body.listing.id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: disputedListingId, quantityKg: 5 });
    const orderId = orderRes.body.order.id;

    await request(app)
      .post(`/api/orders/${orderId}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone: '0271112222', transactionId: 'DISPUTE02' });
    await request(app)
      .post(`/api/orders/${orderId}/reject-payment`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({});
    await request(app)
      .post(`/api/orders/${orderId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'I really did pay' });

    const resolveRes = await request(app)
      .post(`/api/admin/orders/${orderId}/resolve-dispute`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'uphold_rejection' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.order.status).toBe('cancelled');

    const listingAfter = await request(app)
      .get(`/api/listings/${disputedListingId}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(listingAfter.body.listing.status).toBe('ACTIVE');
  });
});
