import { useState } from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Caption, Heading } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function ScanScreen() {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function openMachine(qrCodeIdentifier: string) {
    setError(null);
    try {
      const result = await apiRequest<{ machine: { id: string } }>(
        `/buildings/qr/${qrCodeIdentifier}`,
        { token: token! },
      );
      router.replace(`/(main)/machine/${result.machine.id}`);
    } catch {
      setError('Maschine nicht gefunden oder kein Zugriff.');
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Heading>{t('dashboard.scanQr')}</Heading>
        <Button label="Kamera erlauben" onPress={requestPermission} />
        <ManualEntry value={manualCode} onChange={setManualCode} onSubmit={() => openMachine(manualCode)} />
        {error ? <Caption>{error}</Caption> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Heading>{t('dashboard.scanQr')}</Heading>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => openMachine(data)}
      />
      <ManualEntry value={manualCode} onChange={setManualCode} onSubmit={() => openMachine(manualCode)} />
      {error ? <Caption>{error}</Caption> : null}
    </View>
  );
}

function ManualEntry({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.manual}>
      <Text style={typography.label}>QR-Code manuell eingeben</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        accessibilityLabel="QR code"
        placeholder="UUID"
      />
      <Button label="Öffnen" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  camera: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 280 },
  manual: { marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 48,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
});
