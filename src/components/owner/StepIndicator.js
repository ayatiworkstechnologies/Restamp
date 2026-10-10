import React, { useRef, useEffect, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import COLORS from "../../constants/colors";

const DEFAULT_RENT_STEPS = [
  { step: 1, label: "Basic", fullLabel: "Add Property" },
  { step: 2, label: "Location", fullLabel: "Property Location" },
  { step: 3, label: "Details", fullLabel: "Property Details" },
  { step: 4, label: "Pricing", fullLabel: "Price & Terms" },
  { step: 5, label: "Photos", fullLabel: "Photos & Details" },
  { step: 6, label: "Amenities", fullLabel: "Amenities" },
  { step: 7, label: "Review", fullLabel: "Review Property" },
];

function StepIndicator({
  currentStep = 1,
  steps = DEFAULT_RENT_STEPS,
  onStepPress,
}) {
  const scrollRef = useRef(null);
  const totalSteps = steps.length;
  const currentStepObj = steps[currentStep - 1] || steps[0];

  useEffect(() => {
    if (scrollRef.current && currentStep > 0) {
      scrollRef.current.scrollTo({
        x: Math.max(0, (currentStep - 2) * 78),
        animated: true,
      });
    }
  }, [currentStep]);

  return (
    <View style={styles.container}>
      {/* Top Header: Step 1 to 7 Indicator */}
      <View style={styles.topMetaRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            Step {currentStep} of {totalSteps}
          </Text>
        </View>
        <Text style={styles.stepTitleText} numberOfLines={1}>
          {currentStepObj?.fullLabel || currentStepObj?.label}
        </Text>
      </View>

      {/* Horizontal Tabs with Active Underline Indicator */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {steps.map((s) => {
          const isCurrent = s.step === currentStep;

          return (
            <TouchableOpacity
              key={s.step}
              style={styles.tabItem}
              onPress={() => onStepPress?.(s.step)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isCurrent ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {s.label}
              </Text>
              {isCurrent && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    paddingTop: 10,
    paddingBottom: 2,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  stepBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  stepTitleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  tabTextInactive: {
    color: "#64748B",
    fontWeight: "500",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 4,
    left: 14,
    right: 14,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
});

export default memo(StepIndicator);
