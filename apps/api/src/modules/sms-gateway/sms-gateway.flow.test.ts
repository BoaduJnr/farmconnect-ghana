import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerLocalPhone = uniqueTestPhone('271'); // raw digits, no +233 — as an SMS gateway sends it
const buyerLocalPhone = uniqueTestPhone('272');

async function registerAndLoginViaApp(phone: string, role: (typeof Role)[keyof typeof Role]) {
  const otpRes = await request(app).post('/api/auth/otp/request').send({ phone });
  const verifyRes = await request(app)
    .post('/api/auth/otp/verify')
    .send({ phone, code: otpRes.body.devCode });
  const roleRes = await request(app)
    .post('/api/auth/role')
    .send({ preAuthToken: verifyRes.body.preAuthToken, role, locale: 'en' });
  return roleRes.body.accessToken as string;
}

async function sms(from: string, text: string) {
  const res = await request(app).post('/api/sms/inbound').send({ from, text });
  return res;
}

describe('sms gateway flow (integration, real Postgres + Redis)', () => {
  let buyerToken: string;

  beforeAll(async () => {
    buyerToken = await registerAndLoginViaApp(buyerLocalPhone, Role.BUYER);
  });

  afterAll(async () => {
    const farmerUser = await prisma.user.findUnique({ where: { phone: `+233${farmerLocalPhone}` } });
    const buyerUser = await prisma.user.findUnique({ where: { phone: `+233${buyerLocalPhone}` } });
    const userIds = [farmerUser?.id, buyerUser?.id].filter((id): id is string => Boolean(id));
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({
      where: { OR: [{ buyerId: { in: userIds } }, { farmerId: { in: userIds } }] },
    });
    await prisma.listing.deleteMany({ where: { farmerId: { in: userIds } } });
    await prisma.smsInboundLog.deleteMany({ where: { fromPhone: `+233${farmerLocalPhone}` } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('replies with the help text for HELP and for unparseable input', async () => {
    const helpRes = await sms(farmerLocalPhone, 'HELP');
    expect(helpRes.status).toBe(200);
    expect(helpRes.body.reply).toMatch(/FarmConnect commands/i);

    const blankRes = await sms(farmerLocalPhone, '   ');
    expect(blankRes.body.reply).toMatch(/FarmConnect commands/i);
  });

  it('replies with an unknown-command message for an unrecognized command', async () => {
    const res = await sms(farmerLocalPhone, 'BANANA now');
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Unknown command "BANANA"/);
  });

  it('registers a new farmer via REG, then refuses to register the same phone twice', async () => {
    const regRes = await sms(farmerLocalPhone, 'REG Ama Serwaa');
    expect(regRes.body.reply).toMatch(/Welcome to FarmConnect, Ama Serwaa/);

    const user = await prisma.user.findUnique({ where: { phone: `+233${farmerLocalPhone}` } });
    expect(user).toMatchObject({ role: 'FARMER', name: 'Ama Serwaa' });

    const regAgainRes = await sms(farmerLocalPhone, 'REG Ama Serwaa');
    expect(regAgainRes.body.reply).toMatch(/already registered as a farmer/);
  });

  it('refuses LIST before Mobile Money is linked, then accepts it after MOMO', async () => {
    const listBeforeMomo = await sms(farmerLocalPhone, 'LIST maize 100 4.50 Kumasi');
    expect(listBeforeMomo.body.reply).toMatch(/Link your Mobile Money first/);

    const momoBadRes = await sms(farmerLocalPhone, 'MOMO');
    expect(momoBadRes.body.reply).toMatch(/Usage: MOMO/);

    const momoRes = await sms(farmerLocalPhone, 'MOMO mtn 0241234567');
    expect(momoRes.body.reply).toMatch(/Mobile Money details saved/);

    const user = await prisma.user.findUnique({ where: { phone: `+233${farmerLocalPhone}` } });
    expect(user).toMatchObject({
      momoProvider: 'mtn',
      momoPhone: '+233241234567',
      momoAccountName: 'Ama Serwaa',
    });
  });

  it('lists produce via LIST, and PRICE reports the current price for that crop', async () => {
    const listRes = await sms(farmerLocalPhone, 'LIST maize 100 4.50 Kumasi');
    expect(listRes.body.reply).toMatch(/Listed 100kg of maize at GHS 4\.5\/kg/);

    const unknownRegionRes = await sms(farmerLocalPhone, 'LIST maize 100 4.50 Nowhereville');
    expect(unknownRegionRes.body.reply).toMatch(/Unknown region/);

    const priceRes = await sms(farmerLocalPhone, 'PRICE maize');
    expect(priceRes.body.reply).toMatch(/^maize: GHS \d+\.\d{2}\/kg \([+-]?\d+(\.\d+)?%\)$/);

    const priceUsageRes = await sms(farmerLocalPhone, 'PRICE');
    expect(priceUsageRes.body.reply).toMatch(/Usage: PRICE/);
  });

  it('shows no actionable orders yet, then the pending payment after a buyer submits it, then confirms via SMS', async () => {
    const noOrdersRes = await sms(farmerLocalPhone, 'ORDERS');
    expect(noOrdersRes.body.reply).toMatch(/No orders need your attention/);

    const farmer = await prisma.user.findUnique({ where: { phone: `+233${farmerLocalPhone}` } });
    const listing = await prisma.listing.findFirst({
      where: { farmerId: farmer!.id, cropType: 'maize' },
      orderBy: { createdAt: 'desc' },
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing!.id, quantityKg: 10 });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order.id as string;

    await request(app)
      .post(`/api/orders/${orderId}/submit-payment`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ buyerMomoPhone: '0271112222', transactionId: 'TXNSMS001' });

    const shortId = orderId.slice(-6);

    const ordersRes = await sms(farmerLocalPhone, 'ORDERS');
    expect(ordersRes.body.reply).toContain(shortId);
    expect(ordersRes.body.reply).toMatch(/payment_submitted/);

    const confirmUsageRes = await sms(farmerLocalPhone, 'CONFIRM');
    expect(confirmUsageRes.body.reply).toMatch(/Usage: CONFIRM/);

    const confirmBadIdRes = await sms(farmerLocalPhone, 'CONFIRM zzzzzz');
    expect(confirmBadIdRes.body.reply).toMatch(/No pending payment found/);

    const confirmRes = await sms(farmerLocalPhone, `CONFIRM ${shortId}`);
    expect(confirmRes.body.reply).toBe(`Payment confirmed for maize order ${shortId}.`);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('paid');

    const ordersAfterConfirmRes = await sms(farmerLocalPhone, 'ORDERS');
    expect(ordersAfterConfirmRes.body.reply).toMatch(/No orders need your attention/);
  });

  it('logs every inbound message to SmsInboundLog', async () => {
    const logs = await prisma.smsInboundLog.findMany({
      where: { fromPhone: `+233${farmerLocalPhone}` },
    });
    expect(logs.length).toBeGreaterThan(5);
    expect(logs.every((l) => typeof l.responseText === 'string' && l.responseText.length > 0)).toBe(true);
  });
});
