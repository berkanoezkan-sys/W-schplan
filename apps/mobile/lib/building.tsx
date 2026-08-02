import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CreateBuildingInput, ResourceType } from '@woeschplan/shared';
import { saveRegistrationToken, clearRegistrationToken } from '@/lib/registrationStorage';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  buildingQueryKeys,
  type BuildingsListResponse,
  type PortfolioStats,
} from '@/lib/buildingQueries';
import { resolveSelectedBuildingId } from '@/lib/buildingSelection';
import { invalidateBuildingQueries } from '@/lib/invalidateBuildingQueries';

const SELECTED_BUILDING_KEY = 'woeschplan_selected_building';

const EMPTY_PORTFOLIO: PortfolioStats = { buildingCount: 0, activeResidentCount: 0 };

export type Resource = {
  id: string;
  name: string;
  resourceType: ResourceType;
  status: string;
  model?: string | null;
  estimatedDefaultRuntime?: number;
  qrCodeIdentifier?: string;
  isActive?: boolean;
};

export type LaundryRoom = {
  id: string;
  name: string;
  floor?: string | null;
  instructions?: string | null;
  isActive?: boolean;
  resources: Resource[];
};

export type Building = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  language: string;
  role: 'RESIDENT' | 'ADMINISTRATOR';
  laundryRooms: LaundryRoom[];
  registration?: {
    token: string;
    shareUrl: string;
    appDeepLink: string;
  };
};

type BuildingContextValue = {
  buildings: Building[];
  portfolio: PortfolioStats;
  building: Building | null;
  buildingId: string | null;
  isAdmin: boolean;
  isPropertyManager: boolean;
  loading: boolean;
  refetch: () => Promise<unknown>;
  selectBuilding: (buildingId: string) => Promise<void>;
  createBuilding: (input: CreateBuildingInput) => Promise<Building>;
  duplicateBuilding: (sourceBuildingId: string, input: CreateBuildingInput) => Promise<Building>;
  deleteBuilding: (buildingId: string) => Promise<void>;
  isSelectingBuilding: boolean;
  isCreatingBuilding: boolean;
  isDeletingBuilding: boolean;
};

const BuildingContext = createContext<BuildingContextValue | null>(null);

export function BuildingProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: buildingQueryKeys.list(token),
    enabled: !!token,
    queryFn: () => apiRequest<BuildingsListResponse>('/buildings', { token: token! }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_BUILDING_KEY).then((stored) => {
      if (stored) setSelectedBuildingId(stored);
      setHydrated(true);
    });
  }, []);

  const buildings = data?.buildings ?? [];
  const portfolio = data?.portfolio ?? EMPTY_PORTFOLIO;

  const syncSelectedBuilding = useCallback(
    async (buildingsList: Building[], preferredId?: string | null) => {
      const resolvedId = resolveSelectedBuildingId(
        buildingsList,
        preferredId ?? selectedBuildingId,
      );
      if (!resolvedId) {
        setSelectedBuildingId(null);
        await AsyncStorage.removeItem(SELECTED_BUILDING_KEY);
        return null;
      }
      if (resolvedId !== selectedBuildingId) {
        setSelectedBuildingId(resolvedId);
        await AsyncStorage.setItem(SELECTED_BUILDING_KEY, resolvedId);
      }
      return resolvedId;
    },
    [selectedBuildingId],
  );

  useEffect(() => {
    if (!hydrated) return;
    void syncSelectedBuilding(buildings, selectedBuildingId);
  }, [hydrated, buildings, selectedBuildingId, syncSelectedBuilding]);

  const refreshBuildings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: buildingQueryKeys.list(token) });
    return refetch();
  }, [queryClient, token, refetch]);

  const selectMutation = useMutation({
    mutationFn: async (buildingId: string) => {
      await AsyncStorage.setItem(SELECTED_BUILDING_KEY, buildingId);
      try {
        await apiRequest('/auth/me/preferred-building', {
          token: token!,
          method: 'PATCH',
          body: JSON.stringify({ buildingId }),
        });
      } catch {
        // Non-admin users may not persist server-side; local selection still works.
      }
      return buildingId;
    },
    onSuccess: (buildingId) => {
      setSelectedBuildingId(buildingId);
      invalidateBuildingQueries(queryClient, token, buildingId);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ sourceBuildingId, input }: { sourceBuildingId: string; input: CreateBuildingInput }) =>
      apiRequest<Building>(`/buildings/${sourceBuildingId}/duplicate`, {
        token: token!,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async (created) => {
      if (created.registration?.token) {
        await saveRegistrationToken(created.id, created.registration.token);
      }
      const result = await refreshBuildings();
      const latestBuildings = (result.data?.buildings ?? []) as Building[];
      await syncSelectedBuilding(latestBuildings, created.id);
      invalidateBuildingQueries(queryClient, token, created.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (buildingId: string) =>
      apiRequest<{ ok: true }>(`/buildings/${buildingId}`, {
        token: token!,
        method: 'DELETE',
      }),
    onSuccess: async (_, deletedBuildingId) => {
      await clearRegistrationToken(deletedBuildingId);
      const result = await refreshBuildings();
      const latestBuildings = (result.data?.buildings ?? []) as Building[];
      await syncSelectedBuilding(latestBuildings);
      invalidateBuildingQueries(queryClient, token);
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateBuildingInput) =>
      apiRequest<Building>('/buildings', {
        token: token!,
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async (created) => {
      if (created.registration?.token) {
        await saveRegistrationToken(created.id, created.registration.token);
      }
      const result = await refreshBuildings();
      const latestBuildings = (result.data?.buildings ?? []) as Building[];
      await syncSelectedBuilding(latestBuildings, created.id);
      invalidateBuildingQueries(queryClient, token, created.id);
    },
  });

  const building = useMemo(() => {
    if (!buildings.length) return null;
    const resolvedId = resolveSelectedBuildingId(buildings, selectedBuildingId);
    if (!resolvedId) return null;
    return buildings.find((item) => item.id === resolvedId) ?? null;
  }, [buildings, selectedBuildingId]);

  const isPropertyManager =
    user?.platformRole === 'PROPERTY_ADMIN' ||
    buildings.some((item) => item.role === 'ADMINISTRATOR') ||
    buildings.length === 0;

  const selectBuilding = useCallback(
    async (buildingId: string) => {
      await selectMutation.mutateAsync(buildingId);
    },
    [selectMutation],
  );

  const createBuilding = useCallback(
    async (input: CreateBuildingInput) => {
      const created = await createMutation.mutateAsync(input);
      await selectBuilding(created.id);
      return created;
    },
    [createMutation, selectBuilding],
  );

  const duplicateBuilding = useCallback(
    async (sourceBuildingId: string, input: CreateBuildingInput) => {
      const created = await duplicateMutation.mutateAsync({ sourceBuildingId, input });
      await selectBuilding(created.id);
      return created;
    },
    [duplicateMutation, selectBuilding],
  );

  const deleteBuilding = useCallback(
    async (buildingId: string) => {
      await deleteMutation.mutateAsync(buildingId);
    },
    [deleteMutation],
  );

  const value = useMemo(
    () => ({
      buildings,
      portfolio,
      building,
      buildingId: building?.id ?? null,
      isAdmin: building?.role === 'ADMINISTRATOR',
      isPropertyManager,
      loading: (!data && isLoading) || !hydrated,
      refetch: refreshBuildings,
      selectBuilding,
      createBuilding,
      duplicateBuilding,
      deleteBuilding,
      isSelectingBuilding: selectMutation.isPending,
      isCreatingBuilding: createMutation.isPending || duplicateMutation.isPending,
      isDeletingBuilding: deleteMutation.isPending,
    }),
    [
      buildings,
      portfolio,
      building,
      isPropertyManager,
      isLoading,
      hydrated,
      refreshBuildings,
      selectBuilding,
      createBuilding,
      duplicateBuilding,
      deleteBuilding,
      selectMutation.isPending,
      createMutation.isPending,
      duplicateMutation.isPending,
      deleteMutation.isPending,
    ],
  );

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
}

export function useBuilding() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuilding must be used within BuildingProvider');
  return ctx;
}

export function getAllResources(building: Building | null): Resource[] {
  return building?.laundryRooms.flatMap((room) => room.resources) ?? [];
}

export function formatResourceTypeLabel(type: ResourceType): string {
  switch (type) {
    case 'TUMBLE_DRYER':
      return 'resource.type.dryer';
    case 'DRYING_ROOM':
      return 'resource.type.dryingRoom';
    default:
      return 'resource.type.washer';
  }
}

export function resourceTypeIcon(type: ResourceType): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  switch (type) {
    case 'TUMBLE_DRYER':
      return 'flame-outline';
    case 'DRYING_ROOM':
      return 'sunny-outline';
    default:
      return 'shirt-outline';
  }
}
