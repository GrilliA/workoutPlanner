import "./workout-row.css";

type WorkoutRowProps = {
  name: string;
  dateLabel: string;
  durationMin: number;
  volumeKg: number;
};

export function WorkoutRow({
  name,
  dateLabel,
  durationMin,
  volumeKg,
}: WorkoutRowProps) {
  return (
    <button type="button" className="workout-row">
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
          {dateLabel} · {durationMin} min · {(volumeKg / 1000).toFixed(1)}k kg
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
    </button>
  );
}
