import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import type { Exercise, LoggedSet } from "../../api";
import { AppText, Meta } from "../../components";
import { colors, radii, spacing } from "../../theme";
import {
  getTargetRepsForSet,
  getTargetSetCount,
  isExerciseComplete,
  stepReps,
  stepWeightKg,
} from "./logDefaults";

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

type EditingField = "weight" | "reps" | null;

async function tickHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Simulator / permissions.
  }
}

/** Card esercizio: serie limitate dal piano, stepper ±, tap per edit. */
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
  const [editing, setEditing] = useState<EditingField>(null);
  const weightRef = useRef<TextInputType>(null);
  const repsRef = useRef<TextInputType>(null);

  const targetSets = getTargetSetCount(exercise);
  const complete = isExerciseComplete(exercise, sets.length);
  const nextSetNumber = sets.length + 1;
  const targetReps = getTargetRepsForSet(exercise, nextSetNumber);
  const canLog = !readOnly && !complete;

  const startEdit = (field: EditingField) => {
    setEditing(field);
    requestAnimationFrame(() => {
      if (field === "weight") {
        weightRef.current?.focus();
      } else if (field === "reps") {
        repsRef.current?.focus();
      }
    });
  };

  const onStepWeight = (direction: 1 | -1) => {
    void tickHaptic();
    onChangeWeight(stepWeightKg(weight, direction));
  };

  const onStepReps = (direction: 1 | -1) => {
    void tickHaptic();
    onChangeReps(stepReps(reps, direction));
  };

  return (
    <View
      style={[
        styles.card,
        resting && styles.cardResting,
        complete && styles.cardDone,
      ]}
    >
      <AppText tone="heading" style={styles.name}>
        {exercise.name}
      </AppText>
      <Meta>
        Serie {Math.min(sets.length, targetSets)} / {targetSets}
        {` · target ${targetReps} reps`}
      </Meta>

      {Array.from({ length: targetSets }, (_, index) => {
        const setNumber = index + 1;
        const logged = sets.find((set) => set.setNumber === setNumber);
        const plannedReps = getTargetRepsForSet(exercise, setNumber);

        if (logged) {
          return (
            <AppText key={setNumber} style={styles.setLine}>
              #{setNumber}: {logged.weightKg ?? "—"} kg × {logged.reps}{" "}
              <AppText tone="muted">(piano {plannedReps})</AppText>
            </AppText>
          );
        }

        return (
          <AppText key={setNumber} tone="muted" style={styles.setLine}>
            #{setNumber}: in attesa · {plannedReps} reps
          </AppText>
        );
      })}

      {complete && !readOnly ? (
        <AppText tone="accent" style={styles.doneLabel}>
          Esercizio completato
        </AppText>
      ) : null}

      {canLog ? (
        <View style={styles.logBlock}>
          <Meta style={styles.nextLabel}>
            Prossima: serie {nextSetNumber} / {targetSets}
          </Meta>
          <StepperRow
            label="kg"
            value={weight}
            placeholder="0"
            editing={editing === "weight"}
            inputRef={weightRef}
            keyboardType="decimal-pad"
            onMinus={() => onStepWeight(-1)}
            onPlus={() => onStepWeight(1)}
            onPressValue={() => startEdit("weight")}
            onChangeText={onChangeWeight}
            onEndEditing={() => setEditing(null)}
          />
          <StepperRow
            label="reps"
            value={reps}
            placeholder={String(targetReps)}
            editing={editing === "reps"}
            inputRef={repsRef}
            keyboardType="number-pad"
            onMinus={() => onStepReps(-1)}
            onPlus={() => onStepReps(1)}
            onPressValue={() => startEdit("reps")}
            onChangeText={onChangeReps}
            onEndEditing={() => setEditing(null)}
          />

          <Pressable
            style={({ pressed }) => [
              styles.logBtn,
              pressed && styles.logBtnPressed,
            ]}
            onPress={onLog}
            accessibilityRole="button"
            accessibilityLabel={`Logga serie ${nextSetNumber}`}
          >
            <AppText style={styles.logBtnLabel}>
              LOGGA SERIE {nextSetNumber}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type StepperRowProps = {
  label: string;
  value: string;
  placeholder: string;
  editing: boolean;
  inputRef: React.RefObject<TextInputType | null>;
  keyboardType: "decimal-pad" | "number-pad";
  onMinus: () => void;
  onPlus: () => void;
  onPressValue: () => void;
  onChangeText: (value: string) => void;
  onEndEditing: () => void;
};

function StepperRow({
  label,
  value,
  placeholder,
  editing,
  inputRef,
  keyboardType,
  onMinus,
  onPlus,
  onPressValue,
  onChangeText,
  onEndEditing,
}: StepperRowProps) {
  return (
    <View style={styles.stepperRow}>
      <AppText tone="muted" style={styles.stepperLabel}>
        {label}
      </AppText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onMinus}
          style={({ pressed }) => [
            styles.stepBtn,
            pressed && styles.stepBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Diminuisci ${label}`}
        >
          <AppText tone="heading" style={styles.stepBtnLabel}>
            −
          </AppText>
        </Pressable>

        {editing ? (
          <TextInput
            ref={inputRef}
            style={styles.valueInput}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={keyboardType}
            selectTextOnFocus
            onChangeText={onChangeText}
            onEndEditing={onEndEditing}
            onBlur={onEndEditing}
          />
        ) : (
          <Pressable
            onPress={onPressValue}
            style={styles.valueTap}
            accessibilityRole="button"
            accessibilityLabel={`Modifica ${label}`}
          >
            <AppText tone="heading" style={styles.valueText}>
              {value === "" ? "—" : value}
            </AppText>
          </Pressable>
        )}

        <Pressable
          onPress={onPlus}
          style={({ pressed }) => [
            styles.stepBtn,
            pressed && styles.stepBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Aumenta ${label}`}
        >
          <AppText tone="heading" style={styles.stepBtnLabel}>
            +
          </AppText>
        </Pressable>
      </View>
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
  cardDone: {
    borderColor: colors.accentBorder,
  },
  name: {
    fontWeight: "700",
    fontSize: 17,
  },
  setLine: {
    color: colors.text,
    marginTop: 4,
  },
  doneLabel: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  logBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  nextLabel: {
    fontWeight: "600",
  },
  stepperRow: {
    gap: spacing.xs,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnPressed: {
    opacity: 0.7,
    borderColor: colors.accent,
  },
  stepBtnLabel: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
  },
  valueTap: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  valueText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  valueInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.bg,
    color: colors.textHeading,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  logBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  logBtnPressed: {
    opacity: 0.85,
  },
  logBtnLabel: {
    color: colors.onAccent,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
