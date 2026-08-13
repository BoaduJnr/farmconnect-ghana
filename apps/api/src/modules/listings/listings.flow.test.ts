import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MomoProvider, Role } from '@farmconnect/shared';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uniqueTestPhone } from '../../test-utils/phone.js';

const app = createApp();

const farmerPhone = uniqueTestPhone('241');
const otherFarmerPhone = uniqueTestPhone('242');
const buyerPhone = uniqueTestPhone('243');

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

describe('listings flow (integration, real Postgres + Redis)', () => {
  let farmerToken: string;
  let otherFarmerToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    farmerToken = await registerAndLogin(farmerPhone, Role.FARMER);
    otherFarmerToken = await registerAndLogin(otherFarmerPhone, Role.FARMER);
    buyerToken = await registerAndLogin(buyerPhone, Role.BUYER);
    await setMomo(farmerToken);
  });

  afterAll(async () => {
    const phones = [`+233${farmerPhone}`, `+233${otherFarmerPhone}`, `+233${buyerPhone}`];
    const users = await prisma.user.findMany({ where: { phone: { in: phones } } });
    await prisma.listing.deleteMany({ where: { farmerId: { in: users.map((u) => u.id) } } });
    await prisma.user.deleteMany({ where: { phone: { in: phones } } });
  });

  it('rejects listing creation from a buyer role', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        cropType: 'maize',
        quantityKg: 200,
        pricePerKg: 4.5,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi, Ashanti',
      });
    expect(res.status).toBe(403);
  });

  it('rejects an invalid crop type', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        // Deliberately not a real word in any language, plus a namespaced suffix — guards
        // against collision with any admin-added crop, including the throwaway one
        // crops.flow.test.ts creates and cleans up in the same shared test database.
        cropType: 'zzz_test_definitely_not_a_real_crop',
        quantityKg: 200,
        pricePerKg: 4.5,
        lat: 6.6885,
        lng: -1.6244,
        regionLabel: 'Kumasi, Ashanti',
      });
    expect(res.status).toBe(400);
  });

  it('creates, lists, fetches, updates, searches, and soft-deletes a listing end-to-end', async () => {
    const createRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        cropType: 'maize',
        quantityKg: 200,
        pricePerKg: 4.5,
        lat: 6.6885, // Kumasi
        lng: -1.6244,
        regionLabel: 'Kumasi, Ashanti',
      });
    expect(createRes.status).toBe(201);
    const listing = createRes.body.listing;
    expect(listing).toMatchObject({ cropType: 'maize', quantityKg: 200, pricePerKg: 4.5, status: 'ACTIVE' });

    const mineRes = await request(app)
      .get('/api/listings/mine')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(mineRes.status).toBe(200);
    expect(mineRes.body.listings.map((l: { id: string }) => l.id)).toContain(listing.id);

    const detailRes = await request(app)
      .get(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.listing.farmer.name).toMatch(/^Farmer •\d{4}$/);

    // Ownership is enforced — a different farmer can't edit or delete this listing.
    const foreignUpdateRes = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${otherFarmerToken}`)
      .send({ pricePerKg: 1 });
    expect(foreignUpdateRes.status).toBe(403);

    const updateRes = await request(app)
      .patch(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ pricePerKg: 5.0 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.listing.pricePerKg).toBe(5);

    // Search by category (maize -> grains), from a point near Kumasi, as the buyer.
    const searchRes = await request(app)
      .get('/api/listings')
      .query({ category: 'grains', lat: 6.7, lng: -1.6, radiusKm: 50 })
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.results.map((l: { id: string }) => l.id)).toContain(listing.id);
    expect(searchRes.body.results[0].distanceKm).toBeLessThan(50);

    // Searching a category the listing doesn't belong to excludes it.
    const wrongCategoryRes = await request(app)
      .get('/api/listings')
      .query({ category: 'fruits' })
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(wrongCategoryRes.status).toBe(200);
    expect(wrongCategoryRes.body.results.map((l: { id: string }) => l.id)).not.toContain(listing.id);

    // A radius too small to reach the listing excludes it.
    const tooFarRes = await request(app)
      .get('/api/listings')
      .query({ lat: 5.6, lng: -0.2, radiusKm: 5 }) // Accra, far from Kumasi
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(tooFarRes.body.results.map((l: { id: string }) => l.id)).not.toContain(listing.id);

    const deleteRes = await request(app)
      .delete(`/api/listings/${listing.id}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.listing.status).toBe('REMOVED');

    // Removed listings drop out of buyer search.
    const afterDeleteSearch = await request(app)
      .get('/api/listings')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(afterDeleteSearch.body.results.map((l: { id: string }) => l.id)).not.toContain(listing.id);
  });
});
