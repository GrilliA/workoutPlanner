import type { DailyChartPoint } from "../types";
import "./style.css";

type VolumeChartProps = {
  points: DailyChartPoint[];
};

const formatVolumeLabel = (volumeKg: number): string => {
  if (volumeKg <= 0) {
    return "0 kg";
  }

  if (volumeKg >= 1000) {
    return `${(volumeKg / 1000).toFixed(1)}k kg`;
  }

  return `${Math.round(volumeKg)} kg`;
};

export function VolumeChart({ points }: VolumeChartProps) {
  const maxVolume = Math.max(...points.map((point) => point.volumeKg), 1);

  return (
    <div
      className="volume-chart"
      role="img"
      aria-label="Volume sollevato negli ultimi 7 giorni"
    >
      <div className="bars">
        {points.map((point) => {
          const heightPercent = (point.volumeKg / maxVolume) * 100;

          return (
            <div key={point.date} className="bar-wrap">
              <span className="value-label">{formatVolumeLabel(point.volumeKg)}</span>
              <div className="bar-track">
                <div
                  className="bar"
                  style={{ height: `${heightPercent}%` }}
                  title={`${point.weekdayLabel}: ${formatVolumeLabel(point.volumeKg)}`}
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
