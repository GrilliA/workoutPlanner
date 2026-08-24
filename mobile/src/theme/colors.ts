/** Design tokens — charcoal surfaces + powder blue accent. */

export const colors = {
  bg: "#1d1f25",
  surface: "#252830",
  surfaceElevated: "#2c3038",
  border: "rgba(224, 224, 224, 0.12)",
  text: "#aaaaaa",
  textHeading: "#e0e0e0",
  accent: "#bfdbf7",
  accentBg: "rgba(191, 219, 247, 0.12)",
  accentBorder: "rgba(191, 219, 247, 0.4)",
  onAccent: "#111111",
  danger: "#f87171",
  dangerBg: "rgba(248, 113, 113, 0.12)",
  muted: "#666666",
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
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  heading: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 18 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 1,
    lineHeight: 16,
  },
  meta: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
};
