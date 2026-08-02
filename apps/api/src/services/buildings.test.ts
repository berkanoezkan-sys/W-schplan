import { describe, expect, it } from 'vitest';
import { computePortfolioStats } from '../services/buildings.js';

describe('computePortfolioStats', () => {
  it('counts only administrator memberships in the scoped building list', () => {
    const stats = computePortfolioStats([
      { role: 'ADMINISTRATOR', buildingId: 'b1' },
      { role: 'ADMINISTRATOR', buildingId: 'b2' },
      { role: 'RESIDENT', buildingId: 'b3' },
    ]);

    expect(stats.buildingCount).toBe(2);
    expect(stats.adminBuildingIds).toEqual(['b1', 'b2']);
  });

  it('returns zero when no administrator memberships exist', () => {
    const stats = computePortfolioStats([{ role: 'RESIDENT', buildingId: 'b1' }]);
    expect(stats.buildingCount).toBe(0);
    expect(stats.adminBuildingIds).toEqual([]);
  });
});

describe('portfolio and building list consistency', () => {
  it('uses the same building count as the visible administrator building list', () => {
    const memberships = [
      { role: 'ADMINISTRATOR', buildingId: 'b1' },
      { role: 'ADMINISTRATOR', buildingId: 'b2' },
    ];

    const stats = computePortfolioStats(memberships);
    const visibleBuildings = memberships.filter((membership) => membership.role === 'ADMINISTRATOR');

    expect(stats.buildingCount).toBe(visibleBuildings.length);
  });
});
