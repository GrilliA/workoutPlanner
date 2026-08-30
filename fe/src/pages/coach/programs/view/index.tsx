import { Link, useRoute } from "wouter";
import type { WorkoutDetail } from "@api";
import { WEEKDAY_LABELS_SHORT } from "@pages/workouts/new/types";
import { ExerciseRow } from "@pages/workouts/new/exerciserow";
import { PageHeader } from "@components/pageHeader";
import { CoachCard, CoachCardList } from "../../coachCard";
import { useClientProgram } from "./api/useClientProgram";
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
    <CoachCardList>
      {days.map((day) => {
        const exercises = day.exercises ?? [];

        return (
          <CoachCard key={day.id} className="coach-program-day">
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
          </CoachCard>
        );
      })}
    </CoachCardList>
  );
}

export default function ViewClientProgramPage() {
  const [, params] = useRoute("/clients/:athleteId/programs/:workoutId");
  const athleteId = Number(params?.athleteId);
  const workoutId = Number(params?.workoutId);
  const idsValid =
    Number.isInteger(athleteId) &&
    athleteId >= 1 &&
    Number.isInteger(workoutId) &&
    workoutId >= 1;

  if (!idsValid) {
    return (
      <div className="coach-page page-container page-container--wide">
        <PageHeader title="Scheda" />
        <p className="coach-empty">Scheda non trovata</p>
      </div>
    );
  }

  return (
    <ViewClientProgramLoaded
      key={`${athleteId}-${workoutId}`}
      athleteId={athleteId}
      workoutId={workoutId}
    />
  );
}

function ViewClientProgramLoaded({
  athleteId,
  workoutId,
}: {
  athleteId: number;
  workoutId: number;
}) {
  const { program, loading } = useClientProgram(athleteId, workoutId);
  const editHref = `/clients/${athleteId}/programs/${workoutId}/edit`;
  const clientHref = `/clients/${athleteId}`;

  return (
    <div className="coach-page page-container page-container--wide">
      <PageHeader
        title={program?.name ?? "Scheda"}
        subtitle={
          program
            ? `${program.frequency} · ${program.exerciseCount} esercizi · recupero ${program.defaultRestSec}s`
            : undefined
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

      {loading ? <p className="coach-empty">Caricamento…</p> : null}

      {!loading && !program ? (
        <p className="coach-empty">Scheda non trovata</p>
      ) : null}

      {program ? <ProgramDays program={program} /> : null}
    </div>
  );
}
