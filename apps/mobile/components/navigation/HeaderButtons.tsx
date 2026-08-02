import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

type HeaderTextButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'destructive';
};

export function HeaderTextButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: HeaderTextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[styles.btn, disabled && styles.disabled]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.label,
          variant === 'accent' && styles.accent,
          variant === 'destructive' && styles.destructive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function HeaderCancelButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <HeaderTextButton
      label={Platform.OS === 'android' ? t('common.cancel') : t('common.cancel')}
      onPress={onPress}
      disabled={disabled}
    />
  );
}

export function HeaderSaveButton({
  onPress,
  loading,
  label = t('settings.save'),
}: {
  onPress: () => void;
  loading?: boolean;
  label?: string;
}) {
  if (loading) {
    return (
      <Pressable style={styles.btn} accessibilityRole="button" disabled>
        <ActivityIndicator size="small" color={colors.accent} />
      </Pressable>
    );
  }

  return <HeaderTextButton label={label} onPress={onPress} variant="accent" />;
}

const styles = StyleSheet.create({
  btn: {
    minWidth: Platform.OS === 'ios' ? 64 : 48,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: Platform.OS === 'android' ? 'center' : 'flex-end',
  },
  disabled: { opacity: 0.5 },
  label: { ...typography.body, color: colors.primary },
  accent: { color: colors.accent, fontWeight: '600' },
  destructive: { color: colors.danger },
});
