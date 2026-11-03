// Feature gates for surfaces that do not yet have a production backend
// contract. Keep disabled until the APIs, authorization, and payment flows
// exist; never re-enable seeded demo data as a substitute.
// Agent flow (plans -> Chennai localities -> payment -> agent dashboard) is
// DISABLED: payment would only be simulated in-app and no agent backend
// contract is connected yet. While false, the agent routes are not
// registered (AppNavigator), the Agent Plan tab and membership entry points
// are hidden, and AgentContext actions are no-ops.
export const AGENT_MODULE_ENABLED = true;
