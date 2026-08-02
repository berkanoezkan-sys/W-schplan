import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '@/lib/theme';

export function SettingsGroup({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.group, style]}>
      {title ? <Text style={styles.groupTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  destructive,
  last,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  last?: boolean;
}) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
          <Ionicons name={icon} size={18} color={destructive ? colors.danger : colors.primary} />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDanger]}>{label}</Text>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          !last && styles.rowBorder,
          pressed && styles.rowPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, !last && styles.rowBorder]}>{content}</View>;
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.lg },
  groupTitle: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
    letterSpacing: 0.4,
  },
  groupFooter: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginHorizontal: spacing.sm,
    lineHeight: 18,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.background },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: '#FDEEEE' },
  rowBody: { flex: 1 },
  rowLabel: { ...typography.body },
  rowLabelDanger: { color: colors.danger },
  rowValue: { ...typography.caption, marginTop: 2 },
});
