import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { noticeCategoryColors, SEVERITY_COLORS, type NoticeCategory, type NoticeSeverity, type NoticeAttachment } from '@woeschplan/shared';
import { resolveApiUrl } from '@/lib/api';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Props = {
  notice: {
    id: string;
    title: string;
    body: string;
    category: NoticeCategory;
    severity: NoticeSeverity;
    icon: string;
    attachmentUrl?: string | null;
    attachments?: NoticeAttachment[];
    localDateLabel: string;
    localStart: string;
    localEnd: string;
    affectsLaundry: boolean;
    archivedAt?: string | null;
    isActive?: boolean;
    isUpcoming?: boolean;
    acknowledged?: boolean;
  };
  onPress?: () => void;
  compact?: boolean;
  showUnread?: boolean;
};

export function NoticeCard({ notice, onPress, compact, showUnread }: Props) {
  const palette = noticeCategoryColors(notice.category);
  const severityColor = SEVERITY_COLORS[notice.severity];

  const content = (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={styles.iconWrap}>
        <View style={[styles.iconCircle, { backgroundColor: palette.border }]}>
          <Ionicons name={notice.icon as keyof typeof Ionicons.glyphMap} size={compact ? 18 : 22} color="#FFFFFF" />
        </View>
        {showUnread && !notice.acknowledged ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.fg }]} numberOfLines={compact ? 1 : 2}>
            {notice.title}
          </Text>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>{t(`notices.severity.${notice.severity}`)}</Text>
          </View>
        </View>
        {!compact ? (
          <Text style={[styles.description, { color: palette.fg }]} numberOfLines={3}>
            {notice.body}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: palette.fg }]}>
          {notice.localDateLabel} · {notice.localStart}–{notice.localEnd}
        </Text>
        <View style={styles.tags}>
          <Text style={[styles.categoryTag, { color: palette.border }]}>
            {t(`notices.category.${notice.category}`)}
          </Text>
          {notice.affectsLaundry ? (
            <View style={styles.laundryTag}>
              <Ionicons name="water-outline" size={12} color={colors.warning} />
              <Text style={styles.laundryTagText}>{t('notices.affectsLaundry')}</Text>
            </View>
          ) : null}
          {notice.archivedAt ? (
            <Text style={styles.archivedTag}>{t('notices.archived')}</Text>
          ) : notice.isActive ? (
            <Text style={styles.activeTag}>{t('notices.active')}</Text>
          ) : notice.isUpcoming ? (
            <Text style={styles.upcomingTag}>{t('notices.upcoming')}</Text>
          ) : null}
        </View>
        {notice.attachments && notice.attachments.length > 0 && !compact ? (
          <View style={styles.attachmentsBlock}>
            {notice.attachments.map((item) => (
              <Pressable
                key={item.id}
                style={styles.attachment}
                onPress={() => Linking.openURL(resolveApiUrl(item.url))}
                accessibilityRole="link"
              >
                <Ionicons name="attach-outline" size={14} color={palette.border} />
                <Text style={[styles.attachmentText, { color: palette.border }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : notice.attachmentUrl && !compact ? (
          <Pressable
            style={styles.attachment}
            onPress={() => Linking.openURL(resolveApiUrl(notice.attachmentUrl!))}
            accessibilityRole="link"
          >
            <Ionicons name="attach-outline" size={14} color={palette.border} />
            <Text style={[styles.attachmentText, { color: palette.border }]}>{t('notices.attachment')}</Text>
          </Pressable>
        ) : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={palette.fg} style={styles.chevron} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  iconWrap: { position: 'relative' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: 4 },
  title: { ...typography.body, fontWeight: '700', flex: 1 },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  severityText: { ...typography.caption, fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  description: { ...typography.caption, marginBottom: 4, opacity: 0.9 },
  meta: { ...typography.caption, fontSize: 11, opacity: 0.85 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs, alignItems: 'center' },
  categoryTag: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  laundryTag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  laundryTagText: { ...typography.caption, fontSize: 10, color: colors.warning, fontWeight: '600' },
  archivedTag: { ...typography.caption, fontSize: 10, color: colors.textMuted },
  activeTag: { ...typography.caption, fontSize: 10, color: colors.success, fontWeight: '600' },
  upcomingTag: { ...typography.caption, fontSize: 10, color: colors.primary, fontWeight: '600' },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  attachmentsBlock: { gap: 2, marginTop: spacing.xs },
  attachmentText: { ...typography.caption, fontWeight: '600', flex: 1 },
  chevron: { marginTop: 10 },
});
