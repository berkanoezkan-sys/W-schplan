import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { BuildingDuplicatePreview, CreateBuildingInput } from '@woeschplan/shared';
import { suggestDuplicateBuildingName } from '@woeschplan/shared';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBuilding } from '@/lib/building';
import { Button, LoadingState, PageShell, TextField } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { triggerSaveHaptic } from '@/lib/useEditableHeader';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

export default function CreateBuildingScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const { sourceBuildingId: rawSourceId } = useLocalSearchParams<{ sourceBuildingId?: string }>();
  const sourceBuildingId = typeof rawSourceId === 'string' ? rawSourceId : undefined;
  const isDuplicate = !!sourceBuildingId;

  const { building, createBuilding, duplicateBuilding, isCreatingBuilding } = useBuilding();

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['duplicate-preview', sourceBuildingId],
    enabled: !!token && !!sourceBuildingId,
    queryFn: () =>
      apiRequest<BuildingDuplicatePreview>(`/buildings/${sourceBuildingId}/duplicate-preview`, {
        token: token!,
      }),
  });

  const sourceName = preview?.sourceName ?? building?.name ?? '';
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [internalReference, setInternalReference] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isDuplicate ? t('duplicate.create') : t('dashboard.addBuilding.title'),
    });
  }, [navigation, isDuplicate]);

  useEffect(() => {
    if (!isDuplicate) return;
    if (preview?.sourceName) {
      setName(suggestDuplicateBuildingName(preview.sourceName));
      setAddress('');
      setInternalReference(preview.sourceName);
    } else if (building?.name) {
      setName(suggestDuplicateBuildingName(building.name));
      setInternalReference(building.name);
    }
  }, [isDuplicate, preview?.sourceName, building?.name]);

  const canSave = name.trim().length > 0 && address.trim().length > 0;

  const payload = useMemo<CreateBuildingInput>(
    () => ({
      name: name.trim(),
      address: address.trim(),
      timezone: 'Europe/Zurich',
      language: 'de',
    }),
    [name, address],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) {
      setError(t('dashboard.addBuilding.validation'));
      return;
    }
    setError(null);
    try {
      if (isDuplicate && sourceBuildingId) {
        await duplicateBuilding(sourceBuildingId, payload);
      } else {
        await createBuilding(payload);
      }
      await triggerSaveHaptic();
      router.back();
    } catch {
      setError(isDuplicate ? t('duplicate.error') : t('dashboard.addBuilding.error'));
    }
  }, [canSave, isDuplicate, sourceBuildingId, payload, duplicateBuilding, createBuilding]);

  if (isDuplicate && previewLoading) return <LoadingState />;

  return (
    <PageShell
      footer={
        <Button
          label={isDuplicate ? t('duplicate.create') : t('dashboard.addBuilding.save')}
          variant="accent"
          loading={isCreatingBuilding}
          onPress={() => void handleSave()}
        />
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            {isDuplicate ? t('duplicate.intro') : t('dashboard.addBuilding.intro')}
          </Text>

          {isDuplicate && preview ? (
            <View style={styles.sourceCard}>
              <Text style={styles.sourceLabel}>{t('duplicate.sourceBuilding')}</Text>
              <Text style={styles.sourceName}>{preview.sourceName}</Text>
              <Text style={styles.sourceAddress}>{preview.sourceAddress}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextField
            label={t('dashboard.addBuilding.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('dashboard.addBuilding.namePlaceholder')}
            autoCapitalize="words"
          />
          <TextField
            label={t('dashboard.addBuilding.address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('dashboard.addBuilding.addressPlaceholder')}
            autoCapitalize="words"
            multiline
          />
          {isDuplicate ? (
            <TextField
              label={t('duplicate.internalReference')}
              value={internalReference}
              onChangeText={setInternalReference}
              placeholder={t('duplicate.internalReferencePlaceholder')}
              autoCapitalize="words"
            />
          ) : null}

          {isDuplicate && preview ? (
            <>
              <Text style={styles.sectionLabel}>{t('duplicate.willCopy')}</Text>
              <SettingsGroup>
                {preview.sections.map((section, index) => (
                  <SettingsRow
                    key={section.key}
                    icon={sectionIcon(section.key)}
                    label={t(section.labelKey)}
                    value={
                      section.count != null
                        ? String(section.count)
                        : t('duplicate.included')
                    }
                    last={index === preview.sections.length - 1}
                  />
                ))}
              </SettingsGroup>

              <Text style={styles.sectionLabel}>{t('duplicate.willNotCopy')}</Text>
              <SettingsGroup footer={t('duplicate.registrationHint')}>
                {preview.excluded.map((item, index) => (
                  <SettingsRow
                    key={item.key}
                    icon="close-circle-outline"
                    label={t(item.labelKey)}
                    value="—"
                    last={index === preview.excluded.length - 1}
                  />
                ))}
              </SettingsGroup>
            </>
          ) : (
            <View style={styles.defaults}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.defaultsText}>{t('dashboard.addBuilding.defaults')}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PageShell>
  );
}

function sectionIcon(key: string): keyof typeof Ionicons.glyphMap {
  switch (key) {
    case 'houseRules':
      return 'water-outline';
    case 'bookingRules':
      return 'document-text-outline';
    case 'checklistTemplates':
      return 'checkbox-outline';
    case 'laundryRooms':
      return 'home-outline';
    default:
      return 'copy-outline';
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl, gap: spacing.sm },
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  sourceLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  sourceName: { ...typography.body, fontWeight: '600', marginTop: spacing.xs },
  sourceAddress: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger, marginBottom: spacing.sm },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  defaults: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  defaultsText: { ...typography.caption, flex: 1, lineHeight: 18 },
});
