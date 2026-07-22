/**
 * Synth-based tactile telemetry — maps MatrixTelemetryEvent types to cues (FE-4).
 * Oscillators avoid shipping binary buffers; mute + reduced-sound respected.
 */
import type { MatrixTelemetryEventType } from "@/contracts/data_contracts";

type PlayFn = (type: MatrixTelemetryEventType) => void;

let ctx: AudioContext | null = null;
let unlocked = false;
let muted = false;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Unlock AudioContext on first user gesture */
export function unlockTactileAudio(): void {
  const c = getCtx();
  if (!c) return;
  void c.resume().then(() => {
    unlocked = true;
  });
}

export function setTactileMuted(next: boolean): void {
  muted = next;
  if (muted) stopHum();
}

export function isTactileMuted(): boolean {
  return muted;
}

function prefersReducedSound(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stopHum(): void {
  try {
    humOsc?.stop();
  } catch {
    /* already stopped */
  }
  humOsc = null;
  humGain = null;
}

function startHum(c: AudioContext): void {
  stopHum();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 55;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  humOsc = osc;
  humGain = gain;
}

function beep(
  c: AudioContext,
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  gainVal = 0.08,
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;
  osc.connect(gain);
  gain.connect(c.destination);
  const now = c.currentTime;
  osc.start(now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.stop(now + durationMs / 1000 + 0.02);
}

/** Play a cue for a telemetry event type */
export const playTelemetry: PlayFn = (type) => {
  if (muted || prefersReducedSound() || !unlocked) return;
  const c = getCtx();
  if (!c || c.state === "suspended") return;

  switch (type) {
    case "PHANTOM_RUNNING":
    case "PHANTOM_COMPILING":
      startHum(c);
      return;
    case "EVALS_PASSED":
    case "SYNTHESIS_COMPLETE":
      stopHum();
      beep(c, 880, 60, "square", 0.1);
      return;
    case "EVALS_FAILED":
    case "MATRIX_DENIED":
      stopHum();
      beep(c, 180, 120, "sawtooth", 0.12);
      beep(c, 140, 160, "sawtooth", 0.08);
      return;
    case "SCOPE_WARNING":
      beep(c, 440, 80, "triangle", 0.07);
      beep(c, 330, 100, "triangle", 0.07);
      return;
    case "BRANCH_READY":
      stopHum();
      beep(c, 660, 90, "sine", 0.09);
      return;
    default:
      return;
  }
};

const TELEMETRY_TYPES: MatrixTelemetryEventType[] = [
  "PHANTOM_RUNNING",
  "PHANTOM_COMPILING",
  "SYNTHESIS_COMPLETE",
  "EVALS_PASSED",
  "EVALS_FAILED",
  "MATRIX_DENIED",
  "SCOPE_WARNING",
  "BRANCH_READY",
];

/** Narrow unknown string to MatrixTelemetryEventType */
export function asTelemetryType(
  value: unknown,
): MatrixTelemetryEventType | null {
  if (typeof value !== "string") return null;
  return TELEMETRY_TYPES.includes(value as MatrixTelemetryEventType)
    ? (value as MatrixTelemetryEventType)
    : null;
}
