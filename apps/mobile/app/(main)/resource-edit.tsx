import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { ResourceType } from '@woeschplan/shared';
import { defaultRuntimeForResourceType } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useLaundryRooms } from '@/lib/hooks/useLaundryRooms';
import { LoadingState, PageShell, TextField } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import {
  SavedIndicator,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function ResourceEditScreen() {
  const { roomId, resourceId, resourceType: typeParam } = useLocalSearchParams<{
    roomId: string;
    resourceId?: string;
    resourceType?: ResourceType;
  }>();
  const { building, loading } = useBuilding();
  const { createResource, updateResource, deleteResource } = useLaundryRooms();

  const room = building?.laundryRooms.find((r) => r.id === roomId);
  const existing = room?.resources.find((r) => r.id === resourceId);
  const isNew = !resourceId;
  const resourceType = (existing?.resourceType ?? typeParam ?? 'WASHING_MACHINE') as ResourceType;

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [runtime, setRuntime] = useState(String(defaultRuntimeForResourceType(resourceType)));
  const [baseline, setBaseline] = useState({ name: '', model: '', runtime: '' });
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setModel(existing.model ?? '');
      setRuntime(String(existing.estimatedDefaultRuntime ?? defaultRuntimeForResourceType(resourceType)));
      setBaseline({
        name: existing.name,
        model: existing.model ?? '',
        runtime: String(existing.estimatedDefaultRuntime ?? defaultRuntimeForResourceType(resourceType)),
      });
      return;
    }
    if (isNew) {
      const defaultName =
        resourceType === 'DRYING_ROOM'
          ? t('resource.defaultName.dryingRoom')
          : resourceType === 'TUMBLE_DRYER'
            ? t('resource.defaultName.dryer')
            : t('resource.defaultName.washer');
      const nextRuntime = String(defaultRuntimeForResourceType(resourceType));
      setName(defaultName);
      setModel('');
      setRuntime(nextRuntime);
      setBaseline({ name: defaultName, model: '', runtime: nextRuntime });
    }
  }, [existing, isNew, resourceType]);

  const isDirty = useMemo(() => {
    if (isNew) return name.trim().length > 0;
    return (
      name !== baseline.name || model !== baseline.model || runtime !== baseline.runtime
    );
  }, [isNew, name, model, runtime, baseline]);

  async function handleSave() {
    if (!room || !name.trim()) return;
    const parsedRuntime = Number(runtime);
    if (!Number.isFinite(parsedRuntime) || parsedRuntime < 15) return;

    setSaving(true);
    try {
      if (isNew) {
        await createResource.mutateAsync({
          roomId: room.id,
          input: {
            name: name.trim(),
            resourceType,
            model: model.trim() || undefined,
            estimatedDefaultRuntime: parsedRuntime,
          },
        });
        router.back();
        return;
      }

      await updateResource.mutateAsync({
        roomId: room.id,
        resourceId: resourceId!,
        input: {
          name: name.trim(),
          model: model.trim() || undefined,
          estimatedDefaultRuntime: parsedRuntime,
        },
      });
      const next = { name: name.trim(), model: model.trim(), runtime: String(parsedRuntime) };
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
    setModel(baseline.model);
    setRuntime(baseline.runtime);
  }

  useEditableHeader({
    isDirty,
    isSaving: saving,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  function handleDelete() {
    if (!room || !resourceId) return;
    Alert.alert(t('resource.deleteTitle'), t('resource.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteResource.mutateAsync({ roomId: room.id, resourceId });
            router.back();
          } catch {
            Alert.alert(t('resource.deleteBlocked'));
          }
        },
      },
    ]);
  }

  if (loading || !building || !room) return <LoadingState />;

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />
      <Text style={styles.intro}>
        {resourceType === 'DRYING_ROOM'
          ? t('resource.type.dryingRoom')
          : resourceType === 'TUMBLE_DRYER'
            ? t('machine.type.dryer')
            : t('machine.type.washer')}
      </Text>

      <SettingsGroup>
        <TextField label={t('resource.name')} value={name} onChangeText={setName} />
        <TextField
          label={t('resource.model')}
          value={model}
          onChangeText={setModel}
          placeholder={t('resource.modelPlaceholder')}
        />
        <TextField
          label={t('resource.runtime')}
          value={runtime}
          onChangeText={setRuntime}
          keyboardType="number-pad"
        />
      </SettingsGroup>

      {!isNew ? (
        <SettingsGroup>
          <SettingsRow
            icon="trash-outline"
            label={t('resource.delete')}
            onPress={handleDelete}
            showChevron={false}
            destructive
            last
          />
        </SettingsGroup>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.caption, marginBottom: spacing.md, lineHeight: 20 },
});
