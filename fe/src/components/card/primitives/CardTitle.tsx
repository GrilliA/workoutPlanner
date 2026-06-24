import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";
import { useCardContext } from "../context";

export type CardTitleProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
};

export function CardTitle({ className, children, id, ...props }: CardTitleProps) {
  const { titleId } = useCardContext();

  return (
    <span id={id ?? titleId} className={cx("title", className)} {...props}>
      {children}
    </span>
  );
}
