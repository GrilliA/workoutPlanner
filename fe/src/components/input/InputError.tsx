import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

export type InputErrorProps = ComponentPropsWithoutRef<"p">;

export function InputError({ className, children, ...props }: InputErrorProps) {
  return (
    <p role="alert" className={cx("input-error", className)} {...props}>
      {children}
    </p>
  );
}
