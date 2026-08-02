import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import { buildRegistrationPaths } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useBuildingRegistration } from '@/lib/hooks/useBuildingRegistration';
import { saveRegistrationToken } from '@/lib/registrationStorage';
import {
  Body,
  Button,
  Caption,
  Card,
  LoadingState,
  PageShell,
  SectionLabel,
} from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingRegistrationScreen() {
  const { building, buildingId, isAdmin } = useBuilding();
  const {
    data,
    isLoading,
    regenerate,
    isRegenerating,
    regenerated,
    toggleSelfRegistration,
    isToggling,
  } = useBuildingRegistration(buildingId);

  const [plainToken, setPlainToken] = useState<string | null>(null);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  useEffect(() => {
    if (regenerated?.token) {
      setPlainToken(regenerated.token);
    } else if (data?.storedToken) {
      setPlainToken(data.storedToken);
    }
  }, [data?.storedToken, regenerated?.token]);

  const urls = useMemo(() => {
    if (!plainToken) return null;
    const paths = buildRegistrationPaths(plainToken);
    const baseUrl = process.env.EXPO_PUBLIC_REGISTRATION_BASE_URL ?? 'https://woeschplan.ch';
    return {
      appDeepLink: paths.appDeepLink,
      shareUrl: `${baseUrl.replace(/\/$/, '')}${paths.webPath}`,
    };
  }, [plainToken]);

  if (isLoading || !buildingId) return <LoadingState />;
  if (!isAdmin) {
    return (
      <PageShell>
        <Caption>{t('settings.building.readOnlyHint')}</Caption>
      </PageShell>
    );
  }

  async function handleCopyLink() {
    if (!urls?.shareUrl) return;
    await Clipboard.setStringAsync(urls.shareUrl);
    Alert.alert(t('registration.copied'));
  }

  async function handleShare() {
    if (!urls) return;
    await Share.share({
      message: t('registration.shareMessage')
        .replace('{building}', building?.name ?? '')
        .replace('{url}', urls.shareUrl),
      url: urls.shareUrl,
    });
  }

  async function handlePrint() {
    if (!urls || !building) return;
    const qrDataUrl = await new Promise<string>((resolve) => {
      qrRef.current?.toDataURL((data) => resolve(`data:image/png;base64,${data}`));
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${building.name} – Wöschplan</title>
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 22px; margin-bottom: 8px; }
            p { color: #666; margin: 4px 0 24px; }
            img { width: 240px; height: 240px; }
            .url { font-size: 12px; word-break: break-all; margin-top: 24px; color: #333; }
          </style>
        </head>
        <body>
          <h1>${building.name}</h1>
          <p>${building.address}</p>
          <img src="${qrDataUrl}" alt="QR Code" />
          <p class="url">${urls.shareUrl}</p>
        </body>
      </html>
    `;

    await Print.printAsync({ html });
  }

  async function handleRegenerate() {
    Alert.alert(t('registration.regenerateTitle'), t('registration.regenerateMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('registration.regenerateConfirm'),
        style: 'destructive',
        onPress: () => {
          void regenerate().then((result) => {
            if (buildingId) void saveRegistrationToken(buildingId, result.token);
            setPlainToken(result.token);
          });
        },
      },
    ]);
  }

  const selfRegistrationEnabled = data?.selfRegistrationEnabled ?? true;

  return (
    <PageShell>
      <SectionLabel>{t('registration.adminTitle')}</SectionLabel>
      <Caption>{t('registration.adminHint')}</Caption>

      <Card style={styles.qrCard}>
        {urls ? (
          <>
            <View style={styles.qrWrap}>
              <QRCode
                value={urls.appDeepLink}
                size={220}
                getRef={(ref) => {
                  qrRef.current = ref;
                }}
              />
            </View>
            <Body style={styles.qrBuilding}>{building?.name}</Body>
            <Caption style={styles.qrCaption}>{t('registration.scanHint')}</Caption>
          </>
        ) : (
          <View style={styles.noToken}>
            <Ionicons name="key-outline" size={32} color={colors.textMuted} />
            <Caption style={styles.noTokenText}>{t('registration.noTokenStored')}</Caption>
            <Button
              label={t('registration.generateToken')}
              onPress={() => void handleRegenerate()}
              loading={isRegenerating}
              variant="accent"
            />
          </View>
        )}
      </Card>

      {urls ? (
        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => void handleCopyLink()}>
            <Ionicons name="copy-outline" size={22} color={colors.primary} />
            <Text style={styles.actionLabel}>{t('registration.copyLink')}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => void handleShare()}>
            <Ionicons name="share-outline" size={22} color={colors.primary} />
            <Text style={styles.actionLabel}>{t('registration.share')}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => void handlePrint()}>
            <Ionicons name="print-outline" size={22} color={colors.primary} />
            <Text style={styles.actionLabel}>{t('registration.print')}</Text>
          </Pressable>
        </View>
      ) : null}

      <SettingsGroup title={t('registration.controls')} style={styles.controls}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleLabel}>{t('registration.selfRegistration')}</Text>
            <Caption>{t('registration.selfRegistrationHint')}</Caption>
          </View>
          <Switch
            value={selfRegistrationEnabled}
            disabled={isToggling}
            onValueChange={(value) => void toggleSelfRegistration(value)}
            trackColor={{ true: colors.accent }}
          />
        </View>
        <SettingsRow
          icon="refresh-outline"
          label={t('registration.regenerate')}
          value={
            data?.lastRegeneratedAt
              ? new Date(data.lastRegeneratedAt).toLocaleDateString('de-CH')
              : '—'
          }
          onPress={() => void handleRegenerate()}
          last
        />
      </SettingsGroup>

      <SettingsGroup
        title={t('registration.stats')}
        footer={t('registration.statsHint')}
      >
        <SettingsRow
          icon="people-outline"
          label={t('registration.totalRegistrations')}
          value={`${data?.totalRegistrations ?? 0}`}
          last={!data?.recentRegistrations.length}
        />
      </SettingsGroup>

      {data?.recentRegistrations.length ? (
        <>
          <SectionLabel>{t('registration.recent')}</SectionLabel>
          <ScrollView horizontal={false} style={styles.list}>
            {data.recentRegistrations.map((entry) => (
              <Card key={entry.id} style={styles.registrationCard}>
                <Body>
                  {entry.user.firstName} {entry.user.lastName}
                </Body>
                <Caption>
                  {entry.user.apartmentNumber ? `${entry.user.apartmentNumber} · ` : ''}
                  {entry.user.email}
                </Caption>
                <Caption>
                  {new Date(entry.registeredAt).toLocaleString('de-CH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Caption>
              </Card>
            ))}
          </ScrollView>
        </>
      ) : (
        <Caption style={styles.empty}>{t('registration.noRegistrations')}</Caption>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.lg },
  qrWrap: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  qrBuilding: { fontWeight: '600', textAlign: 'center' },
  qrCaption: { textAlign: 'center', marginTop: spacing.xs },
  noToken: { alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  noTokenText: { textAlign: 'center', lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  actionBtn: { alignItems: 'center', gap: spacing.xs, minWidth: 72 },
  actionLabel: { ...typography.caption, color: colors.primary },
  controls: { marginTop: 0 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toggleText: { flex: 1 },
  toggleLabel: { ...typography.body, fontWeight: '500' },
  list: { marginTop: spacing.sm },
  registrationCard: { marginBottom: spacing.sm },
  empty: { marginTop: spacing.md, textAlign: 'center' },
});
