import type { BusinessRange } from "@api";
import { BUSINESS_RANGE_OPTIONS } from "../mappers/business";
import "./style.css";

type RangeFilterProps = {
  value: BusinessRange;
  onChange: (range: BusinessRange) => void;
};

export function RangeFilter({ value, onChange }: RangeFilterProps) {
  return (
    <div className="business-range" role="tablist" aria-label="Periodo">
      {BUSINESS_RANGE_OPTIONS.map((option) => {
        const isSelected = option.range === value;

        return (
          <button
            key={option.range}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={isSelected ? "chip active" : "chip"}
            onClick={() => onChange(option.range)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
