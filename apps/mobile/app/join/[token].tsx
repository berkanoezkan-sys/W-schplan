import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildRegistrationPaths } from '@woeschplan/shared';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, LoadingState, Screen, TextField } from '@/components/ui';
import { HeaderLogo } from '@/components/HeaderLogo';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type ValidateResult =
  | { valid: true; building: { id: string; name: string; address: string; language: string } }
  | { valid: false; reason: string };

export default function JoinScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token: string }>();
  const token = typeof rawToken === 'string' ? decodeURIComponent(rawToken) : '';
  const { token: authToken, loading: authLoading, registerWithToken } = useAuth();

  const [validating, setValidating] = useState(true);
  const [building, setBuilding] = useState<{
    id: string;
    name: string;
    address: string;
    language: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValidationError('INVALID');
      return;
    }

    apiRequest<ValidateResult>(`/registration/validate/${encodeURIComponent(token)}`)
      .then((result) => {
        if (result.valid) {
          setBuilding(result.building);
        } else {
          setValidationError(result.reason);
        }
      })
      .catch(() => setValidationError('INVALID'))
      .finally(() => setValidating(false));
  }, [token]);

  if (authLoading) return <LoadingState />;
  if (authToken) return <Redirect href="/(main)/(tabs)/dashboard" />;

  async function handleRegister() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await registerWithToken({
        token,
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        apartmentNumber: apartmentNumber.trim(),
      });
      // Auth state update triggers Redirect below — avoid double navigation flicker.
    } catch (err) {
      if (err instanceof ApiError) {
        const code = err.message;
        if (code === 'INVALID_TOKEN' || code === 'REGISTRATION_DISABLED') {
          setSubmitError(t('registration.error.invalidToken'));
        } else if (code === 'ALREADY_REGISTERED') {
          setSubmitError(t('registration.error.alreadyRegistered'));
        } else if (code === 'OTHER_BUILDING') {
          setSubmitError(t('registration.error.otherBuilding'));
        } else if (code === 'ADMIN_ACCOUNT') {
          setSubmitError(t('registration.error.adminAccount'));
        } else if (err.status === 0) {
          setSubmitError(t('login.networkError'));
        } else {
          setSubmitError(t('common.error'));
        }
      } else {
        setSubmitError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const paths = token ? buildRegistrationPaths(token) : null;

  return (
    <Screen>
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <HeaderLogo />
          </View>
        </SafeAreaView>

        {validating ? (
          <LoadingState />
        ) : validationError || !building ? (
        <View style={styles.centered}>
          <Text style={styles.title}>{t('registration.invalidTitle')}</Text>
          <Text style={styles.subtitle}>
            {validationError === 'DISABLED'
              ? t('registration.error.disabled')
              : t('registration.error.invalidToken')}
          </Text>
          <Button label={t('registration.backToLogin')} onPress={() => router.replace('/')} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t('registration.title')}</Text>
            <View style={styles.buildingCard}>
              <Text style={styles.buildingName}>{building.name}</Text>
              <Text style={styles.buildingAddress}>{building.address}</Text>
            </View>
            <Text style={styles.intro}>{t('registration.intro')}</Text>

            <TextField
              label={t('registration.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextField
              label={t('registration.lastName')}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <TextField
              label={t('registration.apartment')}
              value={apartmentNumber}
              onChangeText={setApartmentNumber}
              placeholder={t('registration.apartmentPlaceholder')}
            />
            <TextField
              label={t('login.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label={t('login.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

            <Button
              label={t('registration.submit')}
              onPress={handleRegister}
              loading={submitting}
              variant="accent"
            />

            {paths ? (
              <Text style={styles.hint}>{t('registration.buildingDetected')}</Text>
            ) : null}

            <Button
              label={t('registration.haveAccount')}
              onPress={() => router.replace('/')}
              variant="secondary"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { backgroundColor: colors.background },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    height: 44,
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  buildingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  buildingName: { ...typography.body, fontWeight: '600' },
  buildingAddress: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
