import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBuildingNoticeInput, NoticeAttachment, NoticeCategory, UpdateBuildingNoticeInput } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';

export type BuildingNotice = {
  id: string;
  buildingId: string;
  title: string;
  body: string;
  category: NoticeCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  icon: string;
  attachmentUrl: string | null;
  attachments: NoticeAttachment[];
  startTime: string;
  endTime: string;
  localStart: string;
  localEnd: string;
  localDate: string;
  localEndDate: string;
  localDateLabel: string;
  affectsLaundry: boolean;
  showOnLogin: boolean;
  sendPushNotification: boolean;
  archivedAt: string | null;
  isActive: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  acknowledged?: boolean;
  createdBy?: { name: string };
  createdAt: string;
  updatedAt: string;
};

export function useBuildingNotices(includeArchived = false) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  return useQuery({
    queryKey: ['notices', buildingId, includeArchived],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<{ notices: BuildingNotice[]; timezone: string }>(
        `/buildings/${buildingId}/notices?includeArchived=${includeArchived}`,
        { token: token! },
      ),
  });
}

export function useNoticePopup() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();

  return useQuery({
    queryKey: ['notices', 'popup', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<{ notices: BuildingNotice[] }>(`/buildings/${buildingId}/notices/popup`, {
        token: token!,
      }),
    staleTime: 0,
  });
}

export function useNoticeMutations() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notices', buildingId] });
    void queryClient.invalidateQueries({ queryKey: ['notices', 'popup', buildingId] });
    void queryClient.invalidateQueries({ queryKey: ['schedule', buildingId] });
  };

  const create = useMutation({
    mutationFn: (input: CreateBuildingNoticeInput) =>
      apiRequest<BuildingNotice>(`/buildings/${buildingId}/notices`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ noticeId, input }: { noticeId: string; input: UpdateBuildingNoticeInput }) =>
      apiRequest<BuildingNotice>(`/buildings/${buildingId}/notices/${noticeId}`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (noticeId: string) =>
      apiRequest<BuildingNotice>(`/buildings/${buildingId}/notices/${noticeId}/archive`, {
        method: 'POST',
        token: token!,
      }),
    onSuccess: invalidate,
  });

  const acknowledge = useMutation({
    mutationFn: (noticeIds: string[]) =>
      apiRequest<{ ok: boolean }>(`/buildings/${buildingId}/notices/acknowledge`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ noticeIds }),
      }),
    onSuccess: invalidate,
  });

  return { create, update, archive, acknowledge };
}
