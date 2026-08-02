import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export type OnboardingState = {
  onboardingStatus: string;
  organisation: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    website: string | null;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    administratorSettings: {
      companyContact: {
        companyName: string;
        contactPerson: string;
        phone: string;
        email: string;
        website?: string;
      };
    };
  };
  building: {
    id: string;
    name: string;
    street: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    timezone: string;
    language: string;
  } | null;
  laundryRoom: {
    id: string;
    name: string;
    floor: string | null;
    resourceCount: number;
  } | null;
  registrationConfigured: boolean;
  registrationToken?: string;
};

export function useOnboarding() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['onboarding', token],
    enabled: !!token,
    queryFn: () => apiRequest<OnboardingState>('/onboarding/state', { token: token! }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['onboarding', token] });

  const saveCompany = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<OnboardingState>('/onboarding/company-profile', {
        token: token!,
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const saveBuilding = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<OnboardingState>('/onboarding/building', {
        token: token!,
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const saveLaundry = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<OnboardingState>('/onboarding/laundry-room', {
        token: token!,
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const generateRegistration = useMutation({
    mutationFn: () =>
      apiRequest<{ token: string; shareUrl: string; appDeepLink: string }>(
        '/onboarding/registration-token',
        { token: token!, method: 'POST' },
      ),
  });

  const complete = useMutation({
    mutationFn: () =>
      apiRequest<OnboardingState>('/onboarding/complete', {
        token: token!,
        method: 'POST',
      }),
    onSuccess: invalidate,
  });

  return {
    ...query,
    saveCompany,
    saveBuilding,
    saveLaundry,
    generateRegistration,
    complete,
  };
}
