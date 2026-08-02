import { useMemo } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_I18N_KEYS,
  type ReservationStatusValue,
} from '@woeschplan/shared';
import { getAllResources } from '@/lib/building';
import { useAdminSchedule, type AdminScheduleReservation } from '@/lib/hooks/useAdminSchedule';
import {
  EmptyState,
  LoadingState,
  OptionPicker,
  PageShell,
  SectionLabel,
  SegmentedControl,
  TextField,
} from '@/components/ui';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function ReservationStatusBadge({ status }: { status: string }) {
  const key =
    RESERVATION_STATUS_I18N_KEYS[status as ReservationStatusValue] ??
    'reservation.status.confirmed';
  const color =
    RESERVATION_STATUS_COLORS[status as ReservationStatusValue] ?? colors.reserved;

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{t(key)}</Text>
    </View>
  );
}

function ReservationRow({
  item,
  onPress,
}: {
  item: AdminScheduleReservation;
  onPress: () => void;
}) {
  const residentName = item.resident?.name ?? item.privacyLabel;
  const resourceName = item.resource.name;
  const roomName = item.resource.laundryRoom.name;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.residentName} numberOfLines={1}>
          {residentName}
        </Text>
        <Text style={styles.resourceLine} numberOfLines={1}>
          {resourceName} · {roomName}
        </Text>
        <Text style={styles.timeLine}>
          {item.localStart}–{item.localEnd}
        </Text>
      </View>
      <ReservationStatusBadge status={item.status} />
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function AdminScheduleDashboard() {
  const {
    view,
    setView,
    resourceId,
    setResourceId,
    search,
    setSearch,
    buildingId,
    adminBuildings,
    selectBuilding,
    data,
    isLoading,
    isFetching,
    cancelReservation,
    isCancelling,
  } = useAdminSchedule();

  const selectedBuilding = adminBuildings.find((building) => building.id === buildingId) ?? adminBuildings[0];
  const resources = getAllResources(selectedBuilding ?? null);

  const resourceOptions = useMemo(
    () => [
      { label: t('schedule.admin.allResources'), value: 'all' },
      ...resources.map((resource) => ({ label: resource.name, value: resource.id })),
    ],
    [resources],
  );

  const buildingOptions = useMemo(
    () =>
      adminBuildings.map((building) => ({
        label: building.name,
        value: building.id,
      })),
    [adminBuildings],
  );

  const grouped = useMemo(() => {
    const reservations = data?.reservations ?? [];
    if (view === 'day') return [{ label: null as string | null, items: reservations }];

    const map = new Map<string, AdminScheduleReservation[]>();
    for (const item of reservations) {
      const bucket = map.get(item.localDateLabel) ?? [];
      bucket.push(item);
      map.set(item.localDateLabel, bucket);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [data?.reservations, view]);

  function openReservationActions(item: AdminScheduleReservation) {
    const canCancel = item.status === 'CONFIRMED';
    const message = [
      item.resident?.name ?? item.privacyLabel,
      `${item.resource.name} · ${item.resource.laundryRoom.name}`,
      `${item.localStart}–${item.localEnd}`,
      t(RESERVATION_STATUS_I18N_KEYS[item.status as ReservationStatusValue] ?? 'reservation.status.confirmed'),
    ].join('\n');

    if (Platform.OS === 'ios') {
      const options = [
        ...(canCancel ? [t('schedule.admin.cancelReservation')] : []),
        t('common.cancel'),
      ];
      const cancelIndex = canCancel ? 0 : -1;
      const dismissIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('schedule.admin.detailsTitle'),
          message,
          options,
          cancelButtonIndex: dismissIndex,
          destructiveButtonIndex: canCancel ? cancelIndex : undefined,
        },
        (index) => {
          if (canCancel && index === cancelIndex) {
            confirmCancel(item);
          }
        },
      );
      return;
    }

    Alert.alert(t('schedule.admin.detailsTitle'), message, [
      ...(canCancel
        ? [
            {
              text: t('schedule.admin.cancelReservation'),
              style: 'destructive' as const,
              onPress: () => confirmCancel(item),
            },
          ]
        : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }

  function confirmCancel(item: AdminScheduleReservation) {
    Alert.alert(
      t('schedule.admin.cancelConfirmTitle'),
      t('schedule.admin.cancelConfirmMessage')
        .replace('{resident}', item.resident?.name ?? item.privacyLabel)
        .replace('{resource}', item.resource.name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('schedule.admin.cancelReservation'),
          style: 'destructive',
          onPress: () => {
            void cancelReservation(item.id).catch(() => {
              Alert.alert(t('common.error'));
            });
          },
        },
      ],
    );
  }

  if (isLoading && !data) return <LoadingState />;

  if (!buildingId) {
    return (
      <PageShell>
        <EmptyState message={t('dashboard.noBuildings')} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'day', label: t('schedule.today') },
          { value: 'week', label: t('schedule.week') },
        ]}
      />

      <TextField
        label={t('schedule.admin.searchLabel')}
        accessibilityLabel={t('schedule.admin.searchLabel')}
        placeholder={t('schedule.admin.searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {buildingOptions.length > 1 ? (
        <>
          <SectionLabel>{t('schedule.admin.buildingFilter')}</SectionLabel>
          <OptionPicker
            options={buildingOptions}
            value={buildingId ?? buildingOptions[0]?.value ?? ''}
            onChange={(value) => {
              void selectBuilding(value);
            }}
          />
        </>
      ) : null}

      {resourceOptions.length > 1 ? (
        <>
          <SectionLabel>{t('schedule.admin.resourceFilter')}</SectionLabel>
          <OptionPicker options={resourceOptions} value={resourceId} onChange={setResourceId} />
        </>
      ) : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {t('schedule.admin.resultCount').replace('{count}', String(data?.reservations.length ?? 0))}
        </Text>
        {isFetching && !isLoading ? <Text style={styles.refreshHint}>{t('common.loading')}</Text> : null}
      </View>

      {!data?.reservations.length ? (
        <EmptyState message={t('schedule.admin.empty')} />
      ) : (
        <View style={[styles.listWrap, isCancelling && styles.listBusy]}>
          {grouped.map((group) => (
            <View key={group.label ?? 'day'} style={styles.group}>
              {group.label ? <SectionLabel>{group.label}</SectionLabel> : null}
              <View style={styles.list}>
                {group.items.map((item, index) => (
                  <View key={item.id}>
                    <ReservationRow item={item} onPress={() => openReservationActions(item)} />
                    {index < group.items.length - 1 ? <View style={styles.separator} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryText: { ...typography.caption, color: colors.textMuted },
  refreshHint: { ...typography.caption, color: colors.primary },
  listWrap: { gap: spacing.md },
  group: { gap: spacing.sm },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listBusy: { opacity: 0.72 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 72,
  },
  rowPressed: { backgroundColor: colors.background },
  rowMain: { flex: 1, gap: 2 },
  residentName: { ...typography.body, fontWeight: '600' },
  resourceLine: { ...typography.caption, color: colors.textMuted },
  timeLine: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
