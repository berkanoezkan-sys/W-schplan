import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { CompanyContact } from '@woeschplan/shared';
import { useBuilding } from '@/lib/building';
import { useAdministratorSettings } from '@/lib/hooks/useAdministratorSettings';
import { Card, LoadingState, PageShell, TextField } from '@/components/ui';
import {
  SavedIndicator,
  triggerSaveHaptic,
  useEditableHeader,
} from '@/lib/useEditableHeader';
import { spacing } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function CompanySettingsScreen() {
  const { isAdmin } = useBuilding();
  const { settings, isLoading, patchSettings } = useAdministratorSettings();
  const [form, setForm] = useState<CompanyContact | null>(null);
  const [baseline, setBaseline] = useState<CompanyContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings.companyContact });
      setBaseline({ ...settings.companyContact });
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
      await patchSettings({ companyContact: form });
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

  function update(field: keyof CompanyContact, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  return (
    <PageShell>
      <SavedIndicator visible={savedVisible} />
      <Text style={styles.intro}>{t('settings.propertyManagement.companyHint')}</Text>
      <Card>
        <TextField
          label={t('settings.contact.company')}
          value={form.companyName}
          onChangeText={(v) => update('companyName', v)}
          editable={!readOnly}
        />
        <TextField
          label={t('settings.contact.contactPerson')}
          value={form.contactPerson}
          onChangeText={(v) => update('contactPerson', v)}
          editable={!readOnly}
        />
        <TextField
          label={t('settings.contact.phone')}
          value={form.phone}
          onChangeText={(v) => update('phone', v)}
          keyboardType="phone-pad"
          editable={!readOnly}
        />
        <TextField
          label={t('settings.contact.email')}
          value={form.email}
          onChangeText={(v) => update('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!readOnly}
        />
        <TextField
          label={t('settings.contact.website')}
          value={form.website ?? ''}
          onChangeText={(v) => update('website', v)}
          keyboardType="url"
          autoCapitalize="none"
          editable={!readOnly}
        />
      </Card>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.sm },
});
