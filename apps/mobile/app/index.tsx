import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { TextInput, View, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, LoadingState, Screen, Title } from '@/components/ui';
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
          <Title>{t('app.name')}</Title>
          <Text style={typography.caption}>{t('app.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={typography.label}>{t('login.email')}</Text>
          <TextInput
            accessibilityLabel={t('login.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <Text style={typography.label}>{t('login.password')}</Text>
          <TextInput
            accessibilityLabel={t('login.password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t('login.submit')} onPress={handleLogin} loading={submitting} />
          <Text style={styles.demo}>{t('login.demo')}</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  hero: { marginBottom: spacing.xl, gap: spacing.sm },
  form: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 48,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  demo: { ...typography.caption, textAlign: 'center', marginTop: spacing.md },
});
