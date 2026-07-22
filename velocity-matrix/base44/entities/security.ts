/**
 * Solo-cell RLS policies — mirrors rls blocks in sibling *.jsonc entities.
 * Source: agents/05_security_and_rls.md + agents/auth_design.md
 */

/** Condition: row.owner_id must equal authenticated JWT user id */
export const isolateToHacker = {
  "data.owner_id": "{{user.id}}",
} as const;

/** Condition: caller must be an authenticated user */
export const requireAuthenticated = {
  user_condition: { id: "{{user.id}}" },
} as const;

/** Shared zero-trust policy applied to all Velocity Matrix entities */
export const isolateToHackerPolicy = {
  create: requireAuthenticated,
  read: isolateToHacker,
  update: isolateToHacker,
  delete: isolateToHacker,
} as const;

/** Per-entity RLS registry for validation / docs */
export const ENTITY_RLS = {
  HackathonState: isolateToHackerPolicy,
  ActiveBlockers: isolateToHackerPolicy,
  GeneratedSolutions: isolateToHackerPolicy,
  PhantomThreads: isolateToHackerPolicy,
  ArchitectureGraph: isolateToHackerPolicy,
} as const;

/** Entities that must enforce isolateToHacker */
export const SECURED_ENTITIES = Object.keys(ENTITY_RLS);

/** Human-readable denial messages (client-facing) */
export const MATRIX_DENIAL = {
  HackathonState: "MATRIX_DENIED: Unauthorized workspace access.",
  ActiveBlockers: "MATRIX_DENIED: Cannot intercept external audio streams.",
  GeneratedSolutions: "MATRIX_DENIED: Codebase access restricted.",
  PhantomThreads: "MATRIX_DENIED: Phantom thread stream restricted.",
  ArchitectureGraph: "MATRIX_DENIED: Neural map access restricted.",
} as const;
