import type { PRIVACY_LABEL_MODES } from './constants.js';

type PrivacyMode = (typeof PRIVACY_LABEL_MODES)[number];

type UserLike = {
  firstName?: string | null;
  lastName?: string | null;
  apartmentNumber?: string | null;
};

export function formatPrivacyLabel(
  mode: PrivacyMode,
  user: UserLike | null | undefined,
): string {
  if (!user) return 'Reserved';

  switch (mode) {
    case 'FIRST_NAME':
      return user.firstName?.trim() || 'Reserved';
    case 'APARTMENT_NUMBER':
      return user.apartmentNumber ? `Apt ${user.apartmentNumber}` : 'Reserved';
    case 'INITIALS': {
      const first = user.firstName?.trim()?.[0]?.toUpperCase() ?? '';
      const last = user.lastName?.trim()?.[0]?.toUpperCase() ?? '';
      const initials = `${first}${last}`.trim();
      return initials || 'Reserved';
    }
    case 'RESERVED':
    default:
      return 'Reserved';
  }
}
