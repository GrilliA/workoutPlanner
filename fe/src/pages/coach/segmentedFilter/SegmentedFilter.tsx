import "./style.css";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedFilterProps<T extends string> = {
  /** Accessible name of the group: "Periodo". */
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Exclusive choice in a pill: a group of toggle buttons, the selected one drawn from `aria-pressed`. */
export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedFilterProps<T>) {
  return (
    <div className="segmented-filter" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
