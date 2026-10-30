/**
 * Contact reveal (Phase 6). POST /buyer/listings/{id}/contact returns the owner
 * phone ONLY on success — callers must never display a number they did not get
 * from this call. Requires an authenticated buyer (401 otherwise).
 *
 * The endpoint is gated on the BUYER role, so the request runs through
 * `withBuyerMode` (server-confirmed role switch) — same as the enquiry and
 * site-visit calls.
 */
import { apiPost } from "./client.js";
import { withBuyerMode } from "../../features/buyer/api/buyerMode.js";

export async function revealContactPhone(listingId) {
  const data = await withBuyerMode(() =>
    apiPost(`/buyer/listings/${listingId}/contact`)
  );
  return data && data.phone ? String(data.phone) : null;
}
