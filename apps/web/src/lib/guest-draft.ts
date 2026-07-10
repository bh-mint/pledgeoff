// A guest's idea draft written on the homepage before they have an account.
// localStorage survives the signup detour (login -> email confirm ->
// onboarding) as long as they stay in the same browser; /ideas/new picks the
// draft up on first mount and clears it.
const GUEST_DRAFT_KEY = "po_guest_idea_draft";

export function saveGuestDraft(text: string): void {
  try {
    window.localStorage.setItem(GUEST_DRAFT_KEY, text);
  } catch {
    // Storage unavailable (private mode/quota) — the user just retypes.
  }
}

export function takeGuestDraft(): string | null {
  try {
    const draft = window.localStorage.getItem(GUEST_DRAFT_KEY);
    if (draft) window.localStorage.removeItem(GUEST_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}
