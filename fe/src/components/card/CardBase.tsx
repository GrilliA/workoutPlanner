import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";

export type CardBaseProps = ComponentPropsWithoutRef<"article"> & {
  as?: "article" | "li" | "div";
  labelledBy?: string;
};

export function CardBase({
  as: Component = "article",
  labelledBy,
  className,
  children,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: CardBaseProps) {
  return (
    <Component
      className={cx("card", className)}
      aria-labelledby={labelledBy ?? ariaLabelledBy}
      {...props}
    >
      {children}
    </Component>
  );
}
