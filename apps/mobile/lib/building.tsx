import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Building = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  language: string;
  role: 'RESIDENT' | 'ADMINISTRATOR';
  laundryRooms: Array<{
    id: string;
    name: string;
    machines: Array<{ id: string; name: string; machineType: string; status: string }>;
  }>;
};

type BuildingContextValue = {
  building: Building | null;
  buildingId: string | null;
  isAdmin: boolean;
  loading: boolean;
  refetch: () => void;
};

const BuildingContext = createContext<BuildingContextValue | null>(null);

export function BuildingProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buildings', token],
    enabled: !!token,
    queryFn: () => apiRequest<Building[]>('/buildings', { token: token! }),
  });

  const building = data?.[0] ?? null;

  const value = useMemo(
    () => ({
      building,
      buildingId: building?.id ?? null,
      isAdmin: building?.role === 'ADMINISTRATOR',
      loading: isLoading,
      refetch,
    }),
    [building, isLoading, refetch],
  );

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
}

export function useBuilding() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuilding must be used within BuildingProvider');
  return ctx;
}
