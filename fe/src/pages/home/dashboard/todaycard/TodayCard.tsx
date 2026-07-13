import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@components/button";
import { Skeleton } from "@components/skeleton";
import { resolveWorkoutSessionId } from "@pages/sessions/active/api";
import type { TodayWorkout } from "../types";
import "./style.css";

export type TodayCardProps = {
  workout: TodayWorkout | null;
  isLoading?: boolean;
};

function TodayCardSkeleton() {
  return (
    <section
      className="today-card loading"
      aria-labelledby="today-card-title"
      aria-busy="true"
    >
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <Skeleton variant="text" width="55%" height={28} />
      </div>

      <Skeleton variant="text" width="80%" />
      <div className="meta">
        <Skeleton variant="block" width={120} height={28} className="chip-skeleton" />
        <Skeleton variant="block" width={72} height={28} className="chip-skeleton" />
      </div>

      <Skeleton variant="block" height={44} className="cta-skeleton" />
    </section>
  );
}

function TodayCardEmpty() {
  return (
    <section className="today-card empty" aria-labelledby="today-card-title">
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <h2 id="today-card-title" className="title">
          Nessun allenamento oggi
        </h2>
      </div>

      <p className="empty-message" aria-live="polite">
        Programma un workout per iniziare
      </p>

      <Link href="/workouts/new" className="cta-link">
        <Button.Root variant="secondary" className="cta">
          <Button.Label>CREA WORKOUT</Button.Label>
        </Button.Root>
      </Link>
    </section>
  );
}

export function TodayCard({ workout, isLoading = false }: TodayCardProps) {
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (isLoading) {
    return <TodayCardSkeleton />;
  }

  if (!workout) {
    return <TodayCardEmpty />;
  }

  const { workoutId, name, exercises, goal, durationMin } = workout;

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);

    try {
      const sessionId = await resolveWorkoutSessionId(workoutId);
      setLocation(`/sessions/${sessionId}`);
    } catch {
      setStartError("Impossibile avviare l'allenamento");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <section className="today-card" aria-labelledby="today-card-title">
      <div className="header">
        <span className="eyebrow">OGGI</span>
        <h2 id="today-card-title" className="title">
          {name}
        </h2>
      </div>

      <p className="exercises">{exercises.join(" · ")}</p>

      <div className="meta">
        <span className="chip">{goal}</span>
        {durationMin > 0 && <span className="chip">{durationMin} min</span>}
      </div>

      {startError ? (
        <p className="start-error" role="alert">
          {startError}
        </p>
      ) : null}

      <Button.Root
        variant="primary"
        className="cta"
        loading={isStarting}
        disabled={isStarting}
        onClick={() => void handleStart()}
      >
        <Button.Label>AVVIA WORKOUT</Button.Label>
      </Button.Root>
    </section>
  );
}
