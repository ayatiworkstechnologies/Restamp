// Dealer Home tab: the app Home page with the "Dealer" header tag.
import React from "react";
import HomeScreen from "../../buyer/screens/HomeScreen.js";

export default function DealerHomeScreen({ route, ...props }) {
  return <HomeScreen {...props} route={{ ...route, params: { ...route?.params, modeRole: "dealer" } }} />;
}
