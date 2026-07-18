import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Caption, Card, Heading, LoadingState } from '@/components/ui';
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
      <ScrollView style={styles.container}>
        <Caption>Bitte Maschine über Maschinendetails auswählen.</Caption>
      </ScrollView>
    );
  }

  if (isLoading || !data) return <LoadingState />;

  const mandatoryIds = data.items.filter((i) => i.mandatory).map((i) => i.id);
  const allMandatoryChecked = mandatoryIds.every((id) => checked.has(id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('checklist.title')}</Heading>

      {data.items.map((item) => (
        <ChecklistRow
          key={item.id}
          label={t(item.labelKey)}
          checked={checked.has(item.id)}
          onToggle={() => toggle(item.id)}
          mandatory={item.mandatory}
        />
      ))}

      <Text style={styles.sectionTitle}>{t('checklist.maintenance')}</Text>
      {data.maintenance.map((item) => (
        <Card key={item.id}>
          <Caption>{t(item.labelKey)}</Caption>
        </Card>
      ))}

      <Button
        label={t('checklist.confirm')}
        onPress={confirm}
        loading={submitting}
        disabled={!allMandatoryChecked}
      />
    </ScrollView>
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
      style={styles.row}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={28}
        color={checked ? colors.primary : colors.textMuted}
      />
      <Text style={styles.rowLabel}>
        {label}
        {mandatory ? ' *' : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  rowLabel: { ...typography.body, flex: 1 },
  sectionTitle: { ...typography.label, marginTop: spacing.lg, marginBottom: spacing.sm },
});
