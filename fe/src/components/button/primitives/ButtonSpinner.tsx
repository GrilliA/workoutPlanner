import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";
import { useButtonContext } from "../context";

export type ButtonSpinnerProps = ComponentPropsWithoutRef<"span">;

export function ButtonSpinner({ className, ...props }: ButtonSpinnerProps) {
  const { loading } = useButtonContext();

  if (!loading) {
    return null;
  }

  const spinnerClassName = cx("button-spinner", className);

  return <span className={spinnerClassName} aria-hidden="true" {...props} />;
}
