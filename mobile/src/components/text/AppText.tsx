import {
  StyleSheet,
  Text as RNText,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";
import { colors, fontFamilies, typography } from "../../theme";

type Variant = "title" | "heading" | "body" | "label" | "eyebrow" | "meta";

type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: "default" | "heading" | "accent" | "danger";
  style?: StyleProp<TextStyle>;
};

const toneColor = {
  default: colors.text,
  heading: colors.textHeading,
  accent: colors.accentText,
  danger: colors.danger,
} as const;

/**
 * Plus Jakarta Sans del peso richiesto. `fontWeight` torna "normal" perché
 * su Android un peso sopra una famiglia già bold aggiunge un grassetto finto.
 */
export function fontForWeight(style: StyleProp<TextStyle>): TextStyle {
  const weight = String(StyleSheet.flatten(style)?.fontWeight ?? "400");
  const isKnownWeight = weight in fontFamilies;
  const fontFamily = isKnownWeight
    ? fontFamilies[weight as keyof typeof fontFamilies]
    : fontFamilies["400"];
  return { fontFamily, fontWeight: "normal" };
}

/** Testo tipografico dell'app (varianti allineate al web). */
export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...props
}: AppTextProps) {
  const textStyle = [typography[variant], { color: toneColor[tone] }, style];
  return <RNText {...props} style={[textStyle, fontForWeight(textStyle)]} />;
}

/** Scorciatoie leggibili nei JSX. */
export function Title(props: Omit<AppTextProps, "variant" | "tone">) {
  return <AppText variant="title" tone="heading" {...props} />;
}

export function Heading(props: Omit<AppTextProps, "variant" | "tone">) {
  return <AppText variant="heading" tone="heading" {...props} />;
}

export function Body(props: Omit<AppTextProps, "variant">) {
  return <AppText variant="body" {...props} />;
}

export function Eyebrow(props: Omit<AppTextProps, "variant" | "tone">) {
  return <AppText variant="eyebrow" tone="accent" {...props} />;
}

export function Meta(props: Omit<AppTextProps, "variant">) {
  return <AppText variant="meta" {...props} />;
}

export function SectionLabel(props: Omit<AppTextProps, "variant" | "tone">) {
  return <AppText variant="eyebrow" style={styles.section} {...props} />;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
});
