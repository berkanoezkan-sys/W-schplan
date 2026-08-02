import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { CapacityLevel, ScheduleView, TimeRange } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';

export type ScheduleReservation = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  localStart: string;
  localEnd: string;
  localDate: string;
  localDateLabel: string;
  privacyLabel: string;
  isOwn: boolean;
  resourceId: string;
  resource: {
    id: string;
    name: string;
    resourceType: string;
    status: string;
    laundryRoom: { name: string };
  };
  activeTimer: {
    id: string;
    expectedCompletionTime: string;
    remainingMs: number;
  } | null;
};

export type ScheduleBufferBlock = {
  resourceId: string;
  reservationId: string;
  startTime: string;
  endTime: string;
  localStart: string;
  localEnd: string;
  localDate: string;
  bufferMinutes: number;
};

export type ScheduleResource = {
  id: string;
  name: string;
  resourceType: string;
  status: string;
  bufferMinutes: number;
  laundryRoom: { id: string; name: string };
  activeTimer: {
    id: string;
    expectedCompletionTime: string;
    remainingMs: number;
  } | null;
};

export type ScheduleMonthDay = {
  date: string;
  freeRatio: number;
  level: CapacityLevel;
};

export type ScheduleNotice = {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: string;
  icon: string;
  attachmentUrl: string | null;
  startTime: string;
  endTime: string;
  localStart: string;
  localEnd: string;
  localDate: string;
  localEndDate: string;
  affectsLaundry: boolean;
  showOnLogin: boolean;
  isActive: boolean;
};

export type ScheduleLaundryRoom = {
  id: string;
  name: string;
  floor?: string | null;
};

export type ResidentScheduleData = {
  view: ScheduleView;
  anchorDate: string;
  timezone: string;
  washingHours: TimeRange;
  quietHours: TimeRange;
  laundryRooms: ScheduleLaundryRoom[];
  resources: ScheduleResource[];
  reservations: ScheduleReservation[];
  bufferBlocks: ScheduleBufferBlock[];
  notices: ScheduleNotice[];
  monthDays?: ScheduleMonthDay[];
};

export type ScheduleFilters = {
  laundryRoomId?: string | null;
  resourceId?: string | null;
};

function buildSchedulePath(buildingId: string, view: ScheduleView, anchorDate: string, filters: ScheduleFilters) {
  const params = new URLSearchParams({ view, date: anchorDate });
  if (filters.resourceId) params.set('resourceId', filters.resourceId);
  if (filters.laundryRoomId) params.set('laundryRoomId', filters.laundryRoomId);
  return `/buildings/${buildingId}/schedule?${params.toString()}`;
}

export function useResidentSchedule(view: ScheduleView, anchorDate: string, filters: ScheduleFilters = {}) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  return useQuery({
    queryKey: ['schedule', buildingId, view, anchorDate, filters.laundryRoomId ?? null, filters.resourceId ?? null],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<ResidentScheduleData>(buildSchedulePath(buildingId!, view, anchorDate, filters), {
        token: token!,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 1,
  });
}
