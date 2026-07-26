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
  formatWeightKg,
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
  onUndoLast: () => void;
  onEditSet: (
    setNumber: number,
    next: { reps: number; weightKg: number | null },
  ) => void;
};

type EditingField = "weight" | "reps" | null;

type EditDraft = {
  setNumber: number;
  weight: string;
  reps: string;
};

async function tickHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch {
    // Simulator / permissions.
  }
}

function formatLogLabel(weight: string, reps: string, setNumber: number): string {
  const kg = weight.trim() === "" ? "—" : weight.trim();
  const repValue = reps.trim() === "" ? "—" : reps.trim();
  return `LOG ${kg} × ${repValue}  ·  #${setNumber}`;
}

/** Card esercizio: one-tap log, edit/undo set, stepper opzionali. */
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
  onUndoLast,
  onEditSet,
}: ExerciseCardProps) {
  const [editing, setEditing] = useState<EditingField>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const weightRef = useRef<TextInputType>(null);
  const repsRef = useRef<TextInputType>(null);

  const targetSets = getTargetSetCount(exercise);
  const complete = isExerciseComplete(exercise, sets.length);
  const nextSetNumber = sets.length + 1;
  const targetReps = getTargetRepsForSet(exercise, nextSetNumber);
  const canLog = !readOnly && !complete;
  const canUndo = !readOnly && sets.length > 0 && editDraft === null;

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

  const openSetEditor = (logged: LoggedSet) => {
    if (readOnly) {
      return;
    }
    setAdjustOpen(false);
    setEditDraft({
      setNumber: logged.setNumber,
      weight:
        logged.weightKg === null ? "" : formatWeightKg(logged.weightKg),
      reps: String(logged.reps),
    });
  };

  const saveSetEditor = () => {
    if (!editDraft) {
      return;
    }

    const nextReps = Number(editDraft.reps);
    const weightRaw = editDraft.weight.trim();
    const weightKg = weightRaw === "" ? null : Number(weightRaw);

    if (!Number.isFinite(nextReps) || nextReps <= 0) {
      return;
    }

    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
      return;
    }

    onEditSet(editDraft.setNumber, { reps: nextReps, weightKg });
    setEditDraft(null);
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
        {canLog ? ` · prossima ${targetReps} reps` : ""}
      </Meta>

      {Array.from({ length: targetSets }, (_, index) => {
        const setNumber = index + 1;
        const logged = sets.find((set) => set.setNumber === setNumber);
        const plannedReps = getTargetRepsForSet(exercise, setNumber);

        if (logged) {
          const isEditingThis =
            editDraft !== null && editDraft.setNumber === setNumber;

          if (isEditingThis && editDraft) {
            return (
              <View key={setNumber} style={styles.editBlock}>
                <Meta style={styles.nextLabel}>Modifica serie #{setNumber}</Meta>
                <StepperRow
                  label="kg"
                  value={editDraft.weight}
                  placeholder="0"
                  editing={editing === "weight"}
                  inputRef={weightRef}
                  keyboardType="decimal-pad"
                  onMinus={() =>
                    setEditDraft((current) =>
                      current
                        ? {
                            ...current,
                            weight: stepWeightKg(current.weight, -1),
                          }
                        : current,
                    )
                  }
                  onPlus={() =>
                    setEditDraft((current) =>
                      current
                        ? {
                            ...current,
                            weight: stepWeightKg(current.weight, 1),
                          }
                        : current,
                    )
                  }
                  onPressValue={() => startEdit("weight")}
                  onChangeText={(value) =>
                    setEditDraft((current) =>
                      current ? { ...current, weight: value } : current,
                    )
                  }
                  onEndEditing={() => setEditing(null)}
                />
                <StepperRow
                  label="reps"
                  value={editDraft.reps}
                  placeholder={String(plannedReps)}
                  editing={editing === "reps"}
                  inputRef={repsRef}
                  keyboardType="number-pad"
                  onMinus={() =>
                    setEditDraft((current) =>
                      current
                        ? { ...current, reps: stepReps(current.reps, -1) }
                        : current,
                    )
                  }
                  onPlus={() =>
                    setEditDraft((current) =>
                      current
                        ? { ...current, reps: stepReps(current.reps, 1) }
                        : current,
                    )
                  }
                  onPressValue={() => startEdit("reps")}
                  onChangeText={(value) =>
                    setEditDraft((current) =>
                      current ? { ...current, reps: value } : current,
                    )
                  }
                  onEndEditing={() => setEditing(null)}
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={() => setEditDraft(null)}
                    style={styles.textAction}
                    accessibilityRole="button"
                    accessibilityLabel="Annulla modifica"
                  >
                    <Meta>Annulla</Meta>
                  </Pressable>
                  <Pressable
                    onPress={saveSetEditor}
                    style={styles.saveEditBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Salva serie ${setNumber}`}
                  >
                    <AppText style={styles.saveEditLabel}>Salva</AppText>
                  </Pressable>
                </View>
              </View>
            );
          }

          return (
            <Pressable
              key={setNumber}
              onPress={() => openSetEditor(logged)}
              disabled={readOnly || editDraft !== null}
              accessibilityRole={readOnly ? "text" : "button"}
              accessibilityLabel={
                readOnly
                  ? `Serie ${setNumber}: ${logged.weightKg ?? "—"} kg per ${logged.reps} reps`
                  : `Modifica serie ${setNumber}`
              }
              style={({ pressed }) => [
                styles.setLinePressable,
                pressed && !readOnly && styles.setLinePressed,
              ]}
            >
              <AppText style={styles.setLine}>
                #{setNumber}: {logged.weightKg ?? "—"} kg × {logged.reps}{" "}
                <AppText tone="muted">(piano {plannedReps})</AppText>
              </AppText>
              {!readOnly ? (
                <Meta style={styles.editHint}>tocca per modificare</Meta>
              ) : null}
            </Pressable>
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

      {canLog && editDraft === null ? (
        <View style={styles.logBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.logBtn,
              pressed && styles.logBtnPressed,
            ]}
            onPress={onLog}
            accessibilityRole="button"
            accessibilityLabel={`Logga serie ${nextSetNumber}: ${weight || "senza peso"} kg per ${reps || targetReps} reps`}
          >
            <AppText style={styles.logBtnLabel}>
              {formatLogLabel(weight, reps || String(targetReps), nextSetNumber)}
            </AppText>
          </Pressable>

          <Pressable
            onPress={() => setAdjustOpen((open) => !open)}
            style={styles.textAction}
            accessibilityRole="button"
            accessibilityLabel={
              adjustOpen ? "Nascondi regolazione" : "Modifica peso e reps"
            }
          >
            <Meta style={styles.adjustToggle}>
              {adjustOpen ? "Nascondi regolazione" : "Modifica peso / reps"}
            </Meta>
          </Pressable>

          {adjustOpen ? (
            <>
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
            </>
          ) : null}
        </View>
      ) : null}

      {canUndo ? (
        <Pressable
          onPress={onUndoLast}
          style={styles.textAction}
          accessibilityRole="button"
          accessibilityLabel="Annulla ultima serie"
        >
          <Meta style={styles.undoLabel}>Annulla ultima serie</Meta>
        </Pressable>
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
  setLinePressable: {
    marginTop: 4,
  },
  setLinePressed: {
    opacity: 0.7,
  },
  editHint: {
    fontSize: 11,
    marginTop: 2,
  },
  doneLabel: {
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  logBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.bg,
  },
  nextLabel: {
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  saveEditBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveEditLabel: {
    color: colors.onAccent,
    fontWeight: "800",
  },
  textAction: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  adjustToggle: {
    fontWeight: "600",
  },
  undoLabel: {
    color: colors.danger,
    fontWeight: "600",
    marginTop: spacing.xs,
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
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  logBtnPressed: {
    opacity: 0.85,
  },
  logBtnLabel: {
    color: colors.onAccent,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
