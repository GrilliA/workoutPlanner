/** Le due sezioni dell'app: Allenamento (default) e Alimentazione (piano pasti, AL). */
export type AppMode = "training" | "nutrition";

/** Route delle tab che esistono in una sola modalità; le altre (index, stats, settings) in entrambe. */
const TAB_ROUTE_MODES: Record<string, AppMode> = {
  workouts: "training",
  meals: "nutrition",
};

/** Valore salvato sul telefono → modalità; vuoto o sconosciuto = Allenamento. */
export function parseStoredAppMode(storedValue: string | null): AppMode {
  if (storedValue === "nutrition") {
    return "nutrition";
  }
  return "training";
}

/**
 * La modalità da mostrare: l'ultima scelta, ma Alimentazione solo con un piano pasti attivo.
 * Senza piano (o finché la Home non ha risposto) si resta in Allenamento.
 */
export function resolveAppMode(chosenMode: AppMode, isNutritionAvailable: boolean): AppMode {
  if (!isNutritionAvailable) {
    return "training";
  }
  return chosenMode;
}

/** La tab esiste solo nell'altra modalità: va nascosta dalla tab bar. */
export function isTabHiddenInMode(routeName: string, mode: AppMode): boolean {
  const routeMode = TAB_ROUTE_MODES[routeName];
  if (routeMode === undefined) {
    return false;
  }
  return routeMode !== mode;
}

/**
 * Un link diretto a una tab dell'altra modalità (es. `/workouts` in Alimentazione)
 * porta in quella modalità, così la tab bar mostra la tab aperta. Alimentazione
 * solo con un piano attivo: altrimenti la modalità non cambia.
 */
export function appModeForFocusedTab(
  routeName: string,
  currentMode: AppMode,
  isNutritionAvailable: boolean,
): AppMode {
  const routeMode = TAB_ROUTE_MODES[routeName];
  if (routeMode === undefined) {
    return currentMode;
  }
  const canEnterNutrition = routeMode === "nutrition" && isNutritionAvailable;
  if (routeMode === "training" || canEnterNutrition) {
    return routeMode;
  }
  return currentMode;
}
