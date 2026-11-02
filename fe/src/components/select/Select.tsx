import { useId, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { InputLabel } from "../input/InputLabel";
import { InputError } from "../input/InputError";
import { InputHelper } from "../input/InputHelper";
import { SelectBase, type SelectBaseProps } from "./SelectBase";

export type SelectProps = Omit<SelectBaseProps, "invalid"> & {
  label?: ReactNode;
  error?: string;
  helper?: string;
};

export function Select({
  id: idProp,
  label,
  error,
  helper,
  disabled = false,
  required,
  "aria-describedby": ariaDescribedBy,
  ...selectProps
}: SelectProps) {
  const generatedId = useId();
  const fieldId = idProp ?? generatedId;
  const labelId = `${fieldId}-label`;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const describedBy =
    [error ? errorId : null, helper ? helperId : null, ariaDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;

  // A <label> only focuses form controls; the trigger is a div.
  const focusTrigger = () => document.getElementById(fieldId)?.focus();

  return (
    <div
      className={cx(
        "input",
        error && "input--error",
        disabled && "input--disabled",
      )}
    >
      {label ? (
        <InputLabel id={labelId} required={required} onClick={focusTrigger}>
          {label}
        </InputLabel>
      ) : null}
      <SelectBase
        {...selectProps}
        id={fieldId}
        disabled={disabled}
        required={required}
        invalid={Boolean(error)}
        aria-labelledby={label ? labelId : selectProps["aria-labelledby"]}
        aria-describedby={describedBy}
      />
      {helper ? <InputHelper id={helperId}>{helper}</InputHelper> : null}
      {error ? <InputError id={errorId}>{error}</InputError> : null}
    </div>
  );
}
