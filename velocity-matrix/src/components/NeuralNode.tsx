/**
 * Resolution Feed code block — renders Node 03 execution output.
 * Props align with ResolutionArtifact + ExecutionResult for F6 wiring.
 */
import type {
  ArtifactAction,
  ResolutionArtifact,
} from "@/contracts/data_contracts";

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
  onAction,
}: {
  title?: string;
  code?: string;
  latencyMs?: number;
  /** ResolutionArtifact.neural_summary */
  summary?: string;
  /** ResolutionArtifact.payload.language */
  language?: string;
  /** ResolutionArtifact.payload.file_path */
  filePath?: string;
  /** ResolutionArtifact.available_actions */
  actions?: ArtifactAction[];
  committed?: boolean;
  deploymentUrl?: string;
  errorTrace?: string;
  onAction?: (action: ArtifactAction) => void;
}) {
  const actionLabels: Record<ArtifactAction, string> = {
    deploy: "[ Deploy ]",
    override: "[ Override ]",
    discard: "[ Discard ]",
  };

  return (
    <article className="neural-node" aria-label={title}>
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
      <pre className="neural-node-code">
        <code>{code || "// awaiting execution trace"}</code>
      </pre>
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
              onClick={() => onAction(action)}
            >
              {actionLabels[action]}
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
