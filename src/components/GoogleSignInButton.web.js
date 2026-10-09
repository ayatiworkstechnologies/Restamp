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

export default function GoogleSignInButton({ onCredential, onError, disabled, compact }) {
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
            window.google.accounts.id.renderButton(buttonRef.current, {
              theme: "outline",
              size: "large",
              width: 280,
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
  }, [clientId]);

  if (!clientId) return null;

  return (
    <View style={styles.container}>
      {!compact ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}
      {/* GIS renders its own button into this host div. */}
      <View style={styles.buttonHost}>
        <div ref={buttonRef} />
      </View>
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
