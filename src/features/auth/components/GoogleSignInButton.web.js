/**
 * Web-only Google Sign-In button (Google Identity Services).
 *
 * This file is picked up ONLY on web via Metro platform extensions; native
 * builds resolve GoogleSignInButton.js (a null stub) instead. Renders the
 * official GIS button into a div: the GIS callback delivers the Google ID
 * token (credential), which the parent POSTs to /auth/google.
 *
 * Client ID comes from EXPO_PUBLIC_GOOGLE_CLIENT_ID (set on Vercel by the
 * deploy teammate). Renders nothing when unconfigured. Script tag is added
 * once (module-level promise + existing-tag check); listeners are cleaned
 * up on unmount.
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

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

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GIS_SCRIPT_ID = "google-gsi-client";

function getClientId() {
  return (
    (typeof process !== "undefined" &&
      process.env &&
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) ||
    ""
  ).trim();
}

let scriptLoadPromise = null;
// Tracks which client ID the shared GIS client was initialized with so
// multiple mounted button instances (Login + Profile) don't re-initialize
// over each other or cancel a sibling's flow setup.
let initializedClientId = null;
let mountedInstances = 0;

function loadGisScript() {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Google Sign-In requires a browser."));
  }
  if (window.google && window.google.accounts && window.google.accounts.id) {
    return Promise.resolve();
  }
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(GIS_SCRIPT_ID);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Could not load Google Sign-In.")),
          { once: true }
        );
        return;
      }
      const script = document.createElement("script");
      script.id = GIS_SCRIPT_ID;
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptLoadPromise = null;
        reject(new Error("Could not load Google Sign-In."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

export default function GoogleSignInButton({ onCredential, onError, compact, pill }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [loadError, setLoadError] = useState(null);
  callbackRef.current = onCredential;
  errorRef.current = onError;

  const clientId = getClientId();
  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    mountedInstances += 1;
    loadGisScript().then(
      () => {
        if (cancelled) return;
        try {
          // Initialize once per client ID; every instance still renders its
          // own button into its own host div.
          if (initializedClientId !== clientId) {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response) => {
                const credential =
                  response && response.credential ? response.credential : null;
                if (credential && callbackRef.current) {
                  callbackRef.current(credential);
                } else if (errorRef.current) {
                  errorRef.current(new Error("Google did not return a credential."));
                }
              },
            });
            initializedClientId = clientId;
          }
          if (buttonRef.current) {
            buttonRef.current.innerHTML = "";
            // `pill` matches the Login landing stack's rounded white
            // buttons; GIS caps width at 400px.
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: "outline",
              size: "large",
              width: pill ? 400 : 280,
              shape: pill ? "pill" : "rectangular",
              text: pill ? "continue_with" : "signin_with",
            });
          }
        } catch (e) {
          if (!cancelled) setLoadError(e);
        }
      },
      (e) => {
        if (!cancelled) setLoadError(e);
      }
    );
    return () => {
      cancelled = true;
      mountedInstances = Math.max(0, mountedInstances - 1);
      // Only tear down the shared GIS flow when the last button unmounts,
      // so one screen closing never breaks a sibling's pending flow.
      if (mountedInstances > 0) return;
      try {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.cancel();
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [clientId, pill]);

  if (!clientId) return null;

  return (
    <View style={[styles.container, pill && styles.containerPill]}>
      {!compact ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}
      {pill ? (
        // App-styled pill; Google's real button sits invisibly on top and
        // receives the tap, so the official GIS flow is unchanged.
        <View style={styles.pillFace}>
          <GoogleG size={20} />
          <Text style={styles.pillText}>Continue with Google</Text>
          <div
            ref={buttonRef}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.01,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          />
        </View>
      ) : (
        /* GIS renders its own button into this host div. */
        <View style={styles.buttonHost}>
          <div ref={buttonRef} />
        </View>
      )}
      {loadError ? (
        <Text style={styles.errorText}>
          Google Sign-In is unavailable right now. Please use phone login.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 18,
    width: "100%",
  },
  containerPill: {
    marginTop: 0,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#94A3B8",
  },
  pillFace: {
    position: "relative",
    width: "100%",
    height: 52,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
  },
  pillText: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  buttonHost: {
    alignItems: "center",
    minHeight: 44,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#DC2626",
    textAlign: "center",
  },
});
