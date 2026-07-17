import { Button } from "@components/button";
import type { RestTimerStatus } from "./types";
import "./style.css";

export type RestTimerProps = {
  status: RestTimerStatus;
  remainingSec: number;
  totalSec: number;
  onSkip: () => void;
};

const RING_SIZE = 168;
const RING_STROKE = 10;

const formatCountdown = (remainingSec: number): string => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return String(seconds);
};

export function RestTimer({
  status,
  remainingSec,
  totalSec,
  onSkip,
}: RestTimerProps) {
  if (status === "idle") {
    return null;
  }

  const isDone = status === "done";
  // Drain: full ring at start → empties as remaining drops
  const remainingRatio =
    isDone || totalSec <= 0
      ? 0
      : Math.min(1, Math.max(0, remainingSec / totalSec));

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - remainingRatio);

  return (
    <section
      className={`rest-timer rest-timer--${status}`}
      aria-live="polite"
      aria-label="Cronometro recupero"
    >
      <div className="ring-wrap">
        <svg
          className="ring"
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden="true"
        >
          <circle
            className="track"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            strokeWidth={RING_STROKE}
          />
          <circle
            className="arc"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>

        <div className="center">
          <p className="label">{isDone ? "Finito" : "Recupero"}</p>
          <p className="countdown">
            {isDone ? "Vai!" : formatCountdown(remainingSec)}
          </p>
          {isDone ? (
            <p className="hint">Vai con la prossima serie</p>
          ) : null}
        </div>
      </div>

      {status === "running" ? (
        <Button.Root variant="ghost" size="sm" className="skip" onClick={onSkip}>
          <Button.Label>SALTA RECUPERO</Button.Label>
        </Button.Root>
      ) : null}
    </section>
  );
}
