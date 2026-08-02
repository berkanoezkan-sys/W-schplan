import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ChecklistTemplate, ChecklistTemplateItem } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import {
  normalizeChecklistType,
  useBuildingSettings,
  useChecklistTemplate,
} from '@/lib/hooks/useBuildingSettings';
import {
  Caption,
  EmptyState,
  LoadingState,
  PageShell,
  SectionLabel,
} from '@/components/ui';
import { SuccessBanner } from '@/components/WheelPickers';
import { useEditableHeader } from '@/lib/useEditableHeader';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

function newItemId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CleaningRulesEditorScreen() {
  const { type } = useLocalSearchParams<{ type?: string | string[] }>();
  const navigation = useNavigation();
  const checklistType = normalizeChecklistType(type);
  const { isAdmin } = useBuilding();
  const { saveChecklistTemplate } = useBuildingSettings();
  const { data, isLoading, isError, refetch, isFetching } = useChecklistTemplate(checklistType);

  const [draft, setDraft] = useState<ChecklistTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');

  const readOnly = !isAdmin;
  const template = draft ?? data ?? null;

  const isDirty = useMemo(() => {
    if (!draft || !data) return false;
    return JSON.stringify(draft) !== JSON.stringify(data);
  }, [draft, data]);

  const handleCancel = useCallback(() => {
    setDraft(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveChecklistTemplate(draft);
      setDraft(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      Alert.alert(t('common.error'), t('settings.cleaning.saveError'));
    } finally {
      setSaving(false);
    }
  }, [draft, saveChecklistTemplate]);

  useEditableHeader({
    isDirty: isDirty && !readOnly,
    isSaving: saving,
    onSave: handleSave,
    onCancel: handleCancel,
  });

  const title =
    checklistType === 'WASHING_MACHINE'
      ? t('settings.cleaning.washer')
      : t('settings.cleaning.dryer');

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  if (isLoading && !template) {
    return <LoadingState />;
  }

  if (!template) {
    return (
      <PageShell>
        <EmptyState
          message={t('settings.cleaning.loadError')}
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
        />
      </PageShell>
    );
  }

  const workingTemplate = template;

  function updateTemplate(next: ChecklistTemplate) {
    setDraft(next);
  }

  const afterCycle = workingTemplate.items
    .filter((i) => i.category === 'after_cycle')
    .sort((a, b) => a.order - b.order);
  const maintenance = workingTemplate.items
    .filter((i) => i.category === 'maintenance')
    .sort((a, b) => a.order - b.order);

  function updateItems(nextItems: ChecklistTemplateItem[]) {
    updateTemplate({ ...workingTemplate, items: reindex(nextItems) });
  }

  function reindex(items: ChecklistTemplateItem[]): ChecklistTemplateItem[] {
    return items.map((item, index) => ({ ...item, order: index }));
  }

  function toggleEnabled(id: string) {
    updateItems(
      workingTemplate.items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)),
    );
  }

  function moveItem(id: string, direction: -1 | 1) {
    const category = workingTemplate.items.find((i) => i.id === id)?.category;
    if (!category) return;
    const group = workingTemplate.items
      .filter((i) => i.category === category)
      .sort((a, b) => a.order - b.order);
    const index = group.findIndex((i) => i.id === id);
    const target = index + direction;
    if (target < 0 || target >= group.length) return;
    const swapped = [...group];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    const other = workingTemplate.items.filter((i) => i.category !== category);
    updateItems(reindex([...other, ...swapped]));
  }

  function deleteItem(id: string) {
    Alert.alert(t('settings.cleaning.deleteTitle'), t('settings.cleaning.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.cleaning.delete'),
        style: 'destructive',
        onPress: () => updateItems(workingTemplate.items.filter((i) => i.id !== id)),
      },
    ]);
  }

  function addItem(category: 'after_cycle' | 'maintenance') {
    const label = newItemLabel.trim();
    if (!label) return;
    const item: ChecklistTemplateItem = {
      id: newItemId(),
      label,
      mandatory: category === 'after_cycle',
      enabled: true,
      order: workingTemplate.items.length,
      category,
    };
    updateItems([...workingTemplate.items, item]);
    setNewItemLabel('');
  }

  return (
    <PageShell>
      <SuccessBanner message={t('settings.saved')} visible={success} />

      {isError ? (
        <Caption>{t('settings.cleaning.offlineFallback')}</Caption>
      ) : null}
      {isFetching && !isLoading ? <Caption>{t('common.loading')}</Caption> : null}
      <Caption>{title}</Caption>

      <SectionLabel>{t('settings.cleaning.afterCycle')}</SectionLabel>
      {afterCycle.length === 0 ? (
        <Caption>{t('settings.cleaning.noItems')}</Caption>
      ) : (
        afterCycle.map((item, index) => (
          <ChecklistEditorRow
            key={item.id}
            item={item}
            readOnly={readOnly}
            canMoveUp={index > 0}
            canMoveDown={index < afterCycle.length - 1}
            onToggle={() => toggleEnabled(item.id)}
            onMoveUp={() => moveItem(item.id, -1)}
            onMoveDown={() => moveItem(item.id, 1)}
            onDelete={() => deleteItem(item.id)}
            onLabelChange={(label) =>
              updateItems(
                workingTemplate.items.map((i) => (i.id === item.id ? { ...i, label } : i)),
              )
            }
          />
        ))
      )}

      <SectionLabel>{t('settings.cleaning.maintenance')}</SectionLabel>
      {maintenance.length === 0 ? (
        <Caption>{t('settings.cleaning.noItems')}</Caption>
      ) : (
        maintenance.map((item, index) => (
          <ChecklistEditorRow
            key={item.id}
            item={item}
            readOnly={readOnly}
            canMoveUp={index > 0}
            canMoveDown={index < maintenance.length - 1}
            onToggle={() => toggleEnabled(item.id)}
            onMoveUp={() => moveItem(item.id, -1)}
            onMoveDown={() => moveItem(item.id, 1)}
            onDelete={() => deleteItem(item.id)}
            onLabelChange={(label) =>
              updateItems(
                workingTemplate.items.map((i) => (i.id === item.id ? { ...i, label } : i)),
              )
            }
          />
        ))
      )}

      {!readOnly ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder={t('settings.cleaning.newItem')}
            placeholderTextColor={colors.textMuted}
            value={newItemLabel}
            onChangeText={setNewItemLabel}
          />
          <View style={styles.addButtons}>
            <Pressable style={styles.addChip} onPress={() => addItem('after_cycle')}>
              <Text style={styles.addChipText}>{t('settings.cleaning.addAfter')}</Text>
            </Pressable>
            <Pressable style={styles.addChip} onPress={() => addItem('maintenance')}>
              <Text style={styles.addChipText}>{t('settings.cleaning.addMaintenance')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </PageShell>
  );
}

function ChecklistEditorRow({
  item,
  readOnly,
  canMoveUp,
  canMoveDown,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  onLabelChange,
}: {
  item: ChecklistTemplateItem;
  readOnly: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onLabelChange: (label: string) => void;
}) {
  return (
    <View style={[styles.itemRow, !item.enabled && styles.itemRowDisabled]}>
      {!readOnly ? (
        <View style={styles.reorder}>
          <Pressable disabled={!canMoveUp} onPress={onMoveUp} style={styles.reorderBtn}>
            <Ionicons name="chevron-up" size={18} color={canMoveUp ? colors.primary : colors.border} />
          </Pressable>
          <Pressable disabled={!canMoveDown} onPress={onMoveDown} style={styles.reorderBtn}>
            <Ionicons name="chevron-down" size={18} color={canMoveDown ? colors.primary : colors.border} />
          </Pressable>
        </View>
      ) : null}
      {readOnly ? (
        <Text style={styles.itemLabel}>{item.label}</Text>
      ) : (
        <TextInput
          style={styles.itemInput}
          value={item.label}
          onChangeText={onLabelChange}
          multiline
        />
      )}
      {!readOnly ? (
        <>
          <Switch value={item.enabled} onValueChange={onToggle} trackColor={{ true: colors.accent }} />
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 52,
  },
  itemRowDisabled: { opacity: 0.55 },
  reorder: { alignItems: 'center' },
  reorderBtn: { padding: 2 },
  itemLabel: { ...typography.body, flex: 1 },
  itemInput: { ...typography.body, flex: 1, minHeight: 40, padding: 0 },
  deleteBtn: { padding: spacing.xs },
  addRow: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addInput: {
    ...typography.body,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  addButtons: { flexDirection: 'row', gap: spacing.sm },
  addChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  addChipText: { ...typography.caption, fontWeight: '600', color: colors.primary },
});
