/** Misure della tab bar condivise tra gli stili di GlassTabBar e il calcolo dello spazio. */
export const BAR_PADDING = 6;
export const TAB_GAP = 4;
export const OPEN_TAB_PADDING = 16;
export const ICON_SIZE = 23;
export const LABEL_GAP = 6;
export const CLOSED_FLEX = 1;
export const OPEN_FLEX = 1.8;

/** Ultimo `display` di uno stile (oggetto o array annidato, come `StyleSheet.flatten`). */
function displayOf(style: unknown): unknown {
  if (Array.isArray(style)) {
    const displays = style.map(displayOf).filter((display) => display !== undefined);
    return displays.at(-1);
  }
  if (typeof style === "object" && style !== null && "display" in style) {
    return style.display;
  }
  return undefined;
}

/** `href: null` di expo-router diventa `tabBarItemStyle: { display: "none" }`: la tab non si disegna. */
export function isHiddenTabStyle(tabBarItemStyle: unknown): boolean {
  return displayOf(tabBarItemStyle) === "none";
}

/**
 * Larghezza per icona + etichetta dentro la pill attiva, a animazione finita.
 * Le tab hanno base 0: lo spazio libero (tolti padding della barra, spazi tra le tab
 * e padding della pill aperta) si divide in proporzione a `flexGrow`.
 */
export function activePillContentWidth(barWidth: number, visibleTabCount: number): number {
  const closedTabCount = Math.max(visibleTabCount - 1, 0);
  const gaps = TAB_GAP * closedTabCount;
  const freeWidth = barWidth - 2 * BAR_PADDING - gaps - 2 * OPEN_TAB_PADDING;
  const openShare = OPEN_FLEX / (OPEN_FLEX + closedTabCount * CLOSED_FLEX);
  return Math.max(freeWidth, 0) * openShare;
}

/** L'etichetta intera ci sta accanto all'icona; altrimenti la pill mostra solo l'icona. */
export function activeLabelFits(contentWidth: number, labelWidth: number): boolean {
  return ICON_SIZE + LABEL_GAP + labelWidth <= contentWidth;
}
