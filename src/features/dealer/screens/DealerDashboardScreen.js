// Dealer "My Hub": the shared Owner dashboard in dealer mode (dealer plan,
// dealer labels and header tag).
import React from "react";
import OwnerDashboardScreen from "../../owner/screens/OwnerDashboardScreen.js";

export default function DealerDashboardScreen({ route, ...props }) {
  return <OwnerDashboardScreen {...props} route={{ ...route, params: { ...route?.params, mode: "dealer" } }} />;
}
