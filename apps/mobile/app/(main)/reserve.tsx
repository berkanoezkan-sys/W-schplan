import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Button, OptionPicker, PageShell, SectionLabel } from '@/components/ui';
import { t } from '@/lib/i18n';

const DURATIONS = ['60', '90', '120'] as const;
type TimePreset = 'nextHour' | 'tonight' | 'tomorrowAm';

function presetToDate(preset: TimePreset): Date {
  const now = new Date();
  if (preset === 'nextHour') {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
  if (preset === 'tonight') {
    const d = new Date(now);
    d.setHours(19, 0, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function ReserveScreen() {
  const { token } = useAuth();
  const { building, buildingId } = useBuilding();
  const [machineId, setMachineId] = useState('');
  const [timePreset, setTimePreset] = useState<TimePreset>('nextHour');
  const [durationMinutes, setDurationMinutes] = useState<string>('90');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const machines = useMemo(
    () =>
      building?.laundryRooms.flatMap((room) =>
        room.machines.map((m) => ({ ...m, roomName: room.name })),
      ) ?? [],
    [building],
  );

  const timeOptions = useMemo(
    () =>
      (['nextHour', 'tonight', 'tomorrowAm'] as const).map((p) => ({
        value: p,
        label: t(`reserve.preset.${p}`),
        subtitle: presetToDate(p).toLocaleString('de-CH', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    [],
  );

  const durationOptions = DURATIONS.map((d) => ({
    value: d,
    label: `${d} ${t('reserve.minutes')}`,
  }));

  async function submit() {
    if (!buildingId || !machineId) return;
    setLoading(true);
    setError(null);
    try {
      const start = presetToDate(timePreset);
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
    <PageShell
      footer={
        <Button
          label={t('reserve.submit')}
          onPress={submit}
          loading={loading}
          disabled={!machineId}
          variant="accent"
        />
      }
    >
      <OptionPicker
        label={t('reserve.selectMachine')}
        options={machines.map((m) => ({
          value: m.id,
          label: m.name,
          subtitle: m.roomName,
        }))}
        value={machineId}
        onChange={setMachineId}
      />

      <OptionPicker
        label={t('reserve.when')}
        options={timeOptions}
        value={timePreset}
        onChange={(v) => setTimePreset(v as TimePreset)}
      />

      <SectionLabel>{t('reserve.duration')}</SectionLabel>
      <OptionPicker
        options={durationOptions}
        value={durationMinutes}
        onChange={setDurationMinutes}
        variant="chips"
      />

      {error ? <SectionLabel>{error}</SectionLabel> : null}
    </PageShell>
  );
}
