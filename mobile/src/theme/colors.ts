/** Design tokens — allineati al web (`fe/src/index.css` + AppShell). */

export const colors = {
  bg: "#16171d",
  surface: "#1f2028",
  surfaceElevated: "#262833",
  border: "#2e303a",
  text: "#8b8bb8",
  textHeading: "#e8e8ff",
  accent: "#c4ff4d",
  accentBg: "rgba(196, 255, 77, 0.15)",
  accentBorder: "rgba(196, 255, 77, 0.5)",
  onAccent: "#101014",
  danger: "#f87171",
  dangerBg: "rgba(248, 113, 113, 0.12)",
  muted: "#6b6e7c",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
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
