import React from "react";
import { View } from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Home01Icon,
  Search01Icon,
  UserIcon,
  Notification03Icon,
  Settings01Icon,
  Clock01Icon,
  Menu01Icon,
  Building01Icon,
  Building02Icon,
  DashboardSquare01Icon,
  UserGroupIcon,
  PlusSignIcon,
  MinusSignIcon,
  Calendar03Icon,
  Call02Icon,
  Message01Icon,
  WhatsappIcon,
  FavouriteIcon,
  StarIcon,
  ViewIcon,
  Location01Icon,
  ShieldCheckIcon,
  ShieldIcon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  Sorting05Icon,
  Briefcase01Icon,
  SlidersHorizontalIcon,
  FilterIcon,
  TrendingUpIcon,
  Tag01Icon,
  SparklesIcon,
  Copy01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  ExternalLinkIcon,
  ReloadIcon,
  RefreshCcwIcon,
  CircleArrowReload01Icon,
  Award01Icon,
  GlobeIcon,
  HelpCircleIcon,
  DocumentValidationIcon,
  LockIcon,
  Logout01Icon,
  CrownIcon,
  Bookmark01Icon,
  Share01Icon,
  SentIcon,
  DropletIcon,
  ActivityIcon,
  ZapIcon,
  LayersIcon,
  TruckDeliveryIcon,
  AlertCircleIcon,
  TriangleAlertIcon,
  Sofa01Icon,
  Money01Icon,
  BedSingle01Icon,
  Calculator01Icon,
  Camera01Icon,
  Car01Icon,
  Compass01Icon,
  CreditCardIcon,
  Download01Icon,
  File01Icon,
  Image01Icon,
  InformationCircleIcon,
  Mail01Icon,
  Maximize01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  PauseCircleIcon,
  RulerIcon,
  SmartPhone01Icon,
  Upload01Icon,
  Wallet01Icon,
  WifiOff01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";

// Export base HugeiconsIcon component and all core free icon glyphs
export { HugeiconsIcon };
export * from "@hugeicons/core-free-icons";

/**
 * Universal HugeIcon component for RESTAMP.
 * Can be used as:
 * <HugeIcon icon={Home01Icon} size={22} color="#2563EB" strokeWidth={1.8} />
 */
export function HugeIcon({
  icon,
  size = 22,
  color = "#0F172A",
  strokeWidth = 1.8,
  style,
  ...rest
}) {
  if (!icon) return null;
  return (
    <View style={style}>
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        {...rest}
      />
    </View>
  );
}

// Pre-configured Hugeicon factory
export const createHuge = (iconDef, defaultStroke = 1.8) => {
  return function HugeIconWrapper({
    size = 22,
    color = "#0F172A",
    strokeWidth = defaultStroke,
    style,
    ...rest
  }) {
    return (
      <View style={style}>
        <HugeiconsIcon
          icon={iconDef}
          size={size}
          color={color}
          strokeWidth={strokeWidth}
          {...rest}
        />
      </View>
    );
  };
};

// ================= Pre-configured RESTAMP Huge Icons =================
export const HugeHome = createHuge(Home01Icon);
export const HugeSearch = createHuge(Search01Icon);
export const HugeUser = createHuge(UserIcon);
export const HugeBell = createHuge(Notification03Icon);
export const HugeSettings = createHuge(Settings01Icon);
export const HugeClock = createHuge(Clock01Icon);
export const HugeMenu = createHuge(Menu01Icon);
export const HugeBuilding = createHuge(Building01Icon);
export const HugeBuilding2 = createHuge(Building02Icon);
export const HugeDashboard = createHuge(DashboardSquare01Icon);
export const HugeUsers = createHuge(UserGroupIcon);
export const HugePlus = createHuge(PlusSignIcon);
export const HugeMinus = createHuge(MinusSignIcon);
export const HugeCalendar = createHuge(Calendar03Icon);
export const HugePhone = createHuge(Call02Icon);
export const HugeMessage = createHuge(Message01Icon);
export const HugeWhatsApp = createHuge(WhatsappIcon);
export const HugeHeart = createHuge(FavouriteIcon);
export const HugeStar = createHuge(StarIcon);
export const HugeEye = createHuge(ViewIcon);
export const HugeMapPin = createHuge(Location01Icon);
export const HugeShieldCheck = createHuge(ShieldCheckIcon);
export const HugeShield = createHuge(ShieldIcon);
export const HugeCheck = createHuge(CheckmarkCircle01Icon);
export const HugeCheckCircle = createHuge(CheckmarkCircle02Icon);
export const HugeClose = createHuge(Cancel01Icon);
export const HugeChevronRight = createHuge(ChevronRightIcon);
export const HugeChevronLeft = createHuge(ChevronLeftIcon);
export const HugeChevronDown = createHuge(ChevronDownIcon);
export const HugeChevronUp = createHuge(ChevronUpIcon);
export const HugeArrowRight = createHuge(ArrowRight01Icon);
export const HugeArrowLeft = createHuge(ArrowLeft01Icon);
export const HugeArrowUpRight = createHuge(ArrowUpRight01Icon);
export const HugeSorting = createHuge(Sorting05Icon);
export const HugeBriefcase = createHuge(Briefcase01Icon);
export const HugeSliders = createHuge(SlidersHorizontalIcon);
export const HugeFilter = createHuge(FilterIcon);
export const HugeTrendingUp = createHuge(TrendingUpIcon);
export const HugeTag = createHuge(Tag01Icon);
export const HugeInfo = createHuge(InformationCircleIcon);
export const HugeSparkles = createHuge(SparklesIcon);
export const HugeCopy = createHuge(Copy01Icon);
export const HugePencil = createHuge(PencilEdit01Icon);
export const HugeTrash = createHuge(Delete02Icon);
export const HugeExternalLink = createHuge(ExternalLinkIcon);
export const HugeRotateCcw = createHuge(ReloadIcon);
export const HugeRefreshCw = createHuge(RefreshCcwIcon);
export const HugeAward = createHuge(Award01Icon);
export const HugeGlobe = createHuge(GlobeIcon);
export const HugeHelp = createHuge(HelpCircleIcon);
export const HugeFileCheck = createHuge(DocumentValidationIcon);
export const HugeLock = createHuge(LockIcon);
export const HugeLogout = createHuge(Logout01Icon);
export const HugeCrown = createHuge(CrownIcon);
export const HugeBookmark = createHuge(Bookmark01Icon);
export const HugeShare = createHuge(Share01Icon);
export const HugeSend = createHuge(SentIcon);
export const HugeDroplet = createHuge(DropletIcon);
export const HugeActivity = createHuge(ActivityIcon);
export const HugeZap = createHuge(ZapIcon);
export const HugeLayers = createHuge(LayersIcon);
export const HugeTruck = createHuge(TruckDeliveryIcon);
export const HugeAlertCircle = createHuge(AlertCircleIcon);
export const HugeAlertTriangle = createHuge(TriangleAlertIcon);
export const HugeSofa = createHuge(Sofa01Icon);
export const HugeMoney = createHuge(Money01Icon);
export const HugeBed = createHuge(BedSingle01Icon);
export const HugeCalculator = createHuge(Calculator01Icon);
export const HugeCamera = createHuge(Camera01Icon);
export const HugeCar = createHuge(Car01Icon);
export const HugeCompass = createHuge(Compass01Icon);
export const HugeCreditCard = createHuge(CreditCardIcon);
export const HugeDownload = createHuge(Download01Icon);
export const HugeFile = createHuge(File01Icon);
export const HugeImage = createHuge(Image01Icon);
export const HugeMail = createHuge(Mail01Icon);
export const HugeMaximize = createHuge(Maximize01Icon);
export const HugeMoreHorizontal = createHuge(MoreHorizontalIcon);
export const HugeMoreVertical = createHuge(MoreVerticalIcon);
export const HugePauseCircle = createHuge(PauseCircleIcon);
export const HugeRuler = createHuge(RulerIcon);
export const HugeSmartphone = createHuge(SmartPhone01Icon);
export const HugeUpload = createHuge(Upload01Icon);
export const HugeWallet = createHuge(Wallet01Icon);
export const HugeWifiOff = createHuge(WifiOff01Icon);
export const HugeWrench = createHuge(Wrench01Icon);

// ================= Drop-in Component Aliases =================
export const AlertCircle = HugeAlertCircle;
export const AlertTriangle = HugeAlertTriangle;
export const Armchair = HugeSofa;
export const ArrowLeft = HugeArrowLeft;
export const ArrowRight = HugeArrowRight;
export const ArrowUpDown = HugeSorting;
export const ArrowUpRight = HugeArrowUpRight;
export const Award = HugeAward;
export const Banknote = HugeMoney;
export const Bed = HugeBed;
export const Bell = HugeBell;
export const Bookmark = HugeBookmark;
export const Briefcase = HugeBriefcase;
export const Building = HugeBuilding;
export const Building2 = HugeBuilding2;
export const Calculator = HugeCalculator;
export const Calendar = HugeCalendar;
export const CalendarDays = HugeCalendar;
export const Camera = HugeCamera;
export const Car = HugeCar;
export const Check = HugeCheck;
export const CheckCircle2 = HugeCheckCircle;
export const ChevronDown = HugeChevronDown;
export const ChevronLeft = HugeChevronLeft;
export const ChevronRight = HugeChevronRight;
export const ChevronUp = HugeChevronUp;
export const Clock = HugeClock;
export const Compass = HugeCompass;
export const Copy = HugeCopy;
export const CreditCard = HugeCreditCard;
export const Crown = HugeCrown;
export const Download = HugeDownload;
export const Droplet = HugeDroplet;
export const Edit = HugePencil;
export const ExternalLink = HugeExternalLink;
export const Eye = HugeEye;
export const FileCheck = HugeFileCheck;
export const FileText = HugeFile;
export const Filter = HugeFilter;
export const Globe = HugeGlobe;
export const Heart = HugeHeart;
export const HelpCircle = HugeHelp;
export const Home = HugeHome;
export const Image = HugeImage;
export const ImageIcon = HugeImage;
export const Info = HugeInfo;
export const Layers = HugeLayers;
export const LayoutDashboard = HugeDashboard;
export const LayoutGrid = HugeDashboard;
export const Lock = HugeLock;
export const LogOut = HugeLogout;
export const Mail = HugeMail;
export const MapPin = HugeMapPin;
export const Maximize2 = HugeMaximize;
export const Menu = HugeMenu;
export const MessageCircle = HugeMessage;
export const MessageSquare = HugeMessage;
export const Minus = HugeMinus;
export const MoreHorizontal = HugeMoreHorizontal;
export const MoreVertical = HugeMoreVertical;
export const PauseCircle = HugePauseCircle;
export const Pencil = HugePencil;
export const Phone = HugePhone;
export const Plus = HugePlus;
export const PlusCircle = HugePlus;
export const RefreshCw = HugeRefreshCw;
export const Repeat = createHuge(CircleArrowReload01Icon);
export const RotateCcw = HugeRotateCcw;
export const Ruler = HugeRuler;
export const Search = HugeSearch;
export const Send = HugeSend;
export const Settings = HugeSettings;
export const SettingsIcon = HugeSettings;
export const Share2 = HugeShare;
export const Shield = HugeShield;
export const ShieldCheck = HugeShieldCheck;
export const SlidersHorizontal = HugeSliders;
export const Smartphone = HugeSmartphone;
export const Sparkles = HugeSparkles;
export const SquarePen = HugePencil;
export const Star = HugeStar;
export const Tag = HugeTag;
export const Trash2 = HugeTrash;
export const TrendingUp = HugeTrendingUp;
export const Truck = HugeTruck;
export const Upload = HugeUpload;
export const User = HugeUser;
export const Users = HugeUsers;
export const Wallet = HugeWallet;
export const WifiOff = HugeWifiOff;
export const Wrench = HugeWrench;
export const X = HugeClose;
export const XCircle = HugeClose;
export const Zap = HugeZap;
export const Activity = HugeActivity;

export default HugeIcon;
