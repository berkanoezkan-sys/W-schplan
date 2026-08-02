import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/ui';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { colors, spacing, typography } from '@/lib/theme';
import { useTranslation } from '@/lib/locale';

type AuthScreenLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  showLocaleSwitcher?: boolean;
  contentStyle?: ViewStyle;
};

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  footer,
  showBack = false,
  onBack,
  showLocaleSwitcher = true,
  contentStyle,
}: AuthScreenLayoutProps) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {showLocaleSwitcher ? (
          <View style={styles.localeBar}>
            {showBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                onPress={onBack ?? (() => router.back())}
                style={styles.backButtonInline}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
                <Text style={styles.backText}>{t('common.back')}</Text>
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <LocaleSwitcher />
          </View>
        ) : showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onBack ?? (() => router.back())}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
        ) : null}

        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <Logo size="large" />
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.form}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    ...Platform.select({
      web: { minHeight: '100vh' as const },
      default: {},
    }),
  },
  flex: {
    flex: 1,
    ...Platform.select({
      web: { minHeight: '100vh' as const },
      default: {},
    }),
  },
  localeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  backSpacer: {
    width: 72,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
    maxWidth: 320,
  },
  form: {
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
