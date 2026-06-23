import { createContext, useContext } from "react";

export type InputContextValue = {
  inputId: string;
  error?: string;
  disabled: boolean;
  helperId: string;
  errorId: string;
  hasHelper: boolean;
  hasErrorMessage: boolean;
  registerHelper: () => () => void;
  registerError: () => () => void;
};

const InputContext = createContext<InputContextValue | null>(null);

export const InputProvider = InputContext.Provider;

export function useInputContext(): InputContextValue {
  const context = useContext(InputContext);

  if (!context) {
    throw new Error("Input sub-components must be used within Input.Root");
  }

  return context;
}

export type InputControlContextValue = {
  embedded: boolean;
};

const InputControlContext = createContext<InputControlContextValue | null>(
  null,
);

export const InputControlProvider = InputControlContext.Provider;

export function useInputControlContext(): InputControlContextValue | null {
  return useContext(InputControlContext);
}
