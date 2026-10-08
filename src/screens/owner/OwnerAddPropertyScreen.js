import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  MapPin,
  Building,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Crown,
  Sparkles,
  Layers,
  Edit,
  Plus,
  Minus,
  Check,
  X,
  Trash2,
  Star,
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Camera,
  Image as ImageIcon,
  Compass,
  Shield,
  ShieldCheck,
  Eye,
  Info,
  Car,
  Clock,
} from "lucide-react-native";
import COLORS from "../../constants/colors";
import { useOwner } from "../../context/OwnerContext";
import { createOwnerListing } from "../../api/owner";
import RestampLogo from "../../components/RestampLogo";
import StepIndicator from "../../components/owner/StepIndicator";
import FormInput from "../../components/owner/FormInput";
import SelectionChip from "../../components/owner/SelectionChip";
import ConfirmationModal from "../../components/owner/ConfirmationModal";

const RENT_STEPS = [
  { step: 1, label: "Basic", fullLabel: "Add Property" },
  { step: 2, label: "Location", fullLabel: "Property Location" },
  { step: 3, label: "Details", fullLabel: "Property Details" },
  { step: 4, label: "Pricing", fullLabel: "Rent & Deposit" },
  { step: 5, label: "Photos", fullLabel: "Photos & Details" },
  { step: 6, label: "Amenities", fullLabel: "Amenities" },
  { step: 7, label: "Review", fullLabel: "Review Property" },
];

const RESIDENTIAL_TYPES = [
  "Apartment",
  "Independent House / Villa",
  "Builder Floor",
  "Plot / Land",
  "Studio Apartment",
];

const COMMERCIAL_TYPES = [
  "Office",
  "Shop",
  "Showroom",
  "Commercial Building",
  "Warehouse / Godown",
  "Commercial Land",
  "Co-working Space",
];

const BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];

const BEDROOMS_OPTIONS = ["1", "2", "3", "4", "5", "5+"];
const BATHROOMS_OPTIONS = ["1", "2", "3", "4", "4+"];
const BALCONIES_OPTIONS = ["0", "1", "2", "3", "3+"];

const AVAILABILITY_STATUS_OPTIONS = ["Ready to Move", "Under Construction"];
const PROPERTY_AGE_OPTIONS = [
  "0–1 Year",
  "1–5 Years",
  "5–10 Years",
  "10+ Years",
];

const MAINTENANCE_FREQUENCY_OPTIONS = ["Monthly", "Quarterly", "Yearly"];
const TENANT_PREFERENCES = ["Family", "Bachelor", "Company", "Any"];
const LOCK_IN_OPTIONS = ["None", "6 Months", "1 Year", "2 Years"];
const AGREEMENT_DURATIONS = ["11 Months", "1 Year", "2 Years", "3 Years", "5 Years"];

const OTHER_ROOMS_OPTIONS = [
  "Pooja Room",
  "Study Room",
  "Servant Room",
  "Store Room",
  "Others",
];

const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Furnished"];

const OWNERSHIP_OPTIONS = [
  "Freehold",
  "Leasehold",
  "Co-operative Society",
  "Power of Attorney",
];

const INITIAL_PROPERTY_FEATURES = [
  "Recently Renovated",
  "Vastu Compliant",
  "High Ceiling",
  "False Ceiling Lighting",
  "Corner Property",
  "Pet Friendly",
];

const EXTRA_PROPERTY_FEATURES = [
  "Gated Community",
  "Modular Kitchen",
  "Solar Water Heater",
  "EV Charging Station",
  "Wheelchair Accessible",
  "Servant Quarters",
  "Natural Daylight",
  "Private Terrace",
];

const INITIAL_AMENITIES = [
  "Lift",
  "Security Guard",
  "CCTV",
  "Club House",
  "Gym",
  "Power Backup",
  "Park",
  "Swimming Pool",
  "Visitor Parking",
  "Intercom",
];

const EXTRA_AMENITIES = [
  "Children's Play Area",
  "Fire Fighting System",
  "Rainwater Harvesting",
  "Piped Gas",
  "Community Hall",
  "Waste Disposal",
];

const OPEN_SIDES_OPTIONS = ["1", "2", "3", "3+"];
const OVERLOOKING_OPTIONS = [
  "Pool",
  "Park",
  "Club",
  "Main Road",
  "Sea Facing",
  "Others",
];
const POWER_BACKUP_OPTIONS = ["None", "Partial", "Full"];
const PROPERTY_FACING_OPTIONS = [
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];

const PHOTO_CATEGORIES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Balcony",
  "Exterior",
  "Floor Plan",
];

const DEFAULT_SAMPLE_PHOTOS = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    category: "Living Room",
    isCover: true,
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80",
    category: "Bedroom",
    isCover: false,
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    category: "Kitchen",
    isCover: false,
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    category: "Bathroom",
    isCover: false,
  },
];

const SAMPLE_PHOTO_LIBRARY = {
  "Living Room": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  Bedroom: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80",
  Kitchen: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
  Bathroom: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
  Balcony: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  Exterior: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "Floor Plan": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
};

export default function OwnerAddPropertyScreen({ route, navigation }) {
  const {
    addProperty,
    subscription,
    ownerProfile,
    rentDraft,
    saveRentDraft,
    clearRentDraft,
  } = useOwner();

  // Mode: initial selection modal or direct form step
  const [purposeSelected, setPurposeSelected] = useState(
    route?.params?.editingProperty?.purpose || route?.params?.purpose || "Rent"
  );
  const [currentStep, setCurrentStep] = useState(
    route?.params?.initialStep || 1
  );

  // Edit Mode Jump Modal
  const [showEditStepModal, setShowEditStepModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showPhotoAddModal, setShowPhotoAddModal] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState("Living Room");
  const [showDateModal, setShowDateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Details
  const [lookingTo, setLookingTo] = useState(
    route?.params?.editingProperty?.lookingTo ||
      (route?.params?.editingProperty?.purpose === "Sell" || route?.params?.editingProperty?.purpose === "Resale"
        ? "Resale"
        : route?.params?.editingProperty?.purpose) ||
      (route?.params?.purpose === "Sell" || route?.params?.purpose === "Resale"
        ? "Resale"
        : route?.params?.purpose) ||
      "Rent"
  ); // Rent | Lease | Resale
  const [category, setCategory] = useState("Residential"); // Residential | Commercial
  const [propertyType, setPropertyType] = useState("Apartment");
  const [bhk, setBhk] = useState("2 BHK");
  const [phoneNumber, setPhoneNumber] = useState(
    ownerProfile?.phone || "+91 98401 23456"
  );
  const [email, setEmail] = useState(
    ownerProfile?.email || "rajesh.kumar@example.com"
  );

  // Step 2: Location
  const [city, setCity] = useState("Chennai");
  const [district, setDistrict] = useState("Chennai");
  const [locality, setLocality] = useState("Anna Nagar");
  const [subLocality, setSubLocality] = useState("5th Avenue, Shanthi Colony");
  const [apartmentSociety, setApartmentSociety] = useState("Green Acres Residency");
  const [houseNo, setHouseNo] = useState("Flat 402, Block B");
  const [landmark, setLandmark] = useState("Opposite Tower Park");
  const [mapLocationSet, setMapLocationSet] = useState(true);

  // Step 3: Property Details
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("2");
  const [balconies, setBalconies] = useState("2");
  const [carpetArea, setCarpetArea] = useState("1200");
  const [builtUpArea, setBuiltUpArea] = useState("1380");
  const [superBuiltUpArea, setSuperBuiltUpArea] = useState("1550");
  const [totalFloors, setTotalFloors] = useState("8");
  const [floorOn, setFloorOn] = useState("3");
  const [duplex, setDuplex] = useState("No");
  const [availabilityStatus, setAvailabilityStatus] = useState("Ready to Move");
  const [propertyAge, setPropertyAge] = useState("1–5 Years");

  // Step 4: Pricing
  const [monthlyRent, setMonthlyRent] = useState("25000");
  const [securityDeposit, setSecurityDeposit] = useState("100000");
  const [maintenanceCharges, setMaintenanceCharges] = useState("3000");
  const [maintenanceFrequency, setMaintenanceFrequency] = useState("Monthly");
  const [rentNegotiable, setRentNegotiable] = useState("No");
  const [availableFrom, setAvailableFrom] = useState("25 Sep 2026");
  const [tenantPreference, setTenantPreference] = useState("Family");
  const [lockInPeriod, setLockInPeriod] = useState("1 Year");
  const [preferredAgreementDuration, setPreferredAgreementDuration] = useState("11 Months");

  // Step 5: Photos & Details
  const [photosList, setPhotosList] = useState(DEFAULT_SAMPLE_PHOTOS);
  const [otherRooms, setOtherRooms] = useState(["Pooja Room"]);
  const [furnishing, setFurnishing] = useState("Semi-Furnished");
  const [coveredParking, setCoveredParking] = useState(1);
  const [openParking, setOpenParking] = useState(1);
  const [description, setDescription] = useState(
    "Well-ventilated and spacious corner apartment in heart of Anna Nagar. Natural sunlight in all rooms, modular kitchen fitted with chimney, power backup, and walking distance to Tower Park and metro."
  );

  // Step 6: Amenities
  const [ownership, setOwnership] = useState("Freehold");
  const [propertyFeatures, setPropertyFeatures] = useState([
    "Recently Renovated",
    "Vastu Compliant",
    "High Ceiling",
  ]);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([
    "Lift",
    "Security Guard",
    "CCTV",
    "Power Backup",
    "Gym",
    "Park",
  ]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [openSides, setOpenSides] = useState("2");
  const [overlooking, setOverlooking] = useState("Park");
  const [powerBackup, setPowerBackup] = useState("Full");
  const [propertyFacing, setPropertyFacing] = useState("East");

  // Errors state
  const [errors, setErrors] = useState({});
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Active preview image in Step 7
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Handle route params on mount / reset
  useEffect(() => {
    if (route?.params?.resetForm) {
      setCurrentStep(1);
      setErrors({});
      if (route?.params?.purpose) {
        setLookingTo(
          route.params.purpose === "Sell" || route.params.purpose === "Resale"
            ? "Resale"
            : route.params.purpose
        );
      }
    }
    if (route?.params?.initialStep) {
      setCurrentStep(route?.params?.initialStep);
    }
    if (route?.params?.editingProperty) {
      const p = route.params.editingProperty;
      if (p.lookingTo) setLookingTo(p.lookingTo);
      else if (p.purpose === "Sell" || p.purpose === "Resale") setLookingTo("Resale");
      else if (p.purpose) setLookingTo(p.purpose);
      if (p.category) setCategory(p.category);
      if (p.propertyType) setPropertyType(p.propertyType);
      if (p.bhk) setBhk(p.bhk);
      if (p.city) setCity(p.city);
      if (p.district) setDistrict(p.district);
      if (p.locality) setLocality(p.locality);
      if (p.subLocality) setSubLocality(p.subLocality);
      if (p.carpetArea) setCarpetArea(String(p.carpetArea).replace(/\D/g, ""));
      if (p.price) setMonthlyRent(String(p.price));
      if (p.deposit) setSecurityDeposit(String(p.deposit));
      if (p.maintenance) setMaintenanceCharges(String(p.maintenance));
      if (p.availableFrom) setAvailableFrom(p.availableFrom);
      if (p.furnishing) setFurnishing(p.furnishing);
    }
  }, [route?.params]);

  // Load draft if available
  const handleResumeDraft = () => {
    if (!rentDraft) return;
    setLookingTo(rentDraft.lookingTo || "Rent");
    setCategory(rentDraft.category || "Residential");
    setPropertyType(rentDraft.propertyType || "Apartment");
    setBhk(rentDraft.bhk || "2 BHK");
    setPhoneNumber(rentDraft.phoneNumber || phoneNumber);
    setEmail(rentDraft.email || email);
    setCity(rentDraft.city || city);
    setDistrict(rentDraft.district || district);
    setLocality(rentDraft.locality || locality);
    setSubLocality(rentDraft.subLocality || subLocality);
    setApartmentSociety(rentDraft.apartmentSociety || apartmentSociety);
    setHouseNo(rentDraft.houseNo || houseNo);
    setLandmark(rentDraft.landmark || landmark);
    setBedrooms(rentDraft.bedrooms || bedrooms);
    setBathrooms(rentDraft.bathrooms || bathrooms);
    setBalconies(rentDraft.balconies || balconies);
    setCarpetArea(rentDraft.carpetArea || carpetArea);
    setBuiltUpArea(rentDraft.builtUpArea || builtUpArea);
    setTotalFloors(rentDraft.totalFloors || totalFloors);
    setFloorOn(rentDraft.floorOn || floorOn);
    setDuplex(rentDraft.duplex || duplex);
    setAvailabilityStatus(rentDraft.availabilityStatus || availabilityStatus);
    setPropertyAge(rentDraft.propertyAge || propertyAge);
    setMonthlyRent(rentDraft.monthlyRent || monthlyRent);
    setSecurityDeposit(rentDraft.securityDeposit || securityDeposit);
    setMaintenanceCharges(rentDraft.maintenanceCharges || maintenanceCharges);
    setMaintenanceFrequency(rentDraft.maintenanceFrequency || maintenanceFrequency);
    setRentNegotiable(rentDraft.rentNegotiable || rentNegotiable);
    setAvailableFrom(rentDraft.availableFrom || availableFrom);
    setTenantPreference(rentDraft.tenantPreference || tenantPreference);
    setFurnishing(rentDraft.furnishing || furnishing);
    setCoveredParking(rentDraft.coveredParking ?? coveredParking);
    setOpenParking(rentDraft.openParking ?? openParking);
    setDescription(rentDraft.description || description);
    setOwnership(rentDraft.ownership || ownership);
    setPropertyFeatures(rentDraft.propertyFeatures || propertyFeatures);
    setSelectedAmenities(rentDraft.selectedAmenities || selectedAmenities);
    setOpenSides(rentDraft.openSides || openSides);
    setOverlooking(rentDraft.overlooking || overlooking);
    setPowerBackup(rentDraft.powerBackup || powerBackup);
    setPropertyFacing(rentDraft.propertyFacing || propertyFacing);
    if (rentDraft.photosList?.length) setPhotosList(rentDraft.photosList);
    if (rentDraft.currentStep) setCurrentStep(rentDraft.currentStep);
    Alert.alert("Draft Resumed", "Your saved rental property listing has been restored.");
  };

  const handleSaveCurrentDraft = (silent = false) => {
    const draftData = {
      lookingTo,
      category,
      propertyType,
      bhk,
      phoneNumber,
      email,
      city,
      district,
      locality,
      subLocality,
      apartmentSociety,
      houseNo,
      landmark,
      bedrooms,
      bathrooms,
      balconies,
      carpetArea,
      builtUpArea,
      superBuiltUpArea,
      totalFloors,
      floorOn,
      duplex,
      availabilityStatus,
      propertyAge,
      monthlyRent,
      securityDeposit,
      maintenanceCharges,
      maintenanceFrequency,
      rentNegotiable,
      availableFrom,
      tenantPreference,
      lockInPeriod,
      preferredAgreementDuration,
      photosList,
      otherRooms,
      furnishing,
      coveredParking,
      openParking,
      description,
      ownership,
      propertyFeatures,
      selectedAmenities,
      openSides,
      overlooking,
      powerBackup,
      propertyFacing,
      currentStep,
    };
    saveRentDraft(draftData);
    if (!silent) {
      Alert.alert(
        "Draft Saved",
        "Your rental property details have been safely stored as a draft."
      );
    }
  };

  // Toggle multi-select chips
  const toggleItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Photo handlers
  const handleAddSamplePhoto = (cat) => {
    const newPhoto = {
      id: `photo-${Date.now()}`,
      url: SAMPLE_PHOTO_LIBRARY[cat] || SAMPLE_PHOTO_LIBRARY["Living Room"],
      category: cat,
      isCover: photosList.length === 0,
    };
    setPhotosList([...photosList, newPhoto]);
    setShowPhotoAddModal(false);
  };

  const handleRemovePhoto = (id) => {
    const remaining = photosList.filter((p) => p.id !== id);
    if (remaining.length > 0 && !remaining.some((p) => p.isCover)) {
      remaining[0].isCover = true;
    }
    setPhotosList(remaining);
  };

  const handleSetCoverPhoto = (id) => {
    setPhotosList(
      photosList.map((p) => ({
        ...p,
        isCover: p.id === id,
      }))
    );
  };

  const handleMovePhoto = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= photosList.length) return;
    const updated = [...photosList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPhotosList(updated);
  };

  // Step Validation
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!phoneNumber || phoneNumber.trim().length < 8) {
        newErrors.phoneNumber = "Please enter a valid phone number (at least 8 digits)";
      }
      if (!email || !email.includes("@") || !email.includes(".")) {
        newErrors.email = "Please enter a valid email address";
      }
      if (!propertyType) {
        newErrors.propertyType = "Please select a property type";
      }
      if (category === "Residential" && propertyType !== "Plot / Land" && !bhk) {
        newErrors.bhk = "Please select a BHK configuration";
      }
    }

    if (step === 2) {
      if (!city || !city.trim()) newErrors.city = "City is required";
      if (!district || !district.trim()) newErrors.district = "District is required";
      if (!locality || !locality.trim()) newErrors.locality = "Locality is required";
    }

    if (step === 3) {
      if (!carpetArea || isNaN(Number(carpetArea)) || Number(carpetArea) <= 0) {
        newErrors.carpetArea = "Enter a valid carpet area in sq.ft";
      }
      if (!totalFloors || isNaN(Number(totalFloors))) {
        newErrors.totalFloors = "Total floors in building is required";
      }
      if (!floorOn) {
        newErrors.floorOn = "Property on floor is required";
      }
    }

    if (step === 4) {
      if (!monthlyRent || isNaN(Number(monthlyRent)) || Number(monthlyRent) <= 0) {
        newErrors.monthlyRent =
          lookingTo === "Resale"
            ? "Enter a valid resale price"
            : "Enter a valid monthly rent amount";
      }
      if (
        lookingTo !== "Resale" &&
        (!securityDeposit || isNaN(Number(securityDeposit)) || Number(securityDeposit) <= 0)
      ) {
        newErrors.securityDeposit = "Security deposit amount is required";
      }
      if (!availableFrom) {
        newErrors.availableFrom = "Available from date is required";
      }
    }

    if (step === 5) {
      if (photosList.length === 0) {
        newErrors.photos = "Please add at least one property photo";
      }
      if (!description || description.trim().length < 10) {
        newErrors.description = "Please add a description (at least 10 characters)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert(
        "Please Complete Required Fields",
        "Fill in all highlighted required fields before proceeding."
      );
    }
  };

  const handleBack = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setShowExitConfirmModal(true);
    }
  };

  // Final Publish Handler
  const handlePublishProperty = () => {
    // Validate all key steps
    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        Alert.alert(
          "Incomplete Details",
          `Please check step ${s} to complete missing required fields.`
        );
        return;
      }
    }

    // Check subscription active
    const isSubActive =
      subscription?.active &&
      (subscription?.usedListings || 0) < (subscription?.listingLimit || 5);

    if (!isSubActive) {
      setShowRenewModal(true);
      return;
    }

    const calculatedTitle =
      category === "Residential" && propertyType !== "Plot / Land"
        ? `${bhk} ${propertyType}`
        : `${category} ${propertyType}`;

    const coverPhotoObj = photosList.find((p) => p.isCover) || photosList[0];
    const rentAmount = parseInt(monthlyRent) || 25000;
    const depositAmount = parseInt(securityDeposit) || 100000;

    const newProperty = {
      title: calculatedTitle,
      purpose: lookingTo === "Resale" ? "Resale" : lookingTo,
      lookingTo,
      badgeType: lookingTo === "Resale" ? "resale" : lookingTo.toLowerCase(),
      isResale: lookingTo === "Resale",
      category,
      propertyType,
      bhk: category === "Residential" ? bhk : "N/A",
      city,
      district,
      locality,
      subLocality,
      address: `${houseNo ? houseNo + ", " : ""}${apartmentSociety ? apartmentSociety + ", " : ""}${subLocality ? subLocality + ", " : ""}${locality}`,
      apartmentSociety,
      houseNo,
      landmark,
      price: rentAmount,
      priceFormatted:
        lookingTo === "Resale"
          ? rentAmount >= 10000000
            ? `₹${(rentAmount / 10000000).toFixed(2)} Cr`
            : rentAmount >= 100000
            ? `₹${(rentAmount / 100000).toFixed(2)} L`
            : `₹${rentAmount.toLocaleString("en-IN")}`
          : `₹${rentAmount.toLocaleString("en-IN")} / month`,
      priceUnit: lookingTo === "Resale" ? "" : "/ month",
      deposit: lookingTo === "Resale" ? (securityDeposit ? parseInt(securityDeposit) : 0) : depositAmount,
      maintenance: parseInt(maintenanceCharges) || 3000,
      maintenanceFrequency,
      rentNegotiable,
      negotiable: rentNegotiable,
      availableFrom,
      tenantPreference,
      lockInPeriod,
      preferredAgreementDuration,
      bedrooms,
      bathrooms,
      balconies,
      carpetArea: `${carpetArea} sq.ft`,
      builtUpArea: builtUpArea ? `${builtUpArea} sq.ft` : `${carpetArea} sq.ft`,
      superBuiltUpArea: superBuiltUpArea ? `${superBuiltUpArea} sq.ft` : null,
      floor: floorOn,
      totalFloors,
      duplex,
      availabilityStatus,
      propertyAge,
      furnishing,
      otherRooms,
      coveredParking,
      openParking,
      parking: coveredParking > 0 || openParking > 0 ? "Yes" : "No",
      description,
      ownership,
      propertyFeatures,
      amenities: selectedAmenities,
      openSides,
      overlooking,
      powerBackup,
      facing: propertyFacing,
      images: photosList.map((p) => p.url),
      coverPhoto: coverPhotoObj?.url || photosList[0]?.url,
      contact: {
        phone: phoneNumber,
        email,
      },
      status: "pending",
    };

    // Optimistic local add (keeps Owner dashboard working immediately)
    addProperty(newProperty);
    clearRentDraft();

    // Fire real backend API — async so we don't block the UX
    setIsSubmitting(true);
    createOwnerListing(newProperty)
      .then((created) => {
        // Patch the local copy with the real listing_id so subsequent reads align
        newProperty.listing_id = created.listing_id;
        newProperty.id = String(created.listing_id);
        // Navigate to Publish Success screen with the server-confirmed listing
        navigation.navigate("OwnerPublishSuccess", { property: { ...newProperty, listing_id: created.listing_id } });
      })
      .catch((err) => {
        // Submission failed — navigate anyway (local data already saved)
        console.warn("[OwnerAddProperty] Backend submit failed:", err?.message);
        navigation.navigate("OwnerPublishSuccess", { property: newProperty });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const currentStepInfo = RENT_STEPS[currentStep - 1] || RENT_STEPS[0];
  const stepFullLabel =
    currentStep === 4 && lookingTo === "Resale"
      ? "Price & Terms"
      : currentStepInfo.fullLabel;
  const coverPhoto = photosList.find((p) => p.isCover) || photosList[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={19} color="#111111" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.brandIconWrapper}>
            <RestampLogo size={32} />
          </View>

          <View style={styles.headerTitles}>
            <Text style={styles.headerSubtitle}>RESTAMP Owner Studio</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {stepFullLabel}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.saveDraftBtn}
            onPress={() => handleSaveCurrentDraft(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.saveDraftText}>Save Draft</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-STEP PROGRESS INDICATOR */}
      <StepIndicator
        currentStep={currentStep}
        steps={RENT_STEPS}
        onStepPress={(step) => {
          setErrors({});
          setCurrentStep(step);
        }}
      />

      {/* DRAFT NOTIFICATION BANNER (if draft exists and not applied) */}
      {rentDraft && currentStep === 1 && (
        <View style={styles.draftBanner}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.draftBannerTitle}>Saved Draft Available</Text>
            <Text style={styles.draftBannerSub}>
              {rentDraft.bhk || "2 BHK"} {rentDraft.propertyType || "Apartment"} in {rentDraft.locality || "Anna Nagar"} (Saved {rentDraft.savedDate || "recently"})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.draftResumeBtn}
            onPress={handleResumeDraft}
            activeOpacity={0.8}
          >
            <Text style={styles.draftResumeBtnText}>Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.draftDismissBtn}
            onPress={clearRentDraft}
            activeOpacity={0.7}
          >
            <X size={15} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* SCROLLABLE FORM CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* =========================================================
            STEP 1 — BASIC DETAILS
            ========================================================= */}
        {currentStep === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Add Property</Text>
            <Text style={styles.cardHeaderSub}>
              Select whether you are listing for rent, lease or resale and your property type.
            </Text>

            {/* Section: You're looking to? */}
            <Text style={styles.fieldHeading}>You're looking to?</Text>
            <View style={styles.underlineTabRow}>
              {["Rent", "Lease", "Resale"].map((opt) => {
                const isSelected = lookingTo === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={styles.underlineTabItem}
                    onPress={() => setLookingTo(opt)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.underlineTabText,
                        isSelected
                          ? styles.underlineTabTextActive
                          : styles.underlineTabTextInactive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {isSelected && <View style={styles.underlineTabIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section: Property Category */}
            <Text style={styles.fieldHeading}>Property Category</Text>
            <View style={styles.chipsRow}>
              {["Residential", "Commercial"].map((cat) => (
                <SelectionChip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  onPress={() => {
                    setCategory(cat);
                    const list = cat === "Residential" ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES;
                    if (!list.includes(propertyType)) {
                      setPropertyType(list[0]);
                    }
                  }}
                />
              ))}
            </View>

            {/* Section: Property Type */}
            <Text style={styles.fieldHeading}>Property Type</Text>
            <View style={styles.chipsRow}>
              {(category === "Residential" ? RESIDENTIAL_TYPES : COMMERCIAL_TYPES).map((type) => (
                <SelectionChip
                  key={type}
                  label={type}
                  selected={propertyType === type}
                  onPress={() => setPropertyType(type)}
                />
              ))}
            </View>
            {errors.propertyType && (
              <Text style={styles.errorInlineText}>{errors.propertyType}</Text>
            )}

            {/* Section: BHK (if Residential and not Plot) */}
            {category === "Residential" && propertyType !== "Plot / Land" && (
              <>
                <Text style={styles.fieldHeading}>BHK Configuration</Text>
                <View style={styles.chipsRow}>
                  {BHK_OPTIONS.map((opt) => (
                    <SelectionChip
                      key={opt}
                      label={opt}
                      selected={bhk === opt}
                      onPress={() => setBhk(opt)}
                    />
                  ))}
                </View>
                {errors.bhk && (
                  <Text style={styles.errorInlineText}>{errors.bhk}</Text>
                )}
              </>
            )}

            {/* Section: Contact Details */}
            <Text style={[styles.fieldHeading, { marginTop: 12 }]}>Contact Details</Text>
            <FormInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="e.g. +91 98401 23456"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
              helperText="Verified buyers/tenants will reach you on this number."
            />

            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. owner@example.com"
              keyboardType="email-address"
              error={errors.email}
              helperText="Official rental agreement and inspection reports will be emailed."
            />
          </View>
        )}

        {/* =========================================================
            STEP 2 — LOCATION
            ========================================================= */}
        {currentStep === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Property Location</Text>
            <Text style={styles.cardHeaderSub}>
              Accurate neighborhood details ensure high-intent tenant matches in your area.
            </Text>

            <FormInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Chennai"
              error={errors.city}
            />

            <FormInput
              label="District"
              value={district}
              onChangeText={setDistrict}
              placeholder="e.g. Chennai"
              error={errors.district}
            />

            <FormInput
              label="Locality"
              value={locality}
              onChangeText={setLocality}
              placeholder="e.g. Anna Nagar"
              error={errors.locality}
            />

            <FormInput
              label="Sub Locality (Optional)"
              value={subLocality}
              onChangeText={setSubLocality}
              placeholder="e.g. 5th Avenue, Shanthi Colony"
            />

            <FormInput
              label="Apartment / Society (Optional)"
              value={apartmentSociety}
              onChangeText={setApartmentSociety}
              placeholder="e.g. Green Acres Residency"
            />

            <FormInput
              label="House No. (Optional)"
              value={houseNo}
              onChangeText={setHouseNo}
              placeholder="e.g. Flat 402, Block B"
            />

            <FormInput
              label="Landmark (Optional)"
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Opposite Tower Park"
            />

            {/* Map Location Section */}
            <Text style={styles.fieldHeading}>Map Location</Text>
            <View style={styles.mapCard}>
              <View style={styles.mapVisualBox}>
                <MapPin size={34} color={COLORS.primary} />
                <Text style={styles.mapVisualTitle}>
                  {locality || "Anna Nagar"}, {city || "Chennai"}
                </Text>
                <Text style={styles.mapVisualSub}>
                  {mapLocationSet ? "GPS Coordinates: 13.0850° N, 80.2101° E (Pinned)" : "Pin not calibrated yet"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.setMapBtn}
                onPress={() => {
                  setMapLocationSet(true);
                  Alert.alert("Map Location Pin", `Coordinates pinned to ${locality}, ${city}. Tenants will see this accurate radius on search map.`);
                }}
                activeOpacity={0.8}
              >
                <MapPin size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.setMapBtnText}>Set Map Location</Text>
                {mapLocationSet && <Check size={16} color={COLORS.success} style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =========================================================
            STEP 3 — PROPERTY DETAILS
            ========================================================= */}
        {currentStep === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Property Details</Text>
            <Text style={styles.cardHeaderSub}>
              Specify room configurations, areas, floor level, and readiness.
            </Text>

            {/* Section 1: Room Details */}
            <Text style={styles.sectionHeading}>Room Details</Text>

            <Text style={styles.fieldHeading}>Bedrooms</Text>
            <View style={styles.chipsRow}>
              {BEDROOMS_OPTIONS.map((num) => (
                <SelectionChip
                  key={num}
                  label={num}
                  selected={bedrooms === num}
                  onPress={() => setBedrooms(num)}
                />
              ))}
            </View>

            <Text style={styles.fieldHeading}>Bathrooms</Text>
            <View style={styles.chipsRow}>
              {BATHROOMS_OPTIONS.map((num) => (
                <SelectionChip
                  key={num}
                  label={num}
                  selected={bathrooms === num}
                  onPress={() => setBathrooms(num)}
                />
              ))}
            </View>

            <Text style={styles.fieldHeading}>Balconies</Text>
            <View style={styles.chipsRow}>
              {BALCONIES_OPTIONS.map((num) => (
                <SelectionChip
                  key={num}
                  label={num}
                  selected={balconies === num}
                  onPress={() => setBalconies(num)}
                />
              ))}
            </View>

            {/* Section 2: Area Details */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Area Details</Text>

            <FormInput
              label="Carpet Area (sq.ft)"
              value={carpetArea}
              onChangeText={setCarpetArea}
              placeholder="e.g. 1200"
              keyboardType="numeric"
              suffix="sq.ft"
              error={errors.carpetArea}
              helperText="Usable net floor area inside the walls."
            />

            <View style={styles.formRow}>
              <FormInput
                label="Built-up Area (Optional)"
                value={builtUpArea}
                onChangeText={setBuiltUpArea}
                placeholder="e.g. 1380"
                keyboardType="numeric"
                suffix="sq.ft"
                style={{ flex: 1, marginRight: 8 }}
              />
              <FormInput
                label="Super Built-up (Optional)"
                value={superBuiltUpArea}
                onChangeText={setSuperBuiltUpArea}
                placeholder="e.g. 1550"
                keyboardType="numeric"
                suffix="sq.ft"
                style={{ flex: 1 }}
              />
            </View>

            {/* Section 3: Floor Details */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Floor Details</Text>

            <View style={styles.formRow}>
              <FormInput
                label="Total Floors in Building"
                value={totalFloors}
                onChangeText={setTotalFloors}
                placeholder="e.g. 8"
                keyboardType="numeric"
                error={errors.totalFloors}
                style={{ flex: 1, marginRight: 8 }}
              />
              <FormInput
                label="Property on Floor"
                value={floorOn}
                onChangeText={setFloorOn}
                placeholder="e.g. 3"
                keyboardType="numeric"
                error={errors.floorOn}
                style={{ flex: 1 }}
              />
            </View>

            <Text style={styles.fieldHeading}>Duplex Property?</Text>
            <View style={styles.chipsRow}>
              {["Yes", "No"].map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={duplex === opt}
                  onPress={() => setDuplex(opt)}
                />
              ))}
            </View>

            {/* Section 4: Availability Status */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Availability Status</Text>
            <View style={styles.chipsRow}>
              {AVAILABILITY_STATUS_OPTIONS.map((status) => (
                <SelectionChip
                  key={status}
                  label={status}
                  selected={availabilityStatus === status}
                  onPress={() => setAvailabilityStatus(status)}
                />
              ))}
            </View>

            {/* Section 5: Property Age */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Property Age</Text>
            <View style={styles.chipsRow}>
              {PROPERTY_AGE_OPTIONS.map((age) => (
                <SelectionChip
                  key={age}
                  label={age}
                  selected={propertyAge === age}
                  onPress={() => setPropertyAge(age)}
                />
              ))}
            </View>
          </View>
        )}

        {/* =========================================================
            STEP 4 — PRICING (Rent & Deposit)
            ========================================================= */}
        {currentStep === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>
              {lookingTo === "Resale" ? "Price & Terms" : "Rent & Deposit"}
            </Text>
            <Text style={styles.cardHeaderSub}>
              {lookingTo === "Resale"
                ? "Transparent resale pricing attracts serious and qualified buyers faster."
                : "Transparent rental pricing and deposit terms attract qualified tenants faster."}
            </Text>

            <FormInput
              label={lookingTo === "Resale" ? "Resale Price" : "Monthly Rent"}
              value={monthlyRent}
              onChangeText={setMonthlyRent}
              placeholder={lookingTo === "Resale" ? "e.g. 7500000" : "e.g. 25000"}
              keyboardType="numeric"
              prefix="₹"
              suffix={lookingTo === "Resale" ? "" : "/ month"}
              error={errors.monthlyRent}
              helperText={
                lookingTo === "Resale"
                  ? monthlyRent && !isNaN(Number(monthlyRent))
                    ? Number(monthlyRent) >= 10000000
                      ? `₹${(Number(monthlyRent) / 10000000).toFixed(2)} Cr`
                      : Number(monthlyRent) >= 100000
                      ? `₹${(Number(monthlyRent) / 100000).toFixed(2)} Lakhs`
                      : `₹${Number(monthlyRent).toLocaleString("en-IN")}`
                    : "e.g. 7500000 for 75 Lakhs"
                  : "Market average for Anna Nagar: ₹22,000 – ₹28,000"
              }
            />

            {lookingTo !== "Resale" ? (
              <FormInput
                label="Security Deposit"
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                placeholder="e.g. 100000"
                keyboardType="numeric"
                prefix="₹"
                error={errors.securityDeposit}
                helperText="Typically 4 to 10 months of monthly rent"
              />
            ) : (
              <FormInput
                label="Booking / Token Amount (Optional)"
                value={securityDeposit}
                onChangeText={setSecurityDeposit}
                placeholder="e.g. 100000"
                keyboardType="numeric"
                prefix="₹"
                helperText="Advance booking deposit"
              />
            )}

            <FormInput
              label="Maintenance Charges"
              value={maintenanceCharges}
              onChangeText={setMaintenanceCharges}
              placeholder="e.g. 3000"
              keyboardType="numeric"
              prefix="₹"
            />

            <Text style={styles.fieldHeading}>Maintenance Frequency</Text>
            <View style={styles.chipsRow}>
              {MAINTENANCE_FREQUENCY_OPTIONS.map((freq) => (
                <SelectionChip
                  key={freq}
                  label={freq}
                  selected={maintenanceFrequency === freq}
                  onPress={() => setMaintenanceFrequency(freq)}
                />
              ))}
            </View>

            <Text style={styles.fieldHeading}>
              {lookingTo === "Resale" ? "Price Negotiable?" : "Rent Negotiable?"}
            </Text>
            <View style={styles.chipsRow}>
              {["Yes", "No"].map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={rentNegotiable === opt}
                  onPress={() => setRentNegotiable(opt)}
                />
              ))}
            </View>

            {/* Available From Date Picker */}
            <Text style={styles.fieldHeading}>Available From</Text>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowDateModal(true)}
              activeOpacity={0.8}
            >
              <Calendar size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.datePickerText}>{availableFrom}</Text>
              <ChevronDown size={16} color="#64748B" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
            {errors.availableFrom && (
              <Text style={styles.errorInlineText}>{errors.availableFrom}</Text>
            )}

            {/* Quick date chips */}
            <View style={[styles.chipsRow, { marginTop: 6 }]}>
              {["Immediately", "15 Oct 2026", "01 Nov 2026"].map((d) => (
                <SelectionChip
                  key={d}
                  label={d}
                  selected={availableFrom === d}
                  onPress={() => setAvailableFrom(d)}
                />
              ))}
            </View>

            {lookingTo !== "Resale" && (
              <>
                <Text style={styles.fieldHeading}>Tenant Preference</Text>
                <View style={styles.chipsRow}>
                  {TENANT_PREFERENCES.map((pref) => (
                    <SelectionChip
                      key={pref}
                      label={pref}
                      selected={tenantPreference === pref}
                      onPress={() => setTenantPreference(pref)}
                    />
                  ))}
                </View>

                <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Agreement Terms (Optional)</Text>

                <Text style={styles.fieldHeading}>Lock-in Period</Text>
                <View style={styles.chipsRow}>
                  {LOCK_IN_OPTIONS.map((opt) => (
                    <SelectionChip
                      key={opt}
                      label={opt}
                      selected={lockInPeriod === opt}
                      onPress={() => setLockInPeriod(opt)}
                    />
                  ))}
                </View>

                <Text style={styles.fieldHeading}>Preferred Agreement Duration</Text>
                <View style={styles.chipsRow}>
                  {AGREEMENT_DURATIONS.map((dur) => (
                    <SelectionChip
                      key={dur}
                      label={dur}
                      selected={preferredAgreementDuration === dur}
                      onPress={() => setPreferredAgreementDuration(dur)}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* =========================================================
            STEP 5 — PHOTOS & DETAILS
            ========================================================= */}
        {currentStep === 5 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Photos & Details</Text>
            <Text style={styles.cardHeaderSub}>
              Properties with authentic photos and clear descriptions receive 5x more site visit requests.
            </Text>

            {/* Section: Add Property Photos */}
            <Text style={styles.sectionHeading}>Add Property Photos</Text>

            {/* Large Upload Area */}
            <TouchableOpacity
              style={styles.largeUploadArea}
              onPress={() => setShowPhotoAddModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.uploadIconCircle}>
                <Camera size={26} color={COLORS.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.uploadPrimaryText}>+ Add Photos</Text>
              <Text style={styles.uploadHelperText}>
                Upload clear photos of your property.
              </Text>
              <View style={styles.uploadSupportRow}>
                <View style={styles.supportBadge}>
                  <Camera size={12} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.supportBadgeText}>Camera</Text>
                </View>
                <View style={styles.supportBadge}>
                  <ImageIcon size={12} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.supportBadgeText}>Gallery</Text>
                </View>
                <View style={styles.supportBadge}>
                  <Layers size={12} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.supportBadgeText}>Multiple Images</Text>
                </View>
              </View>
            </TouchableOpacity>
            {errors.photos && (
              <Text style={styles.errorInlineText}>{errors.photos}</Text>
            )}

            {/* Photos List with Reorder / Delete / Set Cover */}
            <View style={styles.photosGrid}>
              {photosList.map((photo, index) => (
                <View key={photo.id || index} style={styles.photoItemCard}>
                  <Image source={{ uri: photo.url }} style={styles.photoThumbnail} />

                  {photo.isCover && (
                    <View style={styles.coverPhotoPill}>
                      <Star size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.coverPhotoPillText}>COVER</Text>
                    </View>
                  )}

                  <View style={styles.photoCategoryBadge}>
                    <Text style={styles.photoCategoryText}>{photo.category || "Living Room"}</Text>
                  </View>

                  {/* Photo Actions Row: Left, Right, Set Cover, Delete */}
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.miniPhotoActionBtn}
                      disabled={index === 0}
                      onPress={() => handleMovePhoto(index, -1)}
                    >
                      <ArrowLeft size={12} color={index === 0 ? "#CBD5E1" : "#111111"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.miniPhotoActionBtn}
                      disabled={index === photosList.length - 1}
                      onPress={() => handleMovePhoto(index, 1)}
                    >
                      <ArrowRight size={12} color={index === photosList.length - 1 ? "#CBD5E1" : "#111111"} />
                    </TouchableOpacity>

                    {!photo.isCover && (
                      <TouchableOpacity
                        style={[styles.miniPhotoActionBtn, { backgroundColor: "#EFF6FF" }]}
                        onPress={() => handleSetCoverPhoto(photo.id)}
                      >
                        <Star size={12} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.miniPhotoActionBtn, { backgroundColor: "#FEF2F2" }]}
                      onPress={() => handleRemovePhoto(photo.id)}
                    >
                      <Trash2 size={12} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Section: Other Rooms */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Other Rooms</Text>
            <View style={styles.chipsRow}>
              {OTHER_ROOMS_OPTIONS.map((room) => (
                <SelectionChip
                  key={room}
                  label={room}
                  selected={otherRooms.includes(room)}
                  onPress={() => toggleItem(otherRooms, setOtherRooms, room)}
                />
              ))}
            </View>

            {/* Section: Furnishing */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Furnishing</Text>
            <View style={styles.chipsRow}>
              {FURNISHING_OPTIONS.map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={furnishing === opt}
                  onPress={() => setFurnishing(opt)}
                />
              ))}
            </View>

            {/* Section: Reserved Parking */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Reserved Parking</Text>
            <View style={styles.parkingCountersBox}>
              <View style={styles.parkingCounterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.parkingLabel}>Covered Parking</Text>
                  <Text style={styles.parkingSub}>Basement / Stilt reserved slots</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setCoveredParking(Math.max(0, coveredParking - 1))}
                    activeOpacity={0.7}
                  >
                    <Minus size={15} color="#111111" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{coveredParking}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setCoveredParking(coveredParking + 1)}
                    activeOpacity={0.7}
                  >
                    <Plus size={15} color="#111111" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.parkingCounterRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F1F5F9" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.parkingLabel}>Open Parking</Text>
                  <Text style={styles.parkingSub}>Compound / Surface dedicated spots</Text>
                </View>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setOpenParking(Math.max(0, openParking - 1))}
                    activeOpacity={0.7}
                  >
                    <Minus size={15} color="#111111" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{openParking}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setOpenParking(openParking + 1)}
                    activeOpacity={0.7}
                  >
                    <Plus size={15} color="#111111" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Section: Description */}
            <Text style={[styles.sectionHeading, { marginTop: 18 }]}>Description</Text>
            <Text style={styles.fieldHeading}>What makes your property unique?</Text>
            <View
              style={[
                styles.textareaWrapper,
                errors.description && { borderColor: COLORS.danger, backgroundColor: "#FEF2F2" },
              ]}
            >
              <TextInput
                style={styles.textareaInput}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="Add property description..."
                placeholderTextColor="#94A3B8"
                maxLength={1000}
                underlineColorAndroid="transparent"
              />
              <Text style={styles.characterCounter}>
                {description.length} / 1000 characters
              </Text>
            </View>
            {errors.description && (
              <Text style={styles.errorInlineText}>{errors.description}</Text>
            )}
          </View>
        )}

        {/* =========================================================
            STEP 6 — AMENITIES
            ========================================================= */}
        {currentStep === 6 && (
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Amenities</Text>
            <Text style={styles.cardHeaderSub}>
              Highlight building conveniences, security, facing, and unique features.
            </Text>

            {/* Section: Ownership */}
            <Text style={styles.sectionHeading}>Ownership</Text>
            <View style={styles.chipsRow}>
              {OWNERSHIP_OPTIONS.map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={ownership === opt}
                  onPress={() => setOwnership(opt)}
                />
              ))}
            </View>

            {/* Section: Property Features */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Property Features</Text>
            <View style={styles.chipsRow}>
              {(showAllFeatures
                ? [...INITIAL_PROPERTY_FEATURES, ...EXTRA_PROPERTY_FEATURES]
                : INITIAL_PROPERTY_FEATURES
              ).map((feat) => (
                <SelectionChip
                  key={feat}
                  label={feat}
                  selected={propertyFeatures.includes(feat)}
                  onPress={() => toggleItem(propertyFeatures, setPropertyFeatures, feat)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={() => setShowAllFeatures(!showAllFeatures)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreBtnText}>
                {showAllFeatures ? "View Less Features" : "+ View More Features"}
              </Text>
              {showAllFeatures ? (
                <ChevronUp size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
              ) : (
                <ChevronDown size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            {/* Section: Amenities */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Amenities</Text>
            <View style={styles.chipsRow}>
              {(showAllAmenities
                ? [...INITIAL_AMENITIES, ...EXTRA_AMENITIES]
                : INITIAL_AMENITIES
              ).map((amenity) => (
                <SelectionChip
                  key={amenity}
                  label={amenity}
                  selected={selectedAmenities.includes(amenity)}
                  onPress={() => toggleItem(selectedAmenities, setSelectedAmenities, amenity)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={() => setShowAllAmenities(!showAllAmenities)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreBtnText}>
                {showAllAmenities ? "View Less Amenities" : "+ View More Amenities"}
              </Text>
              {showAllAmenities ? (
                <ChevronUp size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
              ) : (
                <ChevronDown size={15} color={COLORS.primary} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            {/* Section: No. of Open Sides */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>No. of Open Sides</Text>
            <View style={styles.chipsRow}>
              {OPEN_SIDES_OPTIONS.map((sides) => (
                <SelectionChip
                  key={sides}
                  label={sides}
                  selected={openSides === sides}
                  onPress={() => setOpenSides(sides)}
                />
              ))}
            </View>

            {/* Section: Overlooking */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Overlooking</Text>
            <View style={styles.chipsRow}>
              {OVERLOOKING_OPTIONS.map((ov) => (
                <SelectionChip
                  key={ov}
                  label={ov}
                  selected={overlooking === ov}
                  onPress={() => setOverlooking(ov)}
                />
              ))}
            </View>

            {/* Section: Power Backup */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Power Backup</Text>
            <View style={styles.chipsRow}>
              {POWER_BACKUP_OPTIONS.map((pb) => (
                <SelectionChip
                  key={pb}
                  label={pb}
                  selected={powerBackup === pb}
                  onPress={() => setPowerBackup(pb)}
                />
              ))}
            </View>

            {/* Section: Property Facing */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Property Facing</Text>
            <View style={styles.chipsRow}>
              {PROPERTY_FACING_OPTIONS.map((f) => (
                <SelectionChip
                  key={f}
                  label={f}
                  selected={propertyFacing === f}
                  onPress={() => setPropertyFacing(f)}
                />
              ))}
            </View>
          </View>
        )}

        {/* =========================================================
            STEP 7 — REVIEW (Exact Buyer Visual System Structure)
            ========================================================= */}
        {currentStep === 7 && (
          <View style={styles.reviewWrapper}>
            {/* Action Bar inside review: Edit button */}
            <View style={styles.reviewHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardHeaderTitle}>Review Property</Text>
                <Text style={styles.cardHeaderSub}>
                  Complete buyer listing preview before publishing
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reviewEditPill}
                onPress={() => setShowEditStepModal(true)}
                activeOpacity={0.8}
              >
                <Edit size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.reviewEditText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* HERO IMAGE GALLERY PREVIEW */}
            <View style={styles.heroPreviewBox}>
              <Image
                source={{ uri: photosList[activePreviewIndex]?.url || coverPhoto?.url }}
                style={styles.heroMainImage}
              />

              <View style={styles.heroOverlayPill}>
                <Text style={styles.heroOverlayText}>FOR {lookingTo.toUpperCase()}</Text>
              </View>

              <View style={styles.heroCounterPill}>
                <Camera size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.heroCounterText}>
                  {activePreviewIndex + 1} of {photosList.length}
                </Text>
              </View>

              {/* Thumbnails strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailStrip}
                contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
              >
                {photosList.map((photo, idx) => (
                  <TouchableOpacity
                    key={photo.id || idx}
                    onPress={() => setActivePreviewIndex(idx)}
                    style={[
                      styles.stripThumbWrapper,
                      activePreviewIndex === idx && styles.stripThumbSelected,
                    ]}
                  >
                    <Image source={{ uri: photo.url }} style={styles.stripThumbImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* CORE HEADLINE CARD */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerTitle}>
                {category === "Residential" && propertyType !== "Plot / Land"
                  ? `${bhk} ${propertyType}`
                  : `${category} ${propertyType}`}
              </Text>
              <View style={styles.buyerLocRow}>
                <MapPin size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.buyerLocText}>
                  {locality}, {city}
                </Text>
              </View>

              <View style={styles.buyerPriceRow}>
                <Text style={styles.buyerPrice}>
                  {lookingTo === "Resale"
                    ? Number(monthlyRent) >= 10000000
                      ? `₹${(Number(monthlyRent) / 10000000).toFixed(2)} Cr`
                      : Number(monthlyRent) >= 100000
                      ? `₹${(Number(monthlyRent) / 100000).toFixed(2)} L`
                      : `₹${parseInt(monthlyRent || 0).toLocaleString("en-IN")}`
                    : `₹${parseInt(monthlyRent || 0).toLocaleString("en-IN")}`}{" "}
                  {lookingTo !== "Resale" && (
                    <Text style={styles.buyerPriceUnit}>/ month</Text>
                  )}
                </Text>
                {rentNegotiable === "Yes" && (
                  <View style={styles.negotiablePill}>
                    <Text style={styles.negotiablePillText}>Negotiable</Text>
                  </View>
                )}
              </View>

              {/* Quick specs chips */}
              <View style={styles.buyerSpecsRow}>
                <View style={styles.buyerSpecChip}>
                  <Text style={styles.buyerSpecChipText}>{carpetArea} sq.ft</Text>
                </View>
                <View style={styles.buyerSpecChip}>
                  <Text style={styles.buyerSpecChipText}>{furnishing}</Text>
                </View>
                <View style={styles.buyerSpecChip}>
                  <Text style={styles.buyerSpecChipText}>Floor {floorOn} of {totalFloors}</Text>
                </View>
                <View style={styles.buyerSpecChip}>
                  <Text style={styles.buyerSpecChipText}>{propertyAge}</Text>
                </View>
              </View>
            </View>

            {/* SECTION 1: OVERVIEW */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Overview</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Available From</Text>
                <Text style={styles.valText}>{availableFrom}</Text>
              </View>
              {lookingTo !== "Resale" && (
                <>
                  <View style={styles.keyValueRow}>
                    <Text style={styles.keyText}>Tenant Preference</Text>
                    <Text style={styles.valText}>{tenantPreference}</Text>
                  </View>
                  <View style={styles.keyValueRow}>
                    <Text style={styles.keyText}>Security Deposit</Text>
                    <Text style={styles.valText}>
                      ₹{parseInt(securityDeposit || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </>
              )}
              {lookingTo === "Resale" && securityDeposit ? (
                <View style={styles.keyValueRow}>
                  <Text style={styles.keyText}>Booking Amount</Text>
                  <Text style={styles.valText}>
                    ₹{parseInt(securityDeposit || 0).toLocaleString("en-IN")}
                  </Text>
                </View>
              ) : null}
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Maintenance</Text>
                <Text style={styles.valText}>
                  ₹{parseInt(maintenanceCharges || 0).toLocaleString("en-IN")} / {maintenanceFrequency}
                </Text>
              </View>
              {lookingTo !== "Resale" && (
                <>
                  <View style={styles.keyValueRow}>
                    <Text style={styles.keyText}>Lock-in Period</Text>
                    <Text style={styles.valText}>{lockInPeriod}</Text>
                  </View>
                  <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.keyText}>Agreement Tenure</Text>
                    <Text style={styles.valText}>{preferredAgreementDuration}</Text>
                  </View>
                </>
              )}
            </View>

            {/* SECTION 2: LOCATION */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Location</Text>
              <Text style={styles.buyerAddressText}>
                {houseNo ? `${houseNo}, ` : ""}
                {apartmentSociety ? `${apartmentSociety}, ` : ""}
                {subLocality ? `${subLocality}, ` : ""}
                {locality}, {district}, {city}
              </Text>
              {landmark ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Compass size={13} color="#64748B" style={{ marginRight: 5 }} />
                  <Text style={styles.landmarkText}>Landmark: {landmark}</Text>
                </View>
              ) : null}
            </View>

            {/* SECTION 3: ROOM DETAILS */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Room Details</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Bedrooms</Text>
                <Text style={styles.valText}>{bedrooms}</Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Bathrooms</Text>
                <Text style={styles.valText}>{bathrooms}</Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Balconies</Text>
                <Text style={styles.valText}>{balconies}</Text>
              </View>
              {otherRooms.length > 0 && (
                <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.keyText}>Other Rooms</Text>
                  <Text style={styles.valText}>{otherRooms.join(", ")}</Text>
                </View>
              )}
            </View>

            {/* SECTION 4: AREA DETAILS */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Area Details</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Carpet Area</Text>
                <Text style={styles.valText}>{carpetArea} sq.ft</Text>
              </View>
              {builtUpArea ? (
                <View style={styles.keyValueRow}>
                  <Text style={styles.keyText}>Built-up Area</Text>
                  <Text style={styles.valText}>{builtUpArea} sq.ft</Text>
                </View>
              ) : null}
              {superBuiltUpArea ? (
                <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.keyText}>Super Built-up Area</Text>
                  <Text style={styles.valText}>{superBuiltUpArea} sq.ft</Text>
                </View>
              ) : null}
            </View>

            {/* SECTION 5: FLOOR DETAILS */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Floor Details</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Property on Floor</Text>
                <Text style={styles.valText}>{floorOn}</Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Total Floors in Building</Text>
                <Text style={styles.valText}>{totalFloors}</Text>
              </View>
              <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.keyText}>Duplex</Text>
                <Text style={styles.valText}>{duplex}</Text>
              </View>
            </View>

            {/* SECTION 6: RENT & DEPOSIT */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Rent & Deposit</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Monthly Rent</Text>
                <Text style={[styles.valText, { color: COLORS.primary, fontWeight: "600" }]}>
                  ₹{parseInt(monthlyRent || 0).toLocaleString("en-IN")} / month
                </Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Security Deposit</Text>
                <Text style={styles.valText}>
                  ₹{parseInt(securityDeposit || 0).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Maintenance</Text>
                <Text style={styles.valText}>
                  ₹{parseInt(maintenanceCharges || 0).toLocaleString("en-IN")} / {maintenanceFrequency}
                </Text>
              </View>
              <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.keyText}>Rent Negotiable</Text>
                <Text style={styles.valText}>{rentNegotiable}</Text>
              </View>
            </View>

            {/* SECTION 7: FURNISHING */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Furnishing</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Furnishing Status</Text>
                <Text style={styles.valText}>{furnishing}</Text>
              </View>
            </View>

            {/* SECTION 8: PARKING */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Reserved Parking</Text>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Covered Parking</Text>
                <Text style={styles.valText}>{coveredParking} slot{coveredParking === 1 ? "" : "s"}</Text>
              </View>
              <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.keyText}>Open Parking</Text>
                <Text style={styles.valText}>{openParking} slot{openParking === 1 ? "" : "s"}</Text>
              </View>
            </View>

            {/* SECTION 9: AMENITIES & FEATURES */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Amenities & Features</Text>
              <Text style={styles.fieldHeading}>Amenities</Text>
              <View style={styles.chipsRow}>
                {selectedAmenities.map((a) => (
                  <View key={a} style={styles.reviewChip}>
                    <CheckCircle2 size={13} color={COLORS.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.reviewChipText}>{a}</Text>
                  </View>
                ))}
              </View>

              {propertyFeatures.length > 0 && (
                <>
                  <Text style={[styles.fieldHeading, { marginTop: 12 }]}>Property Features</Text>
                  <View style={styles.chipsRow}>
                    {propertyFeatures.map((f) => (
                      <View key={f} style={styles.reviewChip}>
                        <Sparkles size={13} color="#D97706" style={{ marginRight: 5 }} />
                        <Text style={styles.reviewChipText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <View style={[styles.keyValueRow, { marginTop: 10 }]}>
                <Text style={styles.keyText}>Facing</Text>
                <Text style={styles.valText}>{propertyFacing}</Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>Overlooking</Text>
                <Text style={styles.valText}>{overlooking}</Text>
              </View>
              <View style={styles.keyValueRow}>
                <Text style={styles.keyText}>No. of Open Sides</Text>
                <Text style={styles.valText}>{openSides}</Text>
              </View>
              <View style={[styles.keyValueRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.keyText}>Power Backup</Text>
                <Text style={styles.valText}>{powerBackup}</Text>
              </View>
            </View>

            {/* SECTION 10: DESCRIPTION */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>What makes your property unique?</Text>
              <Text style={styles.buyerDescText}>{description}</Text>
            </View>

            {/* SECTION 11: PHOTOS LIST */}
            <View style={styles.buyerCard}>
              <Text style={styles.buyerCardTitle}>Photos ({photosList.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {photosList.map((p, idx) => (
                  <View key={p.id || idx} style={styles.reviewPhotoThumbWrapper}>
                    <Image source={{ uri: p.url }} style={styles.reviewPhotoThumb} />
                    <Text style={styles.reviewPhotoCatText}>{p.category}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <ArrowLeft size={16} color="#111111" strokeWidth={2.2} style={{ marginRight: 6 }} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}

        {currentStep < 7 ? (
          <TouchableOpacity
            style={styles.primaryPillBtn}
            onPress={handleNext}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryPillBtnText}>
              {currentStep === 1 ? "Next" : "Continue"}
            </Text>
            <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.4} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryPillBtn}
            onPress={handlePublishProperty}
            activeOpacity={0.88}
          >
            <Upload size={17} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
            <Text style={styles.primaryPillBtnText}>Publish Property</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL 1: STEP SELECTOR JUMP MODAL FROM REVIEW */}
      <Modal visible={showEditStepModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Step to Edit</Text>
              <TouchableOpacity onPress={() => setShowEditStepModal(false)}>
                <X size={20} color="#111111" />
              </TouchableOpacity>
            </View>

            {RENT_STEPS.slice(0, 6).map((s) => (
              <TouchableOpacity
                key={s.step}
                style={styles.modalStepRow}
                onPress={() => {
                  setShowEditStepModal(false);
                  setCurrentStep(s.step);
                }}
              >
                <View style={styles.modalStepBadge}>
                  <Text style={styles.modalStepBadgeText}>{s.step}</Text>
                </View>
                <Text style={styles.modalStepLabel}>
                  {s.step === 4 && lookingTo === "Resale" ? "Price & Terms" : s.fullLabel}
                </Text>
                <ArrowRight size={16} color="#64748B" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD PHOTO CATEGORY PICKER */}
      <Modal visible={showPhotoAddModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Photo Category</Text>
              <TouchableOpacity onPress={() => setShowPhotoAddModal(false)}>
                <X size={20} color="#111111" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select the area of the property you want to add:
            </Text>

            <View style={styles.chipsRow}>
              {PHOTO_CATEGORIES.map((cat) => (
                <SelectionChip
                  key={cat}
                  label={cat}
                  selected={selectedPhotoCategory === cat}
                  onPress={() => setSelectedPhotoCategory(cat)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryPillBtn, { marginTop: 18 }]}
              onPress={() => handleAddSamplePhoto(selectedPhotoCategory)}
              activeOpacity={0.88}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={styles.primaryPillBtnText}>Add {selectedPhotoCategory} Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: QUICK DATE PICKER MODAL */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Available From Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <X size={20} color="#111111" />
              </TouchableOpacity>
            </View>

            {[
              "Immediately",
              "Within 15 Days",
              "25 Sep 2026",
              "01 Oct 2026",
              "15 Oct 2026",
              "01 Nov 2026",
            ].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.modalStepRow, availableFrom === d && { backgroundColor: "#EFF6FF" }]}
                onPress={() => {
                  setAvailableFrom(d);
                  setShowDateModal(false);
                }}
              >
                <Calendar size={16} color={availableFrom === d ? COLORS.primary : "#64748B"} style={{ marginRight: 10 }} />
                <Text style={[styles.modalStepLabel, availableFrom === d && { color: COLORS.primary, fontWeight: "600" }]}>
                  {d}
                </Text>
                {availableFrom === d && <Check size={16} color={COLORS.primary} style={{ marginLeft: "auto" }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* EXIT & SAVE DRAFT CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={showExitConfirmModal}
        title="Save Your Progress?"
        message="You have unsaved changes. Would you like to save this listing as a draft so you can resume later?"
        icon={Clock}
        confirmText="Save & Exit"
        cancelText="Discard"
        onConfirm={() => {
          handleSaveCurrentDraft(true);
          setShowExitConfirmModal(false);
          navigation.navigate("Dashboard");
        }}
        onCancel={() => {
          setShowExitConfirmModal(false);
          navigation.navigate("Dashboard");
        }}
      />

      {/* SUBSCRIPTION RENEWAL MODAL */}
      <ConfirmationModal
        visible={showRenewModal}
        title="Subscription Renewal Required"
        message="You have utilized your active property listing quota. Upgrade or renew your Owner Plan to publish this property."
        icon={Crown}
        confirmText="Renew Plan"
        cancelText="Cancel"
        onConfirm={() => {
          setShowRenewModal(false);
          navigation.navigate("OwnerPlans");
        }}
        onCancel={() => setShowRenewModal(false)}
      />
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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    marginRight: 10,
  },
  brandIconWrapper: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitles: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveDraftBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  saveDraftText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  draftBannerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  draftBannerSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
  draftResumeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
  },
  draftResumeBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  draftDismissBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 0,
  },
  cardHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  cardHeaderSub: {
    fontSize: 13.5,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 22,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  fieldHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 3.5,
    marginBottom: 14,
  },
  underlineTabRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  underlineTabItem: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 11,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 6,
  },
  underlineTabText: {
    fontSize: 14.5,
    letterSpacing: -0.2,
  },
  underlineTabTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  underlineTabTextInactive: {
    color: "#64748B",
    fontWeight: "500",
  },
  underlineTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 2.5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorInlineText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 8,
  },
  mapCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 16,
    marginTop: 6,
  },
  mapVisualBox: {
    alignItems: "center",
    paddingVertical: 18,
  },
  mapVisualTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  mapVisualSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  setMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  setMapBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
  largeUploadArea: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  uploadPrimaryText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  uploadHelperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
  },
  uploadSupportRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  supportBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#334155",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  photoItemCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 12,
  },
  photoThumbnail: {
    width: "100%",
    height: 110,
    backgroundColor: "#F1F5F9",
  },
  coverPhotoPill: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  coverPhotoPillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  photoCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F8FAFC",
  },
  photoCategoryText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  photoActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  miniPhotoActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  parkingCountersBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 4,
  },
  parkingCounterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  parkingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  parkingSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 12,
  },
  textareaWrapper: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    padding: 12,
  },
  textareaInput: {
    fontSize: 14,
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
    outlineStyle: "none",
    outlineWidth: 0,
  },
  characterCounter: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 4,
  },
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 6,
  },
  viewMoreBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  reviewWrapper: {
    gap: 12,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  reviewEditPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reviewEditText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  heroPreviewBox: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  heroMainImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#E2E8F0",
  },
  heroOverlayPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroOverlayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroCounterPill: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroCounterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  thumbnailStrip: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },
  stripThumbWrapper: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  stripThumbSelected: {
    borderColor: COLORS.primary,
  },
  stripThumbImage: {
    width: "100%",
    height: "100%",
  },
  buyerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    padding: 16,
  },
  buyerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  buyerLocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  buyerLocText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  buyerPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  buyerPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  buyerPriceUnit: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  negotiablePill: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  negotiablePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  buyerSpecsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  buyerSpecChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buyerSpecChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  buyerCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  keyValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  keyText: {
    fontSize: 13,
    color: "#64748B",
  },
  valText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  buyerAddressText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
  landmarkText: {
    fontSize: 12,
    color: "#64748B",
  },
  reviewChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  reviewChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0F172A",
  },
  buyerDescText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  reviewPhotoThumbWrapper: {
    width: 100,
    marginRight: 10,
  },
  reviewPhotoThumb: {
    width: 100,
    height: 75,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
  },
  reviewPhotoCatText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  primaryPillBtn: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPillBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 12,
  },
  modalStepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  modalStepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  modalStepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalStepLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
});
