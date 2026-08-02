import { buildingQueryKeys, type PortfolioStats } from './buildingQueries';
import type { QueryClient } from '@tanstack/react-query';

export function invalidateBuildingQueries(
  queryClient: QueryClient,
  token: string | null,
  buildingId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: buildingQueryKeys.list(token) });

  if (buildingId) {
    void queryClient.invalidateQueries({ queryKey: buildingQueryKeys.dashboard(buildingId) });
    void queryClient.invalidateQueries({ queryKey: buildingQueryKeys.settings(buildingId) });
  } else {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['building-settings'] });
  }

  void queryClient.invalidateQueries({ queryKey: ['checklist-template'] });
  void queryClient.invalidateQueries({ queryKey: ['laundry-rooms'] });
}

export function applyBuildingsListUpdate(
  queryClient: QueryClient,
  token: string | null,
  buildings: unknown[],
  portfolio: PortfolioStats,
) {
  queryClient.setQueryData(buildingQueryKeys.list(token), { buildings, portfolio });
}
