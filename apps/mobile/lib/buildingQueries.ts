export const buildingQueryKeys = {
  list: (token: string | null) => ['buildings', token] as const,
  dashboard: (buildingId: string | null) => ['dashboard', buildingId] as const,
  settings: (buildingId: string | null) => ['building-settings', buildingId] as const,
};

export type PortfolioStats = {
  buildingCount: number;
  activeResidentCount: number;
};

export type BuildingsListResponse = {
  buildings: Array<Record<string, unknown>>;
  portfolio: PortfolioStats;
};
