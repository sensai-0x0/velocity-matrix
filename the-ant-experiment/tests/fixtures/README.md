# Fixtures

Captured real output from Apple's own tools, per `spec/phased-plan.md`'s P0 "Fixtures
harness" workstream ("Capture real `bputil -d`, `csrutil status`, `nvram -p` and `ioreg`
output into `tests/fixtures` for deterministic parser tests").

## Provenance

| File | Captured via | Chip | macOS build |
|---|---|---|---|
| `bputil_help_v0.1.14.txt` | `bputil -h` | Apple M2 Pro | 25D125 |
| `csrutil_status.txt` | `csrutil status` | Apple M2 Pro | 25D125 |
| `csrutil_authenticated_root_status.txt` | `csrutil authenticated-root status` | Apple M2 Pro | 25D125 |
| `sw_vers_buildVersion.txt` | `sw_vers -buildVersion` | Apple M2 Pro | 25D125 |
| `sysctl_machdep_cpu_brand_string.txt` | `sysctl -n machdep.cpu.brand_string` | Apple M2 Pro | 25D125 |
| `diskutil_info_root_REDACTED.txt` | `diskutil info /` | Apple M2 Pro | 25D125 |
| `system_profiler_hardware_REDACTED.txt` | `system_profiler SPHardwareDataType` | Apple M2 Pro | 25D125 |
| `ioreg_platform_expert_device_REDACTED.txt` | `ioreg -rd1 -c IOPlatformExpertDevice` | Apple M2 Pro | 25D125 |

All of the above were captured from macOS (not 1TR) — these are the commands `env`/`state/collect`
can run without elevation. All are read-only and change nothing on the host they were captured
from (golden rule 3).

## What's missing

`bputil -d` (and `-d -j`), i.e. the actual local-policy display, **requires root**
(confirmed on this machine: without `sudo`, it fails with "The tool requires running as
root"). Capturing it means running `sudo bputil -d` interactively and pasting the real
output — something this agent cannot do itself, since typing the sudo password is a human
action, and the tool must never automate, store, or prompt for that credential
(`spec/build-spec.md` golden rule 4; `state/collect.rs`'s module doc explains why it uses
`sudo -n` and degrades to `SecurityMode::Unknown` rather than ever touching that prompt).
**A maintainer with physical access should capture this once**, per macOS build and chip
generation in the hardware matrix (`spec/phased-plan.md`'s P5 "Coverage across the hardware
matrix"), and add it here — redacted the same way the files below are.

Per-chip-generation coverage (M1–M5 per `spec/phased-plan.md`'s hardware test matrix) is a
P5 concern; this repo currently only has fixtures from the one Apple Silicon Mac available
during initial development.

## Why `system_profiler`, not `ioreg`, for the serial number

`ioreg_platform_expert_device_REDACTED.txt` is kept for reference, but `state/collect.rs`
reads the serial from `system_profiler SPHardwareDataType` instead. Confirmed on real
hardware: running the same `ioreg -rd1 -c IOPlatformExpertDevice` invocation twice, a few
seconds apart, produces different output even with nothing about the device's security
state having changed — the top-level object line carries a live uptime counter (`busy N ms`)
that free-runs. `diskutil info /` has the same problem (`Container Free Space` /
`Volume Used Space` change as the filesystem is written to in the background).
`system_profiler SPHardwareDataType`, by contrast, reports static hardware facts and was
confirmed byte-identical across two calls. See `state/collect.rs`'s module doc for how this
shaped what goes into `evidence.raw_outputs`.

## Redaction

`diskutil_info_root_REDACTED.txt` and `ioreg_platform_expert_device_REDACTED.txt` have every
UUID-shaped value and both serial-number fields (`IOPlatformSerialNumber`, `serial-number`,
`mlb-serial-number`) replaced with placeholders before being committed. These are real,
device-identifying values from the capturing machine and `contract-spec.md`'s own
`host.serial_masked` constraint ("at most the last 4 characters; never the full serial")
exists precisely because this tool must not leak them — that constraint should extend to the
fixtures that test it. **Never commit an unredacted capture.** If you add a fixture, redact
serials and volume/platform UUIDs the same way (a trivial `sed` pass; see the capture history
for this directory for the exact substitutions used).
