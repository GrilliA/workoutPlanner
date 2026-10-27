import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

/** Input props go to the field, except `className`, which goes on the wrapper with the tag. */
export type UnitInputProps<Unit extends string> = ComponentPropsWithoutRef<"input"> & {
  unit: Unit;
  /** The units the tag cycles through, in this order. */
  units: readonly Unit[];
  unitLabels: Record<Unit, string>;
  onUnitChange: (unit: Unit) => void;
  /** What the tag changes, for screen readers (e.g. "Unità carico serie 1"). */
  unitAriaLabel: string;
  invalid?: boolean;
};

/** A number field with its unit as a tag inside: a click on the tag moves to the next unit. */
export function UnitInput<Unit extends string>({
  unit,
  units,
  unitLabels,
  onUnitChange,
  unitAriaLabel,
  invalid,
  disabled,
  className,
  ...inputProps
}: UnitInputProps<Unit>) {
  const nextUnit = units[(units.indexOf(unit) + 1) % units.length] ?? unit;

  return (
    <span
      className={cx(
        "unit-input",
        invalid && "unit-input--error",
        disabled && "unit-input--disabled",
        className,
      )}
    >
      <input
        {...inputProps}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="unit-input__field"
      />
      <button
        type="button"
        className="unit-input__tag"
        disabled={disabled}
        aria-label={`${unitAriaLabel}: ${unitLabels[unit]}. Passa a ${unitLabels[nextUnit]}`}
        onClick={() => onUnitChange(nextUnit)}
      >
        {unitLabels[unit]}
      </button>
    </span>
  );
}
