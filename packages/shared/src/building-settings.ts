import { z } from 'zod';
import { CHECKLIST_TYPES } from './constants.js';
import { bookingRulesPatchSchema } from './booking-rules.js';

export const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const timeRangeSchema = z.object({
  start: timeHHMM,
  end: timeHHMM,
});

export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const officePeriodSchema = z.object({
  id: z.string().uuid(),
  start: timeHHMM,
  end: timeHHMM,
});

export const officeDaySchema = z.object({
  enabled: z.boolean().default(false),
  periods: z.array(officePeriodSchema).default([]),
});

export const officeHoursSchema = z.object({
  monday: officeDaySchema,
  tuesday: officeDaySchema,
  wednesday: officeDaySchema,
  thursday: officeDaySchema,
  friday: officeDaySchema,
  saturday: officeDaySchema,
  sunday: officeDaySchema,
});

export const caretakerSchema = z.object({
  name: z.string().default(''),
  mobile: z.string().default(''),
  email: z.string().default(''),
  workingHours: z.string().optional(),
});

export const propertyManagementSchema = z.object({
  companyName: z.string().default(''),
  contactPerson: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  website: z.string().optional(),
});

/** Building-level contact (caretaker / Hauswart). */
export const buildingContactSchema = caretakerSchema;

/** @deprecated Use buildingContactSchema for building settings; propertyManagement lives on administrator settings. */
export const contactSettingsSchema = z.object({
  caretaker: caretakerSchema,
  propertyManagement: propertyManagementSchema,
});

export const emergencyContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  isSwissEmergency: z.boolean().optional(),
});

export const houseRulesSchema = z.object({
  washingHours: timeRangeSchema,
  quietHours: timeRangeSchema,
  contact: buildingContactSchema,
  emergencyContacts: z.array(emergencyContactSchema),
});

export const checklistTemplateItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  mandatory: z.boolean().default(true),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0),
  category: z.enum(['after_cycle', 'maintenance']),
});

export const checklistTemplateSchema = z.object({
  checklistType: z.enum(CHECKLIST_TYPES),
  items: z.array(checklistTemplateItemSchema),
});

export const buildingSettingsPatchSchema = z
  .object({
    houseRules: houseRulesSchema.deepPartial().optional(),
    bookingRules: bookingRulesPatchSchema.optional(),
  })
  .refine((v) => v.houseRules || v.bookingRules, { message: 'No settings provided' });

export const checklistTemplatePatchSchema = checklistTemplateSchema;

export type TimeRange = z.infer<typeof timeRangeSchema>;
export type OfficePeriod = z.infer<typeof officePeriodSchema>;
export type OfficeDay = z.infer<typeof officeDaySchema>;
export type OfficeHours = z.infer<typeof officeHoursSchema>;
export type HouseRules = z.infer<typeof houseRulesSchema>;
export type BuildingContact = z.infer<typeof buildingContactSchema>;
export type ContactSettings = z.infer<typeof contactSettingsSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type ChecklistTemplateItem = z.infer<typeof checklistTemplateItemSchema>;
export type ChecklistTemplate = z.infer<typeof checklistTemplateSchema>;

/** @deprecated Import from booking-rules.js */
export {
  DURATION_OPTIONS_MINUTES,
  formatDuration,
  nearestDurationOption,
} from './booking-rules.js';

export function formatTimeRange(range: TimeRange): string {
  return `${range.start} – ${range.end}`;
}

/** Quiet hours are always the inverse of washing hours. */
export function deriveQuietHours(washingHours: TimeRange): TimeRange {
  return { start: washingHours.end, end: washingHours.start };
}

function uuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createOfficePeriod(start: string, end: string): OfficePeriod {
  return { id: uuid(), start, end };
}

export function createDefaultOfficeHours(): OfficeHours {
  const weekdayPeriods = [
    createOfficePeriod('08:00', '12:00'),
    createOfficePeriod('13:30', '17:00'),
  ];
  const closedDay = { enabled: false, periods: [] as OfficePeriod[] };
  const openDay = { enabled: true, periods: weekdayPeriods };

  return {
    monday: { ...openDay, periods: weekdayPeriods.map((p) => ({ ...p, id: uuid() })) },
    tuesday: { ...openDay, periods: weekdayPeriods.map((p) => ({ ...p, id: uuid() })) },
    wednesday: { ...openDay, periods: weekdayPeriods.map((p) => ({ ...p, id: uuid() })) },
    thursday: { ...openDay, periods: weekdayPeriods.map((p) => ({ ...p, id: uuid() })) },
    friday: { ...openDay, periods: weekdayPeriods.map((p) => ({ ...p, id: uuid() })) },
    saturday: { ...closedDay },
    sunday: { ...closedDay },
  };
}

export function createDefaultEmergencyContacts(): EmergencyContact[] {
  return [
    { id: uuid(), name: 'Polizei', role: 'Notfall', phone: '117', isSwissEmergency: true },
    { id: uuid(), name: 'Feuerwehr', role: 'Notfall', phone: '118', isSwissEmergency: true },
    { id: uuid(), name: 'Ambulanz', role: 'Notfall', phone: '144', isSwissEmergency: true },
    { id: uuid(), name: 'Vergiftungsnotfall', role: 'Notfall', phone: '145', isSwissEmergency: true },
    { id: uuid(), name: 'Hauswart', role: 'Caretaker', phone: '+41 79 000 00 00', email: 'hauswart@limmatquai12.ch' },
    { id: uuid(), name: 'Verwaltung', role: 'Property Management', phone: '+41 44 000 00 00', email: 'verwaltung@limmatquai12.ch' },
    { id: uuid(), name: 'Elektriker', role: 'Electrician', phone: '+41 44 111 11 11' },
    { id: uuid(), name: 'Sanitär', role: 'Plumber', phone: '+41 44 222 22 22' },
    { id: uuid(), name: 'Lift-Service', role: 'Lift Service', phone: '+41 44 333 33 33' },
    { id: uuid(), name: 'Gebäudeunterhalt', role: 'Building Maintenance', phone: '+41 44 444 44 44' },
  ];
}

export function createDefaultHouseRules(): HouseRules {
  const washingHours = { start: '06:00', end: '22:00' };
  return {
    washingHours,
    quietHours: deriveQuietHours(washingHours),
    contact: {
      name: 'Max Hauswart',
      mobile: '+41 79 123 45 67',
      email: 'hauswart@limmatquai12.ch',
    },
    emergencyContacts: createDefaultEmergencyContacts(),
  };
}

/** Short summary for settings list row. */
export function formatOfficeHoursSummary(officeHours: OfficeHours): string {
  const enabledDays = WEEKDAY_KEYS.filter((day) => officeHours[day].enabled);
  if (enabledDays.length === 0) return '—';
  const periodCount = officeHours[enabledDays[0]].periods.length;
  const allSame = enabledDays.every(
    (day) =>
      officeHours[day].periods.length === periodCount &&
      officeHours[day].periods.every(
        (p, i) =>
          officeHours[enabledDays[0]].periods[i]?.start === p.start &&
          officeHours[enabledDays[0]].periods[i]?.end === p.end,
      ),
  );
  const dayLabel =
    enabledDays.length === 5 &&
    enabledDays.every((d, i) => d === ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][i])
      ? 'Mo–Fr'
      : `${enabledDays.length}d`;
  if (allSame && periodCount > 0) {
    const first = officeHours[enabledDays[0]].periods[0];
    return `${dayLabel} · ${formatTimeRange(first)}${periodCount > 1 ? ` +${periodCount - 1}` : ''}`;
  }
  return `${enabledDays.length} ${enabledDays.length === 1 ? 'day' : 'days'}`;
}

/** Detailed lines for contact page. */
export function formatOfficeHoursLines(
  officeHours: OfficeHours,
  dayLabels: Record<WeekdayKey, string>,
): string[] {
  return WEEKDAY_KEYS.filter((day) => officeHours[day].enabled).flatMap((day) => {
    const periods = officeHours[day].periods;
    if (periods.length === 0) return [`${dayLabels[day]}: —`];
    return periods.map((p) => `${dayLabels[day]} · ${formatTimeRange(p)}`);
  });
}

export function createDefaultChecklistTemplate(
  checklistType: 'WASHING_MACHINE' | 'TUMBLE_DRYER',
): ChecklistTemplate {
  const afterCycle =
    checklistType === 'WASHING_MACHINE'
      ? [
          'Türdichtung und Gummidichtung abwischen. Wasser, Haare und Rückstände entfernen.',
          'Waschmittelfach prüfen, Rückstände entfernen, leicht offen lassen.',
          'Maschinentür offen lassen.',
          'Trommel auf vergessene Gegenstände prüfen. Münzen, Taschentücher oder Flusen entfernen.',
          'Verschüttetes Wasser um die Maschine wischen.',
        ]
      : [
          'Flusensieb reinigen.',
          'Flusen aus dem Filterfach entfernen.',
          'Wasserbehälter leeren (falls vorhanden).',
          'Trommel auf vergessene Kleidung prüfen.',
          'Türdichtung abwischen.',
          'Tür leicht offen lassen.',
          'Flusen um die Maschine entfernen.',
        ];

  const maintenance =
    checklistType === 'WASHING_MACHINE'
      ? [
          'Abpumpfilter regelmässig reinigen.',
          'Monatlich einen Heisswaschgang durchführen.',
          'Waschmittelfach bei Bedarf gründlich reinigen.',
        ]
      : [
          'Kondensator / Wärmetauscher reinigen.',
          'Unteren Filter reinigen.',
          'Feuchtigkeitssensoren vorsichtig reinigen.',
          'Lüftungsöffnungen prüfen.',
        ];

  const items: ChecklistTemplateItem[] = [
    ...afterCycle.map((label, i) => ({
      id: uuid(),
      label,
      mandatory: true,
      enabled: true,
      order: i,
      category: 'after_cycle' as const,
    })),
    ...maintenance.map((label, i) => ({
      id: uuid(),
      label,
      mandatory: false,
      enabled: true,
      order: afterCycle.length + i,
      category: 'maintenance' as const,
    })),
  ];

  return { checklistType, items };
}

function parseLegacyRange(s: unknown, fallback: TimeRange): TimeRange {
  if (typeof s !== 'string') return fallback;
  const m = s.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  if (!m) return fallback;
  const pad = (t: string) => t.padStart(5, '0').replace(/^(\d):/, '0$1:');
  return { start: pad(m[1]), end: pad(m[2]) };
}

/** Normalize stored JSON, migrate legacy fields, and sync derived quiet hours. */
export function normalizeHouseRules(raw: unknown): HouseRules {
  if (!raw || typeof raw !== 'object') return createDefaultHouseRules();

  const r = raw as Record<string, unknown>;
  const defaults = createDefaultHouseRules();

  let washingHours = defaults.washingHours;
  if (r.washingHours && typeof r.washingHours === 'object') {
    washingHours = timeRangeSchema.parse(r.washingHours);
  } else if (r.openingHours && typeof r.openingHours === 'object') {
    washingHours = timeRangeSchema.parse(r.openingHours);
  } else if (typeof r.openingHours === 'string' || typeof r.washingHours === 'string') {
    washingHours = parseLegacyRange(r.washingHours ?? r.openingHours, defaults.washingHours);
  }

  const quietHours = deriveQuietHours(washingHours);

  let contact = defaults.contact;
  if (r.contact && typeof r.contact === 'object') {
    const c = r.contact as Record<string, unknown>;
    if (c.caretaker && typeof c.caretaker === 'object') {
      try {
        contact = buildingContactSchema.parse(c.caretaker);
      } catch {
        contact = defaults.contact;
      }
    } else {
      try {
        contact = buildingContactSchema.parse(r.contact);
      } catch {
        contact = defaults.contact;
      }
    }
  }

  let emergencyContacts = defaults.emergencyContacts;
  if (Array.isArray(r.emergencyContacts)) {
    try {
      emergencyContacts = z.array(emergencyContactSchema).parse(r.emergencyContacts);
    } catch {
      emergencyContacts = defaults.emergencyContacts;
    }
  }

  return houseRulesSchema.parse({
    washingHours,
    quietHours,
    contact,
    emergencyContacts,
  });
}

/** @deprecated Use normalizeHouseRules */
export function parseHouseRules(raw: unknown): HouseRules {
  return normalizeHouseRules(raw);
}
