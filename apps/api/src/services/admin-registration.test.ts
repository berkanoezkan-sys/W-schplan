import { describe, expect, it } from 'vitest';
import { checkRateLimit, rateLimitKey } from '../middleware/rate-limit.js';
import { hashSecureToken } from '../services/admin-registration.js';

describe('rate limiting', () => {
  it('allows requests within the configured window', () => {
    const key = rateLimitKey('test', 'user@example.com');
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });
});

describe('hashSecureToken', () => {
  it('hashes tokens consistently without storing plain text', () => {
    const hash1 = hashSecureToken('sample-token');
    const hash2 = hashSecureToken('sample-token');
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe('sample-token');
    expect(hash1.length).toBe(64);
  });
});
