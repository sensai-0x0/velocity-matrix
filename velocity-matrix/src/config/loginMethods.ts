/**
 * Login methods mirrored from `base44/auth/config.jsonc`.
 * Keep in sync when OAuth providers are enabled in the dashboard.
 */
export type AuthProviderId = "google" | "microsoft" | "facebook" | "apple" | "sso";

export interface LoginMethods {
  emailAndPassword: boolean;
  google: boolean;
  microsoft: boolean;
  facebook: boolean;
  apple: boolean;
  /** Enterprise SSO — GitHub Solo-Cell uses this when dashboard SSO is configured */
  sso: boolean;
}

/** Enabled auth surfaces for the Locked Cortex gate */
export const LOGIN_METHODS: LoginMethods = {
  emailAndPassword: true,
  google: false,
  microsoft: false,
  facebook: false,
  apple: false,
  sso: false,
};

/** Human labels for text-string affordances */
export const PROVIDER_LABELS: Record<AuthProviderId, string> = {
  google: "Google",
  microsoft: "Microsoft",
  facebook: "Facebook",
  apple: "Apple",
  sso: "GitHub",
};

/** Providers currently enabled for OAuth redirect */
export function enabledProviders(methods: LoginMethods = LOGIN_METHODS): AuthProviderId[] {
  const ids: AuthProviderId[] = ["google", "microsoft", "facebook", "apple", "sso"];
  return ids.filter((id) => methods[id]);
}
