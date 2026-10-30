import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import Svg, { Path } from "react-native-svg";

function BackspaceIcon({ size = 22, color = "#111827" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 9l-6 6M11 9l6 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const KEYPAD_ROWS = [
  [
    { key: "1", sub: "" },
    { key: "2", sub: "ABC" },
    { key: "3", sub: "DEF" },
  ],
  [
    { key: "4", sub: "GHI" },
    { key: "5", sub: "JKL" },
    { key: "6", sub: "MNO" },
  ],
  [
    { key: "7", sub: "PQRS" },
    { key: "8", sub: "TUV" },
    { key: "9", sub: "WXYZ" },
  ],
  [
    { key: "empty", sub: "" },
    { key: "0", sub: "" },
    { key: "backspace", sub: "" },
  ],
];

export default function NumericKeypad({ onKeyPress, style }) {
  return (
    <View style={[styles.container, style]}>
      {KEYPAD_ROWS.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((item, cIdx) => {
            if (item.key === "empty") {
              return <View key={cIdx} style={styles.emptyKey} />;
            }

            if (item.key === "backspace") {
              return (
                <TouchableOpacity
                  key={cIdx}
                  style={styles.keyButton}
                  onPress={() => onKeyPress("backspace")}
                  activeOpacity={0.6}
                  accessibilityLabel="Backspace"
                >
                  <BackspaceIcon size={22} color="#111827" />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={cIdx}
                style={styles.keyButton}
                onPress={() => onKeyPress(item.key)}
                activeOpacity={0.6}
                accessibilityLabel={`Number ${item.key}`}
              >
                <Text style={styles.numberText}>{item.key}</Text>
                {item.sub ? (
                  <Text style={styles.subText}>{item.sub}</Text>
                ) : (
                  <View style={styles.subTextPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  keyButton: {
    flex: 1,
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 0.08s ease, background-color 0.1s ease",
      },
    }),
  },
  emptyKey: {
    flex: 1,
    height: 52,
    backgroundColor: "transparent",
  },
  numberText: {
    fontSize: 23,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 26,
  },
  subText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.5,
    marginTop: -1,
  },
  subTextPlaceholder: {
    height: 10,
  },
});
