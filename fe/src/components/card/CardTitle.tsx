import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";

export type CardTitleProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
};

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <span className={cx("title", className)} {...props}>
      {children}
    </span>
  );
}
