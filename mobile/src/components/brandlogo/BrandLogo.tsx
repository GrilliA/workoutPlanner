import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme";

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
      <Text style={[styles.word, { fontSize: WORD_SIZES[size] }]}>
        tracci
        <Text style={styles.a}>a</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: "center",
  },
  word: {
    color: colors.textHeading,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  a: {
    color: colors.accent,
  },
});
