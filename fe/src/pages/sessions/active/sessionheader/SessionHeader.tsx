import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@components/button";
import "./style.css";

export type SessionHeaderProps = {
  workoutName: string;
  startedAt: Date;
  completedExercises: number;
  totalExercises: number;
  onComplete: () => void;
  onAbandon: () => void;
  isCompleting?: boolean;
};

const formatElapsed = (startedAt: Date, now: number): string => {
  const totalSec = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export function SessionHeader({
  workoutName,
  startedAt,
  completedExercises,
  totalExercises,
  onComplete,
  onAbandon,
  isCompleting = false,
}: SessionHeaderProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleBack = () => {
    const confirmed = window.confirm("Abbandonare l'allenamento in corso?");

    if (confirmed) {
      onAbandon();
    }
  };

  return (
    <header className="session-header">
      <div className="toolbar">
        <button
          type="button"
          className="back"
          onClick={handleBack}
          aria-label="Abbandona allenamento"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 18 9 12l6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <p className="eyebrow">ALLENAMENTO IN CORSO</p>

        <Button.Root
          variant="primary"
          size="sm"
          className="finish"
          loading={isCompleting}
          disabled={isCompleting}
          onClick={onComplete}
        >
          <Button.Label>TERMINA</Button.Label>
        </Button.Root>
      </div>

      <div className="meta">
        <h1 className="title">{workoutName}</h1>
        <div className="chips">
          <span className="chip">⏱ {formatElapsed(startedAt, now)}</span>
          <span className="chip">
            {completedExercises}/{totalExercises} esercizi
          </span>
        </div>
      </div>
    </header>
  );
}

export type SessionHeaderSkeletonProps = {
  backHref?: string;
};

export function SessionHeaderSkeleton({ backHref = "/" }: SessionHeaderSkeletonProps) {
  return (
    <header className="session-header loading" aria-busy="true">
      <div className="toolbar">
        <Link href={backHref} className="back" aria-label="Torna alla home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 18 9 12l6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <p className="eyebrow">ALLENAMENTO IN CORSO</p>
        <span className="finish-skeleton" />
      </div>
    </header>
  );
}
