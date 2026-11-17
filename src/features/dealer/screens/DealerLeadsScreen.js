// Dealer "Buyer Leads" tab: Sales Hub = the dealer's own activity with owners
// in their areas (saved, viewed, calls/messages); My Property Space = buyer
// leads on the dealer's own listings.
import React, { useState } from "react";
import { View } from "react-native";
import SavedScreen from "../../buyer/screens/SavedScreen.js";
import OwnerLeadsScreen from "../../owner/screens/OwnerLeadsScreen.js";
import DealerSpaceTabs from "../components/DealerSpaceTabs.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";

export default function DealerLeadsScreen(props) {
  const [tab, setTab] = useState(AGENT_MODULE_ENABLED ? "sales" : "space");
  const tabs = (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <DealerSpaceTabs value={tab} onChange={setTab} style={{ marginBottom: 4 }} />
    </View>
  );
  return tab === "sales" && AGENT_MODULE_ENABLED ? (
    <SavedScreen {...props} browseRoute="AreaProperties" headerAccessory={tabs} />
  ) : (
    <OwnerLeadsScreen {...props} headerAccessory={tabs} />
  );
}
