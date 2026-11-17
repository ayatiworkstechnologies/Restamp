// Dealer Profile: the shared Owner profile in dealer mode (dealer plan card,
// renew, payment history and invoices for the dealer plan).
import React from "react";
import OwnerProfileScreen from "../../owner/screens/OwnerProfileScreen.js";

export default function DealerProfileScreen({ route, ...props }) {
  return <OwnerProfileScreen {...props} route={{ ...route, params: { ...route?.params, mode: "dealer" } }} />;
}
