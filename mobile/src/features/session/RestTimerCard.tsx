import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Heading } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
  onSkip: () => void;
};

/** Card recupero durante la sessione attiva. */
export function RestTimerCard({
  status,
  remainingSec,
  onSkip,
}: RestTimerCardProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <View style={styles.timer}>
      <AppText tone="accent" style={styles.label}>
        {status === "done" ? "Recupero finito" : "RECUPERO"}
      </AppText>
      <Heading style={styles.value}>
        {status === "done" ? "✓" : `${remainingSec}s`}
      </Heading>
      {status === "running" ? (
        <Pressable onPress={onSkip} accessibilityRole="button">
          <AppText tone="default">SALTA RECUPERO</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timer: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  label: { fontWeight: "700" },
  value: {
    fontSize: 36,
    marginVertical: 4,
  },
});
