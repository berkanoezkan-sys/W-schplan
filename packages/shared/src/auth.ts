import { z } from 'zod';

export const LEGAL_URLS = {
  termsOfService: 'https://woeschplan.ch/terms',
  privacyPolicy: 'https://woeschplan.ch/privacy',
} as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const passwordSchema = z
  .string()
  .min(8, 'WEAK_PASSWORD')
  .max(128)
  .regex(/[a-z]/, 'WEAK_PASSWORD')
  .regex(/[A-Z]/, 'WEAK_PASSWORD')
  .regex(/[0-9]/, 'WEAK_PASSWORD');

export const phoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(30)
  .regex(/^[+0-9()\s-]+$/, 'INVALID_PHONE');

export const optionalWebsiteSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'INVALID_WEBSITE');

export const propertyAdminRegistrationSchema = z
  .object({
    companyName: z.string().trim().min(2).max(120),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().email().transform(normalizeEmail),
    phone: phoneSchema,
    website: optionalWebsiteSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true),
    acceptPrivacy: z.literal(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'PASSWORD_MISMATCH',
    path: ['confirmPassword'],
  });

export type PropertyAdminRegistrationInput = z.infer<typeof propertyAdminRegistrationSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
});

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
});

export function formatBuildingAddress(input: {
  street: string;
  postalCode: string;
  city: string;
  country?: string;
}): string {
  const country = input.country ?? 'CH';
  return `${input.street}, ${input.postalCode} ${input.city}, ${country}`;
}

export const onboardingCompanyProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  contactPerson: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.string().email().transform(normalizeEmail),
  website: optionalWebsiteSchema,
  officeHours: z.unknown().optional(),
});

export const onboardingBuildingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().length(2).default('CH'),
  timezone: z.string().min(1).default('Europe/Zurich'),
  language: z.enum(['de', 'en', 'fr', 'it']).default('de'),
});

export const onboardingLaundryRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),
  floor: z.string().trim().max(50).optional(),
  washingMachines: z.number().int().min(0).max(20).default(1),
  tumbleDryers: z.number().int().min(0).max(20).default(1),
  dryingRooms: z.number().int().min(0).max(10).default(0),
});

export type OnboardingCompanyProfileInput = z.infer<typeof onboardingCompanyProfileSchema>;
export type OnboardingBuildingInput = z.infer<typeof onboardingBuildingSchema>;
export type OnboardingLaundryRoomInput = z.infer<typeof onboardingLaundryRoomSchema>;

export const ONBOARDING_STEPS = [
  'COMPANY_PROFILE',
  'FIRST_BUILDING',
  'LAUNDRY_SETUP',
  'RESIDENT_INVITATION',
  'COMPLETED',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
