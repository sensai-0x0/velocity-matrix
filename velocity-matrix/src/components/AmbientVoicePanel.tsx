/**
 * Ambient Cortex input surface — speech pause bleed + textarea fallback (F4).
 */
import { useState, type FormEvent } from "react";
import type { UseVoiceIngestResult } from "@/hooks/useVoiceIngest";

interface AmbientVoicePanelProps {
  voice: UseVoiceIngestResult;
}

/** Text / speech affordances under the MatrixVoiceWave */
export function AmbientVoicePanel({ voice }: AmbientVoicePanelProps) {
  const [draft, setDraft] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || voice.submitting) return;
    setDraft("");
    await voice.submitText(text);
  }

  const live =
    voice.interimTranscript ||
    voice.lastTranscript ||
    (voice.listening ? "…" : "");

  return (
    <section className="ambient-voice" aria-label="Ambient voice ingest">
      <p className="cortex-ambient-hint" role="status">
        {voice.listening
          ? ">> LISTENING… pause to ingest"
          : voice.speechSupported
            ? ">> INGESTING_AUDIO… speech idle"
            : ">> INGESTING_AUDIO… text fallback"}
      </p>

      {live ? (
        <p
          className="ambient-transcript"
          data-urgency={voice.urgency}
          aria-live="polite"
        >
          {live}
        </p>
      ) : null}

      <form className="ambient-text-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>
            {voice.speechSupported ? "override / fallback" : "transcript"}
          </span>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='e.g. "urgent CORS blocker on /api"'
            disabled={voice.submitting}
          />
        </label>
        <div className="ambient-actions">
          <button
            type="submit"
            className="auth-affordance"
            disabled={voice.submitting || !draft.trim()}
          >
            {voice.submitting ? "[ Ingesting… ]" : "[ Send Transcript ]"}
          </button>
          {voice.speechSupported ? (
            <button
              type="button"
              className="auth-affordance auth-affordance-inline"
              onClick={() =>
                voice.listening ? voice.stopListening() : voice.startListening()
              }
              disabled={voice.submitting}
            >
              {voice.listening ? "[ Stop Mic ]" : "[ Start Mic ]"}
            </button>
          ) : null}
        </div>
      </form>

      {voice.error ? (
        <p className="locked-cortex-error" role="alert">
          {voice.error}
        </p>
      ) : null}
    </section>
  );
}
