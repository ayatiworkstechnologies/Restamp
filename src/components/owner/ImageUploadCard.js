import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import { Camera, Plus, Trash2, Star, Check } from "lucide-react-native";
import COLORS from "../../constants/colors";

export default function ImageUploadCard({
  categoryTitle,
  photos = [],
  coverPhoto,
  onAddPhoto,
  onRemovePhoto,
  onSetCoverPhoto,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{categoryTitle}</Text>
          <Text style={styles.categorySubtitle}>
            {photos.length} photo{photos.length === 1 ? "" : "s"} added
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAddPhoto}
          activeOpacity={0.8}
        >
          <Plus size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyUploadBox}
          onPress={onAddPhoto}
          activeOpacity={0.7}
        >
          <Camera size={22} color={COLORS.muted} />
          <Text style={styles.emptyUploadText}>Upload photos for {categoryTitle}</Text>
          <Text style={styles.emptyUploadSub}>Tap to browse gallery or capture</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailsRow}
        >
          {photos.map((item, index) => {
            const isCover = coverPhoto === item.url;
            return (
              <View key={item.id || index} style={styles.thumbnailContainer}>
                <Image source={{ uri: item.url }} style={styles.thumbnailImage} />

                {isCover && (
                  <View style={styles.coverBadge}>
                    <Star size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.coverBadgeText}>COVER</Text>
                  </View>
                )}

                <View style={styles.thumbnailActions}>
                  {!isCover && (
                    <TouchableOpacity
                      style={styles.iconBtnAction}
                      onPress={() => onSetCoverPhoto?.(item.url)}
                      activeOpacity={0.8}
                    >
                      <Star size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.iconBtnAction, { backgroundColor: "rgba(220, 38, 38, 0.85)" }]}
                    onPress={() => onRemovePhoto?.(item.id || index)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  categorySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
    fontWeight: "400",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary,
  },
  emptyUploadBox: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  emptyUploadText: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textDark,
    marginTop: 6,
  },
  emptyUploadSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "400",
  },
  thumbnailsRow: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 12,
  },
  thumbnailContainer: {
    width: 110,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  coverBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  coverBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  thumbnailActions: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    gap: 6,
  },
  iconBtnAction: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
});
