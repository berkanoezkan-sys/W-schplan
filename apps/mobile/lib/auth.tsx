import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { OnboardingStep } from '@woeschplan/shared';
import { apiRequest } from './api';

const TOKEN_KEY = 'woeschplan_token';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole?: 'PROPERTY_ADMIN' | 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | null;
  emailVerifiedAt?: string | null;
  organisationId?: string | null;
  onboardingStatus?: OnboardingStep | 'PENDING_EMAIL_VERIFICATION' | null;
  requiresEmailVerification?: boolean;
  requiresOnboarding?: boolean;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerAdmin: (input: Record<string, unknown>) => Promise<{ email: string }>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  registerWithToken: (input: {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    apartmentNumber: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthUser(raw: AuthUser): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    platformRole: raw.platformRole ?? null,
    emailVerifiedAt: raw.emailVerifiedAt ?? null,
    organisationId: raw.organisationId ?? null,
    onboardingStatus: raw.onboardingStatus ?? null,
    requiresEmailVerification: raw.requiresEmailVerification,
    requiresOnboarding: raw.requiresOnboarding,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (activeToken?: string | null) => {
    const authToken = activeToken ?? token;
    if (!authToken) return;

    const me = await apiRequest<AuthUser>('/auth/me', { token: authToken });
    setUser(mapAuthUser(me));
  }, [token]);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async (stored) => {
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiRequest<AuthUser>('/auth/me', { token: stored });
        setToken(stored);
        setUser(mapAuthUser(me));
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(mapAuthUser(result.user));
    await refreshUser(result.token);
  }, [refreshUser]);

  const registerAdmin = useCallback(async (input: Record<string, unknown>) => {
    const result = await apiRequest<{ email: string; requiresEmailVerification: boolean }>(
      '/auth/register-admin',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return { email: result.email };
  }, []);

  const verifyEmail = useCallback(async (verificationToken: string) => {
    const result = await apiRequest<{ token: string; user: AuthUser }>(
      `/auth/verify-email/${encodeURIComponent(verificationToken)}`,
    );
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(mapAuthUser(result.user));
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const registerWithToken = useCallback(
    async (input: {
      token: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      apartmentNumber: string;
    }) => {
      const result = await apiRequest<{ token: string; user: AuthUser }>('/registration/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setUser(mapAuthUser(result.user));
    },
    [],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      registerAdmin,
      verifyEmail,
      resendVerification,
      refreshUser,
      registerWithToken,
      logout,
    }),
    [
      token,
      user,
      loading,
      login,
      registerAdmin,
      verifyEmail,
      resendVerification,
      refreshUser,
      registerWithToken,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthGate() {
  const { token, user, loading } = useAuth();

  if (loading) return { status: 'loading' as const };
  if (!token) return { status: 'unauthenticated' as const };

  if (user?.platformRole === 'PROPERTY_ADMIN') {
    if (
      !user.emailVerifiedAt ||
      user.requiresEmailVerification ||
      user.onboardingStatus === 'PENDING_EMAIL_VERIFICATION'
    ) {
      return { status: 'verify-email' as const, email: user.email };
    }
    if (user.onboardingStatus && user.onboardingStatus !== 'COMPLETED') {
      return { status: 'onboarding' as const };
    }
  }

  return { status: 'authenticated' as const };
}
