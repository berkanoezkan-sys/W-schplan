import { useEffect } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text, StyleSheet, View } from 'react-native';
import { HeaderCancelButton, HeaderSaveButton } from '@/components/navigation/HeaderButtons';
import { useUnsavedChangesGuard } from '@/lib/navigation/useUnsavedChangesGuard';
import { colors, spacing, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function configureLayoutAnimation() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

type EditableHeaderOptions = {
  isDirty: boolean;
  isSaving?: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
};

export function useEditableHeader({
  isDirty,
  isSaving,
  onSave,
  onCancel,
  saveLabel,
}: EditableHeaderOptions) {
  const navigation = useNavigation();

  useUnsavedChangesGuard({ enabled: isDirty, onDiscard: onCancel });

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: !isDirty,
      gestureEnabled: true,
      headerLeft: isDirty
        ? () => <HeaderCancelButton onPress={onCancel} disabled={isSaving} />
        : undefined,
      headerRight: isDirty
        ? () => (
            <HeaderSaveButton
              onPress={() => void onSave()}
              loading={isSaving}
              label={saveLabel}
            />
          )
        : () => null,
    });
  }, [navigation, isDirty, isSaving, onSave, onCancel, saveLabel]);
}

export function SavedIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.savedWrap}>
      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      <Text style={styles.savedText}>{t('settings.saved')}</Text>
    </View>
  );
}

export async function triggerSaveHaptic() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

const styles = StyleSheet.create({
  savedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  savedText: { ...typography.caption, color: colors.success, fontWeight: '600' },
});
