/**
 * React binding for the Cortex view-state machine (F2).
 */
import { useCallback, useEffect, useReducer } from "react";
import type { AuthStatus } from "@/hooks/useAuthSession";
import {
  INITIAL_CORTEX_CONTEXT,
  reduceCortex,
  type CortexContext,
  type CortexEvent,
  type CortexView,
} from "@/cortex/cortexMachine";

export interface UseCortexViewResult {
  view: CortexView;
  context: CortexContext;
  dispatch: (event: CortexEvent) => void;
}

/** Sync auth status into the machine; expose dispatch for ingest / subscriptions / voice */
export function useCortexView(authStatus: AuthStatus): UseCortexViewResult {
  const [context, dispatch] = useReducer(
    reduceCortex,
    INITIAL_CORTEX_CONTEXT,
  );

  useEffect(() => {
    if (authStatus === "loading") {
      dispatch({ type: "AUTH_LOADING" });
      return;
    }
    if (authStatus === "authenticated") {
      dispatch({ type: "AUTH_OK" });
      return;
    }
    dispatch({ type: "AUTH_LOST" });
  }, [authStatus]);

  const stableDispatch = useCallback((event: CortexEvent) => {
    dispatch(event);
  }, []);

  return {
    view: context.view,
    context,
    dispatch: stableDispatch,
  };
}
