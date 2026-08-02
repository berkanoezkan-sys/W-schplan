import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { countResourcesByType } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useLaundryRooms } from '@/lib/hooks/useLaundryRooms';
import { Body, Caption, LoadingState, PageShell } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingLaundryRoomsScreen() {
  const { building, isAdmin, loading } = useBuilding();
  const { createRoom } = useLaundryRooms();

  if (!building && loading) return <LoadingState />;
  if (!building) return <LoadingState />;

  function handleAddRoom() {
    Alert.prompt(
      t('laundryRooms.addPromptTitle'),
      t('laundryRooms.addPromptHint'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.save'),
          onPress: (name) => {
            const trimmed = name?.trim();
            if (!trimmed) return;
            void createRoom.mutateAsync({ name: trimmed });
          },
        },
      ],
      'plain-text',
      '',
      'default',
    );
  }

  return (
    <PageShell
      footer={
        isAdmin ? (
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
            onPress={handleAddRoom}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={22} color={colors.accent} />
            <Text style={styles.addLabel}>{t('laundryRooms.add')}</Text>
          </Pressable>
        ) : undefined
      }
    >
      {!building.laundryRooms.length ? (
        <View style={styles.empty}>
          <Ionicons name="home-outline" size={40} color={colors.textMuted} />
          <Body style={styles.emptyTitle}>{t('laundryRooms.empty')}</Body>
          <Caption style={styles.emptyHint}>{t('laundryRooms.emptyHint')}</Caption>
        </View>
      ) : (
        <SettingsGroup footer={t('laundryRooms.listHint')}>
          {building.laundryRooms.map((room, index) => {
            const counts = countResourcesByType(room.resources);
            const summary = [
              counts.WASHING_MACHINE ? `${counts.WASHING_MACHINE} ${t('resource.type.washerShort')}` : null,
              counts.TUMBLE_DRYER ? `${counts.TUMBLE_DRYER} ${t('resource.type.dryerShort')}` : null,
              counts.DRYING_ROOM ? `${counts.DRYING_ROOM} ${t('resource.type.dryingRoomShort')}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <SettingsRow
                key={room.id}
                icon="home-outline"
                label={room.name}
                value={summary || t('laundryRooms.noResources')}
                onPress={() =>
                  router.push({ pathname: '/(main)/laundry-room/[id]', params: { id: room.id } })
                }
                last={index === building.laundryRooms.length - 1}
              />
            );
          })}
        </SettingsGroup>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: { fontWeight: '600', textAlign: 'center' },
  emptyHint: { textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addPressed: { opacity: 0.92 },
  addLabel: { ...typography.body, color: colors.accent, fontWeight: '600' },
});
