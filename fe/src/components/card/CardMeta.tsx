import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";

export type CardMetaProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
};

export function CardMeta({ className, children, ...props }: CardMetaProps) {
  return (
    <span className={cx("meta", className)} {...props}>
      {children}
    </span>
  );
}
