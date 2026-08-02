import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerPhone = uniqueTestPhone('292');
const buyerPhone = uniqueTestPhone('293');

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

describe('notifications flow (integration, real Postgres + Redis)', () => {
  let farmerToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);

    await request(app)
      .patch('/api/users/me/momo')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ momoProvider: MomoProvider.MTN, momoPhone: '0241234567', momoAccountName: 'Ama Serwaa' });
  });

  afterAll(async () => {
    const phones = [`+233${farmerPhone}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    const orders = await prisma.order.findMany({
      where: { OR: [{ buyerId: { in: ids } }, { farmerId: { in: ids } }] },
    });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('starts with zero unread notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notifications: [], unreadCount: 0 });
  });

  it('notifies the farmer when a buyer submits payment, and the buyer when it is confirmed', async () => {
    const listingRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        cropType: 'plantain',
        quantityKg: 60,
        pricePerKg: 5.4,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi, Ashanti',
      });
    const listingId = listingRes.body.listing.id;

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId, quantityKg: 10 });
    const orderId = orderRes.body.order.id;

    await request(app)
      .post(`/api/orders/${orderId}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone: '0271112222', transactionId: 'TXNNOTIFY01' });

    const farmerNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerNotifs.body.unreadCount).toBeGreaterThanOrEqual(1);
    const submittedNotif = farmerNotifs.body.notifications.find(
      (n: { title: string }) => n.title === 'Payment submitted',
    );
    expect(submittedNotif).toBeDefined();
    expect(submittedNotif.read).toBe(false);

    const markReadRes = await request(app)
      .post(`/api/notifications/${submittedNotif.id}/read`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(markReadRes.status).toBe(204);

    const farmerNotifsAfter = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    const stillThere = farmerNotifsAfter.body.notifications.find(
      (n: { id: string }) => n.id === submittedNotif.id,
    );
    expect(stillThere.read).toBe(true);

    await request(app)
      .post(`/api/orders/${orderId}/confirm-payment`)
      .set('Authorization', `Bearer ${farmerToken}`);

    const buyerNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    const confirmedNotif = buyerNotifs.body.notifications.find(
      (n: { title: string }) => n.title === 'Payment confirmed',
    );
    expect(confirmedNotif).toBeDefined();
  });
});
