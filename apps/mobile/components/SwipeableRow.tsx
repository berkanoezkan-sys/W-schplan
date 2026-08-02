import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Pressable,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme';
import { t } from '@/lib/i18n';

const ACTION_WIDTH = 80;
const SNAP_RATIO = 0.3;
const HORIZONTAL_LOCK_DX = 4;
const HORIZONTAL_DOMINANCE = 1.6;

export type SwipeOpenDirection = 'left' | 'right' | null;

function directionToOffset(direction: SwipeOpenDirection): number {
  if (direction === 'left') return -ACTION_WIDTH;
  if (direction === 'right') return ACTION_WIDTH;
  return 0;
}

function isHorizontalIntent(dx: number, dy: number) {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 3) return false;
  return absDx > absDy * 1.15;
}

function isHorizontalSwipe(dx: number, dy: number) {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < HORIZONTAL_LOCK_DX) return false;
  return absDx > absDy * HORIZONTAL_DOMINANCE;
}

function resolveSnapDirection(
  offset: number,
  velocityX: number,
  openAtStart: SwipeOpenDirection,
  hasCopy: boolean,
  hasDelete: boolean,
): SwipeOpenDirection {
  const snapDistance = ACTION_WIDTH * SNAP_RATIO;

  if (openAtStart === 'right') {
    if (offset < snapDistance || velocityX < -0.12) return null;
    return 'right';
  }

  if (openAtStart === 'left') {
    if (offset > -snapDistance || velocityX > 0.12) return null;
    return 'left';
  }

  if (hasCopy && (offset >= snapDistance || velocityX > 0.12)) return 'right';
  if (hasDelete && (offset <= -snapDistance || velocityX < -0.12)) return 'left';

  return null;
}

export function SwipeableRow({
  children,
  onDelete,
  onCopy,
  enabled = true,
  openDirection = null,
  onOpenChange,
  onSwipeActiveChange,
  copyAccessibilityLabel,
  deleteAccessibilityLabel,
  copyLabel = t('common.copy'),
  deleteLabel = t('common.delete'),
  rounded = true,
}: {
  children: React.ReactNode;
  onDelete?: () => void;
  onCopy?: () => void;
  enabled?: boolean;
  openDirection?: SwipeOpenDirection;
  onOpenChange?: (direction: SwipeOpenDirection) => void;
  onSwipeActiveChange?: (active: boolean) => void;
  copyAccessibilityLabel?: string;
  deleteAccessibilityLabel?: string;
  copyLabel?: string;
  deleteLabel?: string;
  rounded?: boolean;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartOffsetRef = useRef(0);
  const openAtGestureStartRef = useRef<SwipeOpenDirection>(null);
  const openDirectionRef = useRef(openDirection);
  const swipeActiveRef = useRef(false);
  const onSwipeActiveChangeRef = useRef(onSwipeActiveChange);
  openDirectionRef.current = openDirection;
  onSwipeActiveChangeRef.current = onSwipeActiveChange;

  const setSwipeActive = (active: boolean) => {
    if (swipeActiveRef.current === active) return;
    swipeActiveRef.current = active;
    onSwipeActiveChangeRef.current?.(active);
  };

  const endSwipeGesture = () => {
    setSwipeActive(false);
  };

  const snapTo = (direction: SwipeOpenDirection) => {
    Animated.timing(translateX, {
      toValue: directionToOffset(direction),
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    snapTo(openDirection);
  }, [openDirection]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => enabled && isHorizontalSwipe(g.dx, g.dy),
        onMoveShouldSetPanResponderCapture: (_, g) => {
          if (!enabled) return false;
          const intent = isHorizontalIntent(g.dx, g.dy);
          if (intent) setSwipeActive(true);
          return intent;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setSwipeActive(true);
          openAtGestureStartRef.current = openDirectionRef.current;
          dragStartOffsetRef.current = directionToOffset(openDirectionRef.current);
          translateX.stopAnimation((value) => {
            dragStartOffsetRef.current = value;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = dragStartOffsetRef.current + g.dx;

          if (onCopy && onDelete) {
            translateX.setValue(Math.min(ACTION_WIDTH, Math.max(-ACTION_WIDTH, next)));
            return;
          }

          if (onDelete) {
            translateX.setValue(Math.min(0, Math.max(-ACTION_WIDTH, next)));
            return;
          }

          if (onCopy) {
            translateX.setValue(Math.min(ACTION_WIDTH, Math.max(0, next)));
          }
        },
        onPanResponderRelease: (_, g) => {
          const projected = dragStartOffsetRef.current + g.dx;
          const nextOpen = resolveSnapDirection(
            projected,
            g.vx,
            openAtGestureStartRef.current,
            !!onCopy,
            !!onDelete,
          );

          snapTo(nextOpen);
          onOpenChange?.(nextOpen);
          endSwipeGesture();
        },
        onPanResponderTerminate: () => {
          snapTo(openDirectionRef.current);
          endSwipeGesture();
        },
      }),
    [enabled, onCopy, onDelete, onOpenChange, onSwipeActiveChange, translateX],
  );

  if (!enabled || (!onDelete && !onCopy)) {
    return <View style={styles.row}>{children}</View>;
  }

  const useIconActions = !!onCopy;

  return (
    <View style={[styles.wrap, rounded && styles.wrapRounded]} {...panResponder.panHandlers}>
      {onCopy ? (
        <View style={styles.copyStrip}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={copyAccessibilityLabel ?? copyLabel}
          >
            <Ionicons name="copy-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      ) : null}
      {onDelete ? (
        <View style={styles.deleteStrip}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={deleteAccessibilityLabel ?? deleteLabel}
          >
            {useIconActions ? (
              <Ionicons name="trash-outline" size={22} color="#fff" />
            ) : (
              <Text style={styles.deleteText}>{deleteLabel}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  wrapRounded: { borderRadius: 8 },
  copyStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteStrip: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: { opacity: 0.82 },
  deleteText: { ...typography.caption, color: '#fff', fontWeight: '600', textAlign: 'center' },
  row: { backgroundColor: colors.surface },
});
