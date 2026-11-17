// Dealer Properties tab: Sales Hub = owner properties in the dealer's chosen
// areas; My Property Space = the dealer's own listings.
import React, { useState } from "react";
import { View } from "react-native";
import AgentPropertiesScreen from "../../agent/screens/AgentPropertiesScreen.js";
import OwnerPropertiesScreen from "../../owner/screens/OwnerPropertiesScreen.js";
import DealerSpaceTabs from "../components/DealerSpaceTabs.js";
import { AGENT_MODULE_ENABLED } from "../../../shared/constants/features.js";

export default function DealerPropertiesScreen(props) {
  const requested = props.route?.params?.space;
  const [tab, setTab] = useState(
    requested === "space" || !AGENT_MODULE_ENABLED ? "space" : "sales"
  );
  const tabs = (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      <DealerSpaceTabs value={tab} onChange={setTab} style={{ marginBottom: 4 }} />
    </View>
  );
  return tab === "sales" && AGENT_MODULE_ENABLED ? (
    <AgentPropertiesScreen {...props} headerAccessory={tabs} />
  ) : (
    <OwnerPropertiesScreen {...props} headerAccessory={tabs} />
  );
}
