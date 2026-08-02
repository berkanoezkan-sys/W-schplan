import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BuildingContact } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useBuildingSettings } from '@/lib/hooks/useBuildingSettings';
import { Body, Card, LoadingState, PageShell, TextField } from '@/components/ui';
import {
  SavedIndicator,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { colors, spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function BuildingContactSettingsScreen() {
  const { isAdmin } = useBuilding();
  const { settings, isLoading, patchSettings } = useBuildingSettings();
  const [form, setForm] = useState<BuildingContact | null>(null);
  const [baseline, setBaseline] = useState<BuildingContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings.houseRules.contact });
      setBaseline({ ...settings.houseRules.contact });
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!form || !baseline) return false;
    return JSON.stringify(form) !== JSON.stringify(baseline);
  }, [form, baseline]);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      await patchSettings({ houseRules: { contact: form } });
      setBaseline({ ...form });
      await triggerSaveHaptic();
      setSavedVisible(true);
      setTimeout(() => setSavedVisible(false), 1800);
    } finally {
      setSaving(false);
    }
  }, [form, patchSettings]);

  const handleCancel = useCallback(() => {
    if (baseline) setForm({ ...baseline });
  }, [baseline]);

  useEditableHeader({ isDirty, isSaving: saving, onSave: handleSave, onCancel: handleCancel });

  if (isLoading || !settings || !form) return <LoadingState />;
  const readOnly = !isAdmin;

  function update(field: keyof BuildingContact, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  if (readOnly) {
    return (
      <PageShell>
        <Card>
          <Body>{form.name}</Body>
          <View style={styles.links}>
            {form.mobile ? (
              <LinkRow icon="call-outline" label={form.mobile} onPress={() => Linking.openURL(`tel:${form.mobile}`)} />
            ) : null}
            {form.email ? (
              <LinkRow icon="mail-outline" label={form.email} onPress={() => Linking.openURL(`mailto:${form.email}`)} />
            ) : null}
          </View>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />
      <Text style={styles.intro}>{t('dashboard.buildingContactHint')}</Text>
      <Card>
        <TextField label={t('settings.contact.name')} value={form.name} onChangeText={(v) => update('name', v)} />
        <TextField
          label={t('settings.contact.mobile')}
          value={form.mobile}
          onChangeText={(v) => update('mobile', v)}
          keyboardType="phone-pad"
        />
        <TextField
          label={t('settings.contact.email')}
          value={form.email}
          onChangeText={(v) => update('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label={t('settings.contact.workingHours')}
          value={form.workingHours ?? ''}
          onChangeText={(v) => update('workingHours', v)}
        />
      </Card>
    </PageShell>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.sm },
  links: { marginTop: spacing.sm, gap: spacing.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  linkText: { color: colors.primary },
});
