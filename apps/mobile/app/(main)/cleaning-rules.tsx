import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBuilding } from '@/lib/building';
import { useBuildingSettings } from '@/lib/hooks/useBuildingSettings';
import { Caption, LoadingState, PageShell, SectionLabel } from '@/components/ui';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsGroup';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';

type ChecklistType = 'WASHING_MACHINE' | 'TUMBLE_DRYER';

export default function CleaningRulesScreen() {
  const { isAdmin } = useBuilding();
  const { settings, isLoading } = useBuildingSettings();
  const [pickerVisible, setPickerVisible] = useState(false);

  if (isLoading || !settings) return <LoadingState />;

  const templates = settings.checklistTemplates;

  function openEditor(type: ChecklistType) {
    router.push({ pathname: '/(main)/cleaning-rules-editor', params: { type } });
  }

  function templateLabel(type: ChecklistType) {
    return type === 'WASHING_MACHINE'
      ? t('settings.cleaning.washer')
      : t('settings.cleaning.dryer');
  }

  function itemCount(type: ChecklistType) {
    return templates.find((tpl) => tpl.checklistType === type)?.items.filter((i) => i.enabled).length ?? 0;
  }

  return (
    <View style={styles.container}>
      <PageShell>
        {templates.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={56} color={colors.textMuted} />
            <SectionLabel>{t('settings.cleaning.empty')}</SectionLabel>
            <Caption>{t('settings.cleaning.emptyHint')}</Caption>
          </View>
        ) : (
          <SettingsGroup title={t('settings.cleaning.templates')}>
            {templates.map((tpl, index) => (
              <SettingsRow
                key={tpl.checklistType}
                icon={tpl.checklistType === 'WASHING_MACHINE' ? 'water-outline' : 'flame-outline'}
                label={templateLabel(tpl.checklistType)}
                value={`${itemCount(tpl.checklistType)} ${t('settings.cleaning.items')}`}
                onPress={() => openEditor(tpl.checklistType)}
                last={index === templates.length - 1}
              />
            ))}
          </SettingsGroup>
        )}
      </PageShell>

      {isAdmin ? (
        <Pressable
          accessibilityRole="button"
          style={styles.fab}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      ) : null}

      <Modal visible={pickerVisible} animationType="fade" transparent onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.cleaning.createPrompt')}</Text>
            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setPickerVisible(false);
                openEditor('WASHING_MACHINE');
              }}
            >
              <Ionicons name="water-outline" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>{t('settings.cleaning.washer')}</Text>
            </Pressable>
            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setPickerVisible(false);
                openEditor('TUMBLE_DRYER');
              }}
            >
              <Ionicons name="flame-outline" size={24} color={colors.primary} />
              <Text style={styles.modalOptionText}>{t('settings.cleaning.dryer')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: { ...typography.heading, textAlign: 'center', marginBottom: spacing.sm },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  modalOptionText: { ...typography.body, fontWeight: '600' },
});
