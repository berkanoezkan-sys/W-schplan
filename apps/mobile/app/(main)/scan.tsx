import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';
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
      setError(t('scan.notFound'));
    }
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Button label={t('scan.allowCamera')} onPress={requestPermission} variant="accent" />
          <TextField
            label={t('scan.manualEntry')}
            value={manualCode}
            onChangeText={setManualCode}
            error={error}
          />
          <Button label={t('scan.open')} onPress={() => openMachine(manualCode)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => openMachine(data)}
      />
      <View style={styles.content}>
        <TextField
          label={t('scan.manualEntry')}
          value={manualCode}
          onChangeText={setManualCode}
          error={error}
        />
        <Button label={t('scan.open')} onPress={() => openMachine(manualCode)} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  camera: { flex: 1, margin: spacing.md, borderRadius: radius.lg, overflow: 'hidden', minHeight: 280 },
  content: { padding: spacing.md, gap: spacing.sm },
});
