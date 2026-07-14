import { Link } from "wouter";
import { Skeleton } from "@components/skeleton";
import "./style.css";

export type WorkoutRowProps = {
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
  sessionId?: number;
};

export function WorkoutRowSkeleton() {
  return (
    <div className="workout-row loading" aria-hidden="true">
      <Skeleton variant="block" width={40} height={40} className="icon-skeleton" />
      <span className="copy">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="80%" />
      </span>
      <Skeleton variant="block" width={16} height={16} className="chevron-skeleton" />
    </div>
  );
}

function WorkoutRowContent({
  name,
  dateLabel,
  durationMin,
  volumeKg,
}: Omit<WorkoutRowProps, "sessionId">) {
  return (
    <>
      <span className="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="M6.5 8.5 4 11v2l2.5 2.5M17.5 8.5 20 11v2l-2.5 2.5M9 12h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="copy">
        <span className="name">{name}</span>
        <span className="meta">
          {[
            dateLabel,
            durationMin > 0 ? `${durationMin} min` : null,
            volumeKg > 0 ? `${(volumeKg / 1000).toFixed(1)}k kg` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>

      <span className="chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="m10 7 5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </>
  );
}

export function WorkoutRow({
  name,
  dateLabel,
  durationMin,
  volumeKg,
  sessionId,
}: WorkoutRowProps) {
  if (sessionId) {
    return (
      <Link href={`/sessions/${sessionId}`} className="workout-row">
        <WorkoutRowContent
          name={name}
          dateLabel={dateLabel}
          durationMin={durationMin}
          volumeKg={volumeKg}
        />
      </Link>
    );
  }

  return (
    <button type="button" className="workout-row">
      <WorkoutRowContent
        name={name}
        dateLabel={dateLabel}
        durationMin={durationMin}
        volumeKg={volumeKg}
      />
    </button>
  );
}
