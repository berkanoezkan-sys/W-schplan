import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdministratorSettings } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export type AdministratorSettingsPatch = Partial<AdministratorSettings>;

export function useAdministratorSettings() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['administrator-settings', token],
    enabled: !!token,
    queryFn: () =>
      apiRequest<AdministratorSettings>('/auth/me/administrator-settings', { token: token! }),
  });

  const patchMutation = useMutation({
    mutationFn: (patch: AdministratorSettingsPatch) =>
      apiRequest<AdministratorSettings>('/auth/me/administrator-settings', {
        token: token!,
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['administrator-settings', token], data);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    patchSettings: patchMutation.mutateAsync,
    isSaving: patchMutation.isPending,
  };
}
