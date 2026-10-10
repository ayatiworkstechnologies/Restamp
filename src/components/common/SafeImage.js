import React, { useState, memo } from "react";
import { Image } from "react-native";

export const DEFAULT_PROPERTY_FALLBACK =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80";

/**
 * Robust, high-performance image wrapper that intercepts broken URLs (like seed.local)
 * and catches network load errors, seamlessly falling back to high-res property images.
 * Memoized to prevent thousands of unnecessary re-renders in property lists.
 */
function SafeImageComponent({ source, style, fallbackUri, onError, ...props }) {
  const [errorUri, setErrorUri] = useState(null);

  const rawUri =
    source && typeof source === "object" && typeof source.uri === "string"
      ? source.uri
      : null;

  const isInvalid =
    rawUri !== null &&
    (!rawUri || rawUri.includes("seed.local") || !rawUri.startsWith("http"));

  const hasError = Boolean(rawUri && errorUri === rawUri);

  let resolvedSource = source;
  if (!source) {
    resolvedSource = { uri: fallbackUri || DEFAULT_PROPERTY_FALLBACK };
  } else if (rawUri !== null) {
    if (hasError || isInvalid) {
      resolvedSource = { uri: fallbackUri || DEFAULT_PROPERTY_FALLBACK };
    }
  }

  return (
    <Image
      {...props}
      source={resolvedSource}
      style={style}
      onError={(e) => {
        if (rawUri) setErrorUri(rawUri);
        if (onError) onError(e);
      }}
    />
  );
}

export default memo(SafeImageComponent);
