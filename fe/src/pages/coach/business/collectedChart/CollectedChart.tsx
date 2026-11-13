import type { CSSProperties } from "react";
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
// Room above the best month for its amount.
const TOP_SPACE = 26;
const FLAT_BAR_HEIGHT = 2;
const MIN_BAR_HEIGHT = 6;
// Above this many months the amounts move to a list under the chart when the card is narrow.
const MANY_MONTHS = 6;

const barHeight = (heightRatio: number): number => {
  if (heightRatio === 0) {
    return FLAT_BAR_HEIGHT;
  }

  return Math.max(MIN_BAR_HEIGHT, heightRatio * (CHART_HEIGHT - TOP_SPACE));
};

/** Where the amount sits: just above the top of its bar, as a share of the plot height. */
const amountOffset = (heightRatio: number): CSSProperties => ({
  bottom: `${(barHeight(heightRatio) / CHART_HEIGHT) * 100}%`,
});

export function CollectedChart({ model }: CollectedChartProps) {
  const chartWidth = model.bars.length * SLOT_WIDTH;
  const barOffset = (SLOT_WIDTH - BAR_WIDTH) / 2;
  const columns = { gridTemplateColumns: `repeat(${model.bars.length}, minmax(0, 1fr))` };
  const className = model.bars.length > MANY_MONTHS ? "business-chart many" : "business-chart";

  return (
    <section className={className} aria-labelledby="business-chart-title">
      <h2 id="business-chart-title">Incassato per mese</h2>
      <div className="plot-area">
        <svg
          className="plot"
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={model.summary}
        >
          {model.bars.map((bar, index) => {
            const height = barHeight(bar.heightRatio);
            const barClassName = bar.isCurrentMonth ? "bar current" : "bar";

            return (
              <rect
                key={bar.accessibilityLabel}
                className={barClassName}
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
        {/* Visible amounts; screen readers get them once, from the month list. */}
        <ol className="amounts" style={columns} aria-hidden="true">
          {model.bars.map((bar) => (
            <li key={bar.accessibilityLabel} className={bar.isCurrentMonth ? "current" : undefined}>
              <span style={amountOffset(bar.heightRatio)}>{bar.compactAmount}</span>
            </li>
          ))}
        </ol>
      </div>
      <ol className="months" style={columns}>
        {model.bars.map((bar) => (
          <li key={bar.accessibilityLabel} className={bar.isCurrentMonth ? "current" : undefined}>
            <span aria-hidden="true">{bar.label}</span>
            <span className="sr-only">{bar.accessibilityLabel}</span>
          </li>
        ))}
      </ol>
      <ul className="amount-list" aria-hidden="true">
        {model.bars.map((bar) => (
          <li key={bar.accessibilityLabel} className={bar.isCurrentMonth ? "current" : undefined}>
            <span>{bar.label}</span>
            <span>{bar.amount}</span>
          </li>
        ))}
      </ul>
      <p className="summary">{model.summary}</p>
    </section>
  );
}
