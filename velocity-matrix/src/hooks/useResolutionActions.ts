/**
 * Resolution Feed actions → execute-resolution (F6).
 */
import { useCallback, useState } from "react";
import { executeArtifactAction } from "@/api/matrixApi";
import type { ArtifactAction } from "@/contracts/data_contracts";
import type { CortexEvent } from "@/cortex/cortexMachine";

export interface UseResolutionActionsOptions {
  artifactId: string | null;
  dispatch: (event: CortexEvent) => void;
}

export interface UseResolutionActionsResult {
  busy: boolean;
  committed: boolean;
  deploymentUrl: string | null;
  errorTrace: string | null;
  handleAction: (action: ArtifactAction, modifiedCode?: string) => Promise<void>;
  reset: () => void;
}

/** Deploy / Override / Discard against Node 03 */
export function useResolutionActions({
  artifactId,
  dispatch,
}: UseResolutionActionsOptions): UseResolutionActionsResult {
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [errorTrace, setErrorTrace] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBusy(false);
    setCommitted(false);
    setDeploymentUrl(null);
    setErrorTrace(null);
  }, []);

  const handleAction = useCallback(
    async (action: ArtifactAction, modifiedCode?: string) => {
      if (!artifactId || busy) return;
      setBusy(true);
      setErrorTrace(null);

      try {
        const result = await executeArtifactAction(artifactId, action, {
          ...(action === "override" && modifiedCode
            ? { modifiedCode }
            : {}),
        });

        if (!result.success) {
          setErrorTrace(result.error_trace ?? "Execution failed");
          setCommitted(false);
          return;
        }

        if (action === "discard") {
          reset();
          dispatch({ type: "CANCEL" });
          return;
        }

        setCommitted(true);
        setDeploymentUrl(result.deployment_url ?? null);
        dispatch({ type: "EXECUTION_SETTLED" });
      } catch (err) {
        setErrorTrace(err instanceof Error ? err.message : String(err));
        setCommitted(false);
      } finally {
        setBusy(false);
      }
    },
    [artifactId, busy, dispatch, reset],
  );

  return {
    busy,
    committed,
    deploymentUrl,
    errorTrace,
    handleAction,
    reset,
  };
}
