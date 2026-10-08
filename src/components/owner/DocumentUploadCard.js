import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FileText, ShieldCheck, Plus, Lock, X } from "lucide-react-native";
import COLORS from "../../constants/colors";

export default function DocumentUploadCard({
  documents = [],
  onUploadDocument,
  onRemoveDocument,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Documents & Verification</Text>
          <Text style={styles.subtitle}>
            Upload ownership proof or tax receipts for priority verification
          </Text>
        </View>
      </View>

      {/* Privacy Notice Banner */}
      <View style={styles.privacyBanner}>
        <Lock size={14} color="#0D9488" style={{ marginRight: 6 }} />
        <Text style={styles.privacyText}>
          Confidential: Documents are strictly for RESTAMP verification and never displayed on public pages.
        </Text>
      </View>

      {/* Documents List */}
      {documents.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyDocBox}
          onPress={onUploadDocument}
          activeOpacity={0.8}
        >
          <FileText size={22} color={COLORS.muted} />
          <Text style={styles.emptyDocText}>No documents uploaded yet</Text>
          <Text style={styles.emptyDocSub}>
            Supported: PDF, JPG, PNG (Max 10MB per file)
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.docList}>
          {documents.map((doc, index) => (
            <View key={doc.id || index} style={styles.docItem}>
              <View style={styles.docIconWrap}>
                <FileText size={18} color="#111111" />
              </View>

              <View style={styles.docDetails}>
                <Text style={styles.docName} numberOfLines={1}>
                  {doc.name}
                </Text>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docType}>{doc.type}</Text>
                  <View style={styles.dot} />
                  <View style={styles.statusRow}>
                    <ShieldCheck size={11} color={COLORS.success} style={{ marginRight: 3 }} />
                    <Text style={styles.statusText}>{doc.status || "Uploaded"}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onRemoveDocument?.(doc.id || index)}
                activeOpacity={0.7}
              >
                <X size={16} color="#111111" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* "Add one more document" row matching reference design */}
      <TouchableOpacity
        style={styles.addMoreRow}
        onPress={onUploadDocument}
        activeOpacity={0.75}
      >
        <Text style={styles.addMoreText}>Add one more document</Text>
        <View style={styles.blackAddCircle}>
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    paddingRight: 8,
    fontWeight: "400",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  privacyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: "#0F766E",
    lineHeight: 15,
    fontWeight: "400",
  },
  emptyDocBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyDocText: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textDark,
    marginTop: 6,
  },
  emptyDocSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  docList: {
    gap: 10,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  docMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  docType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.muted,
    marginHorizontal: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.success,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
