# Goal

**Build a fully simulated macOS research environment — not real owned Apple-Silicon
hardware — and use it to prove, end to end, that bputil-eval can correctly measure a
virtual Mac's boot-chain trust state before and after an owner-authorized security-policy
change, and correctly report when that change has moved the container away from Full
Security.**

Read this before any work in `progress/` or `plans/` that touches the simulated
environment — it's the thing every milestone in `milestones.md` is in service of, and the
thing to re-check against before marking one done.

## What "verifying the virtual OS bootloader is unlocked" means here

This phrase is doing a lot of work and is easy to misread, so pin it down precisely:

- **"Unlocked" has exactly one meaning in this project: `spec/contract-spec.md`'s
  `SecurityMode` moving away from `Full` to `Reduced` or `Permissive`.** It does not mean
  bypassing a signature check, defeating the Secure Enclave, or touching a device or VM
  the person running this project doesn't own or control. `spec/build-spec.md`'s golden
  rules apply here exactly as they do everywhere else in this codebase — a virtual machine
  you created and control is still a device this project only ever modifies through
  Apple's own `bputil`/`kmutil`/`csrutil`, with its own equivalent of an owner present and
  authorizing, never through a bypass.
- **"Verifying" means a fresh measurement, not an assumption.** The success condition for
  every milestone below is `bputil-eval evaluate`/`verify` actually reporting the new
  state, not a plan having been generated or a command having been *attempted*. Golden
  rule 8 (`spec/build-spec.md`: never claim a security state without a fresh measurement
  proving it) applies to this project's own research just as much as it applies to the
  tool it's building.
- **"Simulating the macOS environment" means a VM, built from a real IPSW, that this
  project owns and controls** (see `plans/research-environment.md`'s Track B) — not a
  hand-waved description of what a real Mac would do. If a VM can't actually do the thing
  (see the open question below), that's a finding to record, not a reason to fake the
  result with a hand-built fixture pretending to be a live measurement.

## The open technical question this goal depends on

`plans/research-environment.md` already surfaced community reports that Apple's
Virtualization.framework may not fully emulate the Secure Enclave / LocalPolicy machinery
`bputil` depends on — one forum report describes `bputil -d` failing inside a VZ guest
with an SEP-communication error ("Failed to create local policy"). That's a secondhand
report, not something this project has confirmed or refuted yet.

**This goal does not assume the answer.** It is entirely possible that the honest
end-state of this work is "a macOS VM cannot be used to prove `bputil`'s mutation path
works, only its read-only/display behavior" — in which case the milestone is to confirm
that clearly, in writing, with evidence, and then the path to a real "unlocked" proof goes
through `plans/phase-3.md`'s scratch-hardware route instead. That outcome is a legitimate,
useful result of this research track, not a failure of it.

## How this relates to the rest of the project

- `plans/phase-0.md` through `phase-2.md` (read-only evaluator and planner) are
  prerequisites that are already done — this goal doesn't re-litigate them.
- `plans/phase-3.md` and `phase-4.md` (the real `authorize`/`execute`/`verify` mutation
  pipeline) are also prerequisites: nothing in this goal can "verify an unlock" without
  that pipeline existing and being exercised against *something* — real scratch hardware
  or a VM, whichever turns out to work. Building that pipeline isn't optional busywork
  blocking this goal; it's the same code either way.
- `plans/research-environment.md` is the research record this goal continues from —
  read "Results from the real IPSW" there before starting `milestones.md`'s VM-boot
  milestone.

## What success looks like, concretely

A session transcript (or evidence bundle, per `spec/contract-spec.md`'s
`EvidenceComplete`) showing, against a VM this project built and controls:
1. `evaluate` reporting `security_mode: Full` as the baseline.
2. `plan` producing a transition to a target profile.
3. The VM's own equivalent of 1TR, with its own owner-present authorization, actually
   running `apply`.
4. `evaluate`/`verify` run again, reporting the new, non-`Full` `security_mode` — a fresh
   measurement, not an inference.

If step 3 turns out to be technically impossible inside a VM (see the open question
above), success instead looks like: a clearly written, evidenced finding to that effect in
`milestones.md`, plus an explicit decision about whether to pursue the same proof on real
scratch hardware per `plans/phase-3.md` instead.
