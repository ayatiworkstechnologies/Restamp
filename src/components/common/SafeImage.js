import React, { useState, useEffect } from "react";
import { Image } from "react-native";

export const DEFAULT_PROPERTY_FALLBACK =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80";

/**
 * Robust image wrapper that intercepts broken URLs (like seed.local)
 * and catches network load errors, seamlessly falling back to high-res property images.
 */
export default function SafeImage({ source, style, fallbackUri, onError, ...props }) {
  const [hasError, setHasError] = useState(false);

  const rawUri =
    source && typeof source === "object" && typeof source.uri === "string"
      ? source.uri
      : null;

  // Reset error flag if URI changes
  useEffect(() => {
    setHasError(false);
  }, [rawUri]);

  const isInvalid =
    rawUri !== null &&
    (!rawUri || rawUri.includes("seed.local") || !rawUri.startsWith("http"));

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
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
}
