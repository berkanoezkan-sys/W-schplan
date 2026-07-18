import { describe, expect, it } from 'vitest';
import { formatPrivacyLabel } from '@woeschplan/shared';

describe('formatPrivacyLabel', () => {
  it('shows first name when configured', () => {
    expect(formatPrivacyLabel('FIRST_NAME', { firstName: 'Marco', lastName: 'Meier' })).toBe('Marco');
  });

  it('shows apartment number when configured', () => {
    expect(formatPrivacyLabel('APARTMENT_NUMBER', { apartmentNumber: '4B' })).toBe('Apt 4B');
  });

  it('shows initials when configured', () => {
    expect(formatPrivacyLabel('INITIALS', { firstName: 'Marco', lastName: 'Meier' })).toBe('MM');
  });

  it('hides identity when reserved mode is used', () => {
    expect(formatPrivacyLabel('RESERVED', { firstName: 'Marco' })).toBe('Reserved');
  });
});
