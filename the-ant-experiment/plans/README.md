# Plans

One file per phase of `spec/phased-plan.md`, each listing the concrete, actionable steps
left to close that phase out — not a restatement of the spec, just what to actually go do
next, grounded in the current state of the code (see `../CLAUDE.md` for what's implemented
and what's been deliberately left as an open gap).

| File | Phase | Who does it |
|---|---|---|
| [phase-0.md](phase-0.md) | P0 Foundations — two small gaps left | Either a coding agent or a human; no hardware/credentials needed |
| [phase-1.md](phase-1.md) | P1 Evaluator — mostly done; optional follow-ups | Either |
| [phase-2.md](phase-2.md) | P2 Planner — done for the current scope; what would make it stronger | Either |
| [phase-3.md](phase-3.md) | P3 Executor + Authoriser + Verifier — **not started** | **Human with physical access to a scratch Mac** |
| [phase-4.md](phase-4.md) | P4 Permissive path + revert + control surface — **not started** | **Human with physical access to a scratch Mac** |
| [phase-5.md](phase-5.md) | P5 Hardening + release — **not started** | Human (needs the hardware matrix) |

**Why P3 onward can't just be assigned to an agent the same way P0–P2 were:** those phases
mutate a real Mac's boot security policy, which `spec/build-spec.md`'s golden rules require
to happen only from One True Recovery with a human owner physically present to type their
credentials — not something a coding agent can do unattended in a terminal session. Phase
3's file is written as instructions *for the human*, with the specific places in the
codebase that need code once you're ready to drive the round trip yourself (or hand it back
to an agent with you present at the keyboard).

Read `../CLAUDE.md`'s "Deviations from the literal spec text" section before starting any
phase below — several of the gaps listed there (the missing companion architecture document,
specifically) are preconditions worth resolving before P3 rather than after.
