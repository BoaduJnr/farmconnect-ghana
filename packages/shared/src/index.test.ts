import { describe, expect, it } from 'vitest';
import { createListingSchema, listingSearchSchema, otpVerifySchema, phoneSchema, Role } from './index.js';

describe('@farmconnect/shared', () => {
  it('exposes the Role enum', () => {
    expect(Role.FARMER).toBe('FARMER');
  });

  it('normalizes and validates Ghanaian phone numbers to E.164', () => {
    expect(phoneSchema.parse('024 123 4567')).toBe('+233241234567');
    expect(phoneSchema.parse('0241234567')).toBe('+233241234567');
    expect(phoneSchema.parse('+233241234567')).toBe('+233241234567');
    expect(phoneSchema.parse('241234567')).toBe('+233241234567');
    expect(() => phoneSchema.parse('123')).toThrow();
  });

  it('validates a 6-digit OTP code', () => {
    expect(() => otpVerifySchema.parse({ phone: '0241234567', code: '123456' })).not.toThrow();
    expect(() => otpVerifySchema.parse({ phone: '0241234567', code: '123' })).toThrow();
  });

  it('validates and coerces a create-listing payload', () => {
    const parsed = createListingSchema.parse({
      cropType: 'maize',
      quantityKg: '200',
      pricePerKg: '4.50',
      lat: '6.6885',
      lng: '-1.6244',
      regionLabel: 'Kumasi, Ashanti',
    });
    expect(parsed).toMatchObject({ cropType: 'maize', quantityKg: 200, pricePerKg: 4.5 });
    expect(() => createListingSchema.parse({ cropType: 'durian' })).toThrow();
  });

  it('defaults listing search pagination and validates crop category', () => {
    const parsed = listingSearchSchema.parse({ category: 'grains' });
    expect(parsed).toMatchObject({ page: 1, limit: 20, category: 'grains' });
    expect(() => listingSearchSchema.parse({ category: 'nope' })).toThrow();
  });

  // Crop metadata itself moved to the database (apps/api/src/modules/crops) so an admin can
  // add crops without a redeploy — see crops.flow.test.ts for coverage of the seeded catalog
  // and admin create/activate/deactivate behaviour.
});
