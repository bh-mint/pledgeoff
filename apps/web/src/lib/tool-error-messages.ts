const TOOL_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Your session expired. Refresh and sign in again.",
  PLAN_TOOL_LOCKED: "This tool isn't included in your current plan.",
  RATE_LIMITED: "Too many requests — wait a moment and try again.",
  NOT_FOUND: "This idea couldn't be found.",
  INTERNAL: "Something went wrong. Try again.",
};

/** Maps an API error code to human copy. Unknown codes fall back to a generic message. */
export function friendlyToolError(code: string | undefined): string {
  if (!code) return TOOL_ERROR_MESSAGES.INTERNAL;
  return TOOL_ERROR_MESSAGES[code] ?? TOOL_ERROR_MESSAGES.INTERNAL;
}
