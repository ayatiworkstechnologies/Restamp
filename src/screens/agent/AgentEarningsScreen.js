import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Wallet,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileText,
  Download,
  Share2,
  X,
  ChevronRight,
  TrendingUp,
  MapPin,
  Phone,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react-native";

import COLORS from "../../constants/colors";
import { useAgent } from "../../context/AgentContext";
import StatusBadge from "../../components/owner/StatusBadge";

const FILTER_TABS = [
  { id: "all", label: "All Payouts" },
  { id: "paid", label: "Paid" },
  { id: "processing", label: "In Processing" },
  { id: "pending", label: "Pending" },
];

export default function AgentEarningsScreen({ navigation }) {
  const {
    agentProfile,
    earningsTransactions = [],
    selectedLocalities,
  } = useAgent();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Filter transactions based on tab
  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return earningsTransactions;
    return earningsTransactions.filter((tx) => tx.payoutStatus === activeTab);
  }, [earningsTransactions, activeTab]);

  // Aggregate stats
  const totalEarned = useMemo(() => {
    return earningsTransactions.reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);
  }, [earningsTransactions]);

  const totalPaid = useMemo(() => {
    return earningsTransactions
      .filter((tx) => tx.payoutStatus === "paid")
      .reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);
  }, [earningsTransactions]);

  const totalProcessing = useMemo(() => {
    return earningsTransactions
      .filter((tx) => tx.payoutStatus === "processing")
      .reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);
  }, [earningsTransactions]);

  const totalPending = useMemo(() => {
    return earningsTransactions
      .filter((tx) => tx.payoutStatus === "pending")
      .reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);
  }, [earningsTransactions]);

  const handleDownloadInvoice = (invoice) => {
    Alert.alert(
      "Invoice Downloaded 📄",
      `Tax Invoice #${invoice.invoiceId} has been saved to your downloads as PDF.`
    );
  };

  const handleShareInvoice = async (invoice) => {
    try {
      await Share.share({
        message: `RESTAMP Agent Commission Statement\nInvoice: ${invoice.invoiceId}\nAgent: ${agentProfile?.name || "Vikram Prabhu"}\nAmount: ${invoice.commissionFormatted}\nStatus: ${invoice.payoutStatus.toUpperCase()}\nClient: ${invoice.clientName}`,
      });
    } catch (e) {
      // Fallback
    }
  };

  const handleShowBankInfo = () => {
    Alert.alert(
      "Verified Settlement Account",
      "Bank: HDFC Bank Limited\nAccount: •••• •••• 4892\nIFSC: HDFC0001234\nAccount Type: Current Account\nStatus: KYC VERIFIED & ACTIVE\n\nPayouts are automatically cleared every Monday via NEFT/RTGS direct settlement."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Earnings & Commission</Text>
          <Text style={styles.headerSubtitle}>
            Payouts, Commission Breakdown & Invoices
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerInfoBtn}
          onPress={handleShowBankInfo}
          activeOpacity={0.7}
        >
          <ShieldCheck size={20} color="#16A34A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO BALANCE CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>TOTAL COMMISSION EARNED</Text>
              <Text style={styles.heroAmount}>
                ₹{totalEarned.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroGrowthBadge}>
              <TrendingUp size={13} color="#22C55E" style={{ marginRight: 4 }} />
              <Text style={styles.heroGrowthText}>+18.4%</Text>
            </View>
          </View>

          {/* Sub Stats Row */}
          <View style={styles.heroSubStatsRow}>
            <View style={styles.heroSubStatItem}>
              <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />
              <View>
                <Text style={styles.heroSubStatLabel}>Paid</Text>
                <Text style={styles.heroSubStatVal}>
                  ₹{totalPaid.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <View style={styles.heroSubStatDivider} />

            <View style={styles.heroSubStatItem}>
              <View style={[styles.statusDot, { backgroundColor: "#38BDF8" }]} />
              <View>
                <Text style={styles.heroSubStatLabel}>Processing</Text>
                <Text style={styles.heroSubStatVal}>
                  ₹{totalProcessing.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <View style={styles.heroSubStatDivider} />

            <View style={styles.heroSubStatItem}>
              <View style={[styles.statusDot, { backgroundColor: "#FBBF24" }]} />
              <View>
                <Text style={styles.heroSubStatLabel}>Pending</Text>
                <Text style={styles.heroSubStatVal}>
                  ₹{totalPending.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* Next Payout Alert Banner */}
          <View style={styles.heroNextPayoutBanner}>
            <Clock size={14} color="#93C5FD" style={{ marginRight: 6 }} />
            <Text style={styles.heroNextPayoutText}>
              Next scheduled payout: <Text style={styles.heroNextPayoutAccent}>₹24,000</Text> on Oct 10, 2026
            </Text>
          </View>
        </View>

        {/* 2. LINKED SETTLEMENT BANK ACCOUNT */}
        <TouchableOpacity
          style={styles.bankCard}
          onPress={handleShowBankInfo}
          activeOpacity={0.85}
        >
          <View style={styles.bankIconWrap}>
            <Building2 size={20} color={COLORS.primary} />
          </View>
          <View style={styles.bankInfoCol}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.bankNameText}>HDFC Bank Limited</Text>
              <View style={styles.verifiedMiniBadge}>
                <ShieldCheck size={11} color="#16A34A" style={{ marginRight: 3 }} />
                <Text style={styles.verifiedMiniText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.bankAccountSub}>
              A/C •••• 4892 • IFSC HDFC0001234 • Auto Settlement
            </Text>
          </View>
          <ChevronRight size={16} color="#94A3B8" />
        </TouchableOpacity>

        {/* 3. SECTION TITLE & FILTER TABS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Commission Breakdown</Text>
          <Text style={styles.sectionSubCount}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "Deal" : "Deals"}
          </Text>
        </View>

        <View style={styles.tabsRow}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 4. TRANSACTIONS LIST */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wallet size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No deals found</Text>
            <Text style={styles.emptySub}>
              There are no commission payouts matching this filter.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const isPaid = tx.payoutStatus === "paid";
            const isProcessing = tx.payoutStatus === "processing";

            return (
              <View key={tx.id} style={styles.dealCard}>
                {/* Deal Card Header */}
                <View style={styles.dealCardTop}>
                  <View style={styles.dealClientWrap}>
                    <Text style={styles.clientName}>{tx.clientName}</Text>
                    <View style={styles.dealTypePill}>
                      <Text style={styles.dealTypePillText}>{tx.dealType}</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.payoutBadge,
                      isPaid
                        ? styles.payoutBadgePaid
                        : isProcessing
                        ? styles.payoutBadgeProcessing
                        : styles.payoutBadgePending,
                    ]}
                  >
                    {isPaid ? (
                      <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 4 }} />
                    ) : (
                      <Clock
                        size={12}
                        color={isProcessing ? "#0284C7" : "#D97706"}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={[
                        styles.payoutBadgeText,
                        isPaid
                          ? styles.payoutBadgeTextPaid
                          : isProcessing
                          ? styles.payoutBadgeTextProcessing
                          : styles.payoutBadgeTextPending,
                      ]}
                    >
                      {isPaid ? "Paid" : isProcessing ? "In Processing" : "Pending Payout"}
                    </Text>
                  </View>
                </View>

                {/* Property & Locality */}
                <View style={styles.propLocRow}>
                  <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.propTitleText} numberOfLines={1}>
                    {tx.propertyTitle} ({tx.locality})
                  </Text>
                </View>

                {/* Financial Figures Row */}
                <View style={styles.figuresBox}>
                  <View style={styles.figureCol}>
                    <Text style={styles.figureLabel}>Deal Value</Text>
                    <Text style={styles.figureVal}>{tx.dealValue}</Text>
                  </View>

                  <View style={styles.figureCol}>
                    <Text style={styles.figureLabel}>Commission Rate</Text>
                    <Text style={styles.figureVal}>{tx.commissionRate}</Text>
                  </View>

                  <View style={[styles.figureCol, { alignItems: "flex-end" }]}>
                    <Text style={styles.figureLabel}>Brokerage Earned</Text>
                    <Text style={styles.figureAmountHighlight}>
                      +{tx.commissionFormatted}
                    </Text>
                  </View>
                </View>

                {/* Payout Meta & Reference */}
                <View style={styles.payoutMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Date: {tx.date}</Text>
                    <Text style={styles.metaSub}>
                      {isPaid
                        ? `Settled: ${tx.payoutDate}`
                        : `Target: ${tx.payoutDate}`}
                    </Text>
                  </View>

                  {tx.utrNumber && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.metaLabel}>UTR / Ref</Text>
                      <Text style={styles.metaSub} numberOfLines={1}>
                        {tx.utrNumber}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bottom Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={() => setSelectedInvoice(tx)}
                    activeOpacity={0.8}
                  >
                    <FileText size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.invoiceBtnText}>View Tax Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadIconBtn}
                    onPress={() => handleDownloadInvoice(tx)}
                    activeOpacity={0.7}
                  >
                    <Download size={15} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareIconBtn}
                    onPress={() => handleShareInvoice(tx)}
                    activeOpacity={0.7}
                  >
                    <Share2 size={15} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 5. COMMISSION & TDS POLICY EXPLAINER */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Sparkles size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.policyTitle}>RESTAMP Partner Commission Terms</Text>
          </View>
          <Text style={styles.policyText}>
            • 100% direct brokerage passed to verified Agent Partners with 0% platform take rate.
          </Text>
          <Text style={styles.policyText}>
            • TDS deducted at 5% as per Section 194H of the Indian Income Tax Act. Form 16A is generated quarterly.
          </Text>
          <Text style={styles.policyText}>
            • Payouts are directly credited to your verified bank account upon client token execution.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* TAX INVOICE DETAIL MODAL */}
      <Modal
        visible={!!selectedInvoice}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.invoiceModalCard}>
            {/* Modal Header */}
            <View style={styles.invoiceModalHeader}>
              <View>
                <Text style={styles.invoiceModalTitle}>Commission Tax Invoice</Text>
                <Text style={styles.invoiceModalSubtitle}>
                  Invoice #{selectedInvoice?.invoiceId}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedInvoice(null)}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.invoiceModalScroll} showsVerticalScrollIndicator={false}>
              {/* Slip Body */}
              <View style={styles.slipCard}>
                <View style={styles.slipBrandRow}>
                  <Text style={styles.slipBrandName}>RESTAMP REALTECH</Text>
                  <View style={styles.slipStatusBadge}>
                    <Text style={styles.slipStatusText}>
                      {selectedInvoice?.payoutStatus?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.slipSubText}>
                  Authorized Agent Commission Settlement Statement
                </Text>

                <View style={styles.slipDivider} />

                {/* Agent & Client Details */}
                <View style={styles.slipPartyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partyRole}>AGENT PARTNER</Text>
                    <Text style={styles.partyName}>{agentProfile?.name || "Vikram Prabhu"}</Text>
                    <Text style={styles.partyMeta}>
                      RERA: {agentProfile?.reraNumber || "TN/AGENT/2024/00842"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.partyRole}>CLIENT</Text>
                    <Text style={styles.partyName}>{selectedInvoice?.clientName}</Text>
                    <Text style={styles.partyMeta}>{selectedInvoice?.locality}</Text>
                  </View>
                </View>

                <View style={styles.slipDivider} />

                {/* Property & Deal Information */}
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Property</Text>
                  <Text style={styles.slipDetailVal}>{selectedInvoice?.propertyTitle}</Text>
                </View>
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Deal Value</Text>
                  <Text style={styles.slipDetailVal}>{selectedInvoice?.dealValue}</Text>
                </View>
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Commission Structure</Text>
                  <Text style={styles.slipDetailVal}>{selectedInvoice?.commissionRate}</Text>
                </View>

                <View style={styles.slipDivider} />

                {/* Financial Math Table */}
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Gross Commission Amount</Text>
                  <Text style={styles.slipDetailBoldVal}>
                    {selectedInvoice?.commissionFormatted}
                  </Text>
                </View>
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>TDS (Sec 194H @ 5%)</Text>
                  <Text style={[styles.slipDetailBoldVal, { color: "#DC2626" }]}>
                    -₹{(selectedInvoice?.tdsDeducted || 0).toLocaleString("en-IN")}
                  </Text>
                </View>

                <View style={[styles.slipDivider, { marginVertical: 10 }]} />

                <View style={styles.slipTotalRow}>
                  <Text style={styles.slipTotalKey}>Net Disbursed to Bank</Text>
                  <Text style={styles.slipTotalVal}>
                    ₹{(selectedInvoice?.netDisbursed || 0).toLocaleString("en-IN")}
                  </Text>
                </View>

                <View style={styles.slipDivider} />

                {/* Settlement Account info */}
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Settlement Account</Text>
                  <Text style={styles.slipDetailVal}>
                    {selectedInvoice?.bankAccount || "HDFC Bank •••• 4892"}
                  </Text>
                </View>
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>UTR Reference</Text>
                  <Text style={styles.slipDetailVal}>
                    {selectedInvoice?.utrNumber || "CMS49281740921"}
                  </Text>
                </View>
                <View style={styles.slipDetailRow}>
                  <Text style={styles.slipDetailKey}>Settlement Date</Text>
                  <Text style={styles.slipDetailVal}>{selectedInvoice?.payoutDate}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.invoiceModalFooter}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => selectedInvoice && handleShareInvoice(selectedInvoice)}
                activeOpacity={0.8}
              >
                <Share2 size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.modalSecondaryBtnText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => selectedInvoice && handleDownloadInvoice(selectedInvoice)}
                activeOpacity={0.88}
              >
                <Download size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.modalPrimaryBtnText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  headerInfoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // 1. Hero Card
  heroCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroGrowthBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  heroGrowthText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#22C55E",
  },
  heroSubStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  heroSubStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  heroSubStatLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  heroSubStatVal: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 1,
  },
  heroSubStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
  heroNextPayoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 14,
  },
  heroNextPayoutText: {
    fontSize: 11,
    color: "#E2E8F0",
    fontWeight: "500",
  },
  heroNextPayoutAccent: {
    color: "#60A5FA",
    fontWeight: "700",
  },

  // 2. Bank Account Strip
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  bankIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bankInfoCol: {
    flex: 1,
  },
  bankNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  verifiedMiniBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  verifiedMiniText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#16A34A",
  },
  bankAccountSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  // 3. Section Title & Tabs
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionSubCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },

  // 4. Deal / Transaction Cards
  dealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dealCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dealClientWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  clientName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 8,
  },
  dealTypePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dealTypePillText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  payoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  payoutBadgePaid: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  payoutBadgeProcessing: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  payoutBadgePending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  payoutBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  payoutBadgeTextPaid: {
    color: "#16A34A",
  },
  payoutBadgeTextProcessing: {
    color: "#0284C7",
  },
  payoutBadgeTextPending: {
    color: "#D97706",
  },

  propLocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  propTitleText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },

  figuresBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 10,
  },
  figureCol: {
    flex: 1,
  },
  figureLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  figureVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginTop: 2,
  },
  figureAmountHighlight: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
    marginTop: 1,
  },

  payoutMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metaLabel: {
    fontSize: 10.5,
    color: "#64748B",
  },
  metaSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },

  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  invoiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  downloadIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  shareIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  // 5. Policy Card
  policyCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  policyText: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  invoiceModalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  invoiceModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  invoiceModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  invoiceModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceModalScroll: {
    padding: 16,
  },

  slipCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
  },
  slipBrandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slipBrandName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  slipStatusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slipStatusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  slipSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  slipDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  slipPartyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  partyRole: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  partyMeta: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },

  slipDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  slipDetailKey: {
    fontSize: 12,
    color: "#4B5563",
  },
  slipDetailVal: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
  slipDetailBoldVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
  },

  slipTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 10,
    borderRadius: 8,
  },
  slipTotalKey: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  slipTotalVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  invoiceModalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalPrimaryBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
