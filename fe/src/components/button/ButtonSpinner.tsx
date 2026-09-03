import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

export type ButtonSpinnerProps = ComponentPropsWithoutRef<"span">;

export function ButtonSpinner({ className, ...props }: ButtonSpinnerProps) {
  const spinnerClassName = cx("button-spinner", className);

  return <span className={spinnerClassName} aria-hidden="true" {...props} />;
}
