import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HeaderLogo } from '@/components/HeaderLogo';
import { colors, spacing } from '@/lib/theme';

type AppHeaderProps = {
  title?: string;
  options?: NativeStackNavigationOptions;
};

export function AppHeader({ title, options }: AppHeaderProps) {
  const HeaderLeft = options?.headerLeft as (() => React.ReactNode) | undefined;
  const HeaderRight = options?.headerRight as (() => React.ReactNode) | undefined;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.side}>{HeaderLeft ? <HeaderLeft /> : null}</View>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? ''}
        </Text>
        <View style={[styles.side, styles.sideRight]}>
          {HeaderRight ? <HeaderRight /> : null}
          {!HeaderRight ? (
            <View style={styles.logoCorner} pointerEvents="none">
              <HeaderLogo />
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  bar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  side: {
    width: 88,
    justifyContent: 'center',
  },
  sideRight: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    fontWeight: '600',
    fontSize: 17,
    color: colors.primary,
    textAlign: 'center',
  },
  logoCorner: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    maxWidth: 88,
  },
});
