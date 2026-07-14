import { Link } from "wouter";
import { Button } from "@components/button";
import { Skeleton } from "@components/skeleton";
import { useWorkoutList } from "../useWorkoutList";
import "./style.css";

export function WorkoutList() {
  const { status, workouts, error, retry } = useWorkoutList();
  const isLoading = status === "loading";

  return (
    <div className="workout-list-page page-container">
      <header className="header">
        <div>
          <p className="eyebrow">SCHEDE</p>
          <h1 className="title">I tuoi workout</h1>
        </div>
        <Link href="/workouts/new" className="create-link">
          <Button.Root variant="primary" size="sm">
            <Button.Label>CREA SCHEDA</Button.Label>
          </Button.Root>
        </Link>
      </header>

      {status === "error" ? (
        <div className="list-error" role="alert">
          <p>{error ?? "Impossibile caricare le schede"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      ) : null}

      <section className="list-section" aria-busy={isLoading || undefined}>
        {isLoading ? (
          <div className="skeleton-list">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} variant="block" height={72} className="row-skeleton" />
            ))}
          </div>
        ) : status === "empty" ? (
          <div className="empty-state">
            <p>Nessuna scheda creata</p>
            <Link href="/workouts/new" className="empty-cta">
              <Button.Root variant="secondary">
                <Button.Label>CREA LA PRIMA SCHEDA</Button.Label>
              </Button.Root>
            </Link>
          </div>
        ) : (
          <ul className="list">
            {workouts.map((workout) => (
              <li key={workout.id}>
                <article className="workout-card">
                  <div className="copy">
                    <h2 className="name">{workout.name}</h2>
                    <p className="meta">
                      {workout.exerciseCount}{" "}
                      {workout.exerciseCount === 1 ? "esercizio" : "esercizi"} ·{" "}
                      {workout.workoutType}
                    </p>
                  </div>

                  <Link href={`/workouts/${workout.id}/edit`} className="edit-link">
                    <Button.Root variant="secondary" size="sm">
                      <Button.Label>MODIFICA</Button.Label>
                    </Button.Root>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
