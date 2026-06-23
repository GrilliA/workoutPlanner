import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { useButtonContext } from "../context";

export type ButtonIconProps = ComponentPropsWithoutRef<"span"> & {
  position: "start" | "end";
  children: ReactNode;
};

export function ButtonIcon({
  position,
  className,
  children,
  ...props
}: ButtonIconProps) {
  const { registerIcon } = useButtonContext();

  useEffect(() => registerIcon(position), [position, registerIcon]);

  const iconClassName = cx(
    "button-icon",
    `button-icon--${position}`,
    className,
  );

  return (
    <span className={iconClassName} aria-hidden="true" {...props}>
      {children}
    </span>
  );
}
