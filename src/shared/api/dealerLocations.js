/**
 * Agent locations — the Agent Location Master (backend workbook), one option
 * per PIN code. The website uses the same endpoint, so both show the same
 * options; admin additions appear on the next load (no app release).
 *
 *   GET /locations/agent-groups?q=&zone=
 *     -> { items: [{ id, pincode, primary_name, zone, localities[],
 *                    locality_count, display_name }], version, zones }
 *
 * Selection values are labels "<primary> - <pincode>" — the same text the
 * backend reports for covered groups in GET /broker/plan `localities`, so
 * covered and selected items compare directly. toPlanChoice() converts them
 * to the stable group ids the server stores (older locality names are
 * passed through as names for compatibility).
 */
import { apiGet } from "./client.js";

export const AGENT_ZONES = ["North Chennai", "Central Chennai", "South Chennai"];

const CACHE_MS = 60 * 1000;
let cache = { at: 0, items: null };

// Legacy catalogue items (no location master on the server) select by name.
export const groupLabel = (g) => (g.legacy ? g.primary_name : `${g.primary_name} - ${g.pincode}`);

// Servers without the Agent Location Master (not yet deployed) still serve
// the older locality catalogue: one option per locality, chosen by name.
async function fetchLegacyCatalogue() {
  const data = await apiGet("/broker/locality-catalog");
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((i) => ({
    id: null,
    legacy: true,
    pincode: (i.pincodes || []).join(", "),
    primary_name: i.name,
    zone: null,
    localities: [i.name],
    locality_count: 1,
    display_name: i.name,
  }));
}

/** All published agent location groups (cached briefly). Rejects on failure. */
export async function fetchAgentLocationGroups({ force = false } = {}) {
  if (!force && cache.items && Date.now() - cache.at < CACHE_MS) return cache.items;
  let items;
  try {
    const data = await apiGet("/locations/agent-groups");
    items = Array.isArray(data?.items) ? data.items : [];
  } catch (e) {
    if (e?.status !== 404) throw e;
    items = await fetchLegacyCatalogue();
  }
  cache = { at: Date.now(), items };
  return items;
}

/** Search across PIN code, primary name and every associated locality. */
export function filterAgentGroups(items, query, zone) {
  const q = String(query || "").trim().toLowerCase();
  const key = q.replace(/[^a-z0-9]/g, "");
  return items.filter((g) => {
    if (zone && g.zone !== zone) return false;
    if (!q) return true;
    if (g.pincode.includes(q) || g.primary_name.toLowerCase().includes(q)) return true;
    return (g.localities || []).some((n) => {
      const low = n.toLowerCase();
      return low.includes(q) || (key && low.replace(/[^a-z0-9]/g, "").includes(key));
    });
  });
}

/**
 * Split selected labels into { group_ids, localities } for the plan APIs:
 * labels of known groups become their stable ids; anything else (an older
 * app's locality name) stays a name.
 */
export async function toPlanChoice(labels) {
  const list = Array.isArray(labels) ? labels : [];
  let items = [];
  try {
    items = await fetchAgentLocationGroups();
  } catch {
    items = [];
  }
  const byLabel = new Map(items.filter((g) => g.id != null).map((g) => [groupLabel(g), g.id]));
  const group_ids = [];
  const localities = [];
  for (const l of list) {
    if (byLabel.has(l)) group_ids.push(byLabel.get(l));
    else localities.push(l);
  }
  return { group_ids, localities };
}
