/**
 * Resolution Feed code block — type-reveal, glass edit, Deploy/Override/Discard (F6).
 */
import { useEffect, useState } from "react";
import type {
  ArtifactAction,
  ResolutionArtifact,
} from "@/contracts/data_contracts";

const TYPE_MS = 8;

export function NeuralNode({
  title = "Resolution",
  code = "",
  latencyMs,
  summary,
  language,
  filePath,
  actions,
  committed = false,
  deploymentUrl,
  errorTrace,
  busy = false,
  onAction,
}: {
  title?: string;
  code?: string;
  latencyMs?: number;
  summary?: string;
  language?: string;
  filePath?: string;
  actions?: ArtifactAction[];
  committed?: boolean;
  deploymentUrl?: string;
  errorTrace?: string;
  busy?: boolean;
  onAction?: (action: ArtifactAction, modifiedCode?: string) => void;
}) {
  const [revealed, setRevealed] = useState("");
  const [paused, setPaused] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);

  useEffect(() => {
    setDraft(code);
    setEditing(false);
    setPaused(false);
    setRevealed("");
    if (!code) return;

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setRevealed(code.slice(0, i));
      if (i < code.length) timer = setTimeout(tick, TYPE_MS);
    };
    timer = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timer);
  }, [code]);

  const actionLabels: Record<ArtifactAction, string> = {
    deploy: "[ Deploy ]",
    override: "[ Override ]",
    discard: "[ Discard ]",
  };

  const displayCode = editing || paused ? draft : revealed || code;

  function handleAction(action: ArtifactAction) {
    if (!onAction || busy) return;
    if (action === "override") {
      onAction(action, draft);
      return;
    }
    onAction(action);
  }

  return (
    <article
      className="neural-node"
      data-editing={editing}
      data-committed={committed}
      aria-label={title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!editing) setPaused(false);
      }}
    >
      <header className="neural-node-header">
        <h3>{title}</h3>
        {latencyMs != null && (
          <span className="neural-node-latency">{latencyMs}ms</span>
        )}
        {committed && (
          <span className="neural-node-committed" title={deploymentUrl}>
            committed ✓
          </span>
        )}
      </header>

      {summary ? <p className="neural-node-summary">{summary}</p> : null}

      {(language || filePath) && (
        <p className="neural-node-meta">
          {language ? <span>{language}</span> : null}
          {filePath ? <span>{filePath}</span> : null}
        </p>
      )}

      {editing ? (
        <textarea
          className="neural-node-editor"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(18, Math.max(6, draft.split("\n").length + 1))}
          spellCheck={false}
        />
      ) : (
        <pre className="neural-node-code">
          <code>{displayCode || "// awaiting execution trace"}</code>
        </pre>
      )}

      <div className="neural-node-toolbar">
        <button
          type="button"
          className="auth-affordance auth-affordance-inline"
          onClick={() => {
            setEditing((v) => !v);
            setPaused(true);
            setDraft((d) => d || code);
          }}
          disabled={busy || !code}
        >
          {editing ? "[ Lock Panel ]" : "[ Edit // Override ]"}
        </button>
        {deploymentUrl ? (
          <a
            className="auth-affordance auth-affordance-inline"
            href={deploymentUrl}
            target="_blank"
            rel="noreferrer"
          >
            [ Open Deploy ]
          </a>
        ) : null}
      </div>

      {errorTrace ? (
        <p className="neural-node-error" role="alert">
          {errorTrace}
        </p>
      ) : null}

      {actions && actions.length > 0 && onAction ? (
        <div className="neural-node-actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className="auth-affordance auth-affordance-inline"
              disabled={busy}
              onClick={() => handleAction(action)}
            >
              {busy && action !== "discard"
                ? "[ Working… ]"
                : actionLabels[action]}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** Bind NeuralNode props from a ResolutionArtifact contract payload */
export function neuralNodePropsFromArtifact(artifact: ResolutionArtifact) {
  return {
    title: "Resolution Feed" as const,
    summary: artifact.neural_summary,
    language: artifact.payload.language,
    code: artifact.payload.code,
    actions: artifact.available_actions,
    ...(artifact.payload.file_path
      ? { filePath: artifact.payload.file_path }
      : {}),
  };
}
