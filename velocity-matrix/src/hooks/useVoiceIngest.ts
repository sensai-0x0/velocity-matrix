/**
 * Ambient Cortex voice / text ingest → process-voice-command (F4).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildVoiceIngestionPayload,
  processVoiceCommand,
} from "@/api/matrixApi";
import type { CortexEvent } from "@/cortex/cortexMachine";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";

const PAUSE_SUBMIT_MS = 1_200;

export type VoiceIngestMode = "speech" | "text";

export interface UseVoiceIngestOptions {
  /** Only listen / accept input while Ambient Cortex is active */
  enabled: boolean;
  dispatch: (event: CortexEvent) => void;
}

export interface UseVoiceIngestResult {
  mode: VoiceIngestMode;
  listening: boolean;
  submitting: boolean;
  interimTranscript: string;
  lastTranscript: string;
  amplitude: number;
  urgency: boolean;
  error: string | null;
  speechSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  submitText: (transcript: string) => Promise<void>;
}

/** Detect Cancel / history voice authority phrases (F7 preview) */
function matchVoiceAuthority(transcript: string): CortexEvent | null {
  const t = transcript.trim().toLowerCase();
  if (/^cancel that\.?$/.test(t) || t === "cancel") {
    return { type: "CANCEL" };
  }
  if (/show matrix history/.test(t)) {
    return { type: "SHOW_HISTORY" };
  }
  return null;
}

/** Lightweight context tags from transcript keywords */
function deriveContextTags(transcript: string): string[] {
  const tags: string[] = [];
  if (/\b(auth|jwt|oauth|rls|login)\b/i.test(transcript)) tags.push("auth");
  if (/\b(database|postgres|sql|supabase|schema)\b/i.test(transcript)) {
    tags.push("database");
  }
  if (/\b(route|router|api|endpoint|cors)\b/i.test(transcript)) {
    tags.push("routing");
  }
  if (/\b(deploy|github|commit)\b/i.test(transcript)) tags.push("deploy");
  return tags;
}

/** Speech pause / typed submit → VoiceIngestionPayload → Node 01 */
export function useVoiceIngest({
  enabled,
  dispatch,
}: UseVoiceIngestOptions): UseVoiceIngestResult {
  const speechSupported = getSpeechRecognitionCtor() != null;
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [amplitude, setAmplitude] = useState(0.35);
  const [urgency, setUrgency] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalBufferRef = useRef("");
  const enabledRef = useRef(enabled);
  const dispatchRef = useRef(dispatch);
  const submittingRef = useRef(false);

  enabledRef.current = enabled;
  dispatchRef.current = dispatch;

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const submitTranscript = useCallback(async (raw: string) => {
    const transcript = raw.trim();
    if (!transcript || submittingRef.current) return;

    const authority = matchVoiceAuthority(transcript);
    if (authority) {
      setLastTranscript(transcript);
      setInterimTranscript("");
      finalBufferRef.current = "";
      dispatchRef.current(authority);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    setLastTranscript(transcript);
    setInterimTranscript("");
    finalBufferRef.current = "";

    try {
      const payload = buildVoiceIngestionPayload(transcript, {
        contextTags: deriveContextTags(transcript),
      });
      setUrgency(payload.urgency_flag);

      const response = await processVoiceCommand(payload);
      if (response.status === "acknowledged" && response.blocker_id) {
        dispatchRef.current({
          type: "INGEST_ACKNOWLEDGED",
          blockerId: response.blocker_id,
        });
      } else {
        setError(">> INGEST_REJECTED · try again");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setAmplitude(0.35);
    }
  }, []);

  const stopListening = useCallback(() => {
    clearPauseTimer();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    setAmplitude(0.35);
    try {
      rec?.stop();
    } catch {
      try {
        rec?.abort();
      } catch {
        /* ignore */
      }
    }
  }, [clearPauseTimer]);

  const startListening = useCallback(() => {
    if (!enabledRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(">> SPEECH_UNAVAILABLE · use text fallback");
      return;
    }

    stopListening();
    setError(null);
    finalBufferRef.current = "";
    setInterimTranscript("");

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      let finals = finalBufferRef.current;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finals = `${finals} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }

      finalBufferRef.current = finals;
      setInterimTranscript(interim);
      setAmplitude(0.55 + Math.min(0.4, (interim.length + finals.length) / 80));
      setUrgency(
        /\b(urgent|blocker|critical|asap)\b/i.test(`${finals} ${interim}`),
      );

      clearPauseTimer();
      if (finals.length > 0) {
        pauseTimerRef.current = setTimeout(() => {
          const toSend = finalBufferRef.current;
          finalBufferRef.current = "";
          setInterimTranscript("");
          void submitTranscript(toSend);
        }, PAUSE_SUBMIT_MS);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(`>> SPEECH_ERROR · ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      if (
        enabledRef.current &&
        recognitionRef.current === recognition &&
        !submittingRef.current
      ) {
        try {
          recognition.start();
          setListening(true);
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setAmplitude(0.55);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      recognitionRef.current = null;
      setListening(false);
    }
  }, [clearPauseTimer, stopListening, submitTranscript]);

  useEffect(() => {
    if (!enabled) {
      stopListening();
      setInterimTranscript("");
      setUrgency(false);
      return;
    }
    if (speechSupported) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, [enabled, speechSupported, startListening, stopListening]);

  return {
    mode: speechSupported ? "speech" : "text",
    listening,
    submitting,
    interimTranscript,
    lastTranscript,
    amplitude,
    urgency,
    error,
    speechSupported,
    startListening,
    stopListening,
    submitText: submitTranscript,
  };
}
