import { Alert } from "react-native";
import { agentAreaMessage } from "../../../shared/api/agentPlans.js";

// The existing agent subscription flow: Menu -> Agent Plan tab (plan cards ->
// AgentLocationSelect -> confirm -> payment). Never the buyer plans.
export const AGENT_UPGRADE_ROUTE = "Menu";
export const AGENT_UPGRADE_PARAMS = { initialTab: "agent" };

/**
 * Explain the agent's area limit and offer the Upgrade button. `error` may be
 * the 402 AGENT_AREA_NOT_IN_PLAN ApiError (its server message is shown) or
 * null for the default free-trial wording.
 */
export function promptAgentUpgrade(navigation, error = null) {
  Alert.alert("Explore more areas", agentAreaMessage(error), [
    { text: "Not now", style: "cancel" },
    {
      text: "Upgrade",
      onPress: () => navigation?.navigate?.(AGENT_UPGRADE_ROUTE, AGENT_UPGRADE_PARAMS),
    },
  ]);
}
