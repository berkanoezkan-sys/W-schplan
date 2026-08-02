import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getRegistrationToken, saveRegistrationToken } from '@/lib/registrationStorage';

export type BuildingRegistrationAdmin = {
  buildingId: string;
  selfRegistrationEnabled: boolean;
  totalRegistrations: number;
  lastRegeneratedAt: string | null;
  createdAt: string;
  shareUrlPattern: string;
  appDeepLinkPattern: string;
  recentRegistrations: Array<{
    id: string;
    registeredAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      apartmentNumber: string | null;
      createdAt: string;
    };
  }>;
};

export function useBuildingRegistration(buildingId: string | null) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['building-registration', buildingId],
    enabled: !!token && !!buildingId,
    queryFn: async () => {
      const data = await apiRequest<BuildingRegistrationAdmin>(
        `/buildings/${buildingId}/registration`,
        { token: token! },
      );
      const storedToken = buildingId ? await getRegistrationToken(buildingId) : null;
      return { ...data, storedToken };
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest<{
        token: string;
        shareUrl: string;
        appDeepLink: string;
        lastRegeneratedAt: string;
      }>(`/buildings/${buildingId}/registration/regenerate`, {
        token: token!,
        method: 'POST',
      });
      if (buildingId) await saveRegistrationToken(buildingId, result.token);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-registration', buildingId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (selfRegistrationEnabled: boolean) =>
      apiRequest<{ selfRegistrationEnabled: boolean }>(
        `/buildings/${buildingId}/registration`,
        {
          token: token!,
          method: 'PATCH',
          body: JSON.stringify({ selfRegistrationEnabled }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-registration', buildingId] });
    },
  });

  return {
    ...query,
    regenerate: regenerateMutation.mutateAsync,
    isRegenerating: regenerateMutation.isPending,
    regenerated: regenerateMutation.data,
    toggleSelfRegistration: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
  };
}
