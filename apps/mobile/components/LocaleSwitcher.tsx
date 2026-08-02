import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionPicker } from '@/components/ui';
import { APP_LOCALES, localeLabel, useLocale } from '@/lib/locale';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/lib/theme';

type LanguagePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function LanguagePickerSheet({ visible, onClose }: LanguagePickerSheetProps) {
  const { locale, setLocale } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{t('settings.languageTitle')}</Text>
          <OptionPicker
            options={APP_LOCALES.map((code) => ({
              value: code,
              label: localeLabel(code),
            }))}
            value={locale}
            onChange={(value) => {
              void setLocale(value as (typeof APP_LOCALES)[number]);
              onClose();
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <View style={styles.compactRow} accessibilityRole="radiogroup">
      {APP_LOCALES.map((code) => {
        const selected = locale === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={localeLabel(code)}
            onPress={() => void setLocale(code)}
            style={[styles.compactChip, selected && styles.compactChipSelected]}
          >
            <Text style={[styles.compactChipText, selected && styles.compactChipTextSelected]}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  compactChip: {
    minWidth: 40,
    minHeight: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  compactChipSelected: {
    backgroundColor: colors.accentSurface,
  },
  compactChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  compactChipTextSelected: {
    color: colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    flexGrow: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.heading,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
});
