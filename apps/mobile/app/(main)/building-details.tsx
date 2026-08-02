import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { countResourcesByType } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { navigateToDuplicateBuilding } from '@/lib/buildingActions';
import { Body, Caption, Card, LoadingState, PageShell, SectionLabel } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingDetailsScreen() {
  const { building, isPropertyManager, loading } = useBuilding();

  if (!building && loading) return <LoadingState />;
  if (!building) return <LoadingState />;

  const laundryRoomCount = building.laundryRooms.length;
  const allResources = building.laundryRooms.flatMap((room) => room.resources);
  const counts = countResourcesByType(allResources);
  const resourceSummary = [
    counts.WASHING_MACHINE ? `${counts.WASHING_MACHINE} ${t('resource.type.washerShort')}` : null,
    counts.TUMBLE_DRYER ? `${counts.TUMBLE_DRYER} ${t('resource.type.dryerShort')}` : null,
    counts.DRYING_ROOM ? `${counts.DRYING_ROOM} ${t('resource.type.dryingRoomShort')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PageShell>
      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="business" size={28} color={colors.primary} />
        </View>
        <Body style={styles.heroName}>{building.name}</Body>
        <Caption>{building.address}</Caption>
        <Caption style={styles.meta}>
          {building.timezone} · {building.language.toUpperCase()}
        </Caption>
      </Card>

      <SectionLabel>{t('buildingDetails.overview')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon="home-outline"
          label={t('dashboard.laundryRooms')}
          value={String(laundryRoomCount)}
        />
        <SettingsRow
          icon="grid-outline"
          label={t('buildingDetails.resources')}
          value={resourceSummary || t('laundryRooms.noResources')}
          last
        />
      </SettingsGroup>

      <SectionLabel>{t('buildingDetails.structure')}</SectionLabel>
      <SettingsGroup footer={t('buildingDetails.structureHint')}>
        <SettingsRow
          icon="albums-outline"
          label={t('dashboard.laundryRooms')}
          value={
            laundryRoomCount
              ? `${laundryRoomCount} · ${resourceSummary || t('laundryRooms.noResources')}`
              : t('laundryRooms.empty')
          }
          onPress={() => router.push('/(main)/building-laundry-rooms')}
          last
        />
      </SettingsGroup>

      {isPropertyManager ? (
        <>
          <SectionLabel>{t('buildingDetails.actions')}</SectionLabel>
          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
            onPress={() => navigateToDuplicateBuilding(building.id)}
            accessibilityRole="button"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="copy-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>{t('duplicate.action')}</Text>
              <Text style={styles.actionHint}>{t('duplicate.actionHint')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg, marginBottom: spacing.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroName: { fontWeight: '700', textAlign: 'center', marginBottom: spacing.xs },
  meta: { marginTop: spacing.sm },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionPressed: { opacity: 0.92 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: { flex: 1, gap: 2 },
  actionTitle: { ...typography.body, fontWeight: '600' },
  actionHint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
});
