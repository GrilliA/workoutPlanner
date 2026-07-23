import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../components";
import { colors, radii, spacing } from "../../theme";

type RestTimerCardProps = {
  status: "idle" | "running" | "done";
  remainingSec: number;
  onSkip: () => void;
};

const formatCountdown = (remainingSec: number): string => {
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return `${seconds}s`;
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

  const isDone = status === "done";

  return (
    <View style={[styles.timer, isDone && styles.timerDone]}>
      <AppText variant="eyebrow" tone="accent" style={styles.label}>
        {isDone ? "Recupero finito" : "RECUPERO"}
      </AppText>
      <AppText
        tone="heading"
        style={styles.value}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {isDone ? "✓" : formatCountdown(remainingSec)}
      </AppText>
      {status === "running" ? (
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
        >
          <AppText tone="heading" style={styles.skipLabel}>
            SALTA RECUPERO
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  timer: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginVertical: spacing.sm,
    minHeight: 140,
    width: "100%",
    overflow: "visible",
  },
  timerDone: {
    borderColor: colors.accent,
  },
  label: {
    letterSpacing: 1.2,
  },
  value: {
    // Heading/body base lineHeight is too small for large digits — override fully.
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 58,
    color: colors.textHeading,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    includeFontPadding: false,
    marginVertical: spacing.xs,
  },
  skip: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipPressed: {
    opacity: 0.7,
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
