import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

export type InputHelperProps = ComponentPropsWithoutRef<"p">;

export function InputHelper({
  className,
  children,
  ...props
}: InputHelperProps) {
  return (
    <p className={cx("input-helper", className)} {...props}>
      {children}
    </p>
  );
}
