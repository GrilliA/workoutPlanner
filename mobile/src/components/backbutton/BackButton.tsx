import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";

type BackButtonProps = {
  onPress: () => void;
};

/** Freccia indietro minimale (niente titolo header). */
export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Indietro"
      hitSlop={12}
      style={styles.hit}
    >
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
  );
}

/** Header custom solo freccia, per screen stack. */
export function BackHeader({ onPress }: BackButtonProps) {
  return (
    <View style={styles.bar}>
      <BackButton onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  arrow: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: "300",
    lineHeight: 36,
  },
  bar: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
