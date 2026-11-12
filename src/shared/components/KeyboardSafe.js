// App-wide keyboard handling. Android (Expo SDK 58) is edge-to-edge, so the
// OS no longer resizes the window when the keyboard opens. These drop-in
// replacements keep the focused input visible above the keyboard, and close
// the keyboard when the user taps anything that is not a text field.
import React, { forwardRef, useCallback, useRef } from "react";
import {
  ScrollView as RNScrollView,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Keyboard,
  TextInput,
  Platform,
  findNodeHandle,
} from "react-native";
import Constants from "expo-constants";

// react-native-keyboard-controller (and its Reanimated worklets) are not in
// Expo Go or on web; loading them there crashes with "bytecode of undefined".
// Only use them in real native builds (APK / dev client) and fall back to the
// plain React Native components everywhere else.
const isExpoGo = Constants.executionEnvironment === "storeClient";
let KC = null;
if (Platform.OS !== "web" && !isExpoGo) {
  try {
    KC = require("react-native-keyboard-controller");
  } catch {
    KC = null;
  }
}

/** Wrap the app root; a no-op when keyboard-controller is unavailable. */
export function KeyboardSafeProvider({ children }) {
  if (!KC) return children;
  const { KeyboardProvider } = KC;
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

const tagOf = (node) => {
  if (!node) return null;
  if (node.__nativeTag != null) return node.__nativeTag;
  try {
    return findNodeHandle(node);
  } catch {
    return null;
  }
};

/**
 * Taps (not drags) that land outside the focused input close the keyboard.
 * The tap still reaches the button/chip, so it works in a single touch.
 * Tapping another TextInput just moves focus, keeping the keyboard open.
 */
function useDismissOnTapOutside(onTouchStart, onTouchMove, onTouchEnd) {
  const touch = useRef(null);

  const handleStart = useCallback(
    (e) => {
      const focused = TextInput.State.currentlyFocusedInput?.();
      touch.current = focused
        ? {
            focused,
            target: e.nativeEvent.target,
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
            moved: false,
          }
        : null;
      onTouchStart?.(e);
    },
    [onTouchStart]
  );

  const handleMove = useCallback(
    (e) => {
      const t = touch.current;
      if (t && (Math.abs(e.nativeEvent.pageX - t.x) > 8 || Math.abs(e.nativeEvent.pageY - t.y) > 8)) {
        t.moved = true;
      }
      onTouchMove?.(e);
    },
    [onTouchMove]
  );

  const handleEnd = useCallback(
    (e) => {
      const t = touch.current;
      touch.current = null;
      onTouchEnd?.(e);
      if (!t || t.moved || t.target === tagOf(t.focused)) return;
      // Let a tapped TextInput take focus first; if focus did not move to
      // another input, the tap was on a non-input, so close the keyboard.
      setTimeout(() => {
        const now = TextInput.State.currentlyFocusedInput?.();
        if (!now || now === t.focused) Keyboard.dismiss();
      }, 60);
    },
    [onTouchEnd]
  );

  return { onTouchStart: handleStart, onTouchMove: handleMove, onTouchEnd: handleEnd };
}

/** ScrollView that scrolls the focused TextInput above the keyboard. Horizontal lists stay plain. */
export const ScrollView = forwardRef(function KeyboardSafeScrollView(props, ref) {
  const touchHandlers = useDismissOnTapOutside(props.onTouchStart, props.onTouchMove, props.onTouchEnd);
  if (props.horizontal) return <RNScrollView ref={ref} {...props} />;
  if (!KC) {
    return (
      <RNScrollView
        ref={ref}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...props}
        {...touchHandlers}
      />
    );
  }
  const { KeyboardAwareScrollView } = KC;
  return (
    <KeyboardAwareScrollView
      ref={ref}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...props}
      {...touchHandlers}
    />
  );
});

/** KeyboardAvoidingView that works on Android edge-to-edge (defaults to padding on both platforms). */
export const KeyboardAvoidingView = forwardRef(function KeyboardSafeAvoidingView(
  { behavior, ...props },
  ref
) {
  const Comp = KC ? KC.KeyboardAvoidingView : RNKeyboardAvoidingView;
  const fallbackBehavior = Platform.OS === "ios" ? "padding" : undefined;
  return <Comp ref={ref} behavior={behavior || (KC ? "padding" : fallbackBehavior)} {...props} />;
});
