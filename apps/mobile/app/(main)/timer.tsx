import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Caption, Card, Heading, LoadingState } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

const TIMER_STORAGE_KEY = 'woeschplan_active_timer';

export default function TimerScreen() {
  const { machineId: paramMachineId } = useLocalSearchParams<{ machineId?: string }>();
  const { token } = useAuth();
  const [minutes, setMinutes] = useState('45');
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState(paramMachineId ?? '');

  const { data: activeTimer, isLoading } = useQuery({
    queryKey: ['active-timer'],
    enabled: !!token,
    queryFn: () =>
      apiRequest<{
        id: string;
        machineId: string;
        expectedCompletionTime: string;
        machine: { name: string };
      } | null>('/timers/active', { token: token! }),
  });

  useEffect(() => {
    if (activeTimer) {
      setActiveTimerId(activeTimer.id);
      setMachineId(activeTimer.machineId);
      const ms = new Date(activeTimer.expectedCompletionTime).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
      AsyncStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          timerId: activeTimer.id,
          expectedCompletionTime: activeTimer.expectedCompletionTime,
        }),
      );
    } else {
      AsyncStorage.getItem(TIMER_STORAGE_KEY).then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as {
          timerId: string;
          expectedCompletionTime: string;
        };
        const ms = new Date(parsed.expectedCompletionTime).getTime() - Date.now();
        if (ms > 0) {
          setActiveTimerId(parsed.timerId);
          setRemainingMs(ms);
        } else {
          AsyncStorage.removeItem(TIMER_STORAGE_KEY);
        }
      });
    }
  }, [activeTimer]);

  useEffect(() => {
    if (remainingMs === null || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => (prev === null ? null : Math.max(0, prev - 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  async function startTimer() {
    if (!machineId) return;
    const timer = await apiRequest<{
      id: string;
      expectedCompletionTime: string;
    }>('/timers', {
      token: token!,
      method: 'POST',
      body: JSON.stringify({
        machineId,
        remainingMinutes: Number(minutes),
        notifyFiveMinutesBefore: true,
        notifyOnCompletion: true,
        notifyTenMinutesAfterIfChecklistIncomplete: true,
      }),
    });
    setActiveTimerId(timer.id);
    setRemainingMs(Number(minutes) * 60000);
    await AsyncStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        timerId: timer.id,
        expectedCompletionTime: timer.expectedCompletionTime,
      }),
    );
  }

  async function completeTimer() {
    if (!activeTimerId) return;
    await apiRequest(`/timers/${activeTimerId}/complete`, {
      token: token!,
      method: 'POST',
    });
    await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
    router.push('/(main)/checklist');
  }

  if (isLoading) return <LoadingState />;

  const minutesLeft = remainingMs !== null ? Math.ceil(remainingMs / 60000) : null;

  return (
    <View style={styles.container}>
      <Heading>{t('timer.remaining')}</Heading>

      {remainingMs !== null && remainingMs > 0 ? (
        <Card>
          <Text style={styles.countdown}>{minutesLeft} {t('timer.minutes')}</Text>
          {activeTimer?.machine?.name ? <Caption>{activeTimer.machine.name}</Caption> : null}
          <Button label={t('timer.complete')} onPress={completeTimer} />
        </Card>
      ) : (
        <Card>
          {!paramMachineId ? (
            <>
              <Text style={typography.label}>Maschinen-ID</Text>
              <TextInput
                value={machineId}
                onChangeText={setMachineId}
                style={styles.input}
                accessibilityLabel="Machine ID"
              />
            </>
          ) : null}
          <Text style={typography.label}>{t('timer.minutes')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={minutes}
            onChangeText={setMinutes}
            style={styles.input}
            accessibilityLabel="Remaining minutes"
          />
          <Button label={t('timer.start')} onPress={startTimer} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  countdown: { fontSize: 48, fontWeight: '700', color: colors.primary, textAlign: 'center' },
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
