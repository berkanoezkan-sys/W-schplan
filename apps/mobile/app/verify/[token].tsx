import { useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { LoadingState } from '@/components/ui';
import { colors } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function VerifyEmailTokenScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token: string }>();
  const token = typeof rawToken === 'string' ? decodeURIComponent(rawToken) : '';
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('auth.verifyEmail.invalid'));
      return;
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        if (err instanceof ApiError) {
          if (err.status === 410) setErrorMessage(t('auth.verifyEmail.expired'));
          else setErrorMessage(t('auth.verifyEmail.invalid'));
        } else {
          setErrorMessage(t('common.error'));
        }
      });
  }, [token, verifyEmail]);

  if (status === 'loading') return <LoadingState />;
  if (status === 'success') return <Redirect href="/onboarding" />;

  return (
    <AuthScreenLayout
      title={t('auth.verifyEmail.title')}
      subtitle={errorMessage ?? t('auth.verifyEmail.invalid')}
      showBack
      onBack={() => router.replace('/verify-email')}
    >
      <Text style={styles.error}>{errorMessage}</Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: 'center' },
});
