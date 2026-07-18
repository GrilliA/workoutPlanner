import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./useAuth";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { status, retryBootstrap } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (status === "anonymous") {
      setLocation("/login");
    }
  }, [status, setLocation]);

  if (status === "loading") {
    return (
      <main aria-busy="true" aria-live="polite">
        Verifica della sessione…
      </main>
    );
  }

  if (status === "error") {
    return (
      <main role="alert">
        <p>Impossibile verificare la sessione.</p>
        <button type="button" onClick={retryBootstrap}>
          Riprova
        </button>
      </main>
    );
  }

  if (status === "anonymous") {
    return null;
  }

  return children;
}
