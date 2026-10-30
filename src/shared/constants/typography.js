import { Platform } from "react-native";

export const FONT_FAMILY = Platform.select({
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  android: "sans-serif",
  default: undefined,
});

const fontConfig = FONT_FAMILY ? { fontFamily: FONT_FAMILY } : {};

export const TYPOGRAPHY = {
  // Page Title: Size 28px | Weight: Bold (700)
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    ...fontConfig,
  },
  mainPageTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    ...fontConfig,
  },

  // Card & Section Titles: Size 18px | Weight: Semi-Bold (600)
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  cardHeading: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },
  price: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    ...fontConfig,
  },

  // Inline Section Labels: Size 16px | Weight: Semi-Bold (600)
  inlineSectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    ...fontConfig,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    ...fontConfig,
  },

  // Primary Body Text: Size 16px | Weight: Regular (400)
  primaryBody: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    ...fontConfig,
  },
  bodyText: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    ...fontConfig,
  },
  inputText: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
    ...fontConfig,
  },

  // Secondary/Meta Text & Subtext: Size 14px | Weight: Regular (400)
  secondaryText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  subtext: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  location: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  propertyMeta: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  smallHelperText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },
  specs: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    ...fontConfig,
  },

  // Small Button Text: Size 14px | Weight: Medium (500)
  smallButton: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    ...fontConfig,
  },
  button: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    ...fontConfig,
  },
  filterChip: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    ...fontConfig,
  },
  badge: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    ...fontConfig,
  },
  bottomTab: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    ...fontConfig,
  },

  // Main Action Button: Size 16px | Weight: Semi-Bold (600)
  mainActionButton: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    ...fontConfig,
  },
  mainButton: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    ...fontConfig,
  },
};

export default TYPOGRAPHY;
