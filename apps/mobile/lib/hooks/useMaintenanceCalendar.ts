import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMaintenanceEntryInput,
  MaintenanceCalendarView,
  MaintenanceFilterValue,
  MaintenanceSeriesScope,
  UpdateMaintenanceEntryInput,
} from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';

export type MaintenanceEntry = {
  id: string;
  buildingId: string;
  seriesId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  occurrenceDate: string;
  endDate: string | null;
  localDate: string;
  localEndDate: string;
  localDateLabel: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  localStart: string;
  localEnd: string;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceInterval: number | null;
  recurrenceDays: number[];
  recurrenceEndDate: string | null;
  notifyResidents: boolean;
  residentsNotified: boolean;
  location: string | null;
  affectedAreaIds: string[];
  affectedMachineIds: string[];
  createdBy?: { name: string };
  createdAt: string;
  updatedAt: string;
};

function buildMaintenancePath(
  buildingId: string,
  view: MaintenanceCalendarView,
  anchorDate: string,
  filter: MaintenanceFilterValue,
) {
  const params = new URLSearchParams({ view, date: anchorDate });
  if (filter !== 'all') {
    if (['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(filter)) {
      params.set('status', filter);
    } else {
      params.set('type', filter);
    }
  }
  return `/buildings/${buildingId}/maintenance?${params.toString()}`;
}

export function useMaintenanceCalendar(
  view: MaintenanceCalendarView,
  anchorDate: string,
  filter: MaintenanceFilterValue,
) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  return useQuery({
    queryKey: ['maintenance', buildingId, view, anchorDate, filter],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<{ entries: MaintenanceEntry[]; timezone: string; anchorDate: string }>(
        buildMaintenancePath(buildingId!, view, anchorDate, filter),
        { token: token! },
      ),
  });
}

export function useMaintenanceMutations() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['maintenance', buildingId] });
  };

  const create = useMutation({
    mutationFn: (input: CreateMaintenanceEntryInput) =>
      apiRequest<MaintenanceEntry>(`/buildings/${buildingId}/maintenance`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      entryId,
      input,
    }: {
      entryId: string;
      input: UpdateMaintenanceEntryInput;
    }) =>
      apiRequest<MaintenanceEntry>(`/buildings/${buildingId}/maintenance/${entryId}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: ({
      entryId,
      scope,
    }: {
      entryId: string;
      scope?: MaintenanceSeriesScope;
    }) =>
      apiRequest<{ ok: true }>(`/buildings/${buildingId}/maintenance/${entryId}`, {
        method: 'DELETE',
        token: token!,
        body: JSON.stringify(scope ? { scope } : {}),
      }),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function useMaintenanceEntry(entryId?: string) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  return useQuery({
    queryKey: ['maintenance', buildingId, 'entry', entryId],
    enabled: !!token && !!buildingId && !!entryId,
    queryFn: () =>
      apiRequest<MaintenanceEntry>(`/buildings/${buildingId}/maintenance/${entryId}`, {
        token: token!,
      }),
  });
}
