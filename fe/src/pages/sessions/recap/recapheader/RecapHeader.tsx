import { Link } from "wouter";
import {
  formatRecapDate,
  formatVolumeLabel,
} from "../mappers/mapSessionRecap";
import type { RecapStatus } from "../types";
import "./style.css";

export type RecapHeaderProps = {
  workoutName: string;
  status: RecapStatus;
  completedAt: Date | null;
  durationMin: number;
  volumeKg: number;
  exerciseCount: number;
};

const statusCopy: Record<RecapStatus, string> = {
  completed: "Completato",
  abandoned: "Abbandonato",
};

export function RecapHeader({
  workoutName,
  status,
  completedAt,
  durationMin,
  volumeKg,
  exerciseCount,
}: RecapHeaderProps) {
  const dateLabel = completedAt ? formatRecapDate(completedAt) : "Data non disponibile";

  return (
    <header className="recap-header">
      <div className="toolbar">
        <Link href="/stats" className="back" aria-label="Torna ai progressi">
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

        <p className="eyebrow">RIEPILOGO SESSIONE</p>
        <span className={`status status--${status}`}>{statusCopy[status]}</span>
      </div>

      <div className="meta">
        <h1 className="title">{workoutName}</h1>
        <p className="date">{dateLabel}</p>
        <div className="chips">
          {durationMin > 0 ? <span className="chip">{durationMin} min</span> : null}
          {volumeKg > 0 ? <span className="chip">{formatVolumeLabel(volumeKg)}</span> : null}
          <span className="chip">
            {exerciseCount} {exerciseCount === 1 ? "esercizio" : "esercizi"}
          </span>
        </div>
      </div>
    </header>
  );
}

export function RecapHeaderSkeleton() {
  return (
    <header className="recap-header loading" aria-busy="true">
      <div className="toolbar">
        <Link href="/stats" className="back" aria-label="Torna ai progressi">
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
        <p className="eyebrow">RIEPILOGO SESSIONE</p>
        <span className="status-skeleton" />
      </div>
    </header>
  );
}
