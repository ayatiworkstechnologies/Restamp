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
import { CheckCircle2, Building2, Plus, Clock, ArrowLeft } from "../../components/common/HugeIcon";
import COLORS from "../../constants/colors";
import { freshAddParams } from "../../api/owner";
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
      params: freshAddParams(),
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
        <Text style={styles.subtitle}>Your property has been submitted for backend verification. You’ll be notified once verification is complete.</Text>

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
            Your listing is saved as Pending Verification and is not visible to buyers yet. It will
            automatically become Active within 2 minutes. You can pull to refresh in My Properties
            to see the updated status.
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
        </View>

        <View style={{ height: 40 }} />
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#92400E",
  },
  propertyCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 14,
    marginBottom: 16,
    width: "100%",
  },
  propertyThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 4,
  },
  propertyLocality: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 20,
    width: "100%",
  },
  infoText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
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