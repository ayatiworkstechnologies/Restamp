import React from "react";
import {
  LayoutGrid,
  House,
  LandPlot,
  Hotel,
  Building2,
  BriefcaseBusiness,
} from "lucide-react-native";

// Lucide icons for the Home category row, drawn duotone: full-colour stroke
// with a light tint of the same colour as the fill.
const ICONS = {
  all: LayoutGrid,
  house: House,
  plot: LandPlot,
  villa: Hotel,
  apartment: Building2,
  commercial: BriefcaseBusiness,
};

export default function CategoryFilledIcon({ id, size = 22, color = "#94A3B8" }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.8}
      fill={color}
      fillOpacity={0.18}
    />
  );
}
