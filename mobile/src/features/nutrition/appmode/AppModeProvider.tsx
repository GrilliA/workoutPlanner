import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { getAthleteHome, type AthleteNutrition } from "../../../api";
import { resolveAppMode, type AppMode } from "./appMode";
import { readStoredAppMode, saveAppMode } from "./appModeStorage";

type AppModeContextValue = {
  /** La modalità mostrata: Alimentazione solo con un piano pasti attivo. */
  mode: AppMode;
  /** `nutrition` non null nell'ultima `GET /athlete/home`: lo switch si vede. */
  isNutritionAvailable: boolean;
  chooseMode: (mode: AppMode) => void;
  /** Per chi ha appena letto la Home (es. pull-to-refresh) e conosce già `nutrition`. */
  reportNutrition: (nutrition: AthleteNutrition | null) => void;
  /** Rilegge `nutrition` dalla Home (cache breve dell'API). */
  refreshNutrition: () => void;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

type AppModeProviderProps = {
  userId: number;
  children: ReactNode;
};

/**
 * Modalità Allenamento / Alimentazione dell'atleta. L'ultima scelta resta sul telefono (H9);
 * se il coach disattiva il piano o si scollega, la modalità mostrata torna Allenamento
 * senza cancellare la scelta.
 */
export function AppModeProvider({ userId, children }: AppModeProviderProps) {
  const [chosenMode, setChosenMode] = useState<AppMode>("training");
  const [isNutritionAvailable, setIsNutritionAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readStoredAppMode(userId).then((storedMode) => {
      if (!cancelled) {
        setChosenMode(storedMode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const reportNutrition = (nutrition: AthleteNutrition | null) => {
    setIsNutritionAvailable(nutrition !== null);
  };

  // Senza rete si tiene l'ultimo valore: offline non si esce da Alimentazione.
  const refreshNutrition = () => {
    void getAthleteHome()
      .then((home) => reportNutrition(home.nutrition))
      .catch(() => undefined);
  };

  useEffect(() => {
    refreshNutrition();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshNutrition();
      }
    });
    return () => subscription.remove();
    // Una sola sottoscrizione per utente: refreshNutrition non legge stato.
  }, [userId]);

  const chooseMode = (mode: AppMode) => {
    setChosenMode(mode);
    void saveAppMode(userId, mode);
  };

  const value: AppModeContextValue = {
    mode: resolveAppMode(chosenMode, isNutritionAvailable),
    isNutritionAvailable,
    chooseMode,
    reportNutrition,
    refreshNutrition,
  };

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const context = useContext(AppModeContext);
  if (context === null) {
    throw new Error("useAppMode va usato dentro AppModeProvider");
  }
  return context;
}
