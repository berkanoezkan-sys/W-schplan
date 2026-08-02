import { useRef } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
  type IOSNativeProps,
} from '@react-native-community/datetimepicker';
import { triggerWheelSelectionHaptic } from '@/lib/wheelPickerHaptics';
import {
  nativeWheelPickerProps,
  wheelPickerStyles,
  type ColorScheme,
} from '@/lib/wheelPickerTheme';

type IosWheelDateTimePickerProps = Omit<
  IOSNativeProps,
  'display' | 'textColor' | 'themeVariant' | 'accentColor'
> & {
  colorScheme?: ColorScheme;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
};

/**
 * Native UIDatePicker spinner on iOS.
 * Do not import @react-native-community/datetimepicker elsewhere — use this component.
 * @see {@link ../WheelPickers.ts}
 */
export function IosWheelDateTimePicker({
  colorScheme = 'light',
  style,
  onChange,
  ...props
}: IosWheelDateTimePickerProps) {
  const themeProps = nativeWheelPickerProps(colorScheme);
  const lastHapticAt = useRef(0);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'set' && date && Platform.OS !== 'web') {
      const now = Date.now();
      if (now - lastHapticAt.current > 120) {
        lastHapticAt.current = now;
        triggerWheelSelectionHaptic();
      }
    }
    onChange(event, date);
  }

  return (
    <View style={wheelPickerStyles.nativePickerWrap}>
      <DateTimePicker
        {...props}
        {...themeProps}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        style={[wheelPickerStyles.nativePicker, style]}
        onChange={handleChange}
      />
    </View>
  );
}
