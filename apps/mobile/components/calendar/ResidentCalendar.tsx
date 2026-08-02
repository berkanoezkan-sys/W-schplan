import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDays, startOfWeek, type ScheduleView } from '@woeschplan/shared';
import { useResidentSchedule, type ScheduleNotice } from '@/lib/hooks/useResidentSchedule';
import { useNoticePopup, useNoticeMutations } from '@/lib/hooks/useBuildingNotices';
import { EmptyState, LoadingState, SegmentedControl } from '@/components/ui';
import { CalendarDayView, CalendarMonthView, CalendarWeekView } from './CalendarViews';
import { CalendarFilterBar, type CalendarFilters } from './CalendarFilterBar';
import { BuildingNoticesSection } from './BuildingNoticesSection';
import { NoticePopupModal } from '@/components/notices/NoticePopupModal';
import { navigateAnchorDate } from './CalendarBlocks';
import { useLiveNow } from './useLiveNow';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHeaderTitle(view: ScheduleView, anchorDate: string): string {
  const [y, m, d] = anchorDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (view === 'month') {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate);
    const [sy, sm, sd] = start.split('-').map(Number);
    const end = addDays(start, 6);
    const [ey, em, ed] = end.split('-').map(Number);
    const startDt = new Date(sy, sm - 1, sd);
    const endDt = new Date(ey, em - 1, ed);
    return `${startDt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${endDt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ResidentCalendar() {
  const [view, setView] = useState<ScheduleView>('day');
  const [anchorDate, setAnchorDate] = useState(todayYMD);
  const [filters, setFilters] = useState<CalendarFilters>({ laundryRoomId: null, resourceId: null });
  const [selectedNotice, setSelectedNotice] = useState<ScheduleNotice | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const nowMs = useLiveNow();
  const today = todayYMD();

  const { data, isLoading, isFetching, isError, error, refetch } = useResidentSchedule(view, anchorDate, {
    laundryRoomId: filters.laundryRoomId,
    resourceId: filters.resourceId,
  });

  const { data: popupData } = useNoticePopup();
  const { acknowledge } = useNoticeMutations();
  const popupNotices = popupData?.notices ?? [];
  const showPopup = popupNotices.length > 0 && !popupDismissed;

  const navigate = useCallback(
    (delta: number) => {
      setAnchorDate((prev) => navigateAnchorDate(view, prev, delta));
    },
    [view],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dy) < 30,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 50) navigate(-1);
        else if (g.dx < -50) navigate(1);
      },
    }),
  ).current;

  const displayDate = useMemo(() => {
    if (view === 'day') return anchorDate;
    if (view === 'week') return startOfWeek(anchorDate);
    return anchorDate;
  }, [view, anchorDate]);

  const onReservationPress = useCallback((reservation: { resourceId: string }) => {
    router.push(`/(main)/machine/${reservation.resourceId}`);
  }, []);

  const onResourcePress = useCallback((resourceId: string) => {
    router.push(`/(main)/machine/${resourceId}`);
  }, []);

  const onDayPress = useCallback((date: string) => {
    setAnchorDate(date);
    setView('day');
  }, []);

  const onReserve = useCallback(() => {
    if (filters.resourceId) {
      router.push({ pathname: '/(main)/reserve', params: { resourceId: filters.resourceId } });
    } else {
      router.push('/(main)/reserve');
    }
  }, [filters.resourceId]);

  const handleDismissPopup = useCallback(
    (noticeIds: string[]) => {
      void acknowledge.mutateAsync(noticeIds);
      if (noticeIds.length >= popupNotices.length) setPopupDismissed(true);
    },
    [acknowledge, popupNotices.length],
  );

  if (isLoading && !data) return <LoadingState />;

  if (isError && !data) {
    return (
      <View style={styles.container}>
        <EmptyState
          message={(error as Error)?.message ?? t('common.error')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      </View>
    );
  }

  const hasCalendarContent =
    (data?.reservations.length ?? 0) > 0 ||
    (data?.notices?.length ?? 0) > 0 ||
    (data?.resources.length ?? 0) > 0 ||
    view === 'month';

  return (
    <View style={styles.container}>
      <NoticePopupModal
        notices={popupNotices}
        visible={showPopup}
        onDismiss={handleDismissPopup}
        onViewAll={() => {
          setPopupDismissed(true);
          router.push('/(main)/notices');
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.toolbar}>
            <SegmentedControl
              value={view}
              onChange={(v) => setView(v as ScheduleView)}
              options={[
                { value: 'day', label: t('schedule.view.day') },
                { value: 'week', label: t('schedule.view.week') },
                { value: 'month', label: t('schedule.view.month') },
              ]}
            />
          </View>

          {data ? (
            <CalendarFilterBar
              filters={filters}
              onChange={setFilters}
              scheduleResources={data.resources}
              laundryRooms={data.laundryRooms ?? []}
            />
          ) : null}

          {data && (data.notices?.length ?? 0) > 0 ? (
            <BuildingNoticesSection
              notices={data.notices}
              onNoticePress={setSelectedNotice}
              onViewAll={() => router.push('/(main)/notices')}
            />
          ) : null}

          <View style={styles.header}>
            <Pressable
              onPress={() => navigate(-1)}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={t('schedule.previous')}
            >
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{formatHeaderTitle(view, anchorDate)}</Text>
              {isFetching ? <Text style={styles.syncHint}>{t('schedule.syncing')}</Text> : null}
            </View>

            <Pressable
              onPress={() => navigate(1)}
              style={styles.navBtn}
              accessibilityRole="button"
              accessibilityLabel={t('schedule.next')}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.todayBtn, anchorDate === today && styles.todayBtnActive]}
            onPress={() => setAnchorDate(today)}
            accessibilityRole="button"
          >
            <Text style={[styles.todayText, anchorDate === today && styles.todayTextActive]}>
              {t('schedule.goToday')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.calendarBody} {...panResponder.panHandlers}>
          {!data ? (
            <EmptyState
              message={t('schedule.empty')}
              actionLabel={t('schedule.emptyAction')}
              onAction={onReserve}
            />
          ) : view === 'month' ? (
            <CalendarMonthView
              data={data}
              selectedDate={anchorDate}
              today={today}
              onSelectDate={onDayPress}
            />
          ) : view === 'week' ? (
            <CalendarWeekView
              data={data}
              nowMs={nowMs}
              today={today}
              onReservationPress={onReservationPress}
              onNoticePress={setSelectedNotice}
              onDayPress={onDayPress}
            />
          ) : (
            <CalendarDayView
              data={data}
              date={displayDate}
              nowMs={nowMs}
              onReservationPress={onReservationPress}
              onResourcePress={onResourcePress}
              onNoticePress={setSelectedNotice}
            />
          )}
        </View>

        {!hasCalendarContent && data && view !== 'month' ? (
          <EmptyState
            message={t('schedule.empty')}
            actionLabel={t('schedule.emptyAction')}
            onAction={onReserve}
          />
        ) : null}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={onReserve}
        accessibilityRole="button"
        accessibilityLabel={t('schedule.reserveFab')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <Modal visible={!!selectedNotice} transparent animationType="slide" onRequestClose={() => setSelectedNotice(null)}>
        <View style={styles.noticeModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedNotice(null)} />
          {selectedNotice ? (
            <View style={styles.noticeModalSheet}>
              <BuildingNoticesSection notices={[selectedNotice]} />
              <Text style={styles.noticeBody}>{selectedNotice.body}</Text>
              <Pressable style={styles.noticeClose} onPress={() => setSelectedNotice(null)}>
                <Text style={styles.noticeCloseText}>{t('common.back')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 88 },
  stickyHeader: {
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    zIndex: 10,
  },
  toolbar: { marginBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.heading, fontSize: 17, textAlign: 'center' },
  syncHint: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  todayBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  todayTextActive: { color: '#FFFFFF' },
  calendarBody: { minHeight: 360 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  noticeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  noticeModalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    maxHeight: '75%',
  },
  noticeBody: { ...typography.body, marginVertical: spacing.md },
  noticeClose: { alignItems: 'center', paddingVertical: spacing.md },
  noticeCloseText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
