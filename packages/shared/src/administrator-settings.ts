import { z } from 'zod';
import {
  createDefaultOfficeHours,
  formatOfficeHoursSummary,
  formatOfficeHoursLines,
  officeHoursSchema,
  propertyManagementSchema,
  type OfficeHours,
  type WeekdayKey,
} from './building-settings.js';

export { officeHoursSchema, formatOfficeHoursSummary, formatOfficeHoursLines };
export type { OfficeHours, WeekdayKey };

export const companyContactSchema = propertyManagementSchema;

export const administratorSettingsSchema = z.object({
  officeHours: officeHoursSchema,
  companyContact: companyContactSchema,
});

export const administratorSettingsPatchSchema = administratorSettingsSchema.deepPartial();

export type CompanyContact = z.infer<typeof companyContactSchema>;
export type AdministratorSettings = z.infer<typeof administratorSettingsSchema>;

export function createDefaultAdministratorSettings(): AdministratorSettings {
  return {
    officeHours: createDefaultOfficeHours(),
    companyContact: {
      companyName: 'Limmatquai Verwaltung AG',
      contactPerson: 'Anna Verwaltung',
      phone: '+41 44 555 55 55',
      email: 'verwaltung@limmatquai12.ch',
      website: 'https://limmatquai12.ch',
    },
  };
}

export function normalizeAdministratorSettings(raw: unknown): AdministratorSettings {
  if (!raw || typeof raw !== 'object') return createDefaultAdministratorSettings();

  const r = raw as Record<string, unknown>;
  const defaults = createDefaultAdministratorSettings();

  let officeHours = defaults.officeHours;
  if (r.officeHours && typeof r.officeHours === 'object') {
    try {
      officeHours = officeHoursSchema.parse(r.officeHours);
    } catch {
      officeHours = defaults.officeHours;
    }
  }

  let companyContact = defaults.companyContact;
  if (r.companyContact && typeof r.companyContact === 'object') {
    try {
      companyContact = companyContactSchema.parse(r.companyContact);
    } catch {
      companyContact = defaults.companyContact;
    }
  }

  return administratorSettingsSchema.parse({ officeHours, companyContact });
}

/** Build admin settings from legacy building houseRules during migration. */
export function administratorSettingsFromLegacyHouseRules(houseRules: {
  officeHours?: OfficeHours;
  contact?: { propertyManagement?: CompanyContact };
}): AdministratorSettings {
  const defaults = createDefaultAdministratorSettings();
  return {
    officeHours: houseRules.officeHours ?? defaults.officeHours,
    companyContact: houseRules.contact?.propertyManagement ?? defaults.companyContact,
  };
}
