When you're building a platform that hosts multiple solo hackers simultaneously in a high-stress environment, the biggest risk is data bleed. One hacker's AI agent cannot accidentally overwrite another hacker's repository or read their active blockers.

Because we configured Document 08 (`auth_config.jsonc`) to bypass passwords in favor of GitHub/Google OAuth, we can leverage a **"Solo-Cell" architecture**. Everyone shares the same underlying PostgreSQL tables to maximize Base44's performance, but Row-Level Security (RLS) acts as a cryptographic wall between them.

Here is the plan for how the authorization flows from the Neuropunk UI down into the isolated database cells.

## 1. The Frictionless Authorization Flow

We need the time-to-first-interaction to be under 5 seconds. The flow is strictly linear and handled almost entirely by the Base44 Edge environment.

1. **The OAuth Handshake:** UI -.
Base44 Auth">
The hacker arrives at the Ambient Cortex UI (which is currently locked). They click a minimalist `[ Authenticate // GitHub ]` string. The UI triggers the Base44 SDK `base44.auth.signInWith('github')`. This redirects them through GitHub's OAuth, verifying their identity instantly.


2. **JWT Minting & Edge Injection:** Base44 Auth -.
Edge">
Upon successful callback, the Base44 auth service mints a secure JSON Web Token (JWT) containing the hacker's unique `user.id`. This JWT is securely set as an HttpOnly cookie on the client. From this moment on, every WebSocket ping and Deno function invocation automatically carries this cryptographic identity.


3. **Auto-Provisioning the Grid:** Edge -.
Database">
On their first login, a Base44 Edge function intercepts the auth event. It silently provisions a new row in the `HackathonState` table with their `owner_id`. The UI unlocks, transitioning to the Ambient Cortex listening state. They are now in their isolated cell.


## 2. Multi-User Tenancy: The Solo-Cell Model

To make the multi-tenant database completely secure without standing up separate databases for every user, we implement the following three tenancy rules across the architecture.

### Rule A: The `owner_id` Anchor

Every single entity schema (from Document 02) includes a mandatory `owner_id` column. When a new row is written to `ActiveBlockers` or `GeneratedSolutions`, the backend Deno function does not trust the client to provide this ID. Instead, it extracts the `user.id` directly from the validated JWT context and forces it into the row payload.

### Rule B: Postgres Context Awareness

When the Base44 Deno backend attempts a read or write, it doesn't use a highly privileged superuser role. Instead, the `base44.createClientFromRequest(req)` command passes the user's JWT down to the PostgreSQL layer.

* Postgres reads the `request.jwt.claims.sub` (the user's ID).
* The Document 05 RLS policies (`isolateToHacker`) evaluate this claim against the `owner_id` column.
* **Result:** Even if an AI agent hallucinates a query like `SELECT * FROM ActiveBlockers`, the database intercepts it and *only* returns the rows belonging to that specific hacker.

### Rule C: Connector Dynamic Routing

Because the backend functions are shared, the external tools (Document 06) need to know which hacker they are working for.

* **The Problem:** The `github_auto_commit` connector is system-wide.
* **The Tenancy Fix:** The hacker's `target_repo_url` is stored in their isolated `HackathonState` row. When the AI Executor (Node 03) wants to commit code, it must first read the `target_repo_url` from the DB. Because of RLS, it can only successfully read the repo URL for the currently authenticated hacker, ensuring commits are dynamically and securely routed to the correct GitHub repository.