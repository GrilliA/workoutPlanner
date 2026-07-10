import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";
import { useCardContext } from "../context";

export type CardMetaProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
};

export function CardMeta({
  className,
  children,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: CardMetaProps) {
  const { titleId } = useCardContext();

  return (
    <span
      className={cx("meta", className)}
      aria-labelledby={ariaLabelledBy ?? titleId}
      {...props}
    >
      {children}
    </span>
  );
}
