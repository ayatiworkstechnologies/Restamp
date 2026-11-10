/**
 * Avatar initials — the single rule for every user avatar in the app.
 *
 * Pure module (no React / react-native imports) so it is unit-tested from
 * scripts/profile-initials.test.mjs.
 *
 * - First and last name word -> two letters: "Roshan S" -> "RS",
 *   "Roshan Kumar Shah" -> "RS".
 * - One name word -> one letter: "Roshan" -> "R".
 * - Only words that start with a letter count, so a phone-number default
 *   name ("+919876543210") or a "Buyer #12" placeholder never turns digits
 *   or symbols into initials ("+91 98765 Roshan" -> "R").
 * - Missing, empty or whitespace-only names -> "" (callers show an icon).
 * - The app's own placeholder labels are not names: "User", "Owner",
 *   "Buyer", "Guest", "My Account" and "Buyer #12" (a lead with no chosen
 *   name) -> "", so nobody is shown as "U" or "O".
 * Never changes the stored name; display only.
 */
const STARTS_WITH_LETTER = /^\p{L}/u;
const PLACEHOLDER_NAME = /^(user|owner|buyer|guest|my account|buyer enquiry)(\s*#\d+)?$/i;

export function getInitials(name) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  if (PLACEHOLDER_NAME.test(trimmed)) return "";
  const words = trimmed.split(/\s+/).filter((w) => STARTS_WITH_LETTER.test(w));
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0];
  if (words.length === 1) return first.toLocaleUpperCase();
  const last = Array.from(words[words.length - 1])[0];
  return `${first}${last}`.toLocaleUpperCase();
}
