import { useSegments } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { getAthleteHome, type AthleteNutrition } from "../../../api";
import {
  appModeToSaveOnTabChange,
  displayedAppMode,
  focusedTabFromSegments,
  type AppMode,
} from "./appMode";
import { readStoredAppMode, saveAppMode } from "./appModeStorage";
import { deviceAppModeStorage } from "./deviceAppModeStorage";

type AppModeContextValue = {
  /** La modalità mostrata (tab bar, Home/Oggi, Progressi). */
  mode: AppMode;
  /** `nutrition` non null nell'ultima `GET /athlete/home`: lo switch si vede. */
  isNutritionAvailable: boolean;
  /** La Home ha risposto (o ha dato errore) almeno una volta da quando l'app è aperta. */
  isNutritionKnown: boolean;
  chooseMode: (mode: AppMode) => void;
  /** Per chi ha appena letto la Home (es. pull-to-refresh) e conosce già `nutrition`. */
  reportNutrition: (nutrition: AthleteNutrition | null) => void;
  /** Rilegge `nutrition` dalla Home (cache breve dell'API). */
  refreshNutrition: () => void;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

type AppModeProviderProps = {
  /** Il layout monta il provider con `key={userId}`: un altro utente riparte da zero. */
  userId: number;
  children: ReactNode;
};

/**
 * Modalità Allenamento / Alimentazione dell'atleta. L'ultima scelta resta sul telefono (H9);
 * se il coach disattiva il piano o si scollega, la modalità mostrata torna Allenamento
 * senza cancellare la scelta. La modalità mostrata si calcola a ogni render dalla tab
 * aperta, quindi la tab bar non è mai incoerente con la schermata.
 */
export function AppModeProvider({ userId, children }: AppModeProviderProps) {
  const [chosenMode, setChosenMode] = useState<AppMode>("training");
  const [nutritionState, setNutritionState] = useState({ isAvailable: false, isKnown: false });
  // Una scelta (switch o link) arrivata prima della lettura dallo storage vince su di essa.
  const hasChosenRef = useRef(false);
  const isMountedRef = useRef(true);

  const segments: string[] = useSegments();
  const lastFocusedTabRef = useRef("index");
  const focusedTab = focusedTabFromSegments(segments, lastFocusedTabRef.current);
  lastFocusedTabRef.current = focusedTab;

  useEffect(() => {
    isMountedRef.current = true;
    void readStoredAppMode(deviceAppModeStorage, userId).then((storedMode) => {
      if (isMountedRef.current && !hasChosenRef.current) {
        setChosenMode(storedMode);
      }
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [userId]);

  const reportNutrition = useCallback((nutrition: AthleteNutrition | null) => {
    setNutritionState({ isAvailable: nutrition !== null, isKnown: true });
  }, []);

  // Senza rete si tiene l'ultimo valore (offline non si esce da Alimentazione), ma
  // `nutrition` diventa nota: Piano pasti smette di aspettare.
  const refreshNutrition = useCallback(() => {
    void getAthleteHome()
      .then((home) => {
        if (isMountedRef.current) {
          reportNutrition(home.nutrition);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setNutritionState((current) => ({ ...current, isKnown: true }));
        }
      });
  }, [reportNutrition]);

  useEffect(() => {
    refreshNutrition();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshNutrition();
      }
    });
    return () => subscription.remove();
  }, [refreshNutrition]);

  const chooseMode = useCallback(
    (mode: AppMode) => {
      hasChosenRef.current = true;
      setChosenMode(mode);
      void saveAppMode(deviceAppModeStorage, userId, mode);
    },
    [userId],
  );

  const modeInput = {
    chosenMode,
    isNutritionAvailable: nutritionState.isAvailable,
    isNutritionKnown: nutritionState.isKnown,
    focusedTab,
  };

  // Solo quando cambia la tab (un link verso l'altra modalità), non quando `nutrition`
  // diventa nota: una tab aperta prima della risposta della Home non cambia la scelta.
  useEffect(() => {
    const modeToSave = appModeToSaveOnTabChange(modeInput);
    if (modeToSave !== null) {
      chooseMode(modeToSave);
    }
  }, [focusedTab]);

  const mode = displayedAppMode(modeInput);
  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      isNutritionAvailable: nutritionState.isAvailable,
      isNutritionKnown: nutritionState.isKnown,
      chooseMode,
      reportNutrition,
      refreshNutrition,
    }),
    [mode, nutritionState, chooseMode, reportNutrition, refreshNutrition],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const context = useContext(AppModeContext);
  if (context === null) {
    throw new Error("useAppMode va usato dentro AppModeProvider");
  }
  return context;
}
