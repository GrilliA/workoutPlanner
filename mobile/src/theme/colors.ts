/**
 * Design tokens — tema "Sole" (M4): crema caldo, arancio come riempimento,
 * indaco per i dati. Piano e regole: `docs/plans/M4-design-sole.md`.
 *
 * Regole di contrasto (verificate da `scripts/check-contrast.mjs`):
 * - `accent` è solo un riempimento: il testo sopra è `onAccent` (cacao), mai bianco.
 * - testo o icone arancio su fondo chiaro → `accentText`.
 */

export const colors = {
  bg: "#FFF8F1",
  surface: "#FFFFFF",
  surfaceElevated: "#FFF8F1",
  border: "#F0E4D8",
  textHeading: "#231A14",
  text: "#6F625A",
  accent: "#FF7A45",
  onAccent: "#231A14",
  accentBg: "#FFE7DA",
  accentText: "#A33A12",
  accentBorder: "#FFC2A6",
  ink: "#231A14",
  onInk: "#FFFFFF",
  data: "#3B3F9E",
  dataBg: "#E6E7FA",
  danger: "#B42318",
  onDanger: "#FFFFFF",
  dangerBg: "#FDE4E1",
  dangerBorder: "#F5B5AC",
  warning: "#7A5410",
  warningBg: "#FDF1D8",
  /** Velo dietro bottom sheet e modali. */
  scrim: "rgba(35, 26, 20, 0.4)",
} as const;

/** Ombre in cacao trasparente (iOS `shadow*`, Android `elevation`). */
export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    elevation: 3,
  },
  tabBar: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 10,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 4,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/**
 * Plus Jakarta Sans: su Android ogni peso è una famiglia a sé
 * (`fontWeight` da solo non sceglie il file), quindi il peso diventa `fontFamily`.
 * Nomi = chiavi caricate da `useFonts` nel `_layout.tsx` radice.
 */
export const fontFamilies = {
  "400": "PlusJakartaSans_400Regular",
  "500": "PlusJakartaSans_500Medium",
  "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold",
  "800": "PlusJakartaSans_800ExtraBold",
} as const;

export const typography = {
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  heading: { fontSize: 22, fontWeight: "800" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "500" as const, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 18 },
  eyebrow: { fontSize: 13, fontWeight: "700" as const, lineHeight: 18 },
  meta: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
};
