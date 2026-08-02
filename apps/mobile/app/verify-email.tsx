import { useState } from 'react';
import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';
import { ApiError } from '@/lib/api';
import { useAuth, useAuthGate } from '@/lib/auth';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { Button, LoadingState } from '@/components/ui';
import { colors, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function VerifyEmailScreen() {
  const gate = useAuthGate();
  const { resendVerification } = useAuth();
  const { email: rawEmail } = useLocalSearchParams<{ email?: string }>();
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const [submitting, setSubmitting] = useState(false);

  if (gate.status === 'loading') return <LoadingState />;
  if (gate.status === 'onboarding') return <Redirect href="/onboarding" />;
  if (gate.status === 'authenticated') return <Redirect href="/(main)/dashboard" />;

  async function handleResend() {
    if (!email) return;
    setSubmitting(true);
    try {
      await resendVerification(email);
      Alert.alert(t('auth.verifyEmail.sent'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        Alert.alert(t('login.networkError'));
      } else {
        Alert.alert(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      title={t('auth.verifyEmail.title')}
      subtitle={`${t('auth.verifyEmail.subtitle')}\n\n${email}\n\n${t('auth.verifyEmail.checkInbox')}`}
      showBack
      onBack={() => router.replace('/')}
    >
      <Button
        label={t('auth.verifyEmail.resend')}
        onPress={handleResend}
        loading={submitting}
        variant="secondary"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
