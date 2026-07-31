import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@components/button";
import { Skeleton } from "@components/skeleton";
import { ExerciseCard } from "../exercisecard";
import { getRestAfterLoggedSet } from "../resttimer/getRestAfterLoggedSet";
import { RestTimer } from "../resttimer";
import { useRestTimer } from "../resttimer/useRestTimer";
import { SessionHeader, SessionHeaderSkeleton } from "../sessionheader";
import { useActiveSession } from "../useActiveSession";
import "./style.css";

export type ActiveSessionProps = {
  sessionId: number;
};

const formatVolume = (volumeKg: number): string =>
  volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1)}k kg` : `${Math.round(volumeKg)} kg`;

export function ActiveSession({ sessionId }: ActiveSessionProps) {
  const [, setLocation] = useLocation();
  const [completionDurationMin, setCompletionDurationMin] = useState(1);
  const {
    status,
    view,
    error,
    focusedExerciseId,
    loggingKey,
    completionVolumeKg,
    completedExerciseCount,
    setFocusedExerciseId,
    logSetRow,
    complete,
    abandon,
    retry,
  } = useActiveSession(sessionId);

  const restTimer = useRestTimer();

  useEffect(() => {
    if (status !== "completed") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLocation("/");
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, setLocation]);

  const handleAbandon = async () => {
    restTimer.cancel();

    try {
      await abandon();
      setLocation("/");
    } catch {
      // error surfaced via hook state
    }
  };

  const handleComplete = () => {
    restTimer.cancel();

    if (view) {
      setCompletionDurationMin(
        Math.max(1, Math.round((Date.now() - view.startedAt.getTime()) / 60000)),
      );
    }

    void complete();
  };

  const handleLogSet = async (
    exerciseId: number,
    setNumber: number,
    weightKg: string,
    reps: number,
  ) => {
    const rest = view ? getRestAfterLoggedSet(view, exerciseId, setNumber) : null;

    await logSetRow(exerciseId, setNumber, weightKg, reps);

    if (rest?.shouldStart) {
      await restTimer.start(rest.restSec, exerciseId);
    }
  };

  if (status === "loading") {
    return (
      <div className="active-session page-container">
        <SessionHeaderSkeleton />
        <div className="exercise-stack" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} variant="block" height={88} className="card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error" || !view) {
    return (
      <div className="active-session page-container">
        <SessionHeaderSkeleton />
        <div className="session-error" role="alert">
          <p>{error ?? "Impossibile caricare l'allenamento"}</p>
          <button type="button" className="retry" onClick={retry}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="active-session page-container">
      <SessionHeader
        workoutName={view.workoutName}
        startedAt={view.startedAt}
        completedExercises={completedExerciseCount}
        totalExercises={view.exercises.length}
        onComplete={handleComplete}
        onAbandon={() => void handleAbandon()}
        isCompleting={status === "completing"}
      />

      <RestTimer
        status={restTimer.status}
        remainingSec={restTimer.remainingSec}
        totalSec={restTimer.totalSec}
        onSkip={restTimer.skip}
      />

      {error ? (
        <div className="session-error inline" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {view.exercises.length === 0 ? (
        <section className="empty-exercises">
          <p>Nessun esercizio in questa scheda.</p>
          <Button.Root variant="secondary" onClick={() => void handleAbandon()}>
            <Button.Label>Torna alla home</Button.Label>
          </Button.Root>
        </section>
      ) : (
        <section className="exercise-stack" aria-label="Esercizi">
          {view.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              defaultRestSec={view.defaultRestSec}
              isFocused={exercise.exerciseId === focusedExerciseId}
              isResting={restTimer.restingExerciseId === exercise.exerciseId}
              loggingKey={loggingKey}
              onFocus={() => setFocusedExerciseId(exercise.exerciseId)}
              onLogSet={(setNumber, weightKg, reps) =>
                handleLogSet(exercise.exerciseId, setNumber, weightKg, reps)
              }
            />
          ))}
        </section>
      )}

      <footer className="session-footer">
        <Button.Root variant="ghost" onClick={() => void handleAbandon()}>
          <Button.Label>ABBANDONA</Button.Label>
        </Button.Root>
      </footer>

      {status === "completed" ? (
        <div className="completion-overlay" role="status" aria-live="polite">
          <div className="completion-card">
            <p className="eyebrow">Completato</p>
            <h2 className="title">Allenamento completato</h2>
            <p className="summary">
              {view.workoutName} · {completionDurationMin} min
              {completionVolumeKg > 0 ? ` · ${formatVolume(completionVolumeKg)}` : ""}
            </p>
            <Button.Root variant="primary" onClick={() => setLocation("/")}>
              <Button.Label>TORNA ALLA HOME</Button.Label>
            </Button.Root>
          </div>
        </div>
      ) : null}
    </div>
  );
}
