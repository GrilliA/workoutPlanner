import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@utils/cx";
import { InputControlProvider, useInputContext } from "../context";

export type InputControlProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export function InputControl({ className, children, ...props }: InputControlProps) {
  const { error, disabled } = useInputContext();

  const controlClassName = cx(
    "input-control",
    error && "input-control--error",
    disabled && "input-control--disabled",
    className,
  );

  return (
    <InputControlProvider value={{ embedded: true }}>
      <div className={controlClassName} {...props}>
        {children}
      </div>
    </InputControlProvider>
  );
}
