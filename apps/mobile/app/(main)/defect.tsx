import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, TextInput, Text, StyleSheet } from 'react-native';
import { DEFECT_CATEGORIES, SEVERITIES } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Caption, Card, Heading } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

const categoryLabels: Record<string, string> = {
  MACHINE_DOES_NOT_START: 'Startet nicht',
  MACHINE_DOES_NOT_DRAIN: 'Entleert nicht',
  DOOR_CANNOT_BE_OPENED: 'Tür lässt sich nicht öffnen',
  WATER_LEAKAGE: 'Wasseraustritt',
  UNUSUAL_NOISE: 'Ungewöhnliches Geräusch',
  DRYER_DOES_NOT_HEAT: 'Tumbler heizt nicht',
  DISPLAY_ERROR: 'Displayfehler',
  PAYMENT_SYSTEM_ISSUE: 'Zahlungssystem',
  MACHINE_IS_DIRTY: 'Maschine ist schmutzig',
  OTHER: 'Andere',
};

export default function DefectReportScreen() {
  const { machineId } = useLocalSearchParams<{ machineId?: string }>();
  const { token } = useAuth();
  const [category, setCategory] = useState<string>(DEFECT_CATEGORIES[0]);
  const [severity, setSeverity] = useState<string>('MEDIUM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!machineId) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/defects', {
        token: token!,
        method: 'POST',
        body: JSON.stringify({ machineId, category, severity, description }),
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!machineId) {
    return (
      <ScrollView style={styles.container}>
        <Caption>Maschine aus Maschinendetails auswählen.</Caption>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>{t('defect.title')}</Heading>

      <Text style={typography.label}>Kategorie</Text>
      {DEFECT_CATEGORIES.map((c) => (
        <Button
          key={c}
          label={categoryLabels[c] ?? c}
          variant={category === c ? 'primary' : 'secondary'}
          onPress={() => setCategory(c)}
        />
      ))}

      <Text style={typography.label}>Schweregrad</Text>
      {SEVERITIES.map((s) => (
        <Button
          key={s}
          label={s}
          variant={severity === s ? 'primary' : 'secondary'}
          onPress={() => setSeverity(s)}
        />
      ))}

      <Text style={typography.label}>Beschreibung</Text>
      <TextInput
        accessibilityLabel="Description"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textArea]}
      />

      {error ? <Caption>{error}</Caption> : null}
      <Button label={t('defect.submit')} onPress={submit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 48,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
});
