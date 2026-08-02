import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Subtle selection tick when a wheel value settles — matches iOS picker feel. */
export function triggerWheelSelectionHaptic() {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync();
}
