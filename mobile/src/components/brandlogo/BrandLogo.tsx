import { View, StyleSheet } from "react-native";
import { colors } from "../../theme";
import { AppText } from "../text";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
};

const WORD_SIZES = {
  sm: 18,
  md: 28,
  lg: 34,
} as const;

export function BrandLogo({ size = "md" }: BrandLogoProps) {
  return (
    <View style={styles.lockup} accessibilityLabel="traccia">
      <AppText style={[styles.word, { fontSize: WORD_SIZES[size] }]}>
        tracci
        <AppText style={[styles.word, styles.a, { fontSize: WORD_SIZES[size] }]}>
          a
        </AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: "center",
  },
  word: {
    color: colors.textHeading,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  /** Logotipo: l'arancio pieno è esente dal contrasto testo (WCAG 1.4.3). */
  a: {
    color: colors.accent,
  },
});
