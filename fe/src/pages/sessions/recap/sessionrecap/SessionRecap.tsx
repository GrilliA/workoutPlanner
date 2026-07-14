import { Skeleton } from "@components/skeleton";
import { RecapExerciseCardView } from "../recapexercisecard";
import { RecapHeader, RecapHeaderSkeleton } from "../recapheader";
import { useSessionRecap } from "../useSessionRecap";
import "./style.css";

export type SessionRecapProps = {
  sessionId: number;
};

export function SessionRecap({ sessionId }: SessionRecapProps) {
  const { status, view, error, retry } = useSessionRecap(sessionId);

  if (status === "loading") {
    return (
      <div className="session-recap page-container">
        <RecapHeaderSkeleton />
        <div className="exercise-stack" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} variant="block" height={96} className="card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error" || !view) {
    return (
      <div className="session-recap page-container">
        <RecapHeaderSkeleton />
        <div className="recap-error" role="alert">
          <p>{error ?? "Impossibile caricare il riepilogo"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  const loggedExerciseCount = view.exercises.filter(
    (exercise) => exercise.sets.length > 0,
  ).length;

  return (
    <div className="session-recap page-container">
      <RecapHeader
        workoutName={view.workoutName}
        status={view.status}
        completedAt={view.completedAt}
        durationMin={view.durationMin}
        volumeKg={view.volumeKg}
        exerciseCount={loggedExerciseCount}
      />

      {view.exercises.length === 0 ? (
        <section className="empty-exercises">
          <p>Nessun esercizio registrato in questa sessione.</p>
        </section>
      ) : (
        <section className="exercise-stack" aria-label="Esercizi completati">
          {view.exercises.map((exercise) => (
            <RecapExerciseCardView key={exercise.exerciseId} exercise={exercise} />
          ))}
        </section>
      )}
    </div>
  );
}
