import type { WeeklyChartModel } from "../types";
import "./style.css";

type WeeklyChartProps = {
  model: WeeklyChartModel;
};

export function WeeklyChart({ model }: WeeklyChartProps) {
  const slotWidth = model.barWidth + model.barGap;
  const chartHeight = 120;

  if (model.bars.length === 0) {
    return (
      <section className="analytics-chart" aria-label="Trend settimanale portafoglio">
        <h2>Trend settimanale</h2>
        <p className="analytics-chart__empty">
          Dati insufficienti per mostrare il trend nel periodo selezionato.
        </p>
      </section>
    );
  }

  return (
    <section className="analytics-chart" aria-label="Trend settimanale portafoglio">
      <h2>Trend settimanale</h2>
      <div className={model.scrollable ? "analytics-chart__scroll" : "analytics-chart__fit"}>
        <div
          className="analytics-chart__content"
          style={{ width: model.scrollable ? model.chartWidth : undefined }}
        >
          <svg
            className="analytics-chart__svg"
            width={model.chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${model.chartWidth} ${chartHeight}`}
            role="img"
            aria-label={model.summary}
          >
            {model.bars.map((bar, index) => {
              const height =
                bar.sessionValue === 0
                  ? 2
                  : Math.max(8, (bar.sessionValue / model.maxSessionValue) * (chartHeight - 24));
              const x = index * slotWidth;
              const y = chartHeight - height - 8;

              return (
                <rect
                  key={`${bar.label}-${index}`}
                  x={x}
                  y={y}
                  width={model.barWidth}
                  height={height}
                  rx={3}
                  className="analytics-chart__bar"
                >
                  <title>{bar.accessibilityLabel}</title>
                </rect>
              );
            })}
          </svg>
          <div className="analytics-chart__labels" style={{ width: model.chartWidth }}>
            {model.bars.map((bar, index) => (
              <div
                key={`${bar.label}-${index}`}
                className="analytics-chart__label-slot"
                style={{ width: slotWidth }}
              >
                {bar.showLabel ? <span>{bar.label}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="analytics-chart__summary">{model.summary}</p>
      {model.hasVolume ? (
        <p className="analytics-chart__volume">{model.volumeSummary}</p>
      ) : null}
    </section>
  );
}
