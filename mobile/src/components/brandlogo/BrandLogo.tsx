import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";
import { colors, spacing } from "../../theme";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: { mark: 28, word: 18 },
  md: { mark: 48, word: 28 },
  lg: { mark: 72, word: 34 },
} as const;

export function BrandLogo({ size = "md" }: BrandLogoProps) {
  const dims = SIZES[size];

  return (
    <View style={styles.lockup} accessibilityLabel="traccia">
      <Svg width={dims.mark} height={dims.mark} viewBox="0 0 64 64" fill="none">
        <Defs>
          <LinearGradient id="brandMark" x1="8" y1="12" x2="56" y2="52">
            <Stop offset="0%" stopColor={colors.accent} />
            <Stop offset="100%" stopColor="#166534" />
          </LinearGradient>
        </Defs>
        <Path
          d="M10 18c8-2 18-3 27-2 4 .4 8 1.4 11 3.2"
          stroke="url(#brandMark)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Path
          d="M32 16.5c.4 8 .8 18 1.2 28.5"
          stroke="url(#brandMark)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Path
          d="M44 18.5c4.5 1.8 8.5 5 10.5 9.5 1.4 3.2 1.2 6.4-.6 9.2-1.5 2.3-3.8 3.8-6.4 4.4"
          stroke="url(#brandMark)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <Path d="M48.2 40.2 58 34.8l-2.2 11.2z" fill="url(#brandMark)" />
      </Svg>
      <Text style={[styles.word, { fontSize: dims.word }]}>
        tracci
        <Text style={styles.a}>a</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: "center",
    gap: spacing.sm,
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
