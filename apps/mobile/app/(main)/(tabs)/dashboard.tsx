import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import {
  deriveQuietHours,
  formatBookingRulesSummary,
  formatTimeRange,
} from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { useBuildingSettings } from '@/lib/hooks/useBuildingSettings';
import { BuildingSelector } from '@/components/BuildingSelector';
import {
  AlertBanner,
  HeroCard,
  LoadingState,
  PageShell,
  QuickActionBar,
  StatPill,
} from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import {
  QuietHoursInfoSheet,
  TimeRangePickerSheet,
} from '@/components/WheelPickers';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';
import { useNoticeMutations, useNoticePopup, useBuildingNotices } from '@/lib/hooks/useBuildingNotices';
import { NoticePopupModal } from '@/components/notices/NoticePopupModal';
import { ListRow } from '@/components/ui';

type DashboardData = {
  nextReservation: {
    id: string;
    startTime: string;
    endTime: string;
    resource: { id: string; name: string; laundryRoom: { name: string } };
    machine?: { id: string; name: string; laundryRoom: { name: string } };
  } | null;
  activeTimer: {
    id: string;
    expectedCompletionTime: string;
    resource: { id: string; name: string };
    machine?: { id: string; name: string };
  } | null;
  machinesAvailable: number;
  machinesInUse: number;
  defectiveMachines: Array<{ id: string; name: string; status: string }>;
  openChecklistNeeded: boolean;
};

export default function DashboardScreen() {
  const { isPropertyManager, loading: buildingLoading, buildings } = useBuilding();

  if (buildingLoading && buildings.length === 0) return <LoadingState />;
  if (isPropertyManager) return <AdminDashboard />;
  return <ResidentDashboard />;
}

function AdminDashboard() {
  const { token } = useAuth();
  const { building, buildingId, refetch: refetchBuildings } = useBuilding();
  const { settings, isLoading: settingsLoading, patchSettings, refetch: refetchSettings } = useBuildingSettings();

  useFocusEffect(
    useCallback(() => {
      void refetchBuildings();
    }, [refetchBuildings]),
  );

  const [washingVisible, setWashingVisible] = useState(false);
  const [quietVisible, setQuietVisible] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<DashboardData>(`/buildings/${buildingId}/dashboard`, { token: token! }),
    refetchInterval: 15_000,
  });

  const statsLoading = isLoading && !data;
  const defectiveCount = data?.defectiveMachines.length ?? 0;
  const hasDefects = defectiveCount > 0;

  const houseRules = settings?.houseRules;
  const bookingRules = settings?.bookingRules;
  const quietHours =
    houseRules?.washingHours?.start && houseRules?.washingHours?.end
      ? deriveQuietHours(houseRules.washingHours)
      : null;
  const resourceCount =
    building?.laundryRooms.reduce((n, room) => n + room.resources.length, 0) ?? 0;
  const hasResources = resourceCount > 0;

  return (
    <PageShell>
      <BuildingSelector />

      <Text style={styles.sectionLabel}>{t('dashboard.machineStatus')}</Text>
      <View style={[styles.statsRow, isFetching && !statsLoading && styles.statsFetching]}>
        <StatPill
          label={t('dashboard.available')}
          count={data?.machinesAvailable ?? 0}
          color={colors.success}
          loading={statsLoading}
        />
        <StatPill
          label={t('dashboard.inUse')}
          count={data?.machinesInUse ?? 0}
          color={colors.primary}
          loading={statsLoading}
        />
        <StatPill
          label={t('dashboard.defective')}
          count={defectiveCount}
          color={colors.danger}
          emphasized={hasDefects}
          loading={statsLoading}
          onPress={hasDefects ? () => router.push('/(main)/defects') : undefined}
        />
      </View>

      {hasDefects ? (
        <AlertBanner
          message={t('dashboard.defectsActive').replace('{count}', String(defectiveCount))}
          actionLabel={t('dashboard.viewDefects')}
          onAction={() => router.push('/(main)/defects')}
        />
      ) : null}

      {!settingsLoading && houseRules && bookingRules ? (
        <SettingsGroup
          title={t('dashboard.buildingManagement')}
          footer={t('dashboard.buildingManagementHint')}
          style={styles.managementGroup}
        >
          <SettingsRow
            icon="water-outline"
            label={t('settings.washingHours')}
            value={formatTimeRange(houseRules.washingHours)}
            onPress={() => setWashingVisible(true)}
          />
          <SettingsRow
            icon="moon-outline"
            label={t('settings.quietHours')}
            value={
              quietHours
                ? `${formatTimeRange(quietHours)} · ${t('settings.quietHours.auto')}`
                : '—'
            }
            onPress={() => setQuietVisible(true)}
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('dashboard.bookingRules')}
            value={formatBookingRulesSummary(bookingRules)}
            onPress={() => router.push('/(main)/building-booking-rules')}
          />
          <SettingsRow
            icon="call-outline"
            label={t('dashboard.buildingContact')}
            value={houseRules.contact.name || t('settings.contact.configure')}
            onPress={() => router.push('/(main)/building-contact-settings')}
          />
          <SettingsRow
            icon="alert-circle-outline"
            label={t('settings.emergency')}
            value={`${houseRules.emergencyContacts.length} ${t('settings.emergency.count')}`}
            onPress={() => router.push('/(main)/emergency-contacts')}
          />
          <SettingsRow
            icon="checkbox-outline"
            label={t('settings.cleaningRules')}
            value={t('settings.cleaningRules.summary')}
            onPress={() => router.push('/(main)/cleaning-rules')}
          />
          <SettingsRow
            icon="person-add-outline"
            label={t('registration.adminTitle')}
            value={t('registration.manage')}
            onPress={() => router.push('/(main)/building-registration')}
          />
          <SettingsRow
            icon="megaphone-outline"
            label={t('notices.adminTitle')}
            value={t('notices.manage')}
            onPress={() => router.push('/(main)/building-notices')}
          />
          <SettingsRow
            icon="qr-code-outline"
            label={t('dashboard.qrCodes')}
            value={t('dashboard.qrCodesSummary')}
            onPress={() => router.push('/(main)/building-qr-codes')}
            last
          />
        </SettingsGroup>
      ) : settingsLoading ? (
        <View style={styles.settingsPlaceholder}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <AlertBanner
          message={t('dashboard.settingsUnavailable')}
          actionLabel={t('common.retry')}
          onAction={() => void refetchSettings()}
        />
      )}

      {!hasResources ? (
        <AlertBanner
          message={t('dashboard.setupLaundryRooms')}
          actionLabel={t('buildingDetails.open')}
          onAction={() => router.push('/(main)/building-details')}
        />
      ) : null}

      {houseRules && bookingRules ? (
        <>
          <TimeRangePickerSheet
            visible={washingVisible}
            title={t('settings.washingHours')}
            start={houseRules.washingHours.start}
            end={houseRules.washingHours.end}
            readOnly={false}
            onClose={() => setWashingVisible(false)}
            onSave={async (start, end) => {
              const result = await patchSettings({ houseRules: { washingHours: { start, end } } });
              if (result.quietHoursConflicts.length > 0) {
                const lines = result.quietHoursConflicts
                  .slice(0, 5)
                  .map(
                    (c) =>
                      `${c.resourceName} · ${c.localDate} ${c.localStart}–${c.localEnd} (${c.residentLabel})`,
                  )
                  .join('\n');
                Alert.alert(
                  t('settings.quietHours.conflictTitle'),
                  t('settings.quietHours.conflictMessage').replace('{count}', String(result.quietHoursConflicts.length)) +
                    `\n\n${lines}`,
                  [
                    { text: t('settings.quietHours.viewSchedule'), onPress: () => router.push('/(main)/(tabs)/schedule') },
                    { text: t('common.confirm') },
                  ],
                );
              }
            }}
          />
          <QuietHoursInfoSheet
            visible={quietVisible}
            quietHours={quietHours ?? deriveQuietHours(houseRules.washingHours)}
            washingHours={houseRules.washingHours}
            onClose={() => setQuietVisible(false)}
          />
        </>
      ) : null}
    </PageShell>
  );
}

function ResidentDashboard() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const { data: popupData, refetch: refetchPopup, isFetched: popupFetched } = useNoticePopup();
  const { data: noticesData } = useBuildingNotices(false);
  const { acknowledge } = useNoticeMutations();
  const [popupDismissed, setPopupDismissed] = useState(false);

  const popupNotices = popupData?.notices ?? [];
  const activeNotices =
    noticesData?.notices.filter((n) => n.isActive || n.isUpcoming) ?? [];
  const unreadNotices = activeNotices.filter((n) => !n.acknowledged);

  useEffect(() => {
    setPopupDismissed(false);
  }, [token, buildingId]);

  useFocusEffect(
    useCallback(() => {
      void refetchPopup();
    }, [refetchPopup]),
  );

  const handleDismissPopup = useCallback(
    (noticeIds: string[]) => {
      void acknowledge.mutateAsync(noticeIds);
      if (noticeIds.length >= popupNotices.length) {
        setPopupDismissed(true);
      }
    },
    [acknowledge, popupNotices.length],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<DashboardData>(`/buildings/${buildingId}/dashboard`, { token: token! }),
    refetchInterval: 30_000,
  });

  const dashboardLoading = isLoading && !data;
  const showPopup =
    !dashboardLoading &&
    popupFetched &&
    popupNotices.length > 0 &&
    !popupDismissed;

  if (dashboardLoading) {
    return (
      <PageShell scroll={false}>
        <LoadingState />
      </PageShell>
    );
  }

  const defectiveCount = data?.defectiveMachines.length ?? 0;

  return (
    <PageShell>
      <NoticePopupModal
        notices={popupNotices}
        visible={showPopup}
        onDismiss={handleDismissPopup}
        onViewAll={() => {
          setPopupDismissed(true);
          router.push('/(main)/notices');
        }}
      />

      {data?.activeTimer ? (
        <HeroCard
          label={t('dashboard.hero.timer')}
          title={data.activeTimer.resource?.name ?? data.activeTimer.machine?.name ?? '—'}
          subtitle={new Date(data.activeTimer.expectedCompletionTime).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          accentColor={colors.accent}
          actionLabel={t('dashboard.viewTimer')}
          onPress={() => router.push('/(main)/timer')}
        />
      ) : data?.nextReservation ? (
        <HeroCard
          label={t('dashboard.hero.reservation')}
          title={data.nextReservation.resource?.name ?? data.nextReservation.machine?.name ?? '—'}
          subtitle={`${data.nextReservation.resource?.laundryRoom.name ?? data.nextReservation.machine?.laundryRoom.name ?? '—'} · ${new Date(data.nextReservation.startTime).toLocaleString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
          accentColor={colors.primary}
          actionLabel={t('dashboard.viewReservation')}
          onPress={() =>
            router.push(
              `/(main)/machine/${data.nextReservation!.resource?.id ?? data.nextReservation!.machine?.id}`,
            )
          }
        />
      ) : (
        <HeroCard
          label={t('dashboard.hero.empty')}
          title={t('dashboard.hero.emptySubtitle')}
          accentColor={colors.primaryLight}
          actionLabel={t('dashboard.reserveNow')}
          onPress={() => router.push('/(main)/reserve')}
        />
      )}

      <View style={styles.statsRow}>
        <StatPill label={t('dashboard.available')} count={data?.machinesAvailable ?? 0} color={colors.success} />
        <StatPill label={t('dashboard.inUse')} count={data?.machinesInUse ?? 0} color={colors.primary} />
        <StatPill
          label={t('dashboard.defective')}
          count={defectiveCount}
          color={colors.danger}
          onPress={defectiveCount > 0 ? () => router.push('/(main)/defects') : undefined}
        />
      </View>

      {data?.openChecklistNeeded ? (
        <AlertBanner
          message={t('dashboard.checklistNeeded')}
          actionLabel={t('dashboard.completeChecklist')}
          onAction={() => router.push('/(main)/checklist')}
        />
      ) : null}

      <View style={styles.noticesSection}>
        <ListRow
          title={t('notices.sectionTitle')}
          subtitle={
            unreadNotices.length > 0
              ? t('notices.unreadCount').replace('{count}', String(unreadNotices.length))
              : activeNotices.length > 0
                ? t('notices.activeCount').replace('{count}', String(activeNotices.length))
                : t('notices.sectionHint')
          }
          showChevron
          unread={unreadNotices.length > 0}
          onPress={() => router.push('/(main)/notices')}
        />
      </View>

      <QuickActionBar
        actions={[
          { icon: 'qr-code-outline', label: t('dashboard.scanQr'), onPress: () => router.push('/(main)/scan') },
          { icon: 'calendar-outline', label: t('dashboard.reserve'), onPress: () => router.push('/(main)/reserve') },
          { icon: 'alert-circle-outline', label: t('dashboard.reportProblem'), onPress: () => router.push('/(main)/defects') },
        ]}
      />
    </PageShell>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsFetching: { opacity: 0.72 },
  managementGroup: { marginTop: 0 },
  settingsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  noticesSection: { marginBottom: spacing.md },
});
