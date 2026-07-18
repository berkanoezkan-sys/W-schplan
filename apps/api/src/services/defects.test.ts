import { describe, expect, it } from 'vitest';
import { SERIOUS_DEFECT_CATEGORIES } from '@woeschplan/shared';

describe('defect severity workflow', () => {
  it('defines serious categories that trigger out-of-service', () => {
    expect(SERIOUS_DEFECT_CATEGORIES).toContain('WATER_LEAKAGE');
    expect(SERIOUS_DEFECT_CATEGORIES).toContain('DISPLAY_ERROR');
  });

  it('maps defect status progression', () => {
    const workflow = [
      'REPORTED',
      'ADMINISTRATION_NOTIFIED',
      'UNDER_REVIEW',
      'REPAIR_SCHEDULED',
      'RESOLVED',
    ];
    expect(workflow.indexOf('ADMINISTRATION_NOTIFIED')).toBeGreaterThan(
      workflow.indexOf('REPORTED'),
    );
    expect(workflow.at(-1)).toBe('RESOLVED');
  });
});
