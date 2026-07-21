import { StyleSheet, Text as RNText, type TextProps, type StyleProp, type TextStyle } from "react-native";
import { colors, typography } from "../../theme";

type Variant = "title" | "heading" | "body" | "label" | "eyebrow" | "meta";

type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: "default" | "heading" | "accent" | "danger" | "muted";
  style?: StyleProp<TextStyle>;
};

const toneColor = {
  default: colors.text,
  heading: colors.textHeading,
  accent: colors.accent,
  danger: colors.danger,
  muted: colors.muted,
} as const;

/** Testo tipografico dell'app (varianti allineate al web). */
export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...props
}: AppTextProps) {
  return (
    <RNText
      {...props}
      style={[typography[variant], { color: toneColor[tone] }, style]}
    />
  );
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
  return <AppText variant="meta" tone="muted" {...props} />;
}

export function SectionLabel(props: Omit<AppTextProps, "variant" | "tone">) {
  return (
    <AppText
      variant="eyebrow"
      tone="muted"
      style={styles.section}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
});
