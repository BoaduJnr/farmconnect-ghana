import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Locale, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const adminPhone = uniqueTestPhone('341');
const farmerPhone = uniqueTestPhone('342');
const buyerPhone = uniqueTestPhone('343');

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

describe('support flow (integration, real Postgres + Redis)', () => {
  let adminToken: string;
  let farmerToken: string;
  let buyerToken: string;
  let farmerId: string;

  beforeAll(async () => {
    await prisma.user.create({
      data: { phone: `+233${adminPhone}`, role: Role.ADMIN, locale: Locale.EN, isVerified: true },
    });
    const adminOtp = await request(app).post('/api/auth/otp/request').send({ phone: adminPhone });
    const adminVerify = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone: adminPhone, code: adminOtp.body.devCode });
    adminToken = adminVerify.body.accessToken;

    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);

    const farmerUser = await prisma.user.findUnique({ where: { phone: `+233${farmerPhone}` } });
    farmerId = farmerUser!.id;
  });

  afterAll(async () => {
    const phones = [`+233${adminPhone}`, `+233${farmerPhone}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    const ids = users.map((u) => u.id);
    await prisma.supportMessage.deleteMany({ where: { userId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/support/messages');
    expect(res.status).toBe(401);
  });

  it('is role-gated to admins for the admin inbox/thread/reply endpoints', async () => {
    expect((await request(app).get('/api/admin/support').set('Authorization', `Bearer ${farmerToken}`)).status).toBe(
      403,
    );
    expect(
      (await request(app).get(`/api/admin/support/${farmerId}`).set('Authorization', `Bearer ${farmerToken}`))
        .status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post(`/api/admin/support/${farmerId}`)
          .set('Authorization', `Bearer ${farmerToken}`)
          .send({ content: 'nope' })
      ).status,
    ).toBe(403);
  });

  it('lets a farmer message admin, notifies the admin, and shows up in the admin inbox unread', async () => {
    const sendRes = await request(app)
      .post('/api/support/messages')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ content: 'My listing disappeared, please help' });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.message).toMatchObject({ sender: 'USER', content: 'My listing disappeared, please help' });

    const adminNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminNotifs.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'New support message' }),
    );

    const inbox = await request(app).get('/api/admin/support').set('Authorization', `Bearer ${adminToken}`);
    expect(inbox.status).toBe(200);
    const farmerEntry = inbox.body.inbox.find((row: { userId: string }) => row.userId === farmerId);
    expect(farmerEntry).toMatchObject({ lastMessage: 'My listing disappeared, please help', unreadCount: 1 });
  });

  it('lets admin view (and thereby read) the thread, then reply, notifying the user', async () => {
    const threadRes = await request(app)
      .get(`/api/admin/support/${farmerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(threadRes.status).toBe(200);
    expect(threadRes.body.messages).toHaveLength(1);

    const inboxAfterView = await request(app).get('/api/admin/support').set('Authorization', `Bearer ${adminToken}`);
    const farmerEntryAfterView = inboxAfterView.body.inbox.find(
      (row: { userId: string }) => row.userId === farmerId,
    );
    expect(farmerEntryAfterView.unreadCount).toBe(0);

    const replyRes = await request(app)
      .post(`/api/admin/support/${farmerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Looking into it now.' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.message).toMatchObject({ sender: 'ADMIN', content: 'Looking into it now.' });

    const farmerNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerNotifs.body.notifications).toContainEqual(
      expect.objectContaining({ title: 'Message from FarmConnect support' }),
    );

    const farmerThread = await request(app)
      .get('/api/support/messages')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(farmerThread.body.messages).toHaveLength(2);
    expect(farmerThread.body.messages[1]).toMatchObject({ sender: 'ADMIN', content: 'Looking into it now.' });
  });

  it('tags a message with an orderId when provided (the "complain about this order" entry point)', async () => {
    const res = await request(app)
      .post('/api/support/messages')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Payment was rejected unfairly', orderId: 'order_test_123' });
    expect(res.status).toBe(201);
    expect(res.body.message.orderId).toBe('order_test_123');
  });
});
