import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { t } from '@/lib/i18n';

type Options = {
  enabled: boolean;
  onDiscard?: () => void;
};

export function useUnsavedChangesGuard({ enabled, onDiscard }: Options) {
  const navigation = useNavigation();

  usePreventRemove(enabled, ({ data }) => {
    Alert.alert(
      t('navigation.discardTitle'),
      t('navigation.discardMessage'),
      [
        {
          text: t('navigation.keepEditing'),
          style: 'cancel',
        },
        {
          text: t('navigation.discard'),
          style: Platform.OS === 'ios' ? 'destructive' : 'default',
          onPress: () => {
            onDiscard?.();
            navigation.dispatch(data.action);
          },
        },
      ],
      { cancelable: true },
    );
  });
}
