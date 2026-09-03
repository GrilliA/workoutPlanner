import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";

export type InputLabelProps = ComponentPropsWithoutRef<"label"> & {
  required?: boolean;
  children: ReactNode;
};

export function InputLabel({
  required = false,
  className,
  children,
  ...props
}: InputLabelProps) {
  return (
    <label className={cx("input-label", className)} {...props}>
      {children}
      {required ? <span className="input-label__required" aria-hidden="true"> *</span> : null}
    </label>
  );
}
