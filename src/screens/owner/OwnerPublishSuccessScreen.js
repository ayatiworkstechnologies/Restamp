import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, Building2, Plus, Clock, ArrowLeft } from "lucide-react-native";
import COLORS from "../../constants/colors";
import StatusBadge from "../../components/owner/StatusBadge";
import PrimaryButton from "../../components/owner/PrimaryButton";
import SecondaryButton from "../../components/owner/SecondaryButton";

export default function OwnerPublishSuccessScreen({ route, navigation }) {
  const property = route?.params?.property;

  const handleGoBack = () => {
    navigation.navigate("OwnerNavigator", { screen: "Dashboard" });
  };

  const handleViewMyProperties = () => {
    navigation.navigate("OwnerNavigator", {
      screen: "Properties",
      params: { initialTab: "Pending" },
    });
  };

  const handleAddAnother = () => {
    navigation.navigate("OwnerNavigator", {
      screen: "Add",
      params: { resetForm: Date.now(), initialStep: 1, editingProperty: null },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER: Circular Back Button | Centered Title */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#111111" strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Listing Submitted</Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <CheckCircle2 size={54} color={COLORS.success} strokeWidth={2.3} />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Property Submitted Successfully</Text>
        <Text style={styles.subtitle}>Your property has been sent for verification.</Text>

        {/* Status Badge */}
        <View style={styles.statusBox}>
          <Clock size={16} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={styles.statusLabel}>Current Status: </Text>
          <StatusBadge status="Pending Verification" />
        </View>

        {/* Property Quick Summary Card */}
        {property && (
          <View style={styles.propertyCard}>
            {property.coverPhoto && (
              <Image source={{ uri: property.coverPhoto }} style={styles.propertyThumb} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {property.title}
              </Text>
              <Text style={styles.propertyLocality}>
                {property.locality}, {property.city}
              </Text>
              <Text style={styles.propertyPrice}>{property.priceFormatted}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Our verification team typically validates property ownership within 2 to 4 business hours. You'll receive a push notification once your listing goes live.
          </Text>
        </View>

        {/* Buttons: View My Properties (Primary) & Add Another Property */}
        <View style={styles.buttonStack}>
          <PrimaryButton
            title="View My Properties"
            onPress={handleViewMyProperties}
            icon={Building2}
            style={styles.primaryBtn}
          />

          <SecondaryButton
            title="Add Another Property"
            onPress={handleAddAnother}
            icon={Plus}
            variant="outline"
            style={styles.secondaryBtn}
          />

          <TouchableOpacity
            style={styles.backLinkBtn}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backLinkText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111111",
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 6,
    borderColor: "#D1FAE5",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textDark,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "400",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#92400E",
  },
  propertyCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 16,
  },
  propertyThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  propertyLocality: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    textAlign: "center",
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
  backLinkBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
});
