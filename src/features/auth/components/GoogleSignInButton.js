/**
 * Native (iOS/Android) Google Sign-In button.
 *
 * Metro resolves this file on iOS/Android and GoogleSignInButton.web.js on
 * web. Uses @react-native-google-signin/google-signin with the same web
 * OAuth client ID as the web button (EXPO_PUBLIC_GOOGLE_CLIENT_ID), so the
 * ID token's audience matches what the backend verifies on POST /auth/google.
 *
 * Android also needs an "Android" OAuth client in the same Google Cloud
 * project (package com.restamp.app + the signing key's SHA-1); without it
 * Google returns DEVELOPER_ERROR. Renders nothing when the client ID is unset.
 */
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, ActivityIndicator, StyleSheet, TurboModuleRegistry, NativeModules } from "react-native";
import Svg, { Path } from "react-native-svg";

// Load the library only when its native module is in this binary. Expo Go and
// dev builds made before the library was added don't have it; a static import
// would crash the whole app at startup, so the button just hides instead.
let GSI = null;
try {
  const hasNative =
    (TurboModuleRegistry && TurboModuleRegistry.get && TurboModuleRegistry.get("RNGoogleSignin")) ||
    NativeModules.RNGoogleSignin;
  if (hasNative) GSI = require("@react-native-google-signin/google-signin");
} catch (e) {
  GSI = null;
}

const CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
let configured = false;

function GoogleG({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

export default function GoogleSignInButton({ onCredential, onError }) {
  const [busy, setBusy] = useState(false);
  if (!CLIENT_ID) return null;

  // Binary without the native module (Expo Go / old dev build): keep the
  // button so the screen matches the real app, and explain on tap.
  if (!GSI) {
    return (
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.88}
        onPress={() =>
          Alert.alert(
            "Google Sign-In",
            "Google Sign-In works in the installed Restamp app. Please continue with your mobile number here."
          )
        }
      >
        <GoogleG size={19} />
        <Text style={styles.text}>Continue with Google</Text>
      </TouchableOpacity>
    );
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = GSI;

  const handlePress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!configured) {
        GoogleSignin.configure({ webClientId: CLIENT_ID });
        configured = true;
      }
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always show the account picker (not a silently reused account).
      await GoogleSignin.signOut().catch(() => {});
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // user cancelled
      const idToken = res.data?.idToken;
      if (!idToken) throw new Error("No Google ID token");
      await onCredential?.(idToken);
    } catch (e) {
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
        return;
      }
      console.warn("[GoogleSignIn] failed", e?.code, e?.message);
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.88} disabled={busy}>
      {busy ? <ActivityIndicator color="#0F172A" /> : <GoogleG size={19} />}
      <Text style={styles.text}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  text: { fontSize: 15.5, fontWeight: "600", color: "#0F172A", letterSpacing: -0.2 },
});
