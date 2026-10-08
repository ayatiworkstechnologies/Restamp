/**
 * Contact reveal (Phase 6). POST /buyer/listings/{id}/contact returns the owner
 * phone ONLY on success — callers must never display a number they did not get
 * from this call. Requires an authenticated buyer (401 otherwise).
 */
import { apiPost } from "./client";

export async function revealContactPhone(listingId) {
  const data = await apiPost(`/buyer/listings/${listingId}/contact`);
  return data && data.phone ? String(data.phone) : null;
}
