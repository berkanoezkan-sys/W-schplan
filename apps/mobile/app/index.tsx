import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { ApiError } from '@/lib/api';
import { useAuth, useAuthGate } from '@/lib/auth';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { Button, LoadingState, TextField } from '@/components/ui';
import { colors, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';
import { useTranslation } from '@/lib/locale';

export default function LoginScreen() {
  const { t } = useTranslation();
  const gate = useAuthGate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (gate.status === 'loading') return <LoadingState />;
  if (gate.status === 'verify-email') return <Redirect href={{ pathname: '/verify-email', params: { email: gate.email } }} />;
  if (gate.status === 'onboarding') return <Redirect href="/onboarding" />;
  if (gate.status === 'authenticated') return <Redirect href="/(main)/dashboard" />;

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) setError(t('login.networkError'));
        else if (err.status === 401) setError(t('login.invalidCredentials'));
        else if (err.status === 403 && err.message === 'EMAIL_NOT_VERIFIED') {
          router.push({ pathname: '/verify-email', params: { email: email.trim() } });
          return;
        } else setError(err.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      title={t('login.welcome')}
      subtitle={t('app.tagline')}
      footer={
        <Text style={styles.registerPrompt}>
          {t('login.registerPrompt')}{' '}
          <Text style={styles.registerLink} onPress={() => router.push('/register-admin')}>
            {t('login.registerLink')}
          </Text>
        </Text>
      }
    >
      <TextField
        label={t('login.email')}
        accessibilityLabel={t('login.email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label={t('login.password')}
        accessibilityLabel={t('login.password')}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => Linking.openURL('mailto:support@woeschplan.ch?subject=Password%20reset')}
        style={styles.forgotWrap}
      >
        <Text style={styles.forgot}>{t('login.forgotPassword')}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('login.submit')} onPress={handleLogin} loading={submitting} variant="accent" />
      <Text style={styles.demo}>{t('login.demo')}</Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  forgotWrap: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center' },
  forgot: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger },
  demo: { ...typography.caption, textAlign: 'center', marginTop: 8 },
  registerPrompt: { ...typography.body, textAlign: 'center', color: colors.textMuted },
  registerLink: { color: colors.primary, fontWeight: '600' },
});
