// Feature gates for surfaces that do not yet have a production backend
// contract. Keep disabled until the APIs, authorization, and payment flows
// exist; never re-enable seeded demo data as a substitute.
// Agent flow (plans -> Chennai localities -> payment -> agent dashboard) is
// DISABLED: payment would only be simulated in-app and no agent backend
// contract is connected yet. While false, the agent routes are not
// registered (AppNavigator), the Agent Plan tab and membership entry points
// are hidden, and AgentContext actions are no-ops.
export const AGENT_MODULE_ENABLED = true;

// Agent ROLE hidden at the client's request (keep only Dealer). The agent
// code, routes and backend stay in place, because the Dealer page runs on the
// same area engine (AGENT_MODULE_ENABLED above must stay true). While false:
// no Agent role choice, welcome slide, plan tab, membership, dashboard entry,
// chatbot intent or "Agent" label is shown; a BROKER source reads "Dealer".
// Set to true to bring the Agent role back.
export const AGENT_ROLE_VISIBLE = false;
// Label for leads/visits that come from the BROKER (area) side.
export const PARTNER_LABEL = AGENT_ROLE_VISIBLE ? "Dealer" : "Dealer";
