import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerPhone = uniqueTestPhone('281');

async function registerAndLogin(phone: string) {
  const otpRes = await request(app).post('/api/auth/otp/request').send({ phone });
  const verifyRes = await request(app)
    .post('/api/auth/otp/verify')
    .send({ phone, code: otpRes.body.devCode });
  const roleRes = await request(app)
    .post('/api/auth/role')
    .send({ preAuthToken: verifyRes.body.preAuthToken, role: Role.FARMER, locale: 'en' });
  return roleRes.body.accessToken as string;
}

describe('advisory flow (integration, real Postgres + Redis)', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndLogin(farmerPhone);
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { phone: `+233${farmerPhone}` } });
    if (user) {
      await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/advisory/messages');
    expect(res.status).toBe(401);
  });

  it('starts with an empty message history', async () => {
    const res = await request(app).get('/api/advisory/messages').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('rejects an empty message', async () => {
    const res = await request(app)
      .post('/api/advisory/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '' });
    expect(res.status).toBe(400);
  });

  it('rejects a photo request with no file', async () => {
    const res = await request(app)
      .post('/api/advisory/photo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it(
    'answers a real question via the configured Gemini model and persists both messages',
    async () => {
      const res = await request(app)
        .post('/api/advisory/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'In one short sentence, when should maize be planted in Ghana?' });
      expect(res.status).toBe(201);
      expect(res.body.userMessage.role).toBe('user');
      expect(res.body.assistantMessage.role).toBe('assistant');
      expect(res.body.assistantMessage.content.length).toBeGreaterThan(0);

      const history = await request(app)
        .get('/api/advisory/messages')
        .set('Authorization', `Bearer ${token}`);
      expect(history.body.messages).toHaveLength(2);
      expect(history.body.messages[0].role).toBe('user');
      expect(history.body.messages[1].role).toBe('assistant');
    },
    // A real network call to Gemini — the default 5s test timeout is too tight once this suite
    // runs alongside many other parallel integration test files competing for the network/DB.
    20_000,
  );
});
