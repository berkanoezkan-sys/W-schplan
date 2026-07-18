import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Caption,
  Card,
  EmptyState,
  LoadingState,
  PageShell,
  SectionLabel,
} from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function ChecklistScreen() {
  const { machineId, machineType } = useLocalSearchParams<{
    machineId?: string;
    machineType?: string;
  }>();
  const { token } = useAuth();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const resolvedMachineId = machineId ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['checklist', resolvedMachineId],
    enabled: !!token && !!resolvedMachineId,
    queryFn: () =>
      apiRequest<{
        machineType: 'WASHING_MACHINE' | 'TUMBLE_DRYER';
        items: Array<{ id: string; labelKey: string; mandatory: boolean }>;
        maintenance: Array<{ id: string; labelKey: string; mandatory: boolean }>;
      }>(`/machines/${resolvedMachineId}/checklist`, { token: token! }),
  });

  const type = (machineType as 'WASHING_MACHINE' | 'TUMBLE_DRYER') ?? data?.machineType;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (!resolvedMachineId || !type) return;
    setSubmitting(true);
    try {
      await apiRequest('/checklists/complete', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          machineId: resolvedMachineId,
          checklistType: type,
          completedItems: Array.from(checked),
        }),
      });
      setChecked(new Set());
    } finally {
      setSubmitting(false);
    }
  }

  if (!resolvedMachineId) {
    return (
      <PageShell>
        <EmptyState message={t('checklist.noMachine')} />
      </PageShell>
    );
  }

  if (isLoading || !data) return <LoadingState />;

  const mandatoryIds = data.items.filter((i) => i.mandatory).map((i) => i.id);
  const allMandatoryChecked = mandatoryIds.every((id) => checked.has(id));

  return (
    <PageShell
      footer={
        <Button
          label={t('checklist.confirm')}
          onPress={confirm}
          loading={submitting}
          disabled={!allMandatoryChecked}
          variant="accent"
        />
      }
    >
      {data.items.map((item) => (
        <ChecklistRow
          key={item.id}
          label={t(item.labelKey)}
          checked={checked.has(item.id)}
          onToggle={() => toggle(item.id)}
          mandatory={item.mandatory}
        />
      ))}

      {data.maintenance.length > 0 ? (
        <>
          <SectionLabel>{t('checklist.maintenance')}</SectionLabel>
          {data.maintenance.map((item) => (
            <Card key={item.id}>
              <Caption>{t(item.labelKey)}</Caption>
            </Card>
          ))}
        </>
      ) : null}
    </PageShell>
  );
}

function ChecklistRow({
  label,
  checked,
  onToggle,
  mandatory,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  mandatory: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[styles.row, checked && styles.rowChecked]}
    >
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={28}
        color={checked ? colors.accent : colors.textMuted}
      />
      <Text style={styles.rowLabel}>
        {label}
        {mandatory ? ' *' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  rowChecked: { backgroundColor: colors.accentSurface },
  rowLabel: { ...typography.body, flex: 1 },
});
