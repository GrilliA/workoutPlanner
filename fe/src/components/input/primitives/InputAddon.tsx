import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  ReactNode,
} from "react";
import { cx } from "@utils/cx";

export type InputAddonProps = ComponentPropsWithoutRef<"div"> & {
  position: "start" | "end";
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function InputAddon({
  position,
  children,
  className,
  onClick,
  ...props
}: InputAddonProps) {
  const addonClassName = cx(
    "input-addon",
    `input-addon--${position}`,
    onClick && "input-addon--interactive",
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={addonClassName}
        onClick={onClick}
        tabIndex={-1}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={addonClassName} aria-hidden="true" {...props}>
      {children}
    </div>
  );
}
