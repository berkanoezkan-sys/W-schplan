export const colors = {
  background: '#F8FAFB',
  surface: '#FFFFFF',
  primary: '#1E4470',
  primaryLight: '#5BB8E8',
  accent: '#6BC04A',
  accentLight: '#E8F5E0',
  accentSurface: '#F0F9EC',
  text: '#1A2B33',
  textMuted: '#5A6B73',
  border: '#E2EAF0',
  success: '#6BC04A',
  warning: '#E6A817',
  danger: '#D64545',
  reserved: '#5B8FC6',
  inUse: '#1E4470',
  defective: '#D64545',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 24 },
  caption: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.textMuted },
  hero: { fontSize: 32, fontWeight: '700' as const, color: colors.text },
};

export const machineStatusLabels: Record<string, string> = {
  AVAILABLE: 'status.available',
  RESERVED: 'status.reserved',
  IN_USE: 'status.inUse',
  CLEANING_REQUIRED: 'status.cleaningRequired',
  DEFECTIVE: 'status.defective',
  ADMINISTRATION_NOTIFIED: 'status.adminNotified',
  UNDER_REPAIR: 'status.underRepair',
  OUT_OF_SERVICE: 'status.outOfService',
};

export const machineStatusColors: Record<string, string> = {
  AVAILABLE: colors.success,
  RESERVED: colors.reserved,
  IN_USE: colors.primary,
  CLEANING_REQUIRED: colors.warning,
  DEFECTIVE: colors.danger,
  ADMINISTRATION_NOTIFIED: colors.warning,
  UNDER_REPAIR: colors.warning,
  OUT_OF_SERVICE: colors.danger,
};
