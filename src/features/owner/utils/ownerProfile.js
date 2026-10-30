/**
 * Owner profile name editing — pure helpers (unit-tested in
 * scripts/owner-profile-name.test.mjs).
 *
 * The backend stores a single users.display_name (PATCH /users/me,
 * 1–255 characters after trimming); first/last name are only a client-side
 * split of it. OTP sign-ups start with display_name = their phone number,
 * so a phone-shaped current name is never offered back as the editable
 * "name" — the field starts empty instead.
 */

export const OWNER_NAME_MAX_LENGTH = 255;

/**
 * Initial text for the name editor: the owner's current chosen name, or ""
 * when the current value is a placeholder ("Owner") or phone-shaped.
 */
export function initialOwnerNameDraft(name, phone) {
  const current = typeof name === "string" ? name.trim() : "";
  if (!current || current === "Owner") return "";
  if (phone && current === String(phone).trim()) return "";
  if (/^\+?[\d\s()-]{6,}$/.test(current)) return "";
  return current;
}

/**
 * Validate a draft against the backend rule (trimmed, 1–255 chars).
 * @returns {{ok: true, value: string, firstName: string, lastName: string} | {ok: false, error: string}}
 */
export function validateOwnerName(draft) {
  const value = typeof draft === "string" ? draft.trim().replace(/\s+/g, " ") : "";
  if (!value) return { ok: false, error: "Please enter your name." };
  if (value.length > OWNER_NAME_MAX_LENGTH) {
    return { ok: false, error: `Name must be at most ${OWNER_NAME_MAX_LENGTH} characters.` };
  }
  const [firstName, ...rest] = value.split(" ");
  return { ok: true, value, firstName, lastName: rest.join(" ") };
}
