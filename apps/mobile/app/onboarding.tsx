import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useNavigation } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useQueryClient } from '@tanstack/react-query';
import { buildRegistrationPaths } from '@woeschplan/shared';
import { useAuthGate, useAuth } from '@/lib/auth';
import { invalidateBuildingQueries } from '@/lib/invalidateBuildingQueries';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import {
  Button,
  LoadingState,
  OptionPicker,
  SectionLabel,
  TextField,
} from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

type Step = 'company' | 'building' | 'laundry' | 'invitation';

const STEP_ORDER: Step[] = ['company', 'building', 'laundry', 'invitation'];

function statusToStep(status: string | undefined): Step {
  switch (status) {
    case 'FIRST_BUILDING':
      return 'building';
    case 'LAUNDRY_SETUP':
      return 'laundry';
    case 'RESIDENT_INVITATION':
    case 'COMPLETED':
      return 'invitation';
    default:
      return 'company';
  }
}

export default function OnboardingScreen() {
  const gate = useAuthGate();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const {
    data,
    isLoading,
    saveCompany,
    saveBuilding,
    saveLaundry,
    generateRegistration,
    complete,
  } = useOnboarding();

  const [step, setStep] = useState<Step>('company');
  const [error, setError] = useState<string | null>(null);
  const [registrationUrls, setRegistrationUrls] = useState<{
    shareUrl: string;
    appDeepLink: string;
    token: string;
  } | null>(null);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);
  const dirtyRef = useRef(false);

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  const [buildingName, setBuildingName] = useState('');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('CH');
  const [timezone, setTimezone] = useState('Europe/Zurich');
  const [language, setLanguage] = useState<'de' | 'en' | 'fr' | 'it'>('de');

  const [roomName, setRoomName] = useState('Waschküche');
  const [floor, setFloor] = useState('');
  const [washers, setWashers] = useState('2');
  const [dryers, setDryers] = useState('1');
  const [dryingRooms, setDryingRooms] = useState('0');

  useEffect(() => {
    if (!data) return;
    setStep(statusToStep(data.onboardingStatus));
    setCompanyName(data.organisation.name);
    setContactPerson(data.user.administratorSettings.companyContact.contactPerson);
    setPhone(data.user.phone ?? data.organisation.phone ?? '');
    setEmail(data.organisation.email);
    setWebsite(data.organisation.website ?? '');

    if (data.building) {
      setBuildingName(data.building.name);
      setStreet(data.building.street ?? '');
      setPostalCode(data.building.postalCode ?? '');
      setCity(data.building.city ?? '');
      setCountry(data.building.country ?? 'CH');
      setTimezone(data.building.timezone);
      setLanguage(data.building.language as 'de' | 'en' | 'fr' | 'it');
    }

    if (data.laundryRoom) {
      setRoomName(data.laundryRoom.name);
      setFloor(data.laundryRoom.floor ?? '');
    }
  }, [data]);

  useEffect(() => {
    if (step !== 'invitation' || registrationUrls) return;
    generateRegistration.mutateAsync().then(setRegistrationUrls).catch(() => undefined);
  }, [step, registrationUrls, generateRegistration]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      Alert.alert(t('auth.onboarding.unsavedWarning'), undefined, [
        { text: t('auth.onboarding.unsavedStay'), style: 'cancel' },
        {
          text: t('auth.onboarding.unsavedLeave'),
          style: 'destructive',
          onPress: () => {
            dirtyRef.current = false;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const stepLabel = useMemo(() => {
    switch (step) {
      case 'company':
        return t('auth.onboarding.step.company');
      case 'building':
        return t('auth.onboarding.step.building');
      case 'laundry':
        return t('auth.onboarding.step.laundry');
      default:
        return t('auth.onboarding.step.invitation');
    }
  }, [step]);

  if (gate.status === 'loading' || isLoading) return <LoadingState />;
  if (gate.status === 'unauthenticated') return <Redirect href="/" />;
  if (gate.status === 'verify-email') return <Redirect href="/verify-email" />;
  if (gate.status === 'authenticated') return <Redirect href="/(main)/dashboard" />;

  async function handleNext() {
    setError(null);
    dirtyRef.current = false;
    try {
      if (step === 'company') {
        await saveCompany.mutateAsync({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim() || undefined,
        });
        setStep('building');
        return;
      }

      if (step === 'building') {
        await saveBuilding.mutateAsync({
          name: buildingName.trim(),
          street: street.trim(),
          postalCode: postalCode.trim(),
          city: city.trim(),
          country,
          timezone,
          language,
        });
        invalidateBuildingQueries(queryClient, token);
        setStep('laundry');
        return;
      }

      if (step === 'laundry') {
        await saveLaundry.mutateAsync({
          name: roomName.trim(),
          floor: floor.trim() || undefined,
          washingMachines: Number(washers),
          tumbleDryers: Number(dryers),
          dryingRooms: Number(dryingRooms),
        });
        invalidateBuildingQueries(queryClient, token);
        const registration = await generateRegistration.mutateAsync();
        setRegistrationUrls(registration);
        setStep('invitation');
        return;
      }

      await complete.mutateAsync();
      invalidateBuildingQueries(queryClient, token);
      router.replace('/(main)/dashboard');
    } catch {
      setError(t('common.error'));
    }
  }

  async function handleCopyLink() {
    if (!registrationUrls?.shareUrl) return;
    await Clipboard.setStringAsync(registrationUrls.shareUrl);
    Alert.alert(t('auth.onboarding.invitation.copied'));
  }

  async function handleShareLink() {
    if (!registrationUrls?.shareUrl) return;
    await Share.share({
      message: registrationUrls.shareUrl,
      url: registrationUrls.shareUrl,
    });
  }

  const saving =
    saveCompany.isPending ||
    saveBuilding.isPending ||
    saveLaundry.isPending ||
    generateRegistration.isPending ||
    complete.isPending;

  const shareUrl =
    registrationUrls?.shareUrl ??
    (registrationUrls?.token
      ? `${(process.env.EXPO_PUBLIC_REGISTRATION_BASE_URL ?? 'https://woeschplan.ch').replace(/\/$/, '')}${buildRegistrationPaths(registrationUrls.token).webPath}`
      : null);

  return (
    <AuthScreenLayout title={t('auth.onboarding.title')} subtitle={stepLabel} showBack={stepIndex > 0} onBack={() => setStep(STEP_ORDER[Math.max(0, stepIndex - 1)])}>
      <View style={styles.progressRow}>
        {STEP_ORDER.map((item, index) => (
          <View
            key={item}
            style={[styles.progressDot, index <= stepIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      {step === 'company' ? (
        <>
          <TextField label={t('auth.registerAdmin.companyName')} value={companyName} onChangeText={(v) => { dirtyRef.current = true; setCompanyName(v); }} />
          <TextField label={t('auth.onboarding.company.contactPerson')} value={contactPerson} onChangeText={(v) => { dirtyRef.current = true; setContactPerson(v); }} />
          <TextField label={t('auth.registerAdmin.phone')} keyboardType="phone-pad" value={phone} onChangeText={(v) => { dirtyRef.current = true; setPhone(v); }} />
          <TextField label={t('auth.registerAdmin.email')} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(v) => { dirtyRef.current = true; setEmail(v); }} />
          <TextField label={t('auth.registerAdmin.website')} keyboardType="url" autoCapitalize="none" value={website} onChangeText={(v) => { dirtyRef.current = true; setWebsite(v); }} />
        </>
      ) : null}

      {step === 'building' ? (
        <>
          <TextField label={t('auth.onboarding.building.name')} value={buildingName} onChangeText={(v) => { dirtyRef.current = true; setBuildingName(v); }} />
          <TextField label={t('auth.onboarding.building.street')} value={street} onChangeText={(v) => { dirtyRef.current = true; setStreet(v); }} />
          <TextField label={t('auth.onboarding.building.postalCode')} keyboardType="number-pad" value={postalCode} onChangeText={(v) => { dirtyRef.current = true; setPostalCode(v); }} />
          <TextField label={t('auth.onboarding.building.city')} value={city} onChangeText={(v) => { dirtyRef.current = true; setCity(v); }} />
          <TextField label={t('auth.onboarding.building.country')} value={country} onChangeText={(v) => { dirtyRef.current = true; setCountry(v); }} />
          <TextField label={t('auth.onboarding.building.timezone')} value={timezone} onChangeText={(v) => { dirtyRef.current = true; setTimezone(v); }} />
          <SectionLabel>{t('auth.onboarding.building.language')}</SectionLabel>
          <OptionPicker
            options={[
              { label: 'Deutsch', value: 'de' },
              { label: 'English', value: 'en' },
              { label: 'Français', value: 'fr' },
              { label: 'Italiano', value: 'it' },
            ]}
            value={language}
            onChange={(value) => { dirtyRef.current = true; setLanguage(value); }}
          />
        </>
      ) : null}

      {step === 'laundry' ? (
        <>
          <TextField label={t('auth.onboarding.laundry.name')} value={roomName} onChangeText={(v) => { dirtyRef.current = true; setRoomName(v); }} />
          <TextField label={t('auth.onboarding.laundry.floor')} value={floor} onChangeText={(v) => { dirtyRef.current = true; setFloor(v); }} />
          <TextField label={t('auth.onboarding.laundry.washers')} keyboardType="number-pad" value={washers} onChangeText={(v) => { dirtyRef.current = true; setWashers(v); }} />
          <TextField label={t('auth.onboarding.laundry.dryers')} keyboardType="number-pad" value={dryers} onChangeText={(v) => { dirtyRef.current = true; setDryers(v); }} />
          <TextField label={t('auth.onboarding.laundry.dryingRooms')} keyboardType="number-pad" value={dryingRooms} onChangeText={(v) => { dirtyRef.current = true; setDryingRooms(v); }} />
        </>
      ) : null}

      {step === 'invitation' ? (
        <>
          <Text style={styles.inviteTitle}>{t('auth.onboarding.invitation.title')}</Text>
          <Text style={styles.inviteSubtitle}>{t('auth.onboarding.invitation.subtitle')}</Text>
          {shareUrl ? (
            <View style={styles.qrWrap}>
              <QRCode value={shareUrl} size={180} getRef={(ref) => { qrRef.current = ref; }} />
              <Text style={styles.linkText} selectable>
                {shareUrl}
              </Text>
            </View>
          ) : null}
          <Button label={t('auth.onboarding.invitation.copy')} onPress={handleCopyLink} variant="secondary" />
          <Button label={t('auth.onboarding.invitation.share')} onPress={handleShareLink} variant="secondary" />
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={step === 'invitation' ? t('auth.onboarding.finish') : t('auth.onboarding.next')}
        onPress={handleNext}
        loading={saving}
        variant="accent"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  inviteTitle: { ...typography.heading, textAlign: 'center' },
  inviteSubtitle: { ...typography.caption, textAlign: 'center', color: colors.textMuted },
  qrWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  linkText: { ...typography.caption, textAlign: 'center' },
  error: { color: colors.danger },
});
