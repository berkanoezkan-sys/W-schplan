import { createBuildingSchema } from './schemas.js';
import type { z } from 'zod';

export const duplicateBuildingSchema = createBuildingSchema;

export type DuplicateBuildingInput = z.infer<typeof duplicateBuildingSchema>;

/** Registry of configuration sections copied when duplicating a building. */
export const BUILDING_DUPLICATE_SECTION_KEYS = [
  'houseRules',
  'bookingRules',
  'checklistTemplates',
  'laundryRooms',
] as const;

export type BuildingDuplicateSectionKey = (typeof BUILDING_DUPLICATE_SECTION_KEYS)[number];

export type BuildingDuplicateSectionMeta = {
  key: BuildingDuplicateSectionKey;
  labelKey: string;
};

export const BUILDING_DUPLICATE_SECTIONS: BuildingDuplicateSectionMeta[] = [
  { key: 'houseRules', labelKey: 'duplicate.sections.houseRules' },
  { key: 'bookingRules', labelKey: 'duplicate.sections.bookingRules' },
  { key: 'checklistTemplates', labelKey: 'duplicate.sections.cleaningRules' },
  { key: 'laundryRooms', labelKey: 'duplicate.sections.laundryRooms' },
];

export const BUILDING_DUPLICATE_EXCLUDED_KEYS = [
  'residents',
  'reservations',
  'defectReports',
  'registrationTokens',
] as const;

export type BuildingDuplicateExcludedKey = (typeof BUILDING_DUPLICATE_EXCLUDED_KEYS)[number];

export const BUILDING_DUPLICATE_EXCLUDED: Array<{ key: BuildingDuplicateExcludedKey; labelKey: string }> = [
  { key: 'residents', labelKey: 'duplicate.excluded.residents' },
  { key: 'reservations', labelKey: 'duplicate.excluded.reservations' },
  { key: 'defectReports', labelKey: 'duplicate.excluded.defectReports' },
  { key: 'registrationTokens', labelKey: 'duplicate.excluded.registrationTokens' },
];

export function suggestDuplicateBuildingName(sourceName: string): string {
  const trimmed = sourceName.trim();
  if (!trimmed) return 'New Building (Copy)';
  if (/\(copy\)$/i.test(trimmed)) return trimmed;
  return `${trimmed} (Copy)`;
}

export type BuildingDuplicatePreview = {
  sourceBuildingId: string;
  sourceName: string;
  sourceAddress: string;
  sections: Array<{
    key: BuildingDuplicateSectionKey;
    labelKey: string;
    count?: number;
  }>;
  excluded: Array<{ key: BuildingDuplicateExcludedKey; labelKey: string }>;
};
