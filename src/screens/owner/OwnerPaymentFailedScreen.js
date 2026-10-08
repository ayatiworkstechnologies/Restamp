import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, RefreshCw, Layers, ArrowLeft } from "lucide-react-native";
import COLORS from "../../constants/colors";
import PrimaryButton from "../../components/owner/PrimaryButton";
import SecondaryButton from "../../components/owner/SecondaryButton";

export default function OwnerPaymentFailedScreen({ route, navigation }) {
  const plan = route?.params?.plan;
  const totalAmount = route?.params?.totalAmount;
  const formattedAmount = route?.params?.formattedAmount;

  const handleRetry = () => {
    navigation.navigate("OwnerPayment", {
      plan,
      totalAmount,
      formattedAmount,
    });
  };

  const handleChangePlan = () => {
    navigation.navigate("OwnerPlans");
  };

  const handleBackToPlans = () => {
    navigation.navigate("OwnerPlans");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <AlertCircle size={54} color={COLORS.danger} strokeWidth={2.2} />
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>
          We couldn't process your transaction. Your account has not been charged.
        </Text>

        <View style={styles.errorCard}>
          <Text style={styles.errorLabel}>Possible Reasons:</Text>
          <Text style={styles.errorItem}>• Bank server timeout or network interruption</Text>
          <Text style={styles.errorItem}>• Insufficient balance or incorrect UPI PIN</Text>
          <Text style={styles.errorItem}>• Card payment limits exceeded</Text>
        </View>

        {/* Buttons as explicitly specified in prompt */}
        <View style={styles.buttonStack}>
          <PrimaryButton
            title="Retry Payment"
            onPress={handleRetry}
            icon={RefreshCw}
            style={styles.primaryBtn}
          />

          <SecondaryButton
            title="Change Plan"
            onPress={handleChangePlan}
            icon={Layers}
            variant="outline"
            style={styles.secondaryBtn}
          />

          <SecondaryButton
            title="Back to Plans"
            onPress={handleBackToPlans}
            icon={ArrowLeft}
            variant="subtle"
            style={styles.secondaryBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 6,
    borderColor: "#FEE2E2",
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    color: COLORS.textDark,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  errorCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 28,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  errorItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  buttonStack: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    width: "100%",
  },
  secondaryBtn: {
    width: "100%",
  },
});
