# 05_security_and_rls.ts

## Purpose
This document enforces Row-Level Security (RLS) across the entire Velocity Matrix architecture. In a public hackathon environment, it is critical that your proprietary code, API tokens, and AI session history remain completely isolated. This file instructs the Base44 authorization engine to lock every database interaction down to the authenticated hacker's session token.

## Agent Implementation Instructions

To the agent executing this blueprint, configure the Base44 security policies with absolute zero-trust parameters.

### Security Rules
- **No Global Reads:** Do not allow public, unauthenticated access to any entity. Even `read` operations must be secured.
- **Strict Owner Matching:** Every CRUD (Create, Read, Update, Delete) operation must validate that the `owner_id` on the database record exactly matches the `user.id` present in the current OAuth session context.
- **Bypass Protocol:** The Deno backend functions (Document 03) inherit these rules by default via `createClientFromRequest(req)`. If a background job needs to mutate state while the user is offline, it must explicitly invoke a service role, but standard client-side interactions must never bypass RLS.

## Code Artifact

```typescript
import { defineAccessPolicy } from '@base44/sdk/security';
import { HackathonState, ActiveBlockers, GeneratedSolutions } from './02_entity_schemas';

/**
 * CORE ISOLATION POLICY
 * Evaluates the incoming request token and ensures the user only interacts
 * with rows where the `owner_id` matches their authenticated session ID.
 */
const isolateToHacker = (authContext) => ({
  owner_id: { $eq: authContext.user.id }
});

export const initializeSecurityMatrix = () => {
  // 1. Lock down the Hackathon State (Overarching context)
  defineAccessPolicy(HackathonState, {
    actions: ['read', 'create', 'update', 'delete'],
    roles: ['authenticated'],
    condition: isolateToHacker,
    errorMessage: "MATRIX_DENIED: Unauthorized workspace access."
  });

  // 2. Lock down Active Blockers (Voice ingestion queue)
  defineAccessPolicy(ActiveBlockers, {
    actions: ['read', 'create', 'update', 'delete'],
    roles: ['authenticated'],
    condition: isolateToHacker,
    errorMessage: "MATRIX_DENIED: Cannot intercept external audio streams."
  });

  // 3. Lock down Generated Solutions (AI code artifacts)
  defineAccessPolicy(GeneratedSolutions, {
    actions: ['read', 'create', 'update', 'delete'],
    roles: ['authenticated'],
    condition: isolateToHacker,
    errorMessage: "MATRIX_DENIED: Codebase access restricted."
  });

  console.log("[SYSTEM] >> Row-Level Security Matrix Initialized. Zero-trust enforced.");
};