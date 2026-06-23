import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";
import { useInputContext } from "../context";

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
  const { inputId } = useInputContext();

  const labelClassName = cx("input-label", className);

  return (
    <label htmlFor={inputId} className={labelClassName} {...props}>
      {children}
      {required ? <span className="input-label__required" aria-hidden="true"> *</span> : null}
    </label>
  );
}
