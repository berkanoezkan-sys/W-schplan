import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  listNoticeCategories,
  getNoticeTemplate,
  noticeCategoryColors,
  SEVERITY_COLORS,
  type NoticeCategory,
  type NoticeSeverity,
} from '@woeschplan/shared';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';
export function NoticeCategoryChips({
  value,
  onChange,
}: {
  value: NoticeCategory;
  onChange: (category: NoticeCategory) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {listNoticeCategories().map((category) => {
        const selected = value === category;
        const palette = noticeCategoryColors(category);
        const icon = getNoticeTemplate(category).icon;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(category)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selected ? palette.bg : colors.surface,
                borderColor: selected ? palette.border : colors.border,
              },
            ]}
          >
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={selected ? palette.border : colors.textMuted}
            />
            <Text
              style={[styles.categoryChipText, { color: selected ? palette.fg : colors.textMuted }]}
              numberOfLines={2}
            >
              {t(`notices.category.${category}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NoticeSeverityChips({
  value,
  onChange,
}: {
  value: NoticeSeverity;
  onChange: (severity: NoticeSeverity) => void;
}) {
  const severities: NoticeSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  return (
    <View style={styles.severityRow}>
      {severities.map((severity) => {
        const selected = value === severity;
        const color = SEVERITY_COLORS[severity];
        return (
          <Pressable
            key={severity}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(severity)}
            style={[
              styles.severityChip,
              {
                backgroundColor: selected ? color : colors.surface,
                borderColor: selected ? color : colors.border,
              },
            ]}
          >
            <Text style={[styles.severityChipText, { color: selected ? '#FFFFFF' : color }]}>
              {t(`notices.severity.${severity}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    width: '48%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  categoryChipText: { ...typography.caption, fontWeight: '600', flex: 1 },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  severityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    minHeight: 40,
    justifyContent: 'center',
  },
  severityChipText: { ...typography.caption, fontWeight: '700' },
});
