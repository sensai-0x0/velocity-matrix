/**
 * Base44-required auth path helpers (`/forgot-password`, `/reset-password`).
 * Email reset links are hardcoded to `/reset-password` on the app domain.
 */

export type AuthPath = "login" | "forgot-password" | "reset-password";

/** Normalize pathname for auth surface routing */
export function resolveAuthPath(pathname = window.location.pathname): AuthPath {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/forgot-password") return "forgot-password";
  if (path === "/reset-password") return "reset-password";
  return "login";
}

/**
 * Extract reset token from the email deep-link query string.
 * Accepts common Base44 / OAuth-style param names.
 */
export function getResetTokenFromLocation(
  search = window.location.search,
  hash = window.location.hash,
): string | null {
  const fromSearch = new URLSearchParams(search);
  const candidates = ["token", "reset_token", "resetToken"];
  for (const key of candidates) {
    const value = fromSearch.get(key)?.trim();
    if (value) return value;
  }

  // Some hosts put query after hash: #/reset-password?token=…
  const hashQuery = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
  if (hashQuery) {
    const fromHash = new URLSearchParams(hashQuery);
    for (const key of candidates) {
      const value = fromHash.get(key)?.trim();
      if (value) return value;
    }
  }

  return null;
}

/** Client-side navigate without a router dependency */
export function navigateAuth(path: AuthPath | "/"): void {
  const next = path === "login" || path === "/" ? "/" : `/${path}`;
  if (window.location.pathname === next) return;
  window.history.pushState({}, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
