import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { DEFECT_CATEGORIES, SEVERITIES } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, EmptyState, OptionPicker, PageShell, TextField } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function DefectReportScreen() {
  const { resourceId, machineId } = useLocalSearchParams<{ resourceId?: string; machineId?: string }>();
  const resolvedResourceId = resourceId ?? machineId ?? '';
  const { token } = useAuth();
  const [category, setCategory] = useState<string>(DEFECT_CATEGORIES[0]);
  const [severity, setSeverity] = useState<string>('MEDIUM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!resolvedResourceId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/defects', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ resourceId: resolvedResourceId, category, severity, description }),
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!resolvedResourceId) {
    return (
      <PageShell>
        <EmptyState message={t('defect.noMachine')} />
      </PageShell>
    );
  }

  return (
    <PageShell
      footer={<Button label={t('defect.submit')} onPress={submit} loading={loading} variant="accent" />}
    >
      <OptionPicker
        label={t('defect.category')}
        options={DEFECT_CATEGORIES.map((c) => ({
          value: c,
          label: t(`defect.category.${c}`),
        }))}
        value={category}
        onChange={setCategory}
      />

      <OptionPicker
        label={t('defect.severity')}
        options={SEVERITIES.map((s) => ({
          value: s,
          label: t(`defect.severity.${s}`),
        }))}
        value={severity}
        onChange={setSeverity}
        variant="chips"
      />

      <TextField
        label={t('defect.description')}
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        error={error}
      />
    </PageShell>
  );
}
