import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ScheduleView } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { invalidateBuildingQueries } from '@/lib/invalidateBuildingQueries';

export type AdminScheduleReservation = {
  id: string;
  status: string;
  localStart: string;
  localEnd: string;
  localDate: string;
  localDateLabel: string;
  privacyLabel: string;
  resource: {
    id: string;
    name: string;
    resourceType: string;
    laundryRoom: { name: string };
  };
  resident?: {
    id: string;
    name: string;
    email: string;
    apartmentNumber?: string | null;
  };
};

type ScheduleResponse = {
  view: ScheduleView;
  timezone: string;
  reservations: AdminScheduleReservation[];
};

export function useAdminSchedule() {
  const { token } = useAuth();
  const { buildingId, buildings, selectBuilding } = useBuilding();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ScheduleView>('day');
  const [resourceId, setResourceId] = useState<string>('all');
  const [search, setSearch] = useState('');

  const queryKey = ['schedule', 'admin', buildingId, view, resourceId, search.trim()] as const;

  const query = useQuery({
    queryKey,
    enabled: !!token && !!buildingId,
    queryFn: () => {
      const params = new URLSearchParams({ view });
      if (resourceId !== 'all') params.set('resourceId', resourceId);
      if (search.trim()) params.set('search', search.trim());
      return apiRequest<ScheduleResponse>(
        `/buildings/${buildingId}/schedule?${params.toString()}`,
        { token: token! },
      );
    },
    refetchInterval: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      apiRequest(`/buildings/reservations/${reservationId}`, {
        token: token!,
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['schedule'] });
      invalidateBuildingQueries(queryClient, token, buildingId);
    },
  });

  const adminBuildings = useMemo(
    () => buildings.filter((building) => building.role === 'ADMINISTRATOR'),
    [buildings],
  );

  return {
    view,
    setView,
    resourceId,
    setResourceId,
    search,
    setSearch,
    buildingId,
    adminBuildings,
    selectBuilding,
    ...query,
    cancelReservation: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
