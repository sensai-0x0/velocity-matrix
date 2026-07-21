/**
 * Resolution Feed code block — renders Node 03 execution output.
 */
export function NeuralNode({
  title = "Resolution",
  code = "",
  latencyMs,
}: {
  title?: string;
  code?: string;
  latencyMs?: number;
}) {
  return (
    <article className="neural-node" aria-label={title}>
      <header className="neural-node-header">
        <h3>{title}</h3>
        {latencyMs != null && (
          <span className="neural-node-latency">{latencyMs}ms</span>
        )}
      </header>
      <pre className="neural-node-code">
        <code>{code || "// awaiting execution trace"}</code>
      </pre>
    </article>
  );
}
