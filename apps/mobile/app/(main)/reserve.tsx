import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, Text } from 'react-native';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Button, Caption, Card, Heading } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function ReserveScreen() {
  const { token } = useAuth();
  const { building, buildingId } = useBuilding();
  const [machineId, setMachineId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const machines =
    building?.laundryRooms.flatMap((room) =>
      room.machines.map((m) => ({ ...m, roomName: room.name })),
    ) ?? [];

  async function submit() {
    if (!buildingId || !machineId) return;
    setLoading(true);
    setError(null);
    try {
      const start = startTime ? new Date(startTime) : new Date(Date.now() + 3600000);
      const end = new Date(start.getTime() + Number(durationMinutes) * 60000);
      await apiRequest(`/buildings/${buildingId}/reservations`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          machineId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Heading>Reservation erstellen</Heading>

      <Text style={typography.label}>Maschine</Text>
      {machines.map((m) => (
        <Card key={m.id}>
          <Button
            label={`${m.name} (${m.roomName})`}
            variant={machineId === m.id ? 'primary' : 'secondary'}
            onPress={() => setMachineId(m.id)}
          />
        </Card>
      ))}

      <Text style={typography.label}>Start (ISO, optional)</Text>
      <TextInput
        accessibilityLabel="Start time"
        placeholder="2026-07-19T18:00:00.000Z"
        value={startTime}
        onChangeText={setStartTime}
        style={styles.input}
      />

      <Text style={typography.label}>Dauer (Minuten)</Text>
      <TextInput
        accessibilityLabel="Duration"
        keyboardType="number-pad"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        style={styles.input}
      />

      {error ? <Caption>{error}</Caption> : null}
      <Button label={t('common.confirm')} onPress={submit} loading={loading} />
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
});
