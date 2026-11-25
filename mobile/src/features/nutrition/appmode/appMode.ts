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
 * La modalità dell'ultima scelta, ma Alimentazione solo con un piano pasti attivo.
 * Senza piano (o finché la Home non ha risposto) si resta in Allenamento.
 */
function resolveAppMode(chosenMode: AppMode, isNutritionAvailable: boolean): AppMode {
  if (!isNutritionAvailable) {
    return "training";
  }
  return chosenMode;
}

type DisplayedAppModeInput = {
  chosenMode: AppMode;
  isNutritionAvailable: boolean;
  /** La Home ha risposto (o ha dato errore) almeno una volta. */
  isNutritionKnown: boolean;
  /** Tab aperta (nome della route), anche sotto una schermata dello stack. */
  focusedTab: string;
};

/**
 * La modalità da mostrare, calcolata a ogni render: una tab che esiste in una sola
 * modalità (es. Schede aperta da un link) mostra la sua, così la tab bar non è mai
 * incoerente con la schermata. Piano pasti senza piano attivo mostra Allenamento,
 * ma finché `nutrition` non è nota resta in Alimentazione (la route mostra un caricamento).
 */
export function displayedAppMode({
  chosenMode,
  isNutritionAvailable,
  isNutritionKnown,
  focusedTab,
}: DisplayedAppModeInput): AppMode {
  const tabMode = TAB_ROUTE_MODES[focusedTab];
  if (tabMode === "training") {
    return "training";
  }
  const mayShowNutritionTab = isNutritionAvailable || !isNutritionKnown;
  if (tabMode === "nutrition" && mayShowNutritionTab) {
    return "nutrition";
  }
  return resolveAppMode(chosenMode, isNutritionAvailable);
}

/**
 * Dopo un cambio di tab verso una tab dell'altra modalità (un link: le tab dell'altra
 * modalità non sono nella barra) la scelta salvata diventa quella modalità. Mai finché
 * `nutrition` non è nota: un tap su Schede nel primo secondo non sovrascrive Alimentazione.
 * `null` = niente da salvare.
 */
export function appModeToSaveOnTabChange({
  chosenMode,
  isNutritionAvailable,
  isNutritionKnown,
  focusedTab,
}: DisplayedAppModeInput): AppMode | null {
  const tabMode = TAB_ROUTE_MODES[focusedTab];
  if (!isNutritionKnown || tabMode === undefined || tabMode === chosenMode) {
    return null;
  }
  const isNutritionWithoutPlan = tabMode === "nutrition" && !isNutritionAvailable;
  if (isNutritionWithoutPlan) {
    return null;
  }
  return tabMode;
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
 * Tab aperta dai segmenti di expo-router. Sotto una schermata dello stack
 * (es. `/session/12`) i segmenti non sono più `(app)`: resta l'ultima tab aperta.
 */
export function focusedTabFromSegments(segments: string[], previousTab: string): string {
  if (segments[0] !== "(app)") {
    return previousTab;
  }
  return segments[1] ?? "index";
}
