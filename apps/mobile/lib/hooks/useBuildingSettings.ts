import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChecklistTemplate,
  HouseRules,
  BookingRules,
} from '@woeschplan/shared';
import { createDefaultChecklistTemplate } from '@woeschplan/shared';
import type { bookingRulesPatchSchema } from '@woeschplan/shared';
import type { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';

export type ChecklistType = 'WASHING_MACHINE' | 'TUMBLE_DRYER';

export function normalizeChecklistType(value: unknown): ChecklistType {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'TUMBLE_DRYER' ? 'TUMBLE_DRYER' : 'WASHING_MACHINE';
}

type BookingRulesPatch = z.infer<typeof bookingRulesPatchSchema>;

export type BuildingSettings = {
  buildingId: string;
  name: string;
  address: string;
  timezone: string;
  language: string;
  privacyLabelMode: string;
  houseRules: HouseRules;
  bookingRules: BookingRules;
  checklistTemplates: Array<{
    checklistType: 'WASHING_MACHINE' | 'TUMBLE_DRYER';
    items: ChecklistTemplate['items'];
    updatedAt: string;
  }>;
};

export type SettingsPatch = {
  houseRules?: Partial<HouseRules>;
  bookingRules?: BookingRulesPatch;
};

export function useBuildingSettings() {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['building-settings', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: () =>
      apiRequest<BuildingSettings>(`/buildings/${buildingId}/settings`, {
        token: token!,
      }),
  });

  const patchMutation = useMutation({
    mutationFn: async (patch: SettingsPatch) => {
      const data = await apiRequest<
        BuildingSettings & {
          quietHoursConflicts?: Array<{
            reservationId: string;
            localDate: string;
            localStart: string;
            localEnd: string;
            resourceName: string;
            residentLabel: string;
          }>;
        }
      >(`/buildings/${buildingId}/settings`, {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      const { quietHoursConflicts, ...settings } = data;
      queryClient.setQueryData(['building-settings', buildingId], settings);
      return { settings, quietHoursConflicts: quietHoursConflicts ?? [] };
    },
  });

  const saveChecklistMutation = useMutation({
    mutationFn: (template: ChecklistTemplate) =>
      apiRequest<ChecklistTemplate>(
        `/buildings/${buildingId}/checklist-templates/${template.checklistType}`,
        {
          token: token!,
          method: 'PUT',
          body: JSON.stringify(template),
        },
      ),
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(['building-settings', buildingId], (prev: BuildingSettings | undefined) => {
        if (!prev) return prev;
        const others = prev.checklistTemplates.filter(
          (t) => t.checklistType !== variables.checklistType,
        );
        return {
          ...prev,
          checklistTemplates: [
            ...others,
            {
              checklistType: variables.checklistType,
              items: saved.items,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });
      queryClient.setQueryData(
        ['checklist-template', buildingId, variables.checklistType],
        saved,
      );
    },
  });

  const fetchChecklistTemplate = useCallback(
    async (type: ChecklistType) => {
      if (!buildingId || !token) throw new Error('Building not ready');
      return apiRequest<ChecklistTemplate>(`/buildings/${buildingId}/checklist-templates/${type}`, {
        token,
      });
    },
    [buildingId, token],
  );

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    patchSettings: patchMutation.mutateAsync,
    isSaving: patchMutation.isPending,
    saveChecklistTemplate: saveChecklistMutation.mutateAsync,
    isSavingChecklist: saveChecklistMutation.isPending,
    fetchChecklistTemplate,
  };
}

export function useChecklistTemplate(type: ChecklistType) {
  const { token } = useAuth();
  const { buildingId } = useBuilding();
  const queryClient = useQueryClient();

  const cachedSettings = queryClient.getQueryData<BuildingSettings>([
    'building-settings',
    buildingId,
  ]);
  const cachedTemplate = cachedSettings?.checklistTemplates.find(
    (tpl) => tpl.checklistType === type,
  );

  return useQuery({
    queryKey: ['checklist-template', buildingId, type],
    enabled: !!token && !!buildingId,
    initialData: cachedTemplate
      ? { checklistType: type, items: cachedTemplate.items }
      : undefined,
    queryFn: async () => {
      if (!buildingId || !token) {
        return createDefaultChecklistTemplate(type);
      }
      try {
        return await apiRequest<ChecklistTemplate>(
          `/buildings/${buildingId}/checklist-templates/${type}`,
          { token },
        );
      } catch {
        return createDefaultChecklistTemplate(type);
      }
    },
    retry: 1,
    staleTime: 30_000,
  });
}
