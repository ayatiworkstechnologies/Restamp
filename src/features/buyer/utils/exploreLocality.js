/**
 * Explore screen: label for the selected locality's listing count.
 *
 * The number shown is the backend's own `total` for GET /buyer/listings
 * (verified, available listings in that locality), never the length of the
 * first page and never an invented figure. While loading, or when the count
 * could not be fetched, no number is shown at all.
 */
export function localityCountLabel({ loading, failed, total }) {
  if (loading) return "Loading...";
  if (failed || !Number.isInteger(total) || total < 0) return "Count unavailable";
  return `${total} Available`;
}
