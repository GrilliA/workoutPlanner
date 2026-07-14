import { Skeleton } from "@components/skeleton";
import { ActiveSession } from "../active/activesession";
import { SessionRecap } from "../recap/sessionrecap";
import { useSessionRoute } from "./useSessionRoute";
import "./style.css";

export type SessionRouterProps = {
  sessionId: number;
};

export function SessionRouter({ sessionId }: SessionRouterProps) {
  const { mode, error, retry } = useSessionRoute(sessionId);

  if (mode === "loading") {
    return (
      <div className="session-router page-container" aria-busy="true">
        <Skeleton variant="block" height={120} className="header-skeleton" />
        <div className="stack">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} variant="block" height={88} />
          ))}
        </div>
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="session-router page-container">
        <div className="route-error" role="alert">
          <p>{error ?? "Impossibile caricare la sessione"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (mode === "active") {
    return <ActiveSession sessionId={sessionId} />;
  }

  return <SessionRecap sessionId={sessionId} />;
}
