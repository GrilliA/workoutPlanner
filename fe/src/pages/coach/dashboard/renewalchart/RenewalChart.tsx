import type { RenewalChartModel } from "../types";
import "./style.css";

type RenewalChartProps = {
  model: RenewalChartModel;
};

const BAR_WIDTH = 36;
const BAR_GAP = 16;
const CHART_HEIGHT = 120;

export function RenewalChart({ model }: RenewalChartProps) {
  const slotWidth = BAR_WIDTH + BAR_GAP;
  const chartWidth = model.bars.length * slotWidth;
  const maxCount = Math.max(1, ...model.bars.map((bar) => bar.count));

  return (
    <section
      className="renewal-chart"
      aria-label="Rinnovi nelle prossime 4 settimane"
    >
      <h2>Rinnovi</h2>
      <div className="renewal-chart__fit">
        <div className="renewal-chart__content">
          <svg
            className="renewal-chart__svg"
            viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={model.summary}
          >
            {model.bars.map((bar, index) => {
              const height =
                bar.count === 0
                  ? 2
                  : Math.max(8, (bar.count / maxCount) * (CHART_HEIGHT - 24));
              const x = index * slotWidth + BAR_GAP / 2;
              const y = CHART_HEIGHT - height - 8;

              return (
                <rect
                  key={`${bar.label}-${index}`}
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={height}
                  rx={3}
                  className="renewal-chart__bar"
                >
                  <title>{bar.accessibilityLabel}</title>
                </rect>
              );
            })}
          </svg>
          <div className="renewal-chart__labels">
            {model.bars.map((bar, index) => (
              <div
                key={`${bar.label}-${index}`}
                className="renewal-chart__label-slot"
              >
                <span className="renewal-chart__count">{bar.count}</span>
                <span>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="renewal-chart__summary">{model.summary}</p>
    </section>
  );
}
