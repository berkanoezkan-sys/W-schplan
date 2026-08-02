import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { LEGAL_URLS } from '@woeschplan/shared';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { Button, ConsentCheckbox, PasswordField, TextField } from '@/components/ui';
import { colors, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function RegisterAdminScreen() {
  const { registerAdmin } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      companyName.trim().length >= 2 &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      email.trim().length > 0 &&
      phone.trim().length >= 6 &&
      password.length >= 8 &&
      confirmPassword.length >= 8 &&
      acceptTerms &&
      acceptPrivacy
    );
  }, [
    companyName,
    firstName,
    lastName,
    email,
    phone,
    password,
    confirmPassword,
    acceptTerms,
    acceptPrivacy,
  ]);

  async function handleSubmit() {
    if (password !== confirmPassword) {
      setError(t('auth.registerAdmin.error.passwordMismatch'));
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setError(t('auth.registerAdmin.error.consent'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await registerAdmin({
        companyName: companyName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim() || undefined,
        password,
        confirmPassword,
        acceptTerms: true,
        acceptPrivacy: true,
      });
      router.replace({ pathname: '/verify-email', params: { email: result.email } });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError(t('auth.registerAdmin.error.emailExists'));
        else if (err.status === 400) setError(t('auth.registerAdmin.error.weakPassword'));
        else if (err.status === 0) setError(t('login.networkError'));
        else setError(err.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      title={t('auth.registerAdmin.title')}
      subtitle={t('auth.registerAdmin.subtitle')}
      showBack
      footer={
        <Text style={styles.footer}>
          {t('auth.registerAdmin.haveAccount')}{' '}
          <Text style={styles.link} onPress={() => router.replace('/')}>
            {t('auth.registerAdmin.signIn')}
          </Text>
        </Text>
      }
    >
      <TextField label={t('auth.registerAdmin.companyName')} value={companyName} onChangeText={setCompanyName} />
      <TextField label={t('auth.registerAdmin.firstName')} value={firstName} onChangeText={setFirstName} />
      <TextField label={t('auth.registerAdmin.lastName')} value={lastName} onChangeText={setLastName} />
      <TextField
        label={t('auth.registerAdmin.email')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label={t('auth.registerAdmin.phone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
      />
      <TextField
        label={t('auth.registerAdmin.website')}
        autoCapitalize="none"
        keyboardType="url"
        autoComplete="url"
        value={website}
        onChangeText={setWebsite}
      />
      <PasswordField label={t('auth.registerAdmin.password')} value={password} onChangeText={setPassword} />
      <PasswordField
        label={t('auth.registerAdmin.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <ConsentCheckbox
        checked={acceptTerms}
        onChange={setAcceptTerms}
        label={t('auth.registerAdmin.acceptTerms')}
        linkLabel={t('auth.registerAdmin.termsLink')}
        onLinkPress={() => Linking.openURL(LEGAL_URLS.termsOfService)}
      />
      <ConsentCheckbox
        checked={acceptPrivacy}
        onChange={setAcceptPrivacy}
        label={t('auth.registerAdmin.acceptPrivacy')}
        linkLabel={t('auth.registerAdmin.privacyLink')}
        onLinkPress={() => Linking.openURL(LEGAL_URLS.privacyPolicy)}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t('auth.registerAdmin.submit')}
        onPress={handleSubmit}
        loading={submitting}
        disabled={!canSubmit}
        variant="accent"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger },
  footer: { ...typography.body, textAlign: 'center', color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
});
