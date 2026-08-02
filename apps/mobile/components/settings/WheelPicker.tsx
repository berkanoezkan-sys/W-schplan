import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { triggerWheelSelectionHaptic } from '@/lib/wheelPickerHaptics';
import {
  getWheelPickerTheme,
  wheelItemTextStyle,
  wheelPickerMetrics,
  wheelPickerStyles,
  type ColorScheme,
} from '@/lib/wheelPickerTheme';

export type WheelPickerOption<T extends string | number> = {
  value: T;
  label: string;
};

type WheelPickerProps<T extends string | number> = {
  options: WheelPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  colorScheme?: ColorScheme;
};

/**
 * Native UIPickerView on iOS/Android (Expo Go compatible).
 * Do not import @react-native-picker/picker elsewhere — use this component.
 * @see {@link ../WheelPickers.ts}
 */
export function WheelPicker<T extends string | number>(props: WheelPickerProps<T>) {
  if (Platform.OS === 'web') {
    return <WebScrollWheelPicker {...props} />;
  }
  return <NativePlatformWheelPicker {...props} />;
}

function NativePlatformWheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  colorScheme = 'light',
}: WheelPickerProps<T>) {
  const palette = getWheelPickerTheme(colorScheme);
  const selectedKey = String(value);

  if (options.length === 0) return null;

  return (
    <View style={wheelPickerStyles.nativePickerWrap}>
      <Picker
        selectedValue={selectedKey}
        onValueChange={(itemValue) => {
          const match = options.find((opt) => String(opt.value) === itemValue);
          if (!match || match.value === value) return;
          triggerWheelSelectionHaptic();
          onChange(match.value);
        }}
        itemStyle={{
          color: palette.selected,
          fontSize: wheelPickerMetrics.fontSizeSelected,
        }}
        style={wheelPickerStyles.nativePicker}
      >
        {options.map((opt) => (
          <Picker.Item key={String(opt.value)} label={opt.label} value={String(opt.value)} />
        ))}
      </Picker>
    </View>
  );
}

/**
 * Web-only fallback with iOS-like momentum; snaps after deceleration ends.
 */
function WebScrollWheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  colorScheme = 'light',
}: WheelPickerProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const { itemHeight, visibleRows } = wheelPickerMetrics;
  const wheelHeight = itemHeight * visibleRows;
  const inset = itemHeight * Math.floor(visibleRows / 2);

  const valueIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
  const safeIndex = valueIndex >= 0 ? valueIndex : 0;
  const maxOffset = Math.max(0, (options.length - 1) * itemHeight);

  const focusedIndexRef = useRef(safeIndex);
  const syncingRef = useRef(false);
  const lastValueRef = useRef(value);
  const [focusedIndex, setFocusedIndex] = useState(safeIndex);

  useEffect(() => {
    lastValueRef.current = value;
    focusedIndexRef.current = safeIndex;
    setFocusedIndex(safeIndex);
    syncingRef.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: safeIndex * itemHeight, animated: false });
      syncingRef.current = false;
    });
  }, [safeIndex, itemHeight]);

  function clampOffset(y: number) {
    return Math.max(0, Math.min(maxOffset, y));
  }

  function indexFromOffset(y: number) {
    return Math.max(0, Math.min(options.length - 1, Math.round(clampOffset(y) / itemHeight)));
  }

  function setFocusedIndexSafe(index: number) {
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    if (clamped === focusedIndexRef.current) return;
    focusedIndexRef.current = clamped;
    setFocusedIndex(clamped);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (syncingRef.current || options.length === 0) return;
    setFocusedIndexSafe(indexFromOffset(event.nativeEvent.contentOffset.y));
  }

  /** Snap only after momentum finishes — never on finger lift. */
  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (syncingRef.current || options.length === 0) return;

    const offsetY = event.nativeEvent.contentOffset.y;
    const clampedY = clampOffset(offsetY);
    const index = indexFromOffset(clampedY);

    if (Math.abs(offsetY - clampedY) > 0.5) {
      syncingRef.current = true;
      scrollRef.current?.scrollTo({ y: clampedY, animated: true });
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    }

    setFocusedIndexSafe(index);
    const nextValue = options[index]?.value;
    if (nextValue !== undefined && nextValue !== lastValueRef.current) {
      lastValueRef.current = nextValue;
      triggerWheelSelectionHaptic();
      onChange(nextValue);
    }
  }

  const palette = getWheelPickerTheme(colorScheme);

  if (options.length === 0) return null;

  return (
    <View style={[wheelPickerStyles.wheelContainer, { height: wheelHeight }]}>
      <View
        style={[
          wheelPickerStyles.selectionBand,
          {
            backgroundColor: palette.selectionBackground,
            borderColor: palette.selectionBorder,
          },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        snapToInterval={itemHeight}
        snapToAlignment="center"
        decelerationRate="normal"
        nestedScrollEnabled
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: inset }}
      >
        {options.map((opt, index) => {
          const distance = Math.abs(index - focusedIndex);
          return (
            <Pressable
              key={String(opt.value)}
              accessibilityRole="adjustable"
              accessibilityState={{ selected: index === focusedIndex }}
              onPress={() => {
                const idx = index;
                syncingRef.current = true;
                scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
                setFocusedIndexSafe(idx);
                const nextValue = options[idx].value;
                if (nextValue !== lastValueRef.current) {
                  lastValueRef.current = nextValue;
                  triggerWheelSelectionHaptic();
                  onChange(nextValue);
                }
                requestAnimationFrame(() => {
                  syncingRef.current = false;
                });
              }}
              style={{
                height: itemHeight,
                justifyContent: 'center',
                paddingHorizontal: 8,
              }}
            >
              <Text style={wheelItemTextStyle(distance, colorScheme)}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
