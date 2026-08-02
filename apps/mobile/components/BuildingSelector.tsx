import { useRef, useState, useCallback } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ApiError } from '@/lib/api';
import { useBuilding } from '@/lib/building';
import {
  navigateToCreateBuilding,
  navigateToDuplicateBuilding,
  showBuildingManagementMenu,
} from '@/lib/buildingActions';
import { SwipeableRow, type SwipeOpenDirection } from '@/components/SwipeableRow';
import { PortfolioStatsRow } from '@/components/ui';
import { colors, spacing, typography, radius } from '@/lib/theme';
import { t } from '@/lib/i18n';
import type { Building } from '@/lib/building';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type OpenSwipeState = {
  id: string;
  direction: Exclude<SwipeOpenDirection, null>;
};

export function BuildingSelector() {
  const {
    buildings,
    building,
    portfolio,
    isPropertyManager,
    selectBuilding,
    deleteBuilding,
    isSelectingBuilding,
    isDeletingBuilding,
  } = useBuilding();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openSwipe, setOpenSwipe] = useState<OpenSwipeState | null>(null);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);
  const pendingDeleteIdRef = useRef<string | null>(null);
  const sheetScrollMax = Dimensions.get('window').height * 0.55;
  const isEmpty = buildings.length === 0;
  const canOpenPicker = isPropertyManager && (buildings.length > 0 || isEmpty);

  const handleSwipeActiveChange = useCallback((active: boolean) => {
    setListScrollEnabled(!active);
  }, []);

  function closePicker() {
    setOpenSwipe(null);
    setListScrollEnabled(true);
    setPickerOpen(false);
  }

  async function handleSelect(id: string) {
    setOpenSwipe(null);
    if (id === building?.id) {
      closePicker();
      return;
    }
    await selectBuilding(id);
    closePicker();
  }

  function openAddBuilding() {
    closePicker();
    setTimeout(() => navigateToCreateBuilding(), 280);
  }

  function openBuildingMenu() {
    showBuildingManagementMenu({
      buildingId: building?.id,
      buildingName: building?.name,
    });
  }

  function handleCopyBuilding(buildingId: string) {
    setOpenSwipe(null);
    closePicker();
    navigateToDuplicateBuilding(buildingId);
  }

  function handleDeleteBuilding(item: Building) {
    setOpenSwipe(null);
    Alert.alert(
      t('building.delete.title'),
      t('building.delete.message').replace('{buildingName}', item.name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => void confirmDeleteBuilding(item),
        },
      ],
    );
  }

  async function confirmDeleteBuilding(item: Building) {
    if (pendingDeleteIdRef.current || isDeletingBuilding) return;
    pendingDeleteIdRef.current = item.id;
    setOpenSwipe(null);

    try {
      await deleteBuilding(item.id);
      if (buildings.length <= 1) {
        closePicker();
      }
      Alert.alert(t('building.delete.success'));
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? t('building.delete.blocked')
          : t('building.delete.error');
      Alert.alert(message);
    } finally {
      pendingDeleteIdRef.current = null;
    }
  }

  if (isEmpty && isPropertyManager) {
    return (
      <Pressable
        style={({ pressed }) => [styles.emptyCard, pressed && styles.selectorPressed]}
        onPress={navigateToCreateBuilding}
        accessibilityRole="button"
      >
        <View style={styles.emptyIconWrap}>
          <Ionicons name="business-outline" size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>{t('dashboard.noBuildings')}</Text>
        <Text style={styles.emptySubtitle}>{t('dashboard.noBuildingsHint')}</Text>
        <View style={styles.emptyCta}>
          <Ionicons name="add-circle" size={20} color={colors.accent} />
          <Text style={styles.emptyCtaText}>{t('dashboard.addBuilding.action')}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      {isPropertyManager && buildings.length > 0 ? (
        <PortfolioStatsRow
          buildingCount={portfolio.buildingCount}
          residentCount={portfolio.activeResidentCount}
          loading={false}
          onBuildingsPress={() => setPickerOpen(true)}
          onResidentsPress={() => router.push('/(main)/building-registration')}
        />
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.selector, pressed && styles.selectorPressed]}
        onPress={canOpenPicker ? () => setPickerOpen(true) : undefined}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.selectBuilding')}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={22} color={colors.primary} />
        </View>

        <View style={styles.selectorContent}>
          <Text style={styles.overline}>{t('dashboard.currentBuilding')}</Text>
          <Text style={styles.buildingName} numberOfLines={1}>
            {building?.name ?? '—'}
          </Text>
          {building?.address ? (
            <Text style={styles.buildingAddress} numberOfLines={2}>
              {building.address}
            </Text>
          ) : null}
          {isPropertyManager && buildings.length > 0 ? (
            <Pressable
              onPress={() => router.push('/(main)/building-details')}
              hitSlop={8}
              accessibilityRole="link"
            >
              <Text style={styles.detailsLink}>{t('buildingDetails.open')}</Text>
            </Pressable>
          ) : null}
        </View>

        {isPropertyManager ? (
          <Pressable
            style={styles.menuBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              openBuildingMenu();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('buildingDetails.actions')}
          >
            <Ionicons name="ellipsis-horizontal-circle" size={28} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {canOpenPicker ? (
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        onRequestClose={closePicker}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={closePicker} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('dashboard.selectBuilding')}</Text>

            <ScrollView
              style={[styles.list, { maxHeight: sheetScrollMax }]}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={buildings.length > 6}
              bounces={buildings.length > 6}
              directionalLockEnabled
              scrollEnabled={listScrollEnabled}
              alwaysBounceVertical={false}
            >
              {buildings.map((item, index) => (
                <BuildingOptionRow
                  key={item.id}
                  building={item}
                  selected={item.id === building?.id}
                  showBorder={index < buildings.length - 1}
                  swipeEnabled={isPropertyManager}
                  openDirection={openSwipe?.id === item.id ? openSwipe.direction : null}
                  onOpenChange={(direction) => {
                    if (!direction) {
                      setOpenSwipe((current) => (current?.id === item.id ? null : current));
                      return;
                    }
                    setOpenSwipe({ id: item.id, direction });
                  }}
                  onSwipeActiveChange={handleSwipeActiveChange}
                  onPress={() => void handleSelect(item.id)}
                  onCopy={() => handleCopyBuilding(item.id)}
                  onDelete={() => handleDeleteBuilding(item)}
                  disabled={isSelectingBuilding || isDeletingBuilding}
                />
              ))}
              {isPropertyManager ? (
                <View style={styles.footerActions}>
                  <Pressable
                    style={({ pressed }) => [styles.addRow, pressed && styles.optionPressed]}
                    onPress={openAddBuilding}
                    accessibilityRole="button"
                  >
                    <View style={styles.addIconWrap}>
                      <Ionicons name="add" size={22} color={colors.accent} />
                    </View>
                    <Text style={styles.addRowLabel}>{t('dashboard.addBuilding.action')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BuildingOptionRow({
  building: b,
  selected,
  showBorder,
  swipeEnabled,
  openDirection,
  onOpenChange,
  onSwipeActiveChange,
  onPress,
  onCopy,
  onDelete,
  disabled,
}: {
  building: Building;
  selected: boolean;
  showBorder: boolean;
  swipeEnabled: boolean;
  openDirection: SwipeOpenDirection;
  onOpenChange: (direction: SwipeOpenDirection) => void;
  onSwipeActiveChange: (active: boolean) => void;
  onPress: () => void;
  onCopy: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const rowContent = (
    <>
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons name="business" size={18} color={selected ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionName, selected && styles.optionNameSelected]}>{b.name}</Text>
        <Text style={styles.optionAddress} numberOfLines={2}>
          {b.address}
        </Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark.circle.fill" size={22} color={colors.accent} />
      ) : (
        <View style={styles.optionCheckPlaceholder} />
      )}
    </>
  );

  if (!swipeEnabled) {
    return (
      <View style={[styles.option, showBorder && styles.optionBorder]}>
        <Pressable
          style={({ pressed }) => [styles.optionMain, pressed && styles.optionPressed]}
          onPress={onPress}
          disabled={disabled}
        >
          {rowContent}
        </Pressable>
      </View>
    );
  }

  const row = (
    <View style={[styles.option, showBorder && styles.optionBorder]}>
      <Pressable
        style={({ pressed }) => [styles.optionMain, pressed && styles.optionPressed]}
        onPress={onPress}
        disabled={disabled}
        delayPressIn={120}
      >
        {rowContent}
      </Pressable>
    </View>
  );

  return (
    <SwipeableRow
      enabled={!disabled}
      rounded={false}
      openDirection={openDirection}
      onOpenChange={onOpenChange}
      onSwipeActiveChange={onSwipeActiveChange}
      onCopy={onCopy}
      onDelete={onDelete}
      copyAccessibilityLabel={t('building.action.copyA11y').replace('{buildingName}', b.name)}
      deleteAccessibilityLabel={t('building.action.deleteA11y').replace('{buildingName}', b.name)}
    >
      {row}
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#1E4470',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.md,
    minHeight: 88,
  },
  selectorPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.heading, textAlign: 'center' },
  emptySubtitle: { ...typography.caption, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  emptyCtaText: { ...typography.body, color: colors.accent, fontWeight: '600' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorContent: { flex: 1, gap: 2 },
  overline: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  buildingName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  buildingAddress: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  detailsLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  menuBtn: { justifyContent: 'center' },
  chevronWrap: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingLeft: spacing.xs,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  sheetHandle: {
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
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
  },
  optionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.background },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: colors.accentSurface },
  optionBody: { flex: 1, gap: 2 },
  optionName: { ...typography.body, fontWeight: '500' },
  optionNameSelected: { color: colors.primary, fontWeight: '600' },
  optionAddress: { ...typography.caption, color: colors.textMuted },
  optionCheckPlaceholder: { width: 22 },
  footerActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowLabel: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
});
