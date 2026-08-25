import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ApiError, getCoachClientProgram } from "@api";
import type { WorkoutDetail } from "@api";
import { AppShell } from "@components/appshell";
import { WEEKDAY_LABELS_SHORT } from "@pages/workouts/new/types";
import { ExerciseRow } from "@pages/workouts/new/exerciserow";
import { CoachPageHeader } from "../../coachpageheader";
import "../../style.css";

function formatWeekdays(weekdays: number[]): string {
  if (weekdays.length === 0) {
    return "Nessun giorno assegnato";
  }

  return weekdays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => WEEKDAY_LABELS_SHORT[day] ?? String(day))
    .join(", ");
}

function ProgramDays({ program }: { program: WorkoutDetail }) {
  const days = program.days ?? [];

  if (days.length === 0) {
    return <p className="coach-empty">Questa scheda non ha ancora giorni.</p>;
  }

  return (
    <div className="coach-card-list">
      {days.map((day) => {
        const exercises = day.exercises ?? [];

        return (
          <section key={day.id} className="coach-card coach-program-day">
            <h2>{day.name}</h2>
            <p className="coach-program-day__meta">{formatWeekdays(day.weekdays)}</p>
            {exercises.length === 0 ? (
              <p className="coach-empty">Nessun esercizio</p>
            ) : (
              <div className="coach-program-exercises">
                {exercises.map((exercise, index) => (
                  <ExerciseRow
                    key={exercise.id}
                    index={index + 1}
                    exercise={exercise}
                    defaultRestSec={program.defaultRestSec}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function ViewClientProgramPage() {
  const [, params] = useRoute("/clients/:athleteId/programs/:workoutId");
  const athleteId = Number(params?.athleteId);
  const workoutId = Number(params?.workoutId);
  const [program, setProgram] = useState<WorkoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idsValid =
    Number.isInteger(athleteId) &&
    athleteId >= 1 &&
    Number.isInteger(workoutId) &&
    workoutId >= 1;

  useEffect(() => {
    if (!idsValid) {
      return;
    }

    let cancelled = false;

    void getCoachClientProgram(athleteId, workoutId)
      .then((data) => {
        if (!cancelled) setProgram(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Errore caricamento");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [athleteId, workoutId, idsValid]);

  if (!idsValid) {
    return null;
  }

  const editHref = `/clients/${athleteId}/programs/${workoutId}/edit`;
  const clientHref = `/clients/${athleteId}`;

  return (
    <AppShell>
      <div className="coach-page page-container page-container--wide">
        <CoachPageHeader
          title={program?.name ?? "Scheda"}
          subtitle={
            program
              ? `${program.frequency} · ${program.exerciseCount} esercizi · recupero ${program.defaultRestSec}s`
              : "Caricamento scheda…"
          }
          action={
            <Link href={editHref} className="coach-btn-link coach-btn-link--primary">
              Modifica scheda
            </Link>
          }
        />

        <nav className="coach-link-row coach-link-row--compact">
          <Link href={clientHref} className="coach-link">
            ← Torna al cliente
          </Link>
        </nav>

        {error ? <p className="coach-empty">{error}</p> : null}

        {!program && !error ? <p className="coach-empty">Caricamento…</p> : null}

        {program ? <ProgramDays program={program} /> : null}
      </div>
    </AppShell>
  );
}
