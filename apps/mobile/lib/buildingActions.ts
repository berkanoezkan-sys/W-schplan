import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';

type BuildingActionSource = {
  buildingId?: string | null;
  buildingName?: string | null;
};

export function showBuildingManagementMenu({ buildingId, buildingName }: BuildingActionSource) {
  const options = [
    t('dashboard.addBuilding.action'),
    ...(buildingId ? [t('duplicate.action')] : []),
    t('common.cancel'),
  ];
  const cancelIndex = options.length - 1;
  const duplicateIndex = buildingId ? 1 : -1;

  const onSelect = (index: number) => {
    if (index === cancelIndex) return;
    if (index === 0) {
      router.push('/(main)/create-building');
      return;
    }
    if (index === duplicateIndex && buildingId) {
      router.push({
        pathname: '/(main)/create-building',
        params: { sourceBuildingId: buildingId },
      });
    }
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: buildingName ?? t('dashboard.selectBuilding'),
        options,
        cancelButtonIndex: cancelIndex,
      },
      onSelect,
    );
    return;
  }

  Alert.alert(
    buildingName ?? t('dashboard.selectBuilding'),
    undefined,
    [
      { text: t('dashboard.addBuilding.action'), onPress: () => onSelect(0) },
      ...(buildingId
        ? [{ text: t('duplicate.action'), onPress: () => onSelect(duplicateIndex) }]
        : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ],
  );
}

export function navigateToDuplicateBuilding(sourceBuildingId: string) {
  router.push({
    pathname: '/(main)/create-building',
    params: { sourceBuildingId },
  });
}

export function navigateToCreateBuilding() {
  router.push('/(main)/create-building');
}

export function navigateToBuildingDetails() {
  router.push('/(main)/building-details');
}
