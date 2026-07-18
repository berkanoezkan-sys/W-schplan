import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, machineStatusLabels, machineStatusColors } from '@/lib/theme';
import { t } from '@/lib/i18n';

// ─── Layout ────────────────────────────────────────────────────────────────

export function PageShell({
  children,
  footer,
  scroll = true,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <>
      <View style={styles.pageContent}>{children}</View>
      {footer ? <View style={styles.pageFooter}>{footer}</View> : null}
    </>
  );

  if (scroll) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.page, styles.pageFixed]}>{content}</View>;
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

// ─── Brand ─────────────────────────────────────────────────────────────────

export function Logo({ size = 'large' }: { size?: 'large' | 'small' }) {
  const height = size === 'large' ? 72 : 48;
  return (
    <Image
      source={require('@/assets/logo.png')}
      style={{ height, width: height * 3.2 }}
      resizeMode="contain"
      accessibilityLabel={t('app.name')}
    />
  );
}

// ─── Typography ────────────────────────────────────────────────────────────

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={typography.title}>{children}</Text>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={typography.heading}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={typography.body}>{children}</Text>;
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={typography.caption}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

// ─── Cards & Surfaces ──────────────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function HeroCard({
  label,
  title,
  subtitle,
  accentColor = colors.primary,
  onPress,
  actionLabel,
}: {
  label: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const inner = (
    <>
      <Text style={styles.heroLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      {actionLabel ? (
        <View style={styles.heroAction}>
          <Text style={[styles.heroActionText, { color: accentColor }]}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={accentColor} />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.heroCard,
          { borderLeftColor: accentColor },
          pressed && styles.pressed,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.heroCard, { borderLeftColor: accentColor }]}>{inner}</View>;
}

// ─── Inputs ────────────────────────────────────────────────────────────────

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={typography.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, props.multiline && styles.textArea]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Buttons ───────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const isSecondary = variant === 'secondary';
  const isAccent = variant === 'accent';
  const spinnerColor = isSecondary ? colors.primary : '#fff';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.buttonSecondary,
        isAccent && styles.buttonAccent,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={20} color={isSecondary ? colors.primary : '#fff'} /> : null}
          <Text
            style={[
              styles.buttonText,
              isSecondary && styles.buttonTextSecondary,
              isAccent && styles.buttonTextAccent,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Selection ─────────────────────────────────────────────────────────────

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OptionPicker({
  label,
  options,
  value,
  onChange,
  variant = 'list',
}: {
  label?: string;
  options: Array<{ value: string; label: string; subtitle?: string }>;
  value: string;
  onChange: (v: string) => void;
  variant?: 'list' | 'chips';
}) {
  return (
    <View style={styles.optionPicker}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      {variant === 'chips' ? (
        <View style={styles.chipRow}>
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(opt.value)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        options.map((opt) => (
          <ListRow
            key={opt.value}
            title={opt.label}
            subtitle={opt.subtitle}
            selected={value === opt.value}
            onPress={() => onChange(opt.value)}
            showRadio
          />
        ))
      )}
    </View>
  );
}

// ─── Lists ─────────────────────────────────────────────────────────────────

export function ListRow({
  title,
  subtitle,
  right,
  statusColor,
  selected,
  showRadio,
  showChevron = false,
  unread,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  statusColor?: string;
  selected?: boolean;
  showRadio?: boolean;
  showChevron?: boolean;
  unread?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <>
      {statusColor ? <View style={[styles.statusDot, { backgroundColor: statusColor }]} /> : null}
      <View style={styles.listRowContent}>
        <Text style={[styles.listRowTitle, unread && styles.listRowUnread]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listRowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {showRadio ? (
        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={22}
          color={selected ? colors.accent : colors.border}
        />
      ) : null}
      {showChevron ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.listRow,
          selected && styles.listRowSelected,
          pressed && styles.pressed,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.listRow, selected && styles.listRowSelected]}>{inner}</View>;
}

export function ActionRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={[styles.actionIcon, destructive && styles.actionIconDanger]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.actionLabel, destructive && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Stats & Actions ─────────────────────────────────────────────────────────

export function StatPill({
  label,
  count,
  color,
  onPress,
}: {
  label: string;
  count: number;
  color: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.statPill}>
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.statPill}>{inner}</View>;
}

export function QuickActionBar({
  actions,
}: {
  actions: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }>;
}) {
  return (
    <View style={styles.quickBar}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          onPress={a.onPress}
          style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
        >
          <View style={styles.quickIconWrap}>
            <Ionicons name={a.icon} size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AlertBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.alertBanner}>
      <Ionicons name="alert-circle" size={20} color={colors.warning} />
      <Text style={styles.alertText}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction}>
          <Text style={styles.alertAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Status ────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const labelKey = machineStatusLabels[status] ?? status;
  const color = machineStatusColors[status] ?? colors.textMuted;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} accessibilityElementsHidden />
      <Text style={[styles.badgeText, { color }]}>{t(labelKey)}</Text>
    </View>
  );
}

export function EmptyState({ message, actionLabel, onAction }: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name="calendar-outline" size={40} color={colors.border} />
      <Text style={styles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="accent" />
      ) : null}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={typography.caption}>{t('common.loading')}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageScrollContent: { flexGrow: 1 },
  pageContent: { padding: spacing.md, gap: spacing.md },
  pageFooter: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageFixed: { justifyContent: 'space-between' },
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },

  sectionLabel: { ...typography.label, marginBottom: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  heroLabel: { ...typography.caption, fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.xs },
  heroTitle: { ...typography.hero, marginBottom: spacing.xs },
  heroSubtitle: { ...typography.caption, marginBottom: spacing.sm },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  heroActionText: { fontSize: 15, fontWeight: '600' },

  fieldWrap: { gap: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    minHeight: 48,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  textArea: { minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.md },
  fieldError: { color: colors.danger, fontSize: 13 },

  button: {
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonAccent: { backgroundColor: colors.accent },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: colors.primary },
  buttonTextAccent: { color: '#fff' },
  pressed: { opacity: 0.85 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm + 2,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontWeight: '600', color: colors.textMuted, fontSize: 14 },
  segmentTextActive: { color: colors.primary },

  optionPicker: { gap: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accentLight, borderColor: colors.accent },
  chipText: { fontWeight: '600', color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.primary },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    minHeight: 56,
  },
  listRowSelected: { backgroundColor: colors.accentSurface },
  listRowContent: { flex: 1 },
  listRowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  listRowUnread: { color: colors.primary },
  listRowSubtitle: { ...typography.caption, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: { backgroundColor: '#FDEDED' },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },

  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statCount: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { ...typography.caption, flex: 1 },

  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAction: { alignItems: 'center', gap: spacing.xs, minWidth: 72 },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { ...typography.caption, fontSize: 12, fontWeight: '500', textAlign: 'center' },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFF8E6',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F5E6B8',
  },
  alertText: { flex: 1, ...typography.caption, color: colors.text },
  alertAction: { fontWeight: '600', color: colors.primary, fontSize: 14 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyText: { ...typography.body, textAlign: 'center', color: colors.textMuted },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
});
