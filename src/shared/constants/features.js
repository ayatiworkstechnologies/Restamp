// Feature gates for surfaces that do not yet have a production backend
// contract. Keep disabled until the APIs, authorization, and payment flows
// exist; never re-enable seeded demo data as a substitute.
// Agent flow (plans -> Chennai localities -> payment -> agent dashboard) is
// enabled. Payment is simulated in-app like the owner flow; no gateway or
// agent backend API is connected yet, and agent leads start empty.
export const AGENT_MODULE_ENABLED = true;
