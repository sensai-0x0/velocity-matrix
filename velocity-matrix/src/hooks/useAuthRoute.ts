/**
 * Track Base44 auth path (`/`, `/forgot-password`, `/reset-password`).
 */
import { useEffect, useState } from "react";
import {
  getResetTokenFromLocation,
  resolveAuthPath,
  type AuthPath,
} from "@/lib/authRoutes";

export interface AuthRouteState {
  path: AuthPath;
  resetToken: string | null;
}

/** Subscribe to pathname / popstate for password-reset deep links */
export function useAuthRoute(): AuthRouteState {
  const [state, setState] = useState<AuthRouteState>(() => ({
    path: resolveAuthPath(),
    resetToken: getResetTokenFromLocation(),
  }));

  useEffect(() => {
    function sync() {
      setState({
        path: resolveAuthPath(),
        resetToken: getResetTokenFromLocation(),
      });
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return state;
}
