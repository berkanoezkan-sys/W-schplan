import { describe, expect, it } from 'vitest';
import { adminBuildings, resolveSelectedBuildingId } from './buildingSelection';

const buildings = [
  { id: 'b1', role: 'ADMINISTRATOR' as const, name: 'Alpha' },
  { id: 'b2', role: 'ADMINISTRATOR' as const, name: 'Beta' },
];

describe('resolveSelectedBuildingId', () => {
  it('keeps a valid stored building after restart', () => {
    expect(resolveSelectedBuildingId(buildings, 'b2')).toBe('b2');
  });

  it('falls back when stored building was deleted or is outside scope', () => {
    expect(resolveSelectedBuildingId(buildings, 'missing-id')).toBe('b1');
  });

  it('selects the first administrator building when nothing is stored', () => {
    expect(resolveSelectedBuildingId(buildings, null)).toBe('b1');
  });

  it('returns null when no buildings exist', () => {
    expect(resolveSelectedBuildingId([], 'b1')).toBeNull();
  });
});

describe('adminBuildings', () => {
  it('filters administrator buildings for portfolio views', () => {
    const mixed = [
      ...buildings,
      { id: 'b3', role: 'RESIDENT' as const, name: 'Resident block' },
    ];
    expect(adminBuildings(mixed)).toHaveLength(2);
  });
});
