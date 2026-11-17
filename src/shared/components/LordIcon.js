// Animated Lordicon icon (icons by https://lordicon.com/).
// Web uses the official @lordicon/react Player; Android/iOS play the same
// JSON with lottie-react-native, since <lord-icon> only exists in browsers.
// Change `playKey` (e.g. when a tab gains focus) to replay the animation once.
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

let WebPlayer = null;
let LottieView = null;
if (Platform.OS === "web") {
  try {
    WebPlayer = require("@lordicon/react").Player;
  } catch {
    WebPlayer = null;
  }
} else {
  try {
    LottieView = require("lottie-react-native").default;
  } catch {
    LottieView = null;
  }
}

export default function LordIcon({ icon, size = 24, color = "#64748B", playKey, style }) {
  const ref = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    // Stay still on first mount; animate only when playKey changes afterwards.
    if (first.current) {
      first.current = false;
      return;
    }
    if (Platform.OS === "web") ref.current?.playFromBeginning?.();
    else {
      ref.current?.reset?.();
      ref.current?.play?.();
    }
  }, [playKey]);

  if (Platform.OS === "web" && WebPlayer) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <WebPlayer ref={ref} icon={icon} size={size} colorize={color} />
      </View>
    );
  }

  if (LottieView) {
    return (
      <LottieView
        ref={ref}
        source={icon}
        autoPlay={false}
        loop={false}
        style={[{ width: size, height: size }, style]}
        colorFilters={[{ keypath: "**", color }]}
      />
    );
  }

  return <View style={[{ width: size, height: size }, style]} />;
}
