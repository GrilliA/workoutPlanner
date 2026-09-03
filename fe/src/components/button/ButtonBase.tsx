import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";
import { ButtonSpinner } from "./ButtonSpinner";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonBaseProps = Omit<ComponentPropsWithoutRef<"button">, "disabled"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
};

export const ButtonBase = forwardRef<HTMLButtonElement, ButtonBaseProps>(
  function ButtonBase(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    const rootClassName = cx(
      "button-base",
      `button-base--${variant}`,
      `button-base--${size}`,
      loading && "button-base--loading",
      isDisabled && "button-base--disabled",
      className,
    );

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        className={rootClassName}
      >
        {loading ? <ButtonSpinner /> : null}
        {children}
      </button>
    );
  },
);
