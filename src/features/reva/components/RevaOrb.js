import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, Platform } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from "react-native-svg";

/**
 * Reva AI avatar: soft gradient squircle with two glowing eyes.
 * "Alive" loop: slow colour drift, gentle breathing, eyes that blink
 * and glance around now and then. All transforms run on the native driver.
 */
export default function RevaOrb({ size = 58, animated = true, style }) {
  const useNative = Platform.OS !== "web";
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const look = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return undefined;
    let alive = true;

    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: useNative })
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ])
    );
    spinLoop.start();
    breatheLoop.start();

    // Blink every 2.5–5 s, sometimes a double blink; glance left/right occasionally.
    let timer;
    const close = (d) => Animated.timing(blink, { toValue: 0.1, duration: d, easing: Easing.in(Easing.quad), useNativeDriver: useNative });
    const open = (d) => Animated.timing(blink, { toValue: 1, duration: d, easing: Easing.out(Easing.quad), useNativeDriver: useNative });
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        const steps = [close(70), open(110)];
        if (Math.random() < 0.25) steps.push(Animated.delay(90), close(70), open(110));
        if (Math.random() < 0.4) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          steps.push(
            Animated.timing(look, { toValue: dir, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
            Animated.delay(700),
            Animated.timing(look, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative })
          );
        }
        Animated.sequence(steps).start(schedule);
      }, 2500 + Math.random() * 2500);
    };
    schedule();

    return () => {
      alive = false;
      clearTimeout(timer);
      spinLoop.stop();
      breatheLoop.stop();
    };
  }, [animated]);

  const radius = size * 0.42;
  const big = size * 1.8;
  const eyeW = size * 0.11;
  const eyeH = size * 0.2;
  const eyeGap = size * 0.14;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const lookX = look.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.06, size * 0.06] });

  const Eye = () => (
    <View style={{ width: eyeW * 2, height: eyeH * 1.6, alignItems: "center", justifyContent: "center" }}>
      {/* soft glow */}
      <View
        style={{
          position: "absolute",
          width: eyeW * 2,
          height: eyeH * 1.5,
          borderRadius: eyeW,
          backgroundColor: "rgba(255,255,255,0.28)",
        }}
      />
      <View style={{ width: eyeW, height: eyeH, borderRadius: eyeW / 2, backgroundColor: "#FFFFFF" }} />
    </View>
  );

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ scale }] }, style]}>
      <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: "#4F6BF0" }}>
        {/* Base blue → indigo */}
        <Svg width={size} height={size} style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="revaBase" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#5AA8F5" />
              <Stop offset="0.55" stopColor="#4D63EA" />
              <Stop offset="1" stopColor="#5B8FE0" />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} fill="url(#revaBase)" />
        </Svg>

        {/* Drifting colour blobs (cyan, violet, teal) */}
        <Animated.View
          style={{
            position: "absolute",
            width: big,
            height: big,
            left: (size - big) / 2,
            top: (size - big) / 2,
            transform: [{ rotate }],
          }}
        >
          <Svg width={big} height={big} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="revaCyan" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#5EEBF2" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#5EEBF2" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="revaViolet" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#B38CF0" stopOpacity="0.85" />
                <Stop offset="1" stopColor="#B38CF0" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="revaTeal" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#5FC6C9" stopOpacity="0.8" />
                <Stop offset="1" stopColor="#5FC6C9" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="32" cy="38" r="22" fill="url(#revaCyan)" />
            <Circle cx="70" cy="30" r="18" fill="url(#revaViolet)" />
            <Circle cx="66" cy="70" r="22" fill="url(#revaTeal)" />
          </Svg>
        </Animated.View>

        {/* Eyes */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: size * 0.06,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: eyeGap,
            transform: [{ translateX: lookX }, { scaleY: blink }],
          }}
        >
          <Eye />
          <Eye />
        </Animated.View>
      </View>
    </Animated.View>
  );
}
