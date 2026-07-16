import { Link } from "wouter";
import { Button } from "@components/button";
import { WorkoutRow, WorkoutRowSkeleton } from "@dashboard/workoutrow";
import { useSessionHistory } from "../useSessionHistory";
import "./style.css";

const SESSION_SKELETON_COUNT = 5;

export function SessionHistory() {
  const { status, view, error, page, setPage, retry } = useSessionHistory();
  const isLoading = status === "loading";
  const canGoBack = !isLoading && view !== null && view.page > 1;
  const canGoForward =
    !isLoading && view !== null && view.totalPages > 0 && view.page < view.totalPages;

  return (
    <div className="session-history page-container page-container--wide">
      <header className="header">
        <Link href="/stats" className="back-link">
          ← Progressi
        </Link>
        <h1 className="title">Storico sessioni</h1>
        <p className="subtitle">Sessioni completate</p>
      </header>

      {status === "error" ? (
        <div className="session-history-error" role="alert">
          <p>{error ?? "Impossibile caricare lo storico sessioni"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      ) : null}

      <div className="list" aria-busy={isLoading || undefined}>
        {isLoading ? (
          Array.from({ length: SESSION_SKELETON_COUNT }, (_, index) => (
            <WorkoutRowSkeleton key={index} />
          ))
        ) : view?.items.length === 0 ? (
          <p className="empty-message" aria-live="polite">
            Nessuna sessione completata
          </p>
        ) : (
          view?.items.map((session) => (
            <WorkoutRow key={session.id} sessionId={session.id} {...session} />
          ))
        )}
      </div>

      {!isLoading && view && view.totalPages > 1 ? (
        <footer className="pagination">
          <Button.Root
            variant="secondary"
            size="sm"
            disabled={!canGoBack}
            onClick={() => setPage(page - 1)}
          >
            <Button.Label>Precedente</Button.Label>
          </Button.Root>

          <p className="page-label">
            Pagina {view.page} di {view.totalPages}
          </p>

          <Button.Root
            variant="secondary"
            size="sm"
            disabled={!canGoForward}
            onClick={() => setPage(page + 1)}
          >
            <Button.Label>Successiva</Button.Label>
          </Button.Root>
        </footer>
      ) : null}

      {!isLoading && view && view.total > 0 ? (
        <p className="total-label">{view.total} sessioni totali</p>
      ) : null}
    </div>
  );
}
