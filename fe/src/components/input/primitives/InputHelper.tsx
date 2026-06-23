import { useEffect, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@utils/cx";
import { useInputContext } from "../context";

export type InputHelperProps = ComponentPropsWithoutRef<"p"> & {
  children: ReactNode;
};

export function InputHelper({ className, children, id, ...props }: InputHelperProps) {
  const { helperId, registerHelper } = useInputContext();

  useEffect(() => registerHelper(), [registerHelper]);

  const helperClassName = cx("input-helper", className);

  return (
    <p id={id ?? helperId} className={helperClassName} {...props}>
      {children}
    </p>
  );
}
