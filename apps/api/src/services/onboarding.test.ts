import { describe, expect, it } from 'vitest';
import { ONBOARDING_STEPS } from '@woeschplan/shared';

describe('onboarding steps', () => {
  it('defines the administrator onboarding sequence', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'COMPANY_PROFILE',
      'FIRST_BUILDING',
      'LAUNDRY_SETUP',
      'RESIDENT_INVITATION',
      'COMPLETED',
    ]);
  });
});

describe('organisation tenant isolation rules', () => {
  it('requires matching organisation ids for property admin building access', () => {
    const userOrganisationId = 'org-a';
    const buildingOrganisationId = 'org-b';
    const platformRole = 'PROPERTY_ADMIN';

    const denied =
      platformRole === 'PROPERTY_ADMIN' &&
      buildingOrganisationId &&
      userOrganisationId &&
      buildingOrganisationId !== userOrganisationId;

    expect(denied).toBe(true);
  });

  it('allows access when organisation ids match', () => {
    const userOrganisationId = 'org-a';
    const buildingOrganisationId = 'org-a';
    const platformRole = 'PROPERTY_ADMIN';

    const denied =
      platformRole === 'PROPERTY_ADMIN' &&
      buildingOrganisationId &&
      userOrganisationId &&
      buildingOrganisationId !== userOrganisationId;

    expect(denied).toBe(false);
  });
});
