import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { ResourceType } from '@woeschplan/shared';
import { resourceTypeIcon, useBuilding, type Resource } from '@/lib/building';
import { useLaundryRooms } from '@/lib/hooks/useLaundryRooms';
import { LoadingState, PageShell, SectionLabel, TextField } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import {
  SavedIndicator,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { machineStatusLabels } from '@/lib/theme';
import { t } from '@/lib/i18n';

const RESOURCE_SECTIONS: Array<{ type: ResourceType; titleKey: string }> = [
  { type: 'WASHING_MACHINE', titleKey: 'resource.section.washers' },
  { type: 'TUMBLE_DRYER', titleKey: 'resource.section.dryers' },
  { type: 'DRYING_ROOM', titleKey: 'resource.section.dryingRooms' },
];

export default function LaundryRoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { building, isAdmin, loading } = useBuilding();
  const { updateRoom, deleteRoom } = useLaundryRooms();

  const room = building?.laundryRooms.find((r) => r.id === id);
  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');
  const [instructions, setInstructions] = useState('');
  const [baseline, setBaseline] = useState({ name: '', floor: '', instructions: '' });
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    if (!room) return;
    setName(room.name);
    setFloor(room.floor ?? '');
    setInstructions(room.instructions ?? '');
    setBaseline({
      name: room.name,
      floor: room.floor ?? '',
      instructions: room.instructions ?? '',
    });
  }, [room?.id, room?.name, room?.floor, room?.instructions]);

  const isDirty = useMemo(
    () =>
      !!room &&
      (name !== baseline.name || floor !== baseline.floor || instructions !== baseline.instructions),
    [room, name, floor, instructions, baseline],
  );

  async function handleSave() {
    if (!room || !name.trim()) return;
    setSaving(true);
    try {
      await updateRoom.mutateAsync({
        roomId: room.id,
        input: {
          name: name.trim(),
          floor: floor.trim() || undefined,
          instructions: instructions.trim() || undefined,
        },
      });
      const next = { name: name.trim(), floor: floor.trim(), instructions: instructions.trim() };
      setBaseline(next);
      await triggerSaveHaptic();
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(baseline.name);
    setFloor(baseline.floor);
    setInstructions(baseline.instructions);
  }

  useEditableHeader({
    isDirty: isAdmin && isDirty,
    isSaving: saving,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  if (loading || !building || !room) return <LoadingState />;

  function handleDeleteRoom() {
    Alert.alert(t('laundryRooms.deleteTitle'), t('laundryRooms.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoom.mutateAsync(room.id);
            router.back();
          } catch {
            Alert.alert(t('laundryRooms.deleteBlocked'));
          }
        },
      },
    ]);
  }

  function openAddResource(type: ResourceType) {
    router.push({
      pathname: '/(main)/resource-edit',
      params: { roomId: room.id, resourceType: type },
    });
  }

  function openResource(resource: Resource) {
    router.push({
      pathname: '/(main)/resource-edit',
      params: { roomId: room.id, resourceId: resource.id },
    });
  }

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />

      <SectionLabel>{t('laundryRooms.details')}</SectionLabel>
      <SettingsGroup>
        {isAdmin ? (
          <>
            <TextField
              label={t('laundryRooms.name')}
              value={name}
              onChangeText={setName}
            />
            <TextField
              label={t('laundryRooms.floor')}
              value={floor}
              onChangeText={setFloor}
              placeholder={t('laundryRooms.floorPlaceholder')}
            />
            <TextField
              label={t('laundryRooms.instructions')}
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t('laundryRooms.instructionsPlaceholder')}
              multiline
            />
          </>
        ) : (
          <>
            <SettingsRow icon="home-outline" label={t('laundryRooms.name')} value={room.name} />
            {room.floor ? (
              <SettingsRow icon="layers-outline" label={t('laundryRooms.floor')} value={room.floor} />
            ) : null}
            {room.instructions ? (
              <SettingsRow
                icon="information-circle-outline"
                label={t('laundryRooms.instructions')}
                value={room.instructions}
                showChevron={false}
              />
            ) : null}
          </>
        )}
      </SettingsGroup>

      {RESOURCE_SECTIONS.map(({ type, titleKey }) => {
        const resources = room.resources.filter((r) => r.resourceType === type);
        return (
          <ViewSection
            key={type}
            title={t(titleKey)}
            resources={resources}
            canManage={isAdmin}
            onAdd={() => openAddResource(type)}
            onOpen={openResource}
          />
        );
      })}

      {isAdmin ? (
        <SettingsGroup>
          <SettingsRow
            icon="trash-outline"
            label={t('laundryRooms.delete')}
            onPress={handleDeleteRoom}
            showChevron={false}
            destructive
            last
          />
        </SettingsGroup>
      ) : null}
    </PageShell>
  );
}

function ViewSection({
  title,
  resources,
  canManage,
  onAdd,
  onOpen,
}: {
  title: string;
  resources: Resource[];
  canManage: boolean;
  onAdd: () => void;
  onOpen: (resource: Resource) => void;
}) {
  return (
    <>
      <SectionLabel>{title}</SectionLabel>
      <SettingsGroup footer={canManage ? t('resource.sectionHint') : undefined}>
        {resources.length ? (
          resources.map((resource, index) => (
            <SettingsRow
              key={resource.id}
              icon={resourceTypeIcon(resource.resourceType)}
              label={resource.name}
              value={t(machineStatusLabels[resource.status] ?? 'status.available')}
              onPress={() => onOpen(resource)}
              last={index === resources.length - 1 && !canManage}
            />
          ))
        ) : (
          <SettingsRow icon="remove-outline" label={t('resource.emptySection')} showChevron={false} last={!canManage} />
        )}
        {canManage ? (
          <SettingsRow icon="add-circle-outline" label={t('resource.add')} onPress={onAdd} last />
        ) : null}
      </SettingsGroup>
    </>
  );
}
