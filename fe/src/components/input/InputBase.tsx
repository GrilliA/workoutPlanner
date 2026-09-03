import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

export type InputBaseProps = ComponentPropsWithoutRef<"input"> & {
  invalid?: boolean;
};

export const InputBase = forwardRef<HTMLInputElement, InputBaseProps>(
  function InputBase({ className, disabled, invalid, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cx(
          "input-base",
          invalid && "input-base--error",
          disabled && "input-base--disabled",
          className,
        )}
      />
    );
  },
);
