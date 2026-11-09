# Milestones

Tracks progress toward `goal.md`. Read that file first — every milestone here exists in
service of it.

## How to record progress (read before editing)

- **Update the status table** when a milestone's state changes, and **append a dated
  entry** to the log below it — don't just flip a status with no record of what happened.
- Every "Done" needs evidence: a commit hash, a file path, or both. No commit/file to
  point to means it isn't done yet — write "In progress" and say what's blocking it
  instead. This mirrors `spec/build-spec.md` golden rule 8 (no claim without a fresh
  measurement) applied to this project's own tracking, not just the tool it builds.
- If a milestone turns out to be impossible or needs to be split/reordered, say so in the
  log rather than silently deleting or renumbering it — the history of "we thought X, then
  found Y" is as valuable as the final state.
- New milestones get appended at the end of the table with the next free `M<n>`, not
  inserted into the middle — keeps old log entries' references stable.

## Status

| # | Milestone | Status | Evidence |
|---|---|---|---|
| M0 | Research environment plan written (`plans/research-environment.md`) | Done | commit `f68c6d4` |
| M1 | Real IPSW ground-truth extraction — Track A (`ipsw info`/`plist`/`dtree` against `UniversalMac_27.2_26B7124_Restore.ipsw`) | Done | commit `6b40e36`; results recorded in `plans/research-environment.md`'s "Results from the real IPSW" |
| M2 | M6 identity fixtures committed (`tests/fixtures/*_M6*`) | Done | commit `6b40e36` |
| M3 | `authorize`/`execute`/`verify` mutation pipeline implemented and proven on *some* target (real scratch hardware or VM, per `plans/phase-3.md`) | Not started | — |
| M4 | A macOS VM built from the real IPSW, owned/controlled by this project (`plans/research-environment.md` Track B) | Not started | — |
| M5 | Determined whether `bputil`'s mutation path (SEP/LocalPolicy) actually works inside that VM | Not started (open question — see `goal.md`) | — |
| M6 | End-to-end proof: `evaluate` → `plan` → `apply` → `verify` inside the VM, with `verify` reporting a real non-`Full` `security_mode` | Not started; blocked on M3, M4, M5 | — |
| M7 | *(contingent on M5 being "no")* Written finding on why the VM path doesn't work, plus a decision on pursuing the same proof via `plans/phase-3.md`'s real scratch hardware instead | Not started | — |

## Log

### 2026-11-10 — M0, M1, M2 recorded as done

Installed `blacktop/ipsw` (brew) and ran it against the real
`UniversalMac_27.2_26B7124_Restore.ipsw` (20.8 GB, in the repo root, gitignored). Confirmed
first-hand: the IPSW supports exactly `Mac18,1` (MacBook Pro 14", board `J804AP`) and
`Mac18,2` (iMac 24", board `J833ctAP`), both plain M6 (`t8152`, ARMv9.5-A) — no Pro/Max
tier, matching `plans/research-environment.md` §0's naming concern. Extracted
`BuildManifest.plist`, ran `ipsw dtree --filter j804ap`, extracted `iBoot`/kernelcache,
and one-off-tested that `state::img4::parse_manifest_der` correctly rejects a real IM4P
(it expects IM4M) rather than misparsing it.

Built four fixtures from the confirmed values (`sysctl_machdep_cpu_brand_string_M6.txt`,
`sw_vers_buildVersion_M6.txt`, two `_FIRMWARE_TEMPLATE` identity fixtures) and introduced
the `_FIRMWARE_TEMPLATE` labeling convention in `tests/fixtures/README.md` for data that's
real but comes from unpersonalized firmware rather than a live device. 44 tests pass,
clippy/fmt/guards clean.

`progress/` itself (this file and `goal.md`) created in the same session, to track the
rest of this goal going forward — M3 onward are genuinely not started yet; this entry
doesn't claim otherwise.

**Next up:** M4 (boot the VM via `tart create --from-ipsw=...`, per
`plans/research-environment.md` §3) is the next unblocked milestone — M3 can proceed in
parallel since it doesn't depend on the VM existing yet, only on having *some* target to
eventually run the round trip against.
