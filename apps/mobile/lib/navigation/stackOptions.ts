import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors } from '@/lib/theme';
import { t } from '@/lib/i18n';

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontWeight: '600',
    color: colors.primary,
  },
  headerStyle: {
    backgroundColor: colors.surface,
  },
  headerShadowVisible: Platform.OS === 'ios',
  headerBackTitle: Platform.OS === 'ios' ? t('common.back') : undefined,
  headerBackButtonDisplayMode: 'default',
  headerBackButtonMenuEnabled: false,
  ...Platform.select({
    ios: {
      headerLargeTitle: false,
      headerBlurEffect: 'systemMaterial',
      animation: 'default',
    },
    android: {
      animation: 'slide_from_right',
      headerTitleAlign: 'left' as const,
    },
    web: {
      animation: 'none',
      headerBackButtonDisplayMode: 'minimal',
      headerBackTitleVisible: false,
    },
    default: {},
  }),
};

export function detailScreenOptions(
  title: string,
  backTitle?: string,
): NativeStackNavigationOptions {
  return {
    ...stackScreenOptions,
    title,
    headerBackVisible: true,
    ...(backTitle && Platform.OS === 'ios'
      ? { headerBackTitle: backTitle }
      : null),
  };
}
