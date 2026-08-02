import { z } from 'zod';

export const registrationTokenParamSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const validateRegistrationTokenSchema = z.object({
  token: registrationTokenParamSchema,
});

export const registerWithTokenSchema = z.object({
  token: registrationTokenParamSchema,
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  apartmentNumber: z.string().min(1),
});

export const updateBuildingRegistrationSchema = z.object({
  selfRegistrationEnabled: z.boolean(),
});

export type RegisterWithTokenInput = z.infer<typeof registerWithTokenSchema>;
export type UpdateBuildingRegistrationInput = z.infer<typeof updateBuildingRegistrationSchema>;

export function buildRegistrationPaths(token: string) {
  const encoded = encodeURIComponent(token);
  return {
    appDeepLink: `woeschplan://join/${token}`,
    webPath: `/join/${encoded}`,
  };
}
