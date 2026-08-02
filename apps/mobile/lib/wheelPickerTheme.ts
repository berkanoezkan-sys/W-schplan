import { Platform, StyleSheet, type TextStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';

/** Centralized wheel picker palette — use everywhere, never white picker text. */
export const wheelPickerColors = {
  /** Selected value — primary brand dark blue (#1E4470). WCAG AAA on white. */
  selected: colors.primary,
  /** Nearby unselected rows — lighter brand blue, still readable. */
  unselected: '#5B8FC6',
  /** Far / faded rows — neutral gray-blue. */
  unselectedMuted: colors.textMuted,
  /** Selection band fill — keep native highlight, ensure text stays readable. */
  selectionBackground: 'rgba(30, 68, 112, 0.07)',
  /** Selection band borders — subtle primary tint. */
  selectionBorder: 'rgba(30, 68, 112, 0.22)',
  /** Sheet / wheel background. */
  wheelBackground: colors.surface,
} as const;

export type ColorScheme = 'light' | 'dark';

/** Dark-mode-ready tokens (light used today). */
export const wheelPickerScheme = {
  light: {
    selected: wheelPickerColors.selected,
    unselected: wheelPickerColors.unselected,
    unselectedMuted: wheelPickerColors.unselectedMuted,
    selectionBackground: wheelPickerColors.selectionBackground,
    selectionBorder: wheelPickerColors.selectionBorder,
    wheelBackground: wheelPickerColors.wheelBackground,
    themeVariant: 'light' as const,
  },
  dark: {
    selected: '#A8D4F5',
    unselected: '#7EB3DC',
    unselectedMuted: '#9AAFB8',
    selectionBackground: 'rgba(168, 212, 245, 0.12)',
    selectionBorder: 'rgba(168, 212, 245, 0.28)',
    wheelBackground: '#1A2B33',
    themeVariant: 'dark' as const,
  },
} satisfies Record<
  ColorScheme,
  {
    selected: string;
    unselected: string;
    unselectedMuted: string;
    selectionBackground: string;
    selectionBorder: string;
    wheelBackground: string;
    themeVariant: 'light' | 'dark';
  }
>;

export const wheelPickerMetrics = {
  itemHeight: 44,
  visibleRows: 5,
  nativePickerHeight: 180,
  fontSizeSelected: 22,
  fontSizeUnselected: 18,
  fontSizeFaded: 16,
} as const;

export function getWheelPickerTheme(scheme: ColorScheme = 'light') {
  return wheelPickerScheme[scheme];
}

/** Text style for custom wheel rows based on distance from selection. */
export function wheelItemTextStyle(
  distanceFromSelected: number,
  scheme: ColorScheme = 'light',
): TextStyle {
  const palette = getWheelPickerTheme(scheme);
  if (distanceFromSelected === 0) {
    return {
      color: palette.selected,
      fontSize: wheelPickerMetrics.fontSizeSelected,
      fontWeight: '700',
      textAlign: 'center',
    };
  }
  if (distanceFromSelected === 1) {
    return {
      color: palette.unselected,
      fontSize: wheelPickerMetrics.fontSizeUnselected,
      fontWeight: '500',
      textAlign: 'center',
      opacity: 0.92,
    };
  }
  return {
    color: palette.unselectedMuted,
    fontSize: wheelPickerMetrics.fontSizeFaded,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.75,
  };
};

const WHEEL_INSET = 4;

export const wheelPickerStyles = StyleSheet.create({
  wheelContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: wheelPickerColors.wheelBackground,
    borderRadius: radius.md,
  },
  selectionBand: {
    position: 'absolute',
    left: WHEEL_INSET,
    right: WHEEL_INSET,
    top: '50%',
    marginTop: -wheelPickerMetrics.itemHeight / 2,
    height: wheelPickerMetrics.itemHeight,
    backgroundColor: wheelPickerColors.selectionBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: wheelPickerColors.selectionBorder,
    borderRadius: radius.sm,
    zIndex: 1,
  },
  nativePickerWrap: {
    backgroundColor: wheelPickerColors.wheelBackground,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  nativePicker: {
    height: wheelPickerMetrics.nativePickerHeight,
    ...(Platform.OS === 'ios' ? { alignSelf: 'stretch' as const } : {}),
  },
  readOnlyValue: {
    color: wheelPickerColors.selected,
    fontSize: wheelPickerMetrics.fontSizeSelected,
    fontWeight: '700',
    textAlign: 'center',
  },
});

/** Shared props for @react-native-community/datetimepicker spinner mode. */
export function nativeWheelPickerProps(scheme: ColorScheme = 'light') {
  const palette = getWheelPickerTheme(scheme);
  return {
    themeVariant: palette.themeVariant,
    textColor: palette.selected,
    accentColor: palette.selected,
  } as const;
}
