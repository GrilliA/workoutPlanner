import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { CardProvider } from "../context";

type CardElement = "article" | "li" | "div";

export type CardRootProps = Omit<ComponentPropsWithoutRef<"article">, "children"> & {
  as?: CardElement;
  children: ReactNode;
};

export function CardRoot({
  as: Component = "article",
  className,
  children,
  ...props
}: CardRootProps) {
  const baseId = useId();
  const titleId = `card-title-${baseId}`;

  return (
    <CardProvider value={{ titleId }}>
      <Component className={cx("card", className)} {...props}>
        {children}
      </Component>
    </CardProvider>
  );
}
