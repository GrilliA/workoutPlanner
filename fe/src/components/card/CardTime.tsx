import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";

export type CardTimeProps = ComponentPropsWithoutRef<"time"> & {
  children: ReactNode;
};

export function CardTime({ className, children, ...props }: CardTimeProps) {
  return (
    <time className={cx("meta", className)} {...props}>
      {children}
    </time>
  );
}
