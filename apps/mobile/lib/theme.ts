export const colors = {
  background: '#F5FAFC',
  surface: '#FFFFFF',
  primary: '#006699',
  primaryDark: '#004D73',
  accent: '#E8F4F8',
  text: '#1A2B33',
  textMuted: '#5A6B73',
  border: '#D4E4EC',
  success: '#2E7D4F',
  warning: '#B8860B',
  danger: '#C0392B',
  reserved: '#5B7FA6',
  inUse: '#006699',
  defective: '#C0392B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 24 },
  caption: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.textMuted },
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
  IN_USE: colors.inUse,
  CLEANING_REQUIRED: colors.warning,
  DEFECTIVE: colors.danger,
  ADMINISTRATION_NOTIFIED: colors.warning,
  UNDER_REPAIR: colors.warning,
  OUT_OF_SERVICE: colors.danger,
};
