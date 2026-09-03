import { forwardRef, useId, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { InputBase, type InputBaseProps } from "./InputBase";
import { InputLabel } from "./InputLabel";
import { InputError } from "./InputError";
import { InputHelper } from "./InputHelper";

export type InputProps = Omit<InputBaseProps, "invalid"> & {
  label?: ReactNode;
  error?: string;
  helper?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      id: idProp,
      label,
      error,
      helper,
      disabled = false,
      required,
      className,
      "aria-describedby": ariaDescribedBy,
      ...inputProps
    },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = idProp ?? generatedId;
    const labelId = `${fieldId}-label`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    const describedBy =
      [error ? errorId : null, helper ? helperId : null, ariaDescribedBy]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div
        className={cx(
          "input",
          error && "input--error",
          disabled && "input--disabled",
        )}
      >
        {label ? (
          <InputLabel id={labelId} htmlFor={fieldId} required={required}>
            {label}
          </InputLabel>
        ) : null}
        <InputBase
          {...inputProps}
          ref={ref}
          id={fieldId}
          disabled={disabled}
          required={required}
          invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={className}
        />
        {helper ? <InputHelper id={helperId}>{helper}</InputHelper> : null}
        {error ? <InputError id={errorId}>{error}</InputError> : null}
      </div>
    );
  },
);
