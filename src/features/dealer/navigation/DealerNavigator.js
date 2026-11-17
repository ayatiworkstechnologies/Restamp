// Dealer page. A dealer posts properties through the owner listing system
// (server OWNER role underneath), so the tabs reuse the Owner screens with
// the dealer plan and labels: Dashboard · Add Property · Activity · Profile.
import React from "react";
import OwnerNavigator from "../../owner/navigation/OwnerNavigator.js";

export default function DealerNavigator() {
  return <OwnerNavigator mode="dealer" />;
}
