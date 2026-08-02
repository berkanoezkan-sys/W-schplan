import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { apiRequest, ApiError } from '@/lib/api';
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
  const { resourceId: paramResourceId } = useLocalSearchParams<{ resourceId?: string }>();
  const { token } = useAuth();
  const { building, buildingId } = useBuilding();
  const [resourceId, setResourceId] = useState(paramResourceId ?? '');
  const [timePreset, setTimePreset] = useState<TimePreset>('nextHour');
  const [durationMinutes, setDurationMinutes] = useState<string>('90');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resources = useMemo(
    () =>
      building?.laundryRooms.flatMap((room) =>
        room.resources.map((r) => ({ ...r, roomName: room.name })),
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
    if (!buildingId || !resourceId) return;
    setLoading(true);
    setError(null);
    try {
      const start = presetToDate(timePreset);
      const end = new Date(start.getTime() + Number(durationMinutes) * 60000);
      await apiRequest(`/buildings/${buildingId}/reservations`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify({
          resourceId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'QUIET_HOURS_CONFLICT') {
          setError(t('reserve.error.quietHours'));
        } else if (e.code === 'OVERLAP' || e.status === 409) {
          setError(t('reserve.error.overlap'));
        } else {
          setError(e.message);
        }
      } else {
        setError((e as Error).message ?? t('common.error'));
      }
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
          disabled={!resourceId}
          variant="accent"
        />
      }
    >
      <OptionPicker
        label={t('reserve.selectMachine')}
        options={resources.map((r) => ({
          value: r.id,
          label: r.name,
          subtitle: r.roomName,
        }))}
        value={resourceId}
        onChange={setResourceId}
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
