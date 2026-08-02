import { View, StyleSheet } from 'react-native';
import { noticeCategoryColors, type NoticeCategory } from '@woeschplan/shared';
import {
  blockHeight,
  calendarStyles,
  localMinutesFromHHMM,
  minutesToY,
} from '@/components/calendar/calendarLayout';
import { t } from '@/lib/i18n';

export type CalendarNotice = {
  id: string;
  title: string;
  category: NoticeCategory | string;
  icon: string;
  localStart: string;
  localEnd: string;
  affectsLaundry: boolean;
};

/** Re-export compact banner for timeline use. */
export { NoticeIconBanner } from '@/components/calendar/BuildingNoticesSection';

export function NoticeLaundryOverlay({ notice }: { notice: CalendarNotice }) {
  const startMin = localMinutesFromHHMM(notice.localStart);
  let endMin = localMinutesFromHHMM(notice.localEnd);
  if (endMin <= startMin) endMin += 1440;
  const top = minutesToY(startMin);
  const height = blockHeight(startMin, endMin);

  return (
    <View
      style={[styles.overlay, { top, height }]}
      pointerEvents="none"
      accessibilityLabel={t('notices.laundryOverlay')}
    />
  );
}

/** @deprecated Timeline notice blocks replaced by NoticeIconBanner row. Kept for API compatibility. */
export function NoticeCalendarBlock({
  notice,
  fullWidth,
}: {
  notice: CalendarNotice;
  onPress?: () => void;
  fullWidth?: boolean;
}) {
  const palette = noticeCategoryColors(notice.category as NoticeCategory);
  const startMin = localMinutesFromHHMM(notice.localStart);
  let endMin = localMinutesFromHHMM(notice.localEnd);
  if (endMin <= startMin) endMin += 1440;
  const top = minutesToY(startMin);
  const height = Math.max(blockHeight(startMin, endMin), 20);

  return (
    <View
      style={[
        styles.timelineMarker,
        {
          top,
          height,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          left: fullWidth ? 2 : 4,
          right: fullWidth ? 2 : 4,
        },
      ]}
      pointerEvents="none"
      accessibilityLabel={`${notice.title}, ${notice.localStart}–${notice.localEnd}`}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(230, 168, 23, 0.06)',
    zIndex: 1,
  },
  timelineMarker: {
    position: 'absolute',
    borderRadius: calendarStyles.eventCardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
    zIndex: 2,
  },
});
