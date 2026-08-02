import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBuilding, getAllResources, resourceTypeIcon } from '@/lib/building';
import type { ScheduleResource } from '@/lib/hooks/useResidentSchedule';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { machineStatusColors } from '@/lib/theme';
import { t } from '@/lib/i18n';

export type CalendarFilters = {
  laundryRoomId: string | null;
  resourceId: string | null;
};

type Props = {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  /** Live status from schedule API, keyed by resource id */
  scheduleResources?: ScheduleResource[];
  laundryRooms?: Array<{ id: string; name: string; floor?: string | null }>;
};

export function CalendarFilterBar({ filters, onChange, scheduleResources = [], laundryRooms = [] }: Props) {
  const { building } = useBuilding();

  const statusById = useMemo(() => {
    const map = new Map<string, ScheduleResource>();
    for (const r of scheduleResources) map.set(r.id, r);
    return map;
  }, [scheduleResources]);

  const roomOptions = useMemo(() => {
    const fromApi = laundryRooms.length > 0 ? laundryRooms : (building?.laundryRooms ?? []);
    return fromApi.map((room) => ({
      id: room.id,
      label: room.name,
      subtitle: room.floor ? room.floor : undefined,
    }));
  }, [building?.laundryRooms, laundryRooms]);

  /** Always list all building resources so filters stay stable while data loads. */
  const allResources = useMemo(() => {
    const fromBuilding = getAllResources(building).map((r) => {
      const live = statusById.get(r.id);
      const room = building?.laundryRooms.find((lr) => lr.resources.some((res) => res.id === r.id));
      return {
        id: r.id,
        name: r.name,
        resourceType: r.resourceType,
        status: live?.status ?? r.status,
        laundryRoom: {
          id: room?.id ?? live?.laundryRoom.id ?? '',
          name: room?.name ?? live?.laundryRoom.name ?? '',
        },
      };
    });
    return fromBuilding;
  }, [building, statusById]);

  const filteredResources = useMemo(() => {
    if (!filters.laundryRoomId) return allResources;
    return allResources.filter((r) => r.laundryRoom.id === filters.laundryRoomId);
  }, [filters.laundryRoomId, allResources]);

  return (
    <View style={styles.container}>
      {roomOptions.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('schedule.filter.laundryRoom')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <FilterChip
              label={t('schedule.filter.allRooms')}
              selected={!filters.laundryRoomId}
              onPress={() => onChange({ laundryRoomId: null, resourceId: null })}
            />
            {roomOptions.map((room) => (
              <FilterChip
                key={room.id}
                label={room.label}
                subtitle={room.subtitle}
                selected={filters.laundryRoomId === room.id}
                onPress={() =>
                  onChange({
                    laundryRoomId: room.id,
                    resourceId:
                      filters.resourceId &&
                      allResources.some(
                        (r) => r.id === filters.resourceId && r.laundryRoom.id === room.id,
                      )
                        ? filters.resourceId
                        : null,
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('schedule.filter.machine')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip
            label={t('schedule.filter.allMachines')}
            selected={!filters.resourceId}
            onPress={() => onChange({ ...filters, resourceId: null })}
            icon="grid-outline"
          />
          {filteredResources.map((resource) => (
            <FilterChip
              key={resource.id}
              label={resource.name}
              selected={filters.resourceId === resource.id}
              onPress={() => onChange({ ...filters, resourceId: resource.id })}
              statusColor={machineStatusColors[resource.status]}
              icon={resourceTypeIcon(resource.resourceType)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function FilterChip({
  label,
  subtitle,
  selected,
  onPress,
  statusColor,
  icon,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  statusColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.primary : colors.textMuted}
          style={styles.chipIcon}
        />
      ) : null}
      {statusColor ? <View style={[styles.chipDot, { backgroundColor: statusColor }]} /> : null}
      <View style={styles.chipTextWrap}>
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.chipSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  section: { gap: spacing.xs },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 160,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 40,
  },
  chipSelected: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  chipIcon: { marginRight: 4 },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipTextWrap: { flexShrink: 1 },
  chipLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  chipLabelSelected: { color: colors.primary },
  chipSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
});
