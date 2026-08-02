import { describe, expect, it } from 'vitest';
import {
  formatBuildingAddress,
  normalizeEmail,
  passwordSchema,
  propertyAdminRegistrationSchema,
} from './auth.js';

describe('normalizeEmail', () => {
  it('lowercases and trims email addresses', () => {
    expect(normalizeEmail('  Admin@Example.COM ')).toBe('admin@example.com');
  });
});

describe('passwordSchema', () => {
  it('accepts strong passwords', () => {
    expect(passwordSchema.safeParse('SecurePass1').success).toBe(true);
  });

  it('rejects weak passwords', () => {
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('Password').success).toBe(false);
  });
});

describe('propertyAdminRegistrationSchema', () => {
  const valid = {
    companyName: 'Limmatquai Verwaltung AG',
    firstName: 'Anna',
    lastName: 'Verwaltung',
    email: 'admin@example.com',
    phone: '+41 44 555 55 55',
    website: 'https://example.com',
    password: 'SecurePass1',
    confirmPassword: 'SecurePass1',
    acceptTerms: true as const,
    acceptPrivacy: true as const,
  };

  it('accepts valid administrator registration payloads', () => {
    const parsed = propertyAdminRegistrationSchema.parse(valid);
    expect(parsed.email).toBe('admin@example.com');
  });

  it('rejects password mismatch', () => {
    const result = propertyAdminRegistrationSchema.safeParse({
      ...valid,
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
  });
});

describe('formatBuildingAddress', () => {
  it('formats Swiss building addresses', () => {
    expect(
      formatBuildingAddress({
        street: 'Limmatquai 12',
        postalCode: '8001',
        city: 'Zürich',
        country: 'CH',
      }),
    ).toBe('Limmatquai 12, 8001 Zürich, CH');
  });
});
