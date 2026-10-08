import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  suffix,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
  editable = true,
  helperText,
  error,
  style,
  inputStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
          multiline && { minHeight: 96, alignItems: "flex-start" },
        ]}
      >
        {prefix && <Text style={styles.prefixText}>{prefix}</Text>}

        <TextInput
          style={[
            styles.input,
            multiline && { textAlignVertical: "top", paddingTop: 12 },
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          underlineColorAndroid="transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {suffix && <Text style={styles.suffixText}>{suffix}</Text>}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  inputWrapperDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  prefixText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 8,
  },
  suffixText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#64748B",
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "500",
    color: "#0F172A",
    height: "100%",
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  helperText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 5,
    marginLeft: 2,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 11.5,
    color: COLORS.danger,
    marginTop: 5,
    marginLeft: 2,
    fontWeight: "500",
  },
});
