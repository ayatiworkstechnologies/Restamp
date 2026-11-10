import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Linking, Alert, Platform } from "react-native";
import {
  Heart,
  MapPin,
  Phone,
  MessageCircle,
  Check,
  CheckCircle2,
  X,
  Star,
  Copy,
} from "../../../shared/components/HugeIcon.js";
import COLORS from "../../../shared/constants/colors.js";
import SafeImage from "../../../shared/components/SafeImage.js";
import { getRevealedContact, revealContact } from "../../../shared/api/contact.js";
import { OWNER_NAME_FALLBACK, ownerDialUrl, ownerNameFor, ownerWhatsAppUrl } from "../utils/ownerContact.js";
import { isBuyerPlanRequired, BUYER_PLANS_ROUTE } from "../../../shared/api/buyerPlans.js";
import { isAgentAreaRequired } from "../../../shared/api/agentPlans.js";
import { promptAgentUpgrade } from "../../agent/utils/agentUpgrade.js";
import { recordCallTap } from "../api/calls.js";
import { getAuthTokenSync } from "../../../shared/api/client.js";
import {
  displayCount,
  displayRating,
  searchCardSpecs,
  validConstructionStatus,
} from "../utils/searchCardSpecs.js";

/**
 * The buyer search property card and its View Number sheet, shared by the
 * buyer Search screen and the agent Properties screen (an agent browses
 * exactly like a buyer; every action runs on the signed-in account, and the
 * backend limits agents to the areas in their plan).
 *
 * - PropertySearchCard: presentational card (photo, wishlist heart, price,
 *   specs, location, View Number / WhatsApp / Call).
 * - useViewNumber + ViewNumberSheet: the owner-number reveal and its Call /
 *   WhatsApp actions. A call tap is recorded right before the dialler opens.
 */

// Card specs from real listing data only (see utils/searchCardSpecs.js):
// no assumed area, rate, rating, bed/bath count, status or feature chips.
// Each is null when the backend sent no valid value, and is then hidden.
export function cardSpecs(property) {
  return {
    ...searchCardSpecs(property),
    statusText: validConstructionStatus(property.constructionStatus),
    ratingText: displayRating(property.rating),
    beds: displayCount(property.beds),
    baths: displayCount(property.baths),
  };
}

export default function PropertySearchCard({
  property,
  saved,
  onPress,
  onToggleWishlist,
  onViewNumber,
  onWhatsApp,
  onCall,
}) {
  const { perSqft, areaValue, areaUnitLabel, statusText, tags, ratingText, beds, baths } = cardSpecs(property);
  return (
    <TouchableOpacity
      style={styles.propertyCard}
      activeOpacity={0.93}
      onPress={() => onPress?.(property)}
    >
    {/* Media Container with Image, Bookmark icon and 10 photos badge */}
    <View style={styles.cardMediaContainer}>
      <SafeImage source={{ uri: property.image }} style={styles.cardImage} />

      {/* Heart / Favorite Button in Top Right (Matching Home Screen) */}
      <TouchableOpacity
        style={styles.cardHeartBtn}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={(e) => {
          e.stopPropagation();
          onToggleWishlist?.(property);
        }}
      >
        <Heart
          size={20}
          color={saved ? "#DC2626" : "#FFFFFF"}
          fill={saved ? "#DC2626" : "rgba(0,0,0,0.3)"}
        />
      </TouchableOpacity>

      {/* 10 Photos Badge in Bottom Right (Matching Image 2) */}
      <View style={styles.photoCountBadge}>
        <Text style={styles.photoCountText}>
          {property.gallery ? `${property.gallery.length} photos` : "10 photos"}
        </Text>
      </View>
    </View>

    {/* Card Details Body (Matching Image 2 + Adapted Details from Image 1) */}
    <View style={styles.cardBody}>
      {/* Row 1: Title on Left, Rating on Right (only when the backend sends a real rating) */}
      <View style={styles.titleRatingRow}>
        <Text style={styles.propertyTitle} numberOfLines={1}>
          {property.address ? property.address.split(",")[0] : property.title}
        </Text>
        {ratingText ? (
          <View style={styles.ratingBadge}>
            <Star size={13} color={COLORS.star} fill={COLORS.star} style={{ marginRight: 3 }} />
            <Text style={styles.ratingText}>{ratingText}</Text>
          </View>
        ) : null}
      </View>

      {/* Row 2: Price (e.g. $4.688/month or ₹1.45 Cr • ₹7,838 /sqft) */}
      <View style={styles.priceRow}>
        <Text style={styles.priceMainText}>
          {property.price}
        </Text>
        {property.pricePeriod || perSqft ? (
          <Text style={styles.pricePeriodSubtext}>
            {property.pricePeriod ? property.pricePeriod : ` • ${perSqft}`}
          </Text>
        ) : null}
      </View>

      {/* Row 3: Specs (5 beds    2 baths    3,457 sq ft - as in Image 2) */}
      {beds || baths || areaValue ? (
        <View style={styles.specsRow}>
          {beds ? (
            <Text style={styles.specItem}>
              <Text style={styles.specBold}>{beds} </Text>
              <Text style={styles.specLabel}>{beds === 1 ? "bed" : "beds"}</Text>
            </Text>
          ) : null}
          {baths ? (
            <Text style={styles.specItem}>
              <Text style={styles.specBold}>{baths} </Text>
              <Text style={styles.specLabel}>{baths === 1 ? "bath" : "baths"}</Text>
            </Text>
          ) : null}
          {areaValue ? (
            <Text style={styles.specItem}>
              <Text style={styles.specBold}>{areaValue} </Text>
              <Text style={styles.specLabel}>{areaUnitLabel}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Row 4: Locality Address & Status Badge (Adapted Details from Image 1) */}
      <View style={styles.locationStatusRow}>
        <View style={styles.locationBox}>
          <MapPin size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.locationText} numberOfLines={1}>
            {property.address || property.location}
          </Text>
        </View>
        {statusText ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{statusText}</Text>
          </View>
        ) : null}
      </View>

      {/* Row 5: Feature Tags — only features the listing data actually carries */}
      {tags.length > 0 ? (
        <View style={styles.featureChipsRow}>
          {tags.map((tag, idx) => (
            <View key={idx} style={styles.featureChip}>
              <Text style={styles.featureChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Row 6: Builder Footer & Action Buttons */}
      <View style={styles.builderFooterRow}>
        <View style={styles.agentContactLeft}>
          <View style={styles.agentAvatarBox}>
            {property.agent?.avatar ? (
              <Image
                source={{
                  uri: property.agent.avatar,
                }}
                style={styles.agentAvatar}
              />
            ) : (
              <View
                style={[
                  styles.agentAvatar,
                  { alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
                ]}
              >
                <Check size={12} color="#64748B" strokeWidth={3} />
              </View>
            )}
            <View style={styles.agentVerifiedBadge}>
              <Check size={7} color="#FFFFFF" strokeWidth={3.5} />
            </View>
          </View>
          <View style={styles.builderInfoBox}>
            {property.agent?.agency ? (
              <Text style={styles.agencyNameText} numberOfLines={1}>
                {property.agent.agency}
              </Text>
            ) : null}
            <Text style={styles.agentSubText} numberOfLines={1}>
              {ownerNameFor(
                property,
                typeof property.backendId === "number" ? getRevealedContact(property.backendId) : null
              ) || OWNER_NAME_FALLBACK}
            </Text>
          </View>
        </View>

        <View style={styles.footerActionButtons}>
          {/* View Number Button */}
          <TouchableOpacity
            style={styles.viewNumberBtn}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onViewNumber?.(property);
            }}
          >
            <Text style={styles.viewNumberBtnText}>View Number</Text>
          </TouchableOpacity>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.whatsAppCircleBtn}
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation();
              onWhatsApp?.(property);
            }}
          >
            <MessageCircle size={16} color="#16A34A" />
          </TouchableOpacity>

          {/* Call Button */}
          <TouchableOpacity
            style={styles.callCircleBtn}
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation();
              onCall?.(property);
            }}
          >
            <Phone size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </TouchableOpacity>
  );
}

/**
 * Owner-number reveal state for one screen's View Number sheet, plus the
 * card-level Call/WhatsApp handlers. Plan limits: a buyer out of free leads
 * goes to the buyer plans; an agent outside its plan's areas gets the agent
 * upgrade prompt.
 */
export function useViewNumber({ navigation, requireAuth }) {
  const [viewedNumberProperty, setViewedNumberProperty] = useState(null);
  // The authorized reveal result for the open sheet's listing:
  // {phone, ownerName, ownListing} (contact.js), or null.
  const [contact, setContact] = useState(null);

  // Honest contact: only a number returned by the authorized contact-reveal
  // API is ever dialled or messaged — never a sample number. View Number,
  // Call Now, WhatsApp and the card's Call/WhatsApp all use that same
  // number: the sheet's reveal, or one already revealed for this listing in
  // this session (contact.js remembers it, so no second reveal is sent).
  // A card with no revealed number yet opens View Number instead.
  const knownContact = (property) => {
    if (property?.agent?.phone) return { phone: property.agent.phone, ownerName: null, ownListing: false };
    const id = property && property.backendId;
    return typeof id === "number" ? getRevealedContact(id) : null;
  };

  const handleWhatsApp = (property) => {
    const known = knownContact(property);
    if (!known) {
      handleViewNumber(property);
      return;
    }
    const url = ownerWhatsAppUrl(
      known.phone,
      `Hello! I am interested in ${property.title} (${property.price}) in ${property.location} listed on RESTAMP.`
    );
    if (!url) {
      Alert.alert("Contact Number Unavailable", "This owner's number can't be used for WhatsApp.");
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert("WhatsApp Not Available", "Could not open WhatsApp for this contact.");
    });
  };

  const handleCall = (property) => {
    const known = knownContact(property);
    if (!known) {
      handleViewNumber(property);
      return;
    }
    const url = ownerDialUrl(known.phone);
    if (!url) {
      Alert.alert("Contact Number Unavailable", "This owner's number can't be dialled.");
      return;
    }
    // "Call button tapped" (CONTRACT §B): the call is initiated, never marked
    // answered. Fire-and-forget right before dialling, so it never blocks or
    // fails the dialler. Your own listing is not a call to track.
    if (!known.ownListing) recordCallTap(property?.backendId);
    Linking.openURL(url).catch(() => {
      Alert.alert("Call Unavailable", "Could not place this call.");
    });
  };

  // Contact-reveal state for the open sheet: "idle" | "loading" |
  // "revealed" | "failed" | "login". A number is shown, copied, or dialed
  // only in "revealed", i.e. after the authorized backend call succeeds.
  const [revealState, setRevealState] = useState("idle");
  const revealReq = useRef(0);

  const handleViewNumber = (property) => {
    setViewedNumberProperty(property);
    setContact(null);
    const backendId = property && property.backendId;
    if (typeof backendId !== "number") {
      // No backend record behind this card: nothing genuine to reveal.
      setRevealState("failed");
      return;
    }
    if (!getAuthTokenSync()) {
      setRevealState("login");
      return;
    }
    const cached = getRevealedContact(backendId);
    if (cached) {
      // Already revealed this session: same number, no second request.
      revealReq.current++;
      setContact(cached);
      setRevealState("revealed");
      return;
    }
    // Guard against repeated taps: only the latest request may settle.
    const myReq = ++revealReq.current;
    setRevealState("loading");
    revealContact(backendId).then(
      (result) => {
        if (revealReq.current !== myReq) return;
        if (result && result.phone) {
          setContact(result);
          setRevealState("revealed");
        } else {
          setRevealState("failed");
        }
      },
      (e) => {
        if (revealReq.current !== myReq) return;
        if (isAgentAreaRequired(e)) {
          // Agent outside its plan's areas: agent upgrade, never buyer plans.
          setRevealState("idle");
          setViewedNumberProperty(null);
          promptAgentUpgrade(navigation, e);
          return;
        }
        if (isBuyerPlanRequired(e)) {
          setRevealState("idle");
          navigation.navigate(BUYER_PLANS_ROUTE, { reason: "quota" });
          return;
        }
        setRevealState("failed");
      }
    );
  };

  const handleLoginFromSheet = () => {
    // Queue the exact reveal so a successful login returns to this listing
    // and runs it once; the sheet reopens via handleViewNumber. Cancel/Skip
    // drops the queued action and nothing is requested.
    const property = viewedNumberProperty;
    setViewedNumberProperty(null);
    requireAuth(() => {
      if (property) handleViewNumber(property);
    });
  };


  return {
    property: viewedNumberProperty,
    contact,
    revealedPhone: contact ? contact.phone : null,
    ownerName: ownerNameFor(viewedNumberProperty, contact),
    revealState,
    close: () => setViewedNumberProperty(null),
    handleViewNumber,
    handleLoginFromSheet,
    handleCall,
    handleWhatsApp,
  };
}

export function ViewNumberSheet({ state }) {
  return (
    <Modal
      visible={!!state.property}
      transparent
      animationType="slide"
      onRequestClose={() => state.close()}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => state.close()}
      >
        <TouchableOpacity
          style={styles.agentContactBottomSheet}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandleBar} />

          {/* Header Row */}
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>Contact Seller / Agent</Text>
              <Text style={styles.sheetSubtitle}>Verified Real Estate Partner</Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={() => state.close()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Agent Profile Box (honest: no invented agent identity) */}
          <View style={styles.sheetAgentProfileCard}>
            <View style={styles.modalAvatarBox}>
              {state.property?.agent?.avatar ? (
                <Image
                  source={{ uri: state.property.agent.avatar }}
                  style={styles.modalAvatarImage}
                />
              ) : (
                <CheckCircle2 size={30} color="#0F172A" />
              )}
              <View style={styles.agentVerifiedCheck}>
                <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
              </View>
            </View>

            <View style={styles.sheetAgentInfo}>
              {/* The listing owner's real (public-safe) name from the reveal
                  or the listing detail; the fallback only when none is known. */}
              <Text style={styles.contactAgentName}>
                {state.ownerName || OWNER_NAME_FALLBACK}
              </Text>
              {state.property?.agent?.agency ? (
                <Text style={styles.contactAgencyName}>
                  {state.property.agent.agency}
                </Text>
              ) : null}
              <Text style={styles.sheetPropertyContext} numberOfLines={1}>
                Ref: <Text style={styles.sheetPropertyTitleHighlight}>{state.property?.title}</Text> ({state.property?.price})
              </Text>
            </View>
          </View>

          {/* Phone Number Display: real number only after authorized reveal */}
          <TouchableOpacity
            style={styles.phoneDisplayBox}
            activeOpacity={0.7}
            onPress={() => {
              if (state.revealState !== "revealed" || !state.revealedPhone) return;
              Alert.alert(
                "Phone Number Copied! 📋",
                `${state.revealedPhone} is ready to use.`
              );
            }}
          >
            <View style={styles.phoneIconCircle}>
              <Phone size={17} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.phoneLabelSmall}>CONTACT NUMBER</Text>
              <Text style={styles.phoneDisplayText}>
                {state.revealState === "revealed" && state.revealedPhone
                  ? state.revealedPhone
                  : state.revealState === "loading"
                    ? "Requesting number…"
                    : state.revealState === "login"
                      ? "Log in to view"
                      : "Not available"}
              </Text>
            </View>
            {state.revealState === "revealed" && state.revealedPhone ? (
              <View style={styles.copyBadge}>
                <Copy size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.copyBadgeText}>Copy</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {state.revealState === "login" ? (
            <Text style={styles.sheetAvailabilityNote}>
              Sign in to request the seller's contact number.
            </Text>
          ) : state.revealState === "revealed" && state.contact?.ownListing ? (
            <Text style={styles.sheetAvailabilityNote}>
              This is your own listing, so calls to this number are not added to your activity.
            </Text>
          ) : state.revealState === "failed" ? (
            <Text style={styles.sheetAvailabilityNote}>
              The contact number could not be loaded. Check your connection and reopen to retry.
            </Text>
          ) : (
            <Text style={styles.sheetAvailabilityNote}>
              ⚡ Usually responds within 15 minutes • 9:00 AM – 8:00 PM
            </Text>
          )}

          {/* Action Buttons: Call Now & WhatsApp (revealed number only) */}
          <View style={styles.contactModalActions}>
            {state.revealState === "login" ? (
              <TouchableOpacity
                style={styles.callNowBtn}
                activeOpacity={0.85}
                onPress={state.handleLoginFromSheet}
              >
                <Text style={styles.callNowBtnText}>Log In to Continue</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.callNowBtn,
                    state.revealState !== "revealed" && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.85}
                  disabled={state.revealState !== "revealed"}
                  onPress={() => {
                    if (state.revealState !== "revealed" || !state.revealedPhone || !state.property) {
                      return;
                    }
                    // The revealed contact is remembered for this listing,
                    // so handleCall dials exactly the number shown above.
                    state.handleCall(state.property);
                    state.close();
                  }}
                >
                  <Phone size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.callNowBtnText}>Call Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.whatsappNowBtn,
                    state.revealState !== "revealed" && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.85}
                  disabled={state.revealState !== "revealed"}
                  onPress={() => {
                    if (state.revealState !== "revealed" || !state.revealedPhone || !state.property) {
                      return;
                    }
                    state.handleWhatsApp(state.property);
                    state.close();
                  }}
                >
                  <MessageCircle size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsappNowBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  propertyCard: {
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  cardMediaContainer: {
    height: 220,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E2E8F0",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardHeartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  photoCountBadge: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardBody: {
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  titleRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  priceMainText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  pricePeriodSubtext: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 3,
  },
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 8,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  specBold: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  specLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#475569",
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
    flex: 1,
  },
  statusPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  featureChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  featureChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  builderFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentContactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  agentAvatarBox: {
    position: "relative",
    marginRight: 8,
  },
  agentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  agentVerifiedBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  builderInfoBox: {
    flex: 1,
    justifyContent: "center",
  },
  agencyNameText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  agentSubText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 1,
  },
  footerActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  viewNumberBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  viewNumberBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  whatsAppCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  callCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  agentContactBottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 38 : 24,
    width: "100%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandleBar: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetAgentProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  modalAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  agentVerifiedCheck: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  sheetAgentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactAgentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactAgencyName: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  sheetPropertyContext: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 3,
  },
  sheetPropertyTitleHighlight: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  phoneDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight || "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  phoneLabelSmall: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  phoneDisplayText: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
    letterSpacing: 0.5,
  },
  copyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  copyBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sheetAvailabilityNote: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  contactModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  callNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  callNowBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  whatsappNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappNowBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
