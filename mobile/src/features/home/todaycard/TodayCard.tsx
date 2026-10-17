import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button } from "../../../components";
import { colors, radii, spacing } from "../../../theme";
import { formatExerciseCount } from "../mappers/homeSelection";
import type { SelectedWorkout } from "../types";

type TodayCardProps = {
  workout: SelectedWorkout;
  isStarting: boolean;
  onStart: () => void;
  onChange: () => void;
};

/** Card arancio della Home: un solo bottone, "Inizia allenamento". */
export function TodayCard({
  workout,
  isStarting,
  onStart,
  onChange,
}: TodayCardProps) {
  const eyebrow = workout.isToday ? "Oggi tocca a" : "Hai scelto";
  const meta = `${workout.programName} · ${formatExerciseCount(workout.exerciseCount)}`;
  const startLabel = isStarting ? "Avvio…" : "Inizia allenamento";

  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <AppText style={styles.eyebrow}>{eyebrow}</AppText>
        <AppText style={styles.title} numberOfLines={2}>
          {workout.dayName}
        </AppText>
        <AppText style={styles.meta} numberOfLines={1}>
          {meta}
        </AppText>
      </View>

      <Button
        variant="ink"
        label={startLabel}
        onPress={onStart}
        disabled={isStarting}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onChange}
        hitSlop={8}
        style={({ pressed }) => [styles.change, pressed && styles.pressed]}
      >
        <AppText style={styles.changeLabel}>Cambia allenamento</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    color: colors.onAccent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  title: {
    color: colors.onAccent,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  meta: {
    color: colors.onAccent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  change: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  changeLabel: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
