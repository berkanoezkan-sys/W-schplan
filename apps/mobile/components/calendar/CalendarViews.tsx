import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getQuietBlocksForDay,
  startOfWeek,
  addDays,
  capacityColor,
  noticeCategoryColors,
} from '@woeschplan/shared';
import type {
  ResidentScheduleData,
  ScheduleReservation,
  ScheduleNotice,
} from '@/lib/hooks/useResidentSchedule';
import {
  BufferTimeBlock,
  HourGridLines,
  NowIndicator,
  QuietHoursBlock,
  ReservationBlock,
} from './CalendarBlocks';
import { NoticeLaundryOverlay } from '@/components/notices/NoticeCalendarBlock';
import { NoticeIconBanner } from './BuildingNoticesSection';
import {
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
  TIME_GUTTER,
  formatHourLabel,
  LANE_LABEL_WIDTH,
  calendarStyles,
  WEEK_COLUMN_WIDTH,
} from './calendarLayout';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { machineStatusColors } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Props = {
  data: ResidentScheduleData;
  date: string;
  nowMs: number;
  onReservationPress: (reservation: ScheduleReservation) => void;
  onResourcePress: (resourceId: string) => void;
  onNoticePress?: (notice: ScheduleNotice) => void;
};

function filterForDate<T extends { localDate: string }>(items: T[], date: string): T[] {
  return items.filter((i) => i.localDate === date);
}

function filterNoticesForDate(notices: ScheduleNotice[], date: string): ScheduleNotice[] {
  return notices.filter(
    (n) => n.localDate === date || n.localEndDate === date || (n.localDate <= date && n.localEndDate >= date),
  );
}

function NoticeBannerRow({
  notices,
  onNoticePress,
}: {
  notices: ScheduleNotice[];
  onNoticePress?: (notice: ScheduleNotice) => void;
}) {
  if (notices.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.noticeBannerRow}
      style={styles.noticeBannerScroll}
    >
      {notices.map((notice) => (
        <NoticeIconBanner key={notice.id} notice={notice} onPress={() => onNoticePress?.(notice)} />
      ))}
    </ScrollView>
  );
}

export function CalendarDayView({
  data,
  date,
  nowMs,
  onReservationPress,
  onResourcePress,
  onNoticePress,
}: Props) {
  const resources = data.resources;
  const reservations = filterForDate(data.reservations, date);
  const buffers = filterForDate(data.bufferBlocks, date);
  const dayNotices = filterNoticesForDate(data.notices ?? [], date);
  const laundryNotices = dayNotices.filter((n) => n.affectsLaundry);
  const quietBlocks = getQuietBlocksForDay(data.quietHours);

  if (resources.length === 0) {
    return (
      <View style={styles.emptyLane}>
        <Text style={styles.emptyText}>{t('schedule.noMachines')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <NoticeBannerRow notices={dayNotices} onNoticePress={onNoticePress} />

      <View style={styles.headerRow}>
        <View style={{ width: TIME_GUTTER }} />
        {resources.map((r) => (
          <Pressable
            key={r.id}
            style={[styles.laneHeader, resources.length === 1 && styles.laneHeaderWide]}
            onPress={() => onResourcePress(r.id)}
            accessibilityRole="button"
          >
            <View style={[styles.statusDot, { backgroundColor: machineStatusColors[r.status] ?? colors.textMuted }]} />
            <Text style={styles.laneTitle} numberOfLines={2}>
              {r.name}
            </Text>
            <Text style={styles.laneRoom} numberOfLines={1}>
              {r.laundryRoom.name}
            </Text>
            {r.activeTimer ? (
              <Text style={styles.laneTimer}>{t('schedule.inProgress')}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.timelineRow}>
        <View style={[styles.timeGutter, { height: TIMELINE_HEIGHT }]}>
          {Array.from({ length: 24 }, (_, h) => (
            <Text key={h} style={[styles.hourLabel, { top: h * HOUR_HEIGHT - 7 }]}>
              {h % 2 === 0 ? formatHourLabel(h) : ''}
            </Text>
          ))}
        </View>

        {resources.map((resource) => {
          const laneReservations = reservations.filter((r) => r.resourceId === resource.id);
          const laneBuffers = buffers.filter((b) => b.resourceId === resource.id);
          return (
            <View
              key={resource.id}
              style={[
                styles.lane,
                { height: TIMELINE_HEIGHT },
                resources.length === 1 && styles.laneWide,
              ]}
            >
              <HourGridLines />
              {quietBlocks.map((q, i) => (
                <QuietHoursBlock key={`q-${i}`} startMin={q.startMin} endMin={q.endMin} />
              ))}
              {laundryNotices.map((notice) => (
                <NoticeLaundryOverlay key={`laundry-${notice.id}`} notice={notice} />
              ))}
              {laneReservations.map((r) => (
                <ReservationBlock
                  key={r.id}
                  reservation={r}
                  nowMs={nowMs}
                  variant="day"
                  onPress={() => onReservationPress(r)}
                />
              ))}
              {laneBuffers.map((b) => (
                <BufferTimeBlock
                  key={`${b.reservationId}-buf`}
                  block={b}
                  nowMs={nowMs}
                  onPress={() => onResourcePress(resource.id)}
                />
              ))}
              <NowIndicator nowMs={nowMs} timezone={data.timezone} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function CalendarWeekView({
  data,
  nowMs,
  today,
  onReservationPress,
  onNoticePress,
  onDayPress,
}: {
  data: ResidentScheduleData;
  nowMs: number;
  today: string;
  onReservationPress: (reservation: ScheduleReservation) => void;
  onNoticePress?: (notice: ScheduleNotice) => void;
  onDayPress: (date: string) => void;
}) {
  const weekStart = startOfWeek(data.anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const quietBlocks = getQuietBlocksForDay(data.quietHours);

  return (
    <ScrollView
      style={styles.weekOuterScroll}
      contentContainerStyle={styles.weekOuterContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.weekContainer}>
        <View style={styles.weekTimeColumn}>
          <View style={styles.weekCorner} />
          <View style={{ height: TIMELINE_HEIGHT }}>
            {Array.from({ length: 24 }, (_, h) => (
              <Text key={h} style={[styles.weekHourLabel, { top: h * HOUR_HEIGHT - 7 }]}>
                {h % 2 === 0 ? formatHourLabel(h) : ''}
              </Text>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
          <View style={styles.weekRow}>
            {weekDays.map((date) => {
              const dayReservations = data.reservations.filter((r) => r.localDate === date);
              const dayNotices = filterNoticesForDate(data.notices ?? [], date);
              const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
              });
              const dayNum = Number(date.split('-')[2]);
              const isToday = date === today;

              return (
                <View key={date} style={[styles.weekColumn, isToday && styles.weekColumnToday]}>
                  <Pressable onPress={() => onDayPress(date)} style={styles.weekColumnHeader}>
                    <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>{dayLabel}</Text>
                    <View style={[styles.weekDayNumWrap, isToday && styles.weekDayNumWrapToday]}>
                      <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>{dayNum}</Text>
                    </View>
                    {dayNotices.length > 0 ? (
                      <View style={styles.weekNoticeIcons}>
                        {dayNotices.slice(0, 3).map((notice) => (
                          <NoticeIconBanner
                            key={notice.id}
                            notice={notice}
                            compact
                            onPress={() => onNoticePress?.(notice)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </Pressable>

                  <View style={[styles.weekTimeline, { height: TIMELINE_HEIGHT }]}>
                    <HourGridLines />
                    {quietBlocks.map((q, i) => (
                      <QuietHoursBlock key={`q-${i}`} startMin={q.startMin} endMin={q.endMin} />
                    ))}
                    {dayReservations.map((r) => (
                      <ReservationBlock
                        key={r.id}
                        reservation={r}
                        nowMs={nowMs}
                        variant="week"
                        onPress={() => onReservationPress(r)}
                      />
                    ))}
                    {isToday ? <NowIndicator nowMs={nowMs} timezone={data.timezone} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

export function CalendarMonthView({
  data,
  selectedDate,
  today,
  onSelectDate,
}: {
  data: ResidentScheduleData;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}) {
  const monthDays = data.monthDays ?? [];
  const [y, m] = data.anchorDate.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const weekdayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const reservationsByDate = useMemoMap(data.reservations);
  const noticesByDate = useMemoNoticeMap(data.notices ?? []);

  return (
    <View style={styles.monthContainer}>
      <Text style={styles.monthTitle}>{monthLabel}</Text>
      <View style={styles.weekdayRow}>
        {weekdayLabels.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {monthDays.map((day) => {
          const dayNum = Number(day.date.split('-')[2]);
          const inMonth = Number(day.date.split('-')[1]) === m;
          const selected = day.date === selectedDate;
          const isToday = day.date === today;
          const barColor = capacityColor(day.level);
          const dayNotices = noticesByDate.get(day.date) ?? [];
          const reservationCount = reservationsByDate.get(day.date) ?? 0;

          return (
            <Pressable
              key={day.date}
              style={[
                styles.monthCell,
                selected && styles.monthCellSelected,
                isToday && styles.monthCellToday,
              ]}
              onPress={() => onSelectDate(day.date)}
              accessibilityLabel={`${day.date}, ${day.level} capacity`}
            >
              <View style={[styles.monthDayCircle, isToday && styles.monthDayCircleToday]}>
                <Text
                  style={[
                    styles.monthDayNum,
                    !inMonth && styles.monthDayMuted,
                    isToday && styles.monthDayNumToday,
                  ]}
                >
                  {dayNum}
                </Text>
              </View>
              <View style={styles.monthIndicators}>
                <View style={[styles.monthCapacityBar, { backgroundColor: barColor }]} />
                {reservationCount > 0 ? (
                  <View style={[styles.monthBusyDot, { backgroundColor: barColor }]} />
                ) : null}
              </View>
              {dayNotices.length > 0 ? (
                <View style={styles.monthNoticeIcons}>
                  {dayNotices.slice(0, 3).map((notice) => (
                    <Ionicons
                      key={notice.id}
                      name={notice.icon as keyof typeof Ionicons.glyphMap}
                      size={10}
                      color={noticeCategoryColors(notice.category as never).border}
                    />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <LegendItem color="#6BC04A" label={t('schedule.capacity.high')} />
        <LegendItem color="#E6A817" label={t('schedule.capacity.medium')} />
        <LegendItem color="#D64545" label={t('schedule.capacity.low')} />
        <LegendItem color={calendarStyles.quietFill} label={t('schedule.quietHours')} border />
      </View>
    </View>
  );
}

function useMemoMap(reservations: ScheduleReservation[]) {
  const map = new Map<string, number>();
  for (const r of reservations) {
    map.set(r.localDate, (map.get(r.localDate) ?? 0) + 1);
  }
  return map;
}

function useMemoNoticeMap(notices: ScheduleNotice[]) {
  const map = new Map<string, ScheduleNotice[]>();
  for (const n of notices) {
    const dates = [n.localDate];
    if (n.localEndDate !== n.localDate) dates.push(n.localEndDate);
    for (const d of dates) {
      const list = map.get(d) ?? [];
      list.push(n);
      map.set(d, list);
    }
  }
  return map;
}

function LegendItem({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          border && { borderWidth: 1, borderColor: colors.danger },
        ]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  noticeBannerScroll: { marginBottom: spacing.sm, flexGrow: 0 },
  noticeBannerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  headerRow: { flexDirection: 'row', marginBottom: spacing.sm },
  laneHeader: {
    flex: 1,
    minWidth: LANE_LABEL_WIDTH,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  laneHeaderWide: { minWidth: 120 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 3 },
  laneTitle: { ...typography.caption, fontWeight: '600', textAlign: 'center', fontSize: 12 },
  laneRoom: { ...typography.caption, fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  laneTimer: { ...typography.caption, fontSize: 10, color: colors.accent, fontWeight: '600' },
  timelineRow: { flexDirection: 'row' },
  timeGutter: { width: TIME_GUTTER, position: 'relative' },
  hourLabel: {
    position: 'absolute',
    right: 2,
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  lane: {
    flex: 1,
    minWidth: LANE_LABEL_WIDTH,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  laneWide: { minWidth: 200 },
  emptyLane: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { ...typography.caption },
  weekOuterScroll: { flex: 1 },
  weekOuterContent: { paddingBottom: spacing.xl },
  weekContainer: { flexDirection: 'row', minHeight: TIMELINE_HEIGHT + 64 },
  weekTimeColumn: { width: TIME_GUTTER },
  weekCorner: { height: 64 },
  weekHourLabel: {
    position: 'absolute',
    right: 2,
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  weekScroll: { flex: 1 },
  weekRow: { flexDirection: 'row', paddingBottom: spacing.md },
  weekColumn: {
    width: WEEK_COLUMN_WIDTH,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  weekColumnToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  weekColumnHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minHeight: 64,
  },
  weekDayLabel: { ...typography.caption, fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  weekDayLabelToday: { color: colors.primary },
  weekDayNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weekDayNumWrapToday: { backgroundColor: colors.primary },
  weekDayNum: { ...typography.caption, fontWeight: '700', fontSize: 15 },
  weekDayNumToday: { color: '#FFFFFF' },
  weekNoticeIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    marginTop: 4,
  },
  weekTimeline: {
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  monthContainer: { flex: 1, paddingBottom: spacing.lg },
  monthTitle: { ...typography.heading, marginBottom: spacing.md, textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    padding: 2,
  },
  monthCellSelected: { backgroundColor: colors.accentLight },
  monthCellToday: {},
  monthDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayCircleToday: { backgroundColor: colors.primary },
  monthDayNum: { ...typography.body, fontWeight: '600', fontSize: 15 },
  monthDayNumToday: { color: '#FFFFFF', fontWeight: '700' },
  monthDayMuted: { color: colors.textMuted, opacity: 0.45 },
  monthIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  monthCapacityBar: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },
  monthBusyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  monthNoticeIcons: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    minHeight: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...typography.caption, fontSize: 11 },
});
