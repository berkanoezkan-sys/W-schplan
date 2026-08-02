import { View, Text, StyleSheet } from 'react-native';
import type { NoticeAttachment, NoticeCategory, NoticeSeverity } from '@woeschplan/shared';
import { NoticeCard } from './NoticeCard';
import type { BuildingNotice } from '@/lib/hooks/useBuildingNotices';
import { SectionLabel } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export function buildNoticePreview(params: {
  title: string;
  body: string;
  category: NoticeCategory;
  severity: NoticeSeverity;
  icon: string;
  attachments: NoticeAttachment[];
  visibleFrom: Date;
  visibleUntil: Date;
  affectsLaundry: boolean;
}): BuildingNotice {
  const now = new Date();
  const isActive = now >= params.visibleFrom && now <= params.visibleUntil;
  const isUpcoming = params.visibleFrom > now;

  return {
    id: 'preview',
    buildingId: 'preview',
    title: params.title || t('notices.preview.placeholderTitle'),
    body: params.body || t('notices.preview.placeholderBody'),
    category: params.category,
    severity: params.severity,
    icon: params.icon,
    attachmentUrl: params.attachments[0]?.url ?? null,
    attachments: params.attachments,
    startTime: params.visibleFrom.toISOString(),
    endTime: params.visibleUntil.toISOString(),
    localStart: params.visibleFrom.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    localEnd: params.visibleUntil.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    localDate: params.visibleFrom.toISOString().slice(0, 10),
    localEndDate: params.visibleUntil.toISOString().slice(0, 10),
    localDateLabel: params.visibleFrom.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    affectsLaundry: params.affectsLaundry,
    showOnLogin: true,
    sendPushNotification: false,
    archivedAt: null,
    isActive,
    isUpcoming,
    isExpired: !isActive && !isUpcoming,
    acknowledged: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function NoticePreviewCard(props: Parameters<typeof buildNoticePreview>[0]) {
  const preview = buildNoticePreview(props);

  return (
    <View style={styles.wrap}>
      <SectionLabel>{t('notices.preview.title')}</SectionLabel>
      <Text style={styles.hint}>{t('notices.preview.hint')}</Text>
      <NoticeCard notice={preview} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
});
