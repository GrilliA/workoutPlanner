import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

type SessionActionBarProps = {
  busy?: boolean;
  onComplete: () => void;
};

/** Barra fissa: solo "Termina allenamento", pill bianca con bordo. */
export function SessionActionBar({
  busy = false,
  onComplete,
}: SessionActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <Pressable
        onPress={onComplete}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Termina allenamento"
        style={({ pressed }) => [
          styles.completeBtn,
          (busy || pressed) && styles.dimmed,
        ]}
      >
        <AppText style={styles.completeLabel}>Termina allenamento</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  completeBtn: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  completeLabel: {
    color: colors.textHeading,
    fontWeight: "800",
    fontSize: 16,
  },
  dimmed: {
    opacity: 0.55,
  },
});
