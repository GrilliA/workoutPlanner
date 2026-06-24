import { createContext, useContext } from "react";

export type CardContextValue = {
  titleId: string;
};

const CardContext = createContext<CardContextValue | null>(null);

export const CardProvider = CardContext.Provider;

export function useCardContext(): CardContextValue {
  const context = useContext(CardContext);

  if (!context) {
    throw new Error("Card sub-components must be used within Card.Root");
  }

  return context;
}
