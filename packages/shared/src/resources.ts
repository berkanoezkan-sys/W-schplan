import { RESOURCE_TYPES, type ResourceType } from './constants.js';

export type BookingRulesResourceKey = 'washingMachine' | 'tumbleDryer' | 'dryingRoom';

const BOOKING_RULES_KEY_BY_TYPE: Record<ResourceType, BookingRulesResourceKey> = {
  WASHING_MACHINE: 'washingMachine',
  TUMBLE_DRYER: 'tumbleDryer',
  DRYING_ROOM: 'dryingRoom',
};

export function resourceTypeToBookingRulesKey(type: ResourceType): BookingRulesResourceKey {
  return BOOKING_RULES_KEY_BY_TYPE[type];
}

export function supportsChecklist(type: ResourceType): boolean {
  return type === 'WASHING_MACHINE' || type === 'TUMBLE_DRYER';
}

export function supportsTimer(type: ResourceType): boolean {
  return type !== 'DRYING_ROOM';
}

export function countResourcesByType(
  resources: Array<{ resourceType: ResourceType }>,
): Record<ResourceType, number> {
  return RESOURCE_TYPES.reduce(
    (acc, type) => {
      acc[type] = resources.filter((r) => r.resourceType === type).length;
      return acc;
    },
    {} as Record<ResourceType, number>,
  );
}

export function formatResourceCounts(
  resources: Array<{ resourceType: ResourceType }>,
  labels: Record<ResourceType, string>,
): string {
  const counts = countResourcesByType(resources);
  return RESOURCE_TYPES.filter((type) => counts[type] > 0)
    .map((type) => `${counts[type]} ${labels[type]}`)
    .join(' · ');
}

export function defaultRuntimeForResourceType(type: ResourceType): number {
  switch (type) {
    case 'TUMBLE_DRYER':
      return 60;
    case 'DRYING_ROOM':
      return 120;
    default:
      return 90;
  }
}
