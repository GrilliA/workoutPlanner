import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";

export type ButtonLabelProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
};

export function ButtonLabel({ className, children, ...props }: ButtonLabelProps) {
  const labelClassName = cx("button-label", className);

  return (
    <span className={labelClassName} {...props}>
      {children}
    </span>
  );
}
