import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";
import { useCardContext } from "../context";

export type CardTimeProps = ComponentPropsWithoutRef<"time"> & {
  children: ReactNode;
};

export function CardTime({
  className,
  children,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: CardTimeProps) {
  const { titleId } = useCardContext();

  return (
    <time
      className={cx("meta", className)}
      aria-labelledby={ariaLabelledBy ?? titleId}
      {...props}
    >
      {children}
    </time>
  );
}
