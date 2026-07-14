import type { DailyChartPoint } from "../types";
import "./style.css";

type ActivityChartProps = {
  points: DailyChartPoint[];
};

export function ActivityChart({ points }: ActivityChartProps) {
  const maxCount = Math.max(...points.map((point) => point.workoutCount), 1);

  return (
    <div
      className="activity-chart"
      role="img"
      aria-label="Allenamenti completati negli ultimi 7 giorni"
    >
      <div className="bars">
        {points.map((point) => {
          const heightPercent = (point.workoutCount / maxCount) * 100;
          const countLabel =
            point.workoutCount === 1
              ? "1 allenamento"
              : `${point.workoutCount} allenamenti`;

          return (
            <div key={point.date} className="bar-wrap">
              <span className="value-label">{point.workoutCount}</span>
              <div className="bar-track">
                <div
                  className={`bar${point.workoutCount === 0 ? " empty" : ""}`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${point.weekdayLabel}: ${countLabel}`}
                />
              </div>
              <span className="day">{point.weekdayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
