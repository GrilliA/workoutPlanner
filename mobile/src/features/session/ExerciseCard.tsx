import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { Exercise, LoggedSet } from "../../api";
import { AppText, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";

type ExerciseCardProps = {
  exercise: Exercise;
  sets: LoggedSet[];
  resting: boolean;
  readOnly: boolean;
  weight: string;
  reps: string;
  onChangeWeight: (value: string) => void;
  onChangeReps: (value: string) => void;
  onLog: () => void;
};

/** Card esercizio con set loggati e form di log. */
export function ExerciseCard({
  exercise,
  sets,
  resting,
  readOnly,
  weight,
  reps,
  onChangeWeight,
  onChangeReps,
  onLog,
}: ExerciseCardProps) {
  return (
    <View style={[styles.card, resting && styles.cardResting]}>
      <AppText tone="heading" style={styles.name}>
        {exercise.name}
      </AppText>
      <Meta>
        Serie loggate: {sets.length}
        {exercise.sets != null ? ` / ${exercise.sets}` : ""}
      </Meta>
      {sets.map((set) => (
        <AppText key={set.id} style={styles.setLine}>
          #{set.setNumber}: {set.weightKg ?? "—"} kg × {set.reps}
        </AppText>
      ))}
      {!readOnly ? (
        <View style={styles.logRow}>
          <TextInput
            style={styles.input}
            placeholder="kg"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={onChangeWeight}
          />
          <TextInput
            style={styles.input}
            placeholder="reps"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            value={reps}
            onChangeText={onChangeReps}
          />
          <Pressable
            style={styles.logBtn}
            onPress={onLog}
            accessibilityRole="button"
          >
            <AppText style={styles.logBtnLabel}>LOGGA</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cardResting: {
    borderColor: colors.accent,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
  },
  setLine: {
    color: colors.text,
    marginTop: 4,
  },
  logRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    color: colors.textHeading,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logBtnLabel: {
    color: colors.onAccent,
    fontWeight: "700",
  },
});
