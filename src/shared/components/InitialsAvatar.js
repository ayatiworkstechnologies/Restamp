import React from "react";
import { Image, Text, View } from "react-native";
import { User } from "./HugeIcon.js";
import COLORS from "../constants/colors.js";
import { getInitials } from "../utils/initials.js";

/**
 * User avatar: the real photo when one exists, otherwise the name's initials
 * (shared getInitials rule), otherwise a neutral person icon. Callers pass
 * their own box style (size, radius, margins) so existing layouts are kept.
 */
export default function InitialsAvatar({
  name,
  uri,
  style,
  textStyle,
  iconSize = 20,
  backgroundColor = COLORS.primaryLight,
  color = COLORS.primary,
}) {
  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }
  const initials = getInitials(name);
  return (
    <View
      style={[{ alignItems: "center", justifyContent: "center", backgroundColor }, style]}
      accessibilityLabel={initials ? `${name} avatar` : "Profile avatar"}
    >
      {initials ? (
        <Text style={[{ color, fontWeight: "700", fontSize: iconSize * 0.85 }, textStyle]} numberOfLines={1}>
          {initials}
        </Text>
      ) : (
        <User size={iconSize} color={color} />
      )}
    </View>
  );
}
