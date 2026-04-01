const KEY = "cloudaudit_pending_invite_token";

export function setPendingInviteToken(token: string | null) {
  if (typeof sessionStorage === "undefined") return;
  if (!token?.trim()) {
    sessionStorage.removeItem(KEY);
    return;
  }
  sessionStorage.setItem(KEY, token.trim());
}

export function getPendingInviteToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearPendingInviteToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}
