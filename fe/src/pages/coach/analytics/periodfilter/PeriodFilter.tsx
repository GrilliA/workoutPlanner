import type { StatsRange } from "@api";
import { ANALYTICS_RANGE_OPTIONS } from "../mappers/formatters";
import "./style.css";

type PeriodFilterProps = {
  value: StatsRange;
  onChange: (range: StatsRange) => void;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="analytics-period" role="tablist" aria-label="Filtro periodo">
      {ANALYTICS_RANGE_OPTIONS.map((option) => {
        const selected = option.range === value;

        return (
          <button
            key={option.range}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? "analytics-period__chip active" : "analytics-period__chip"}
            onClick={() => onChange(option.range)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
