import React from "react";
import { View } from "react-native";
import {
  Activity as LucideActivity,
  Armchair as LucideArmchair,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUpDown as LucideArrowUpDown,
  ArrowUpRight as LucideArrowUpRight,
  Award as LucideAward,
  Banknote as LucideBanknote,
  Bed as LucideBed,
  Bell as LucideBell,
  Bookmark as LucideBookmark,
  Briefcase as LucideBriefcase,
  Building as LucideBuilding,
  Building2 as LucideBuilding2,
  Calculator as LucideCalculator,
  Calendar as LucideCalendar,
  Camera as LucideCamera,
  Car as LucideCar,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  CircleAlert as LucideCircleAlert,
  CircleCheck as LucideCircleCheck,
  CircleHelp as LucideCircleHelp,
  CirclePause as LucideCirclePause,
  CirclePlus as LucideCirclePlus,
  CircleX as LucideCircleX,
  Clock as LucideClock,
  Compass as LucideCompass,
  Copy as LucideCopy,
  CreditCard as LucideCreditCard,
  Crown as LucideCrown,
  Download as LucideDownload,
  Droplet as LucideDroplet,
  Ellipsis as LucideEllipsis,
  EllipsisVertical as LucideEllipsisVertical,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  FileCheck as LucideFileCheck,
  FileText as LucideFileText,
  Funnel as LucideFunnel,
  Globe as LucideGlobe,
  Heart as LucideHeart,
  House as LucideHouse,
  Image as LucideImage,
  Info as LucideInfo,
  Layers as LucideLayers,
  LayoutDashboard as LucideLayoutDashboard,
  LayoutGrid as LucideLayoutGrid,
  Lock as LucideLock,
  LogOut as LucideLogOut,
  Mail as LucideMail,
  MapPin as LucideMapPin,
  Maximize2 as LucideMaximize2,
  Menu as LucideMenu,
  MessageCircle as LucideMessageCircle,
  MessageSquare as LucideMessageSquare,
  Minus as LucideMinus,
  Pencil as LucidePencil,
  Phone as LucidePhone,
  Plus as LucidePlus,
  RefreshCw as LucideRefreshCw,
  Repeat as LucideRepeat,
  RotateCcw as LucideRotateCcw,
  Ruler as LucideRuler,
  Search as LucideSearch,
  Send as LucideSend,
  Settings as LucideSettings,
  Share2 as LucideShare2,
  Shield as LucideShield,
  ShieldCheck as LucideShieldCheck,
  SlidersHorizontal as LucideSlidersHorizontal,
  Smartphone as LucideSmartphone,
  Sparkles as LucideSparkles,
  SquarePen as LucideSquarePen,
  Star as LucideStar,
  Tag as LucideTag,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  TriangleAlert as LucideTriangleAlert,
  Truck as LucideTruck,
  Upload as LucideUpload,
  User as LucideUser,
  Users as LucideUsers,
  Wallet as LucideWallet,
  WifiOff as LucideWifiOff,
  Wrench as LucideWrench,
  X as LucideX,
  Zap as LucideZap,
} from "lucide-react-native";

/**
 * App-wide icon set for RESTAMP, backed by Lucide (lucide-react-native).
 * The file keeps its original name and export names so every screen picks up
 * Lucide without import changes. Supports size, color, strokeWidth, fill and
 * a wrapper `style` (used for margins).
 *
 * Can also be used directly:
 * <HugeIcon icon={Search} size={22} color="#2563EB" strokeWidth={1.8} />
 */
export function HugeIcon({ icon: Icon, size = 22, color = "#0F172A", strokeWidth = 1.8, style, ...rest }) {
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={style} {...rest} />;
}

// Wraps a Lucide glyph with the app's defaults. `style` goes on a wrapping
// View so layout props like margins behave as they did before.
export const createHuge = (LucideGlyph, defaultStroke = 1.8) => {
  return function LucideIconWrapper({
    size = 22,
    color = "#0F172A",
    strokeWidth = defaultStroke,
    fill = "none",
    style,
    ...rest
  }) {
    return (
      <View style={style}>
        <LucideGlyph
          size={size}
          color={color}
          strokeWidth={strokeWidth}
          fill={fill}
          {...rest}
        />
      </View>
    );
  };
};

// ================= Pre-configured RESTAMP icons =================
export const HugeHome = createHuge(LucideHouse);
export const HugeSearch = createHuge(LucideSearch);
export const HugeUser = createHuge(LucideUser);
export const HugeBell = createHuge(LucideBell);
export const HugeSettings = createHuge(LucideSettings);
export const HugeClock = createHuge(LucideClock);
export const HugeMenu = createHuge(LucideMenu);
export const HugeBuilding = createHuge(LucideBuilding);
export const HugeBuilding2 = createHuge(LucideBuilding2);
export const HugeDashboard = createHuge(LucideLayoutDashboard);
export const HugeUsers = createHuge(LucideUsers);
export const HugePlus = createHuge(LucidePlus);
export const HugeMinus = createHuge(LucideMinus);
export const HugeCalendar = createHuge(LucideCalendar);
export const HugePhone = createHuge(LucidePhone);
export const HugeMessage = createHuge(LucideMessageCircle);
export const HugeHeart = createHuge(LucideHeart);
export const HugeStar = createHuge(LucideStar);
export const HugeEye = createHuge(LucideEye);
export const HugeMapPin = createHuge(LucideMapPin);
export const HugeShieldCheck = createHuge(LucideShieldCheck);
export const HugeShield = createHuge(LucideShield);
export const HugeCheck = createHuge(LucideCheck);
export const HugeCheckCircle = createHuge(LucideCircleCheck);
export const HugeClose = createHuge(LucideX);
export const HugeChevronRight = createHuge(LucideChevronRight);
export const HugeChevronLeft = createHuge(LucideChevronLeft);
export const HugeChevronDown = createHuge(LucideChevronDown);
export const HugeChevronUp = createHuge(LucideChevronUp);
export const HugeArrowRight = createHuge(LucideArrowRight);
export const HugeArrowLeft = createHuge(LucideArrowLeft);
export const HugeArrowUpRight = createHuge(LucideArrowUpRight);
export const HugeSorting = createHuge(LucideArrowUpDown);
export const HugeBriefcase = createHuge(LucideBriefcase);
export const HugeSliders = createHuge(LucideSlidersHorizontal);
export const HugeFilter = createHuge(LucideFunnel);
export const HugeTrendingUp = createHuge(LucideTrendingUp);
export const HugeTag = createHuge(LucideTag);
export const HugeInfo = createHuge(LucideInfo);
export const HugeSparkles = createHuge(LucideSparkles);
export const HugeCopy = createHuge(LucideCopy);
export const HugePencil = createHuge(LucidePencil);
export const HugeTrash = createHuge(LucideTrash2);
export const HugeExternalLink = createHuge(LucideExternalLink);
export const HugeRotateCcw = createHuge(LucideRotateCcw);
export const HugeRefreshCw = createHuge(LucideRefreshCw);
export const HugeAward = createHuge(LucideAward);
export const HugeGlobe = createHuge(LucideGlobe);
export const HugeHelp = createHuge(LucideCircleHelp);
export const HugeFileCheck = createHuge(LucideFileCheck);
export const HugeLock = createHuge(LucideLock);
export const HugeLogout = createHuge(LucideLogOut);
export const HugeCrown = createHuge(LucideCrown);
export const HugeBookmark = createHuge(LucideBookmark);
export const HugeShare = createHuge(LucideShare2);
export const HugeSend = createHuge(LucideSend);
export const HugeDroplet = createHuge(LucideDroplet);
export const HugeActivity = createHuge(LucideActivity);
export const HugeZap = createHuge(LucideZap);
export const HugeLayers = createHuge(LucideLayers);
export const HugeTruck = createHuge(LucideTruck);
export const HugeAlertCircle = createHuge(LucideCircleAlert);
export const HugeAlertTriangle = createHuge(LucideTriangleAlert);
export const HugeSofa = createHuge(LucideArmchair);
export const HugeMoney = createHuge(LucideBanknote);
export const HugeBed = createHuge(LucideBed);
export const HugeCalculator = createHuge(LucideCalculator);
export const HugeCamera = createHuge(LucideCamera);
export const HugeCar = createHuge(LucideCar);
export const HugeCompass = createHuge(LucideCompass);
export const HugeCreditCard = createHuge(LucideCreditCard);
export const HugeDownload = createHuge(LucideDownload);
export const HugeFile = createHuge(LucideFileText);
export const HugeImage = createHuge(LucideImage);
export const HugeMail = createHuge(LucideMail);
export const HugeMaximize = createHuge(LucideMaximize2);
export const HugeMoreHorizontal = createHuge(LucideEllipsis);
export const HugeMoreVertical = createHuge(LucideEllipsisVertical);
export const HugePauseCircle = createHuge(LucideCirclePause);
export const HugeRuler = createHuge(LucideRuler);
export const HugeSmartphone = createHuge(LucideSmartphone);
export const HugeUpload = createHuge(LucideUpload);
export const HugeWallet = createHuge(LucideWallet);
export const HugeWifiOff = createHuge(LucideWifiOff);
export const HugeWrench = createHuge(LucideWrench);

// ================= Drop-in Component Aliases (Lucide names) =================
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
export const Edit = createHuge(LucideSquarePen);
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
export const LayoutGrid = createHuge(LucideLayoutGrid);
export const Lock = HugeLock;
export const LogOut = HugeLogout;
export const Mail = HugeMail;
export const MapPin = HugeMapPin;
export const Maximize2 = HugeMaximize;
export const Menu = HugeMenu;
export const MessageCircle = HugeMessage;
export const MessageSquare = createHuge(LucideMessageSquare);
export const Minus = HugeMinus;
export const MoreHorizontal = HugeMoreHorizontal;
export const MoreVertical = HugeMoreVertical;
export const PauseCircle = HugePauseCircle;
export const Pencil = HugePencil;
export const Phone = HugePhone;
export const Plus = HugePlus;
export const PlusCircle = createHuge(LucideCirclePlus);
export const RefreshCw = HugeRefreshCw;
export const Repeat = createHuge(LucideRepeat);
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
export const SquarePen = createHuge(LucideSquarePen);
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
export const XCircle = createHuge(LucideCircleX);
export const Zap = HugeZap;
export const Activity = HugeActivity;

export default HugeIcon;
