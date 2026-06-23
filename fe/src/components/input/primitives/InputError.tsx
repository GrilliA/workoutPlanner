import {
  useEffect,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cx } from "@utils/cx";
import { useInputContext } from "../context";

export type InputErrorProps = ComponentPropsWithoutRef<"p"> & {
  children?: ReactNode;
};

export function InputError({
  className,
  children,
  id,
  ...props
}: InputErrorProps) {
  const { error, errorId, registerError } = useInputContext();
  const message = children ?? error;

  useEffect(() => {
    if (!message) {
      return;
    }

    return registerError();
  }, [message, registerError]);

  if (!message) {
    return null;
  }

  return (
    <p
      id={id ?? errorId}
      role="alert"
      aria-live="polite"
      className={cx("input-error", className)}
      {...props}
    >
      {message}
    </p>
  );
}
