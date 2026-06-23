import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";
import { useInputContext, useInputControlContext } from "../context";

export type InputFieldProps = ComponentPropsWithoutRef<"input">;

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    { className, disabled, id, "aria-describedby": ariaDescribedBy, ...props },
    ref,
  ) {
    const {
      inputId,
      error,
      disabled: rootDisabled,
      helperId,
      errorId,
      hasHelper,
      hasErrorMessage,
    } = useInputContext();
    const controlContext = useInputControlContext();
    const isEmbedded = controlContext?.embedded ?? false;
    const isDisabled = disabled ?? rootDisabled;

    const describedByIds = cx(
      ariaDescribedBy,
      hasHelper && helperId,
      hasErrorMessage && errorId,
    );

    const fieldClassName = cx(
      "input-field",
      isEmbedded && "input-field--embedded",
      error && "input-field--error",
      isDisabled && "input-field--disabled",
      className,
    );

    return (
      <input
        ref={ref}
        id={id ?? inputId}
        disabled={isDisabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds || undefined}
        className={fieldClassName}
        {...props}
      />
    );
  },
);
