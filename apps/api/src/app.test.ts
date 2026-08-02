import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('GET /health', () => {
  it('responds with a status payload shaped correctly, regardless of DB/Redis availability', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('redis');
  });
});
