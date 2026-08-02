import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { noticeCategoryColors, type NoticeCategory } from '@woeschplan/shared';
import type { ScheduleNotice } from '@/lib/hooks/useResidentSchedule';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Props = {
  notices: ScheduleNotice[];
  onNoticePress?: (notice: ScheduleNotice) => void;
  onViewAll?: () => void;
};

/** Compact icon banner row — not full-width notice cards. */
export function BuildingNoticesSection({ notices, onNoticePress, onViewAll }: Props) {
  const now = new Date();
  const active = notices.filter((n) => n.isActive);
  const upcoming = notices.filter((n) => !n.isActive && new Date(n.startTime) > now).slice(0, 2);
  const visible = [...active, ...upcoming].slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={14} color={colors.textMuted} />
        {onViewAll ? (
          <Pressable onPress={onViewAll} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.viewAll}>{t('notices.viewAll')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.bannerRow}>
        {visible.map((notice) => (
          <NoticeIconBanner key={notice.id} notice={notice} onPress={() => onNoticePress?.(notice)} />
        ))}
      </View>
    </View>
  );
}

export function NoticeIconBanner({
  notice,
  onPress,
  compact,
}: {
  notice: Pick<ScheduleNotice, 'id' | 'title' | 'category' | 'icon' | 'affectsLaundry'>;
  onPress?: () => void;
  compact?: boolean;
}) {
  const palette = noticeCategoryColors(notice.category as NoticeCategory);

  return (
    <Pressable
      style={[styles.banner, compact && styles.bannerCompact, { borderColor: palette.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notice.title}
    >
      <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
        <Ionicons
          name={notice.icon as keyof typeof Ionicons.glyphMap}
          size={compact ? 11 : 13}
          color={palette.border}
        />
      </View>
      {!compact ? (
        <Text style={[styles.bannerTitle, { color: palette.fg }]} numberOfLines={1}>
          {notice.title}
        </Text>
      ) : null}
      {notice.affectsLaundry ? (
        <Ionicons
          name="water-outline"
          size={compact ? 9 : 11}
          color={colors.warning}
          style={compact ? styles.laundryIconCompact : styles.laundryIcon}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  viewAll: { ...typography.caption, fontSize: 12, color: colors.primary, fontWeight: '600' },
  bannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 180,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerCompact: {
    maxWidth: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: 26,
    height: 26,
    justifyContent: 'center',
    borderRadius: 13,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  laundryIcon: { marginLeft: -2 },
  laundryIconCompact: { position: 'absolute', bottom: -1, right: -1 },
});
