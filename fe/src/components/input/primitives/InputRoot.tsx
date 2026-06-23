import { useId, useState, type ComponentPropsWithoutRef } from "react";
import { cx } from "@utils/cx";
import { InputProvider, type InputContextValue } from "../context";

export type InputRootProps = ComponentPropsWithoutRef<"div"> & {
  error?: string;
  disabled?: boolean;
};

export function InputRoot({
  error,
  disabled = false,
  className,
  children,
  ...props
}: InputRootProps) {
  const baseId = useId();
  const inputId = `input-${baseId}`;
  const [hasHelper, setHasHelper] = useState(false);
  const [hasErrorMessage, setHasErrorMessage] = useState(false);

  const registerHelper = () => {
    setHasHelper(true);
    return () => setHasHelper(false);
  };

  const registerError = () => {
    setHasErrorMessage(true);
    return () => setHasErrorMessage(false);
  };

  const contextValue: InputContextValue = {
    inputId,
    error,
    disabled,
    helperId: `${inputId}-helper`,
    errorId: `${inputId}-error`,
    hasHelper,
    hasErrorMessage,
    registerHelper,
    registerError,
  };

  const rootClassName = cx(
    "input-root",
    error && "input-root--error",
    disabled && "input-root--disabled",
    className,
  );

  return (
    <InputProvider value={contextValue}>
      <div className={rootClassName} {...props}>
        {children}
      </div>
    </InputProvider>
  );
}
