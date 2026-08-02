import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  MAINTENANCE_FILTER_OPTIONS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_STATUS_I18N_KEYS,
  MAINTENANCE_TYPE_COLORS,
  MAINTENANCE_TYPE_I18N_KEYS,
  addDays,
  endOfMonthYmd,
  maintenanceFilterI18nKey,
  maintenanceTypeIcon,
  startOfMonthYmd,
  startOfWeek,
  type MaintenanceCalendarView,
  type MaintenanceFilterValue,
  type MaintenanceSeriesScope,
  type MaintenanceStatus,
  type MaintenanceType,
} from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import {
  useMaintenanceCalendar,
  useMaintenanceMutations,
  type MaintenanceEntry,
} from '@/lib/hooks/useMaintenanceCalendar';
import {
  EmptyState,
  LoadingState,
  PageShell,
  SegmentedControl,
} from '@/components/ui';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHeaderTitle(view: MaintenanceCalendarView, anchorDate: string): string {
  const [y, m, d] = anchorDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (view === 'month') {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate);
    const end = addDays(start, 6);
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const startDt = new Date(sy, sm - 1, sd);
    const endDt = new Date(ey, em - 1, ed);
    return `${startDt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${endDt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function MaintenanceBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MaintenanceRow({ entry, onPress }: { entry: MaintenanceEntry; onPress: () => void }) {
  const typeColor = MAINTENANCE_TYPE_COLORS[entry.type as MaintenanceType] ?? colors.primary;
  const statusKey =
    MAINTENANCE_STATUS_I18N_KEYS[entry.status as MaintenanceStatus] ?? 'maintenance.status.planned';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, ${t(MAINTENANCE_TYPE_I18N_KEYS[entry.type as MaintenanceType])}, ${entry.localStart}–${entry.localEnd}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${typeColor}18` }]}>
        <Ionicons
          name={maintenanceTypeIcon(entry.type as MaintenanceType) as keyof typeof Ionicons.glyphMap}
          size={18}
          color={typeColor}
        />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {entry.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {t(MAINTENANCE_TYPE_I18N_KEYS[entry.type as MaintenanceType])} · {entry.localStart}–{entry.localEnd}
        </Text>
        {entry.isRecurring ? (
          <Text style={styles.rowRecurring}>{t('maintenance.recurring.label')}</Text>
        ) : null}
      </View>
      <View style={styles.rowBadges}>
        <MaintenanceBadge
          label={t(statusKey)}
          color={MAINTENANCE_STATUS_COLORS[entry.status as MaintenanceStatus] ?? colors.textMuted}
        />
        {entry.notifyResidents ? (
          <Ionicons
            name={entry.residentsNotified ? 'notifications' : 'notifications-outline'}
            size={16}
            color={colors.primary}
            accessibilityLabel={t('maintenance.notifyResidents')}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function MonthGrid({
  anchorDate,
  selectedDate,
  entries,
  onSelectDate,
}: {
  anchorDate: string;
  selectedDate: string;
  entries: MaintenanceEntry[];
  onSelectDate: (date: string) => void;
}) {
  const monthStart = startOfMonthYmd(anchorDate);
  const monthEnd = endOfMonthYmd(anchorDate);
  const [, m] = anchorDate.split('-').map(Number);
  const gridStart = startOfWeek(monthStart);
  const days: string[] = [];
  let cursor = gridStart;
  while (cursor <= monthEnd || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 42) break;
  }

  const byDate = useMemo(() => {
    const map = new Map<string, MaintenanceEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.localDate) ?? [];
      list.push(entry);
      map.set(entry.localDate, list);
    }
    return map;
  }, [entries]);

  return (
    <View style={styles.monthWrap}>
      <View style={styles.weekdayRow}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((date) => {
          const inMonth = Number(date.split('-')[1]) === m;
          const selected = date === selectedDate;
          const isToday = date === todayYmd();
          const dayEntries = byDate.get(date) ?? [];
          return (
            <Pressable
              key={date}
              style={styles.monthCell}
              onPress={() => onSelectDate(date)}
              accessibilityLabel={`${date}, ${dayEntries.length} ${t('maintenance.calendar.entries')}`}
              accessibilityState={{ selected }}
            >
              <View style={[styles.monthDayCircle, selected && styles.monthDayCircleSelected]}>
                <Text
                  style={[
                    styles.monthDayNum,
                    !inMonth && styles.monthDayMuted,
                    isToday && !selected && styles.monthDayToday,
                    selected && styles.monthDayNumSelected,
                  ]}
                >
                  {Number(date.split('-')[2])}
                </Text>
              </View>
              {dayEntries.length > 0 ? (
                <View style={styles.monthDots}>
                  {dayEntries.slice(0, 3).map((entry) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.monthDot,
                        {
                          backgroundColor:
                            MAINTENANCE_TYPE_COLORS[entry.type as MaintenanceType] ?? colors.primary,
                        },
                      ]}
                    />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AdminMaintenanceCalendar() {
  const { building, isAdmin } = useBuilding();
  const [view, setView] = useState<MaintenanceCalendarView>('list');
  const [anchorDate, setAnchorDate] = useState(todayYmd);
  const [selectedDate, setSelectedDate] = useState(todayYmd);
  const [filter, setFilter] = useState<MaintenanceFilterValue>('all');
  const [detailEntry, setDetailEntry] = useState<MaintenanceEntry | null>(null);
  const { data, isLoading, isError, error, refetch } = useMaintenanceCalendar(
    view,
    view === 'month' ? anchorDate : selectedDate,
    filter,
  );
  const { remove } = useMaintenanceMutations();

  const entries = data?.entries ?? [];
  const today = todayYmd();
  const isViewingToday =
    view === 'month' ? selectedDate === today && anchorDate.slice(0, 7) === today.slice(0, 7) : selectedDate === today;

  const navigate = useCallback(
    (delta: number) => {
      const step = view === 'month' ? 30 : view === 'week' ? 7 : 1;
      const next = addDays(anchorDate, delta * step);
      setAnchorDate(next);
      setSelectedDate(next);
    },
    [anchorDate, view],
  );

  const goToToday = useCallback(() => {
    setAnchorDate(today);
    setSelectedDate(today);
  }, [today]);

  const grouped = useMemo(() => {
    const map = new Map<string, MaintenanceEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.localDate) ?? [];
      list.push(entry);
      map.set(entry.localDate, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  const visibleEntries =
    view === 'month' ? entries.filter((entry) => entry.localDate === selectedDate) : entries;

  async function handleDelete(entry: MaintenanceEntry) {
    Alert.alert(
      t('maintenance.delete.title'),
      t('maintenance.delete.message').replace('{maintenanceTitle}', entry.title),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void remove
              .mutateAsync({ entryId: entry.id, scope: 'THIS_OCCURRENCE' })
              .then(() => {
                setDetailEntry(null);
                Alert.alert(t('maintenance.delete.success'));
              })
              .catch(() => Alert.alert(t('maintenance.delete.error')));
          },
        },
      ],
    );
  }

  if (!isAdmin) {
    return (
      <PageShell scroll={false}>
        <EmptyState message={t('maintenance.adminOnly')} />
      </PageShell>
    );
  }

  if (isLoading && !data) return <LoadingState />;

  const actionFooter = (
    <View style={styles.actionDock}>
      <Pressable
        style={[styles.todayFab, isViewingToday && styles.todayFabActive]}
        onPress={goToToday}
        accessibilityRole="button"
        accessibilityLabel={t('schedule.today')}
      >
        <Ionicons name="today-outline" size={26} color={isViewingToday ? '#fff' : colors.primary} />
      </Pressable>
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(main)/maintenance-edit')}
        accessibilityRole="button"
        accessibilityLabel={t('maintenance.add')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <PageShell scroll={false} footer={actionFooter}>
      <View style={styles.main}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => navigate(-1)} accessibilityRole="button" hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.toolbarTitle}>{formatHeaderTitle(view, anchorDate)}</Text>
        <Pressable onPress={() => navigate(1)} accessibilityRole="button" hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { label: t('maintenance.view.month'), value: 'month' },
          { label: t('maintenance.view.week'), value: 'week' },
          { label: t('maintenance.view.list'), value: 'list' },
        ]}
      />

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {MAINTENANCE_FILTER_OPTIONS.map((item) => (
            <Pressable
              key={item}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
            >
              <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
                {t(maintenanceFilterI18nKey(item))}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isError && !data ? (
        <EmptyState
          message={(error as Error)?.message ?? t('common.error')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
        />
      ) : null}

      {view === 'month' ? (
        <MonthGrid
          anchorDate={anchorDate}
          selectedDate={selectedDate}
          entries={entries}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          entries.length === 0 && !isError && styles.listContentEmpty,
        ]}
      >
        {entries.length === 0 ? (
          <EmptyState
            title={t('maintenance.empty.title')}
            message={t('maintenance.empty.message')}
            actionLabel={t('maintenance.add')}
            onAction={() => router.push('/(main)/maintenance-edit')}
          />
        ) : view === 'list' || view === 'week' ? (
          grouped.map(([date, items]) => (
            <View key={date}>
              <Text style={styles.groupLabel}>{items[0]?.localDateLabel ?? date}</Text>
              {items.map((entry) => (
                <MaintenanceRow key={entry.id} entry={entry} onPress={() => setDetailEntry(entry)} />
              ))}
            </View>
          ))
        ) : (
          visibleEntries.map((entry) => (
            <MaintenanceRow key={entry.id} entry={entry} onPress={() => setDetailEntry(entry)} />
          ))
        )}
      </ScrollView>
      </View>

      <Modal visible={!!detailEntry} transparent animationType="slide" onRequestClose={() => setDetailEntry(null)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailEntry(null)} />
          {detailEntry ? (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <Text style={styles.sheetTitle}>{detailEntry.title}</Text>
                <MaintenanceBadge
                  label={t(MAINTENANCE_TYPE_I18N_KEYS[detailEntry.type as MaintenanceType])}
                  color={MAINTENANCE_TYPE_COLORS[detailEntry.type as MaintenanceType]}
                />
                <MaintenanceBadge
                  label={t(MAINTENANCE_STATUS_I18N_KEYS[detailEntry.status as MaintenanceStatus])}
                  color={MAINTENANCE_STATUS_COLORS[detailEntry.status as MaintenanceStatus]}
                />
                <Text style={styles.detailLine}>
                  {detailEntry.localDateLabel} · {detailEntry.localStart}–{detailEntry.localEnd}
                </Text>
                {detailEntry.description ? (
                  <Text style={styles.detailBody}>{detailEntry.description}</Text>
                ) : null}
                <Text style={styles.detailLine}>
                  {t('maintenance.notifyResidents')}:{' '}
                  {detailEntry.notifyResidents ? t('maintenance.residentsNotifiedYes') : t('maintenance.residentsNotifiedNo')}
                </Text>
              </ScrollView>
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.sheetBtn}
                  onPress={() => {
                    const id = detailEntry.id;
                    setDetailEntry(null);
                    router.push({ pathname: '/(main)/maintenance-edit', params: { id } });
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetBtnText}>{t('maintenance.edit')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetBtn, styles.sheetBtnDanger]}
                  onPress={() => void handleDelete(detailEntry)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.sheetBtnText, styles.sheetBtnDangerText]}>
                    {t('maintenance.delete.action')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, gap: spacing.md, minHeight: 0 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toolbarTitle: { ...typography.heading, flex: 1, textAlign: 'center' },
  filterBar: {
    flexShrink: 0,
    marginHorizontal: -spacing.md,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.lg,
  },
  filterChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    maxHeight: 44,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.accentSurface, borderColor: colors.accent },
  filterChipText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: colors.primary },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: spacing.md },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  groupLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.92 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  rowRecurring: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  rowBadges: { alignItems: 'flex-end', gap: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...typography.caption, fontWeight: '600', maxWidth: 88 },
  monthWrap: { marginBottom: spacing.md },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xs },
  weekdayLabel: { ...typography.caption, color: colors.textMuted, width: 40, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  monthDayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayCircleSelected: {
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  monthDayNum: { ...typography.body, fontWeight: '600' },
  monthDayNumSelected: { color: colors.primary, fontWeight: '700' },
  monthDayMuted: { color: colors.textMuted, opacity: 0.5 },
  monthDayToday: { color: colors.primary, fontWeight: '700' },
  monthDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  monthDot: { width: 5, height: 5, borderRadius: 2.5 },
  actionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  todayFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1E4470',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  todayFabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1E4470',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sheetContent: { padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { ...typography.heading },
  detailLine: { ...typography.body },
  detailBody: { ...typography.body, color: colors.textMuted },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sheetBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  sheetBtnDanger: { backgroundColor: `${colors.danger}14` },
  sheetBtnText: { ...typography.body, fontWeight: '600', color: colors.primary },
  sheetBtnDangerText: { color: colors.danger },
});
