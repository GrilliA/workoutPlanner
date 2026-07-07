import { createContext, useContext } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonIconPosition = "start" | "end";

export type ButtonContextValue = {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
  loading: boolean;
  hasStartIcon: boolean;
  hasEndIcon: boolean;
  registerIcon: (position: ButtonIconPosition) => () => void;
};

const ButtonContext = createContext<ButtonContextValue | null>(null);

export const ButtonProvider = ButtonContext.Provider;

export function useButtonContext(): ButtonContextValue {
  const context = useContext(ButtonContext);

  if (!context) {
    throw new Error("Button sub-components must be used within Button.Root");
  }

  return context;
}
