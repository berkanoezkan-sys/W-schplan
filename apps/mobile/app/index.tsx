import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, LoadingState, Logo, Screen, TextField } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function LoginScreen() {
  const { token, loading, login } = useAuth();
  const [email, setEmail] = useState('resident@woeschplan.local');
  const [password, setPassword] = useState('resident12345');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState />;
  if (token) return <Redirect href="/(main)/dashboard" />;

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.hero}>
          <Logo />
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label={t('login.email')}
            accessibilityLabel={t('login.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label={t('login.password')}
            accessibilityLabel={t('login.password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('login.submit')} onPress={handleLogin} loading={submitting} variant="accent" />
          <Text style={styles.demo}>{t('login.demo')}</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  hero: { marginBottom: spacing.xxl, alignItems: 'center', gap: spacing.md },
  tagline: { ...typography.caption, textAlign: 'center' },
  form: { gap: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.sm },
  demo: { ...typography.caption, textAlign: 'center', marginTop: spacing.md },
});
