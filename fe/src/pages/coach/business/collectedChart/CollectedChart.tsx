import type { CollectedChartModel } from "../types";
import "./style.css";

type CollectedChartProps = {
  model: CollectedChartModel;
};

// Drawing units. The SVG stretches to the card width at a fixed CSS height, so 12 months fit at
// 375px without scrolling and 6 months do not grow tall on desktop. Stretching would turn rounded
// corners into ellipses, so the bars are square.
const SLOT_WIDTH = 40;
const BAR_WIDTH = 26;
const CHART_HEIGHT = 140;
const TOP_SPACE = 8;
const FLAT_BAR_HEIGHT = 2;
const MIN_BAR_HEIGHT = 6;

const barHeight = (heightRatio: number): number => {
  if (heightRatio === 0) {
    return FLAT_BAR_HEIGHT;
  }

  return Math.max(MIN_BAR_HEIGHT, heightRatio * (CHART_HEIGHT - TOP_SPACE));
};

export function CollectedChart({ model }: CollectedChartProps) {
  const chartWidth = model.bars.length * SLOT_WIDTH;
  const barOffset = (SLOT_WIDTH - BAR_WIDTH) / 2;

  return (
    <section className="business-chart" aria-labelledby="business-chart-title">
      <h2 id="business-chart-title">Incassato per mese</h2>
      <svg
        className="plot"
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={model.summary}
      >
        {model.bars.map((bar, index) => {
          const height = barHeight(bar.heightRatio);
          const className = bar.isCurrentMonth ? "bar current" : "bar";

          return (
            <rect
              key={bar.accessibilityLabel}
              className={className}
              x={index * SLOT_WIDTH + barOffset}
              y={CHART_HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
            >
              <title>{bar.accessibilityLabel}</title>
            </rect>
          );
        })}
      </svg>
      <ol className="months" style={{ gridTemplateColumns: `repeat(${model.bars.length}, minmax(0, 1fr))` }}>
        {model.bars.map((bar) => (
          <li key={bar.accessibilityLabel} className={bar.isCurrentMonth ? "current" : undefined}>
            <span aria-hidden="true">{bar.label}</span>
            <span className="sr-only">{bar.accessibilityLabel}</span>
          </li>
        ))}
      </ol>
      <p className="summary">{model.summary}</p>
    </section>
  );
}
