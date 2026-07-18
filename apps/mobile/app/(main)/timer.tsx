import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  Button,
  Caption,
  HeroCard,
  LoadingState,
  OptionPicker,
  PageShell,
  SectionLabel,
} from '@/components/ui';
import { colors, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

const TIMER_STORAGE_KEY = 'woeschplan_active_timer';
const DURATIONS = ['30', '45', '60', '90'] as const;

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
    router.push({
      pathname: '/(main)/checklist',
      params: { machineId: machineId || activeTimer?.machineId },
    });
  }

  if (isLoading) return <LoadingState />;

  const minutesLeft = remainingMs !== null ? Math.ceil(remainingMs / 60000) : null;
  const secondsLeft =
    remainingMs !== null ? Math.floor((remainingMs % 60000) / 1000) : null;

  if (remainingMs !== null && remainingMs > 0) {
    return (
      <PageShell
        footer={<Button label={t('timer.complete')} onPress={completeTimer} variant="accent" />}
      >
        <HeroCard
          label={t('timer.remaining')}
          title={`${minutesLeft}:${String(secondsLeft).padStart(2, '0')}`}
          subtitle={activeTimer?.machine?.name}
          accentColor={colors.accent}
        />
      </PageShell>
    );
  }

  return (
    <PageShell footer={<Button label={t('timer.start')} onPress={startTimer} variant="accent" disabled={!machineId} />}>
      <SectionLabel>{t('timer.duration')}</SectionLabel>
      <OptionPicker
        options={DURATIONS.map((d) => ({ value: d, label: `${d} ${t('timer.minutes')}` }))}
        value={minutes}
        onChange={setMinutes}
        variant="chips"
      />
      {!paramMachineId ? (
        <Text style={styles.hint}>{t('defect.noMachine')}</Text>
      ) : (
        <Caption>{machineId}</Caption>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, textAlign: 'center' },
});
